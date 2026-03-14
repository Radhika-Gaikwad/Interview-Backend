import Resume from "../Model/Resume.js";
import * as resumeService from "../Services/resume.service.js";
import { bucket } from "../utils/gcs.js";
import path from "path";
/**
 * Create Resume (after upload pipeline)
 */
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

/**
 * Get all resumes for logged-in user
 */
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

export const viewResume = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);
    if (!resume) return res.status(404).json({ error: "Resume not found" });

    const filePath = resume.previewPdfPath || resume.resumePath;

    const file = bucket.file(filePath);

    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 10 * 60 * 1000,
    });

    return res.redirect(url);
  } catch (err) {
    console.error("Preview error:", err);
    res.status(500).json({ error: "Preview failed" });
  }
};
export const downloadResume = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);

    if (!resume) {
      return res.status(404).json({ error: "Resume not found" });
    }

    const file = bucket.file(resume.resumePath);

    // Check if file exists in GCS
    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json({ error: "File not found in storage" });
    }

    const ext = path.extname(resume.resumePath);

    // ✅ Force browser download
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${resume.title}${ext}"`
    );

    res.setHeader("Content-Type", "application/octet-stream");

    // ✅ Stream file directly (NO redirect)
    file.createReadStream()
      .on("error", (err) => {
        console.error("Stream error:", err);
        res.status(500).end();
      })
      .pipe(res);

  } catch (err) {
    console.error("Download error:", err);
    res.status(500).json({ error: "Download failed" });
  }
};


export const deleteResume = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const resumeId = req.params.id;

    const result = await resumeService.deleteResume(
      resumeId,
      userId
    );

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