import Resume from "../Model/Resume.js";
import * as resumeService from "../Services/resume.service.js";
import { bucket } from "../utils/gcs.js";
import path from "path";
import redis from "../config/redis.js";

/* ================= CACHE HELPERS ================= */

const clearResumeCache = async (userId) => {
  try {
    const keys = await redis.keys(`resume:${userId}*`);
    if (keys.length) {
      await redis.del(keys);
    }
  } catch (err) {
    console.error("Resume cache clear error:", err);
  }
};

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

    // ❗ Invalidate cache
    await clearResumeCache(userId);

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

    const result = await resumeService.getResumes(userId, page, limit);

    res.json(result);
  } catch (err) {
    console.error("Get resumes error:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ================= VIEW (CACHEABLE - SHORT TTL) ================= */

export const viewResume = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);

    if (!resume) {
      return res.status(404).json({ error: "Resume not found" });
    }

    const filePath = resume.previewPdfPath || resume.resumePath;
    const file = bucket.file(filePath);

    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 15 * 60 * 1000,
    });

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

    // ❗ Invalidate cache
    await clearResumeCache(userId);

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