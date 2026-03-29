import Resume from "../Model/Resume.js";
import * as resumeService from "../Services/resume.service.js";
import { bucket } from "../utils/gcs.js";
import path from "path";
import crypto from "crypto";



/* ================= CREATE ================= */

export const createResume = async (req, res) => {
  try {
    const userId = req.user.id;
    const email = req.user.email;

    const resume = await resumeService.createResume({
      ...req.body,
      user: userId,
      email,
    });


    res.status(201).json(resume);
  } catch (err) {
    console.error("Create resume error:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ================= LIST (CACHEABLE) ================= */

export const getResumes = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 6;

    // ✅ VERY LIGHT QUERY (only updatedAt)
    const latest = await Resume.find({
      user: userId,
      isDeleted: false,
    })
      .select("updatedAt")
      .sort({ updatedAt: -1 })
      .limit(1)
      .lean();

    const lastUpdated = latest[0]?.updatedAt?.toISOString() || "empty";

    const etag = `${userId}-${page}-${limit}-${lastUpdated}`;

    // ✅ SHORT-CIRCUIT HERE
    if (req.headers["if-none-match"] === etag) {
      return res.status(304).end(); // ⚡ NO DB HEAVY CALL
    }

    // ❗ Only now run heavy query
    const result = await resumeService.getResumes(userId, page, limit);

    res.set("ETag", etag);
    res.set("Cache-Control", "private, max-age=60");

    res.json(result);
  } catch (err) {
    console.error("Get resumes error:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ================= VIEW (CACHEABLE - SHORT TTL) ================= */

export const viewResume = async (req, res) => {
  try {
    const resumeId = req.params.id;

    // ✅ Only fetch updatedAt (VERY FAST)
    const meta = await Resume.findById(resumeId)
      .select("updatedAt previewPdfPath resumePath")
      .lean();

    if (!meta) {
      return res.status(404).json({ error: "Resume not found" });
    }

    const etag = meta.updatedAt?.toISOString();

    // ✅ RETURN EARLY (NO GCS CALL)
    if (req.headers["if-none-match"] === etag) {
      return res.status(304).end(); // ⚡ HUGE SAVING
    }

    // ❗ Only now generate signed URL
    const filePath = meta.previewPdfPath || meta.resumePath;
    const file = bucket.file(filePath);

    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 15 * 60 * 1000,
    });

    res.set("ETag", etag);
    res.set("Cache-Control", "private, max-age=60");

    return res.json({ url });

  } catch (err) {
    console.error("Preview error:", err);
    res.status(500).json({ error: "Preview failed" });
  }
};

/* ================= DOWNLOAD (NO CACHE) ================= */

export const downloadResume = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);

    if (!resume) {
      return res.status(404).json({ error: "Resume not found" });
    }

    const file = bucket.file(resume.resumePath);

    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 15 * 60 * 1000,
      responseDisposition: `attachment; filename="${resume.title}${path.extname(resume.resumePath)}"`
    });

    return res.json({ url });

  } catch (err) {
    console.error("Download error:", err);
    res.status(500).json({ error: "Download failed" });
  }
};

/* ================= DELETE ================= */

export const deleteResume = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const resumeId = req.params.id;

    const result = await resumeService.deleteResume(resumeId, userId);

    return res.status(200).json({
      success: true,
      message: result.message,
    });

  } catch (err) {
    console.error("❌ Delete resume error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to delete resume",
    });
  }
};