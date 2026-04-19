import * as resumeService from "../Services/resume.service.js";
import { bucket } from "../utils/gcs.js";
import path from "path";
import db from "../config/db.js";

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

export const getResumes = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 6;

    // 1. FAST CHECK: Get only the latest updated doc to generate ETag
    // This avoids downloading all IDs and timestamps for every request.
    const latestDocSnapshot = await db.collection("resumes")
      .where("user", "==", userId)
      .where("isDeleted", "==", false)
      .orderBy("updatedAt", "desc")
      .limit(1)
      .get();

    let etag = `${userId}-${page}-${limit}-empty`;
    if (!latestDocSnapshot.empty) {
      const lastUpdate = latestDocSnapshot.docs[0].data().updatedAt?.toMillis() || 0;
      etag = `${userId}-${page}-${limit}-${lastUpdate}`;
    }

    // 2. Browser Cache Validation
    if (req.headers["if-none-match"] === etag) {
      return res.status(304).end();
    }

    // 3. Fetch only the data needed for this specific page
    const result = await resumeService.getResumes(userId, page, limit);

    res.set("ETag", etag);
    res.set("Cache-Control", "private, max-age=120"); // Increased to 2 mins
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

    // ✅ FIREBASE WAY: Direct document read
    const doc = await db.collection("resumes").doc(resumeId).get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Resume not found" });
    }

    const meta = doc.data();
    const etag = meta.updatedAt ? meta.updatedAt.toDate().toISOString() : "new";

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
    const doc = await db.collection("resumes").doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Resume not found" });
    }

    const resume = doc.data();
    const file = bucket.file(resume.resumePath);

    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 15 * 60 * 1000,
      responseDisposition: `attachment; filename="${resume.title}${path.extname(resume.resumePath)}"`,
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