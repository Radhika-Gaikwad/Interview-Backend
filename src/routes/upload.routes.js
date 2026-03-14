import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import os from "os";
import crypto from "crypto";

import { bucket } from "../utils/gcs.js";
import textUtils from "../utils/textUtils.js";
import { parseResumeWithGemini } from "../utils/geminiResumeParser.js";
import Resume from "../Model/Resume.js";
import auth from "../middleware/auth.middleware.js";
import libre from "libreoffice-convert";
import util from "util";

const libreConvert = util.promisify(libre.convert);

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post("/upload-resume", auth, upload.single("resume"), async (req, res) => {
  const requestId = crypto.randomUUID();
  const tempFiles = [];
  const startTime = Date.now();

  const logStep = (step, message) => {
    console.log(`[${requestId}] ✅ ${step} completed — ${message}`);
  };

  const logTime = (label, start) => {
    console.log(`[${requestId}] ⏱ ${label}: ${Date.now() - start}ms`);
  };

  try {
    const stepStart = Date.now();

    const { file } = req;
    const { title } = req.body;
    const userId = req.user._id || req.user.id;
    const email = req.user.email;

    if (!file)
      return res.status(400).json({ success: false, message: "Resume file is required" });

    console.log(`[${requestId}] 🚀 Upload started for user ${userId}`);

    /* ===============================
       STEP 1: Determine version
    =============================== */
    const t1 = Date.now();

    const lastResume = await Resume.findOne({ user: userId, title })
      .sort({ version: -1 })
      .select("version")
      .lean();

    const version = Number(lastResume?.version || 0) + 1;

    logStep("STEP 1", `Version determined: v${version}`);
    logTime("STEP 1 duration", t1);

    /* ===============================
       STEP 2: Upload original resume
    =============================== */
   const t2 = Date.now();

const cleanName = file.originalname.replace(/[^a-zA-Z0-9.]/g, "_");
const baseName = `${Date.now()}-v${version}-${cleanName}`;
const resumePath = `resumes/uploaded/${baseName}`;

// Upload ORIGINAL file (doc/docx/pdf)
await bucket.file(resumePath).save(file.buffer, {
  contentType: file.mimetype,
  resumable: false,
});

let previewPdfPath = resumePath; // default (for PDF uploads)

// ✅ If DOC or DOCX → Convert to PDF
if (
  file.mimetype ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
  file.mimetype === "application/msword"
) {
  console.log(`[${requestId}] 🔄 Converting DOC to PDF`);

  const pdfBuffer = await libreConvert(file.buffer, ".pdf", undefined);

  const pdfName = baseName.replace(path.extname(baseName), ".pdf");
  previewPdfPath = `resumes/preview/${pdfName}`;

  await bucket.file(previewPdfPath).save(pdfBuffer, {
    contentType: "application/pdf",
    resumable: false,
  });

  console.log(`[${requestId}] ✅ DOC converted & PDF uploaded`);
}

logStep("STEP 2", `Original uploaded → ${resumePath}`);
logTime("STEP 2 duration", t2);

    /* ===============================
       STEP 3: Extract text
    =============================== */
    const t3 = Date.now();

    const tempResumePath = path.join(os.tmpdir(), baseName);
    await fs.writeFile(tempResumePath, file.buffer);
    tempFiles.push(tempResumePath);

    const extractedText = await textUtils.extractText(tempResumePath);
// DEBUG: log final extracted text
const debugPath = path.join(os.tmpdir(), `DEBUG_${baseName}.txt`);
await fs.writeFile(debugPath, extractedText);

console.log("========== EXTRACTED TEXT SENT TO GEMINI ==========");
console.log(extractedText);
console.log("====================================================");
    logStep("STEP 3", `Text extracted (${extractedText.length} chars)`);
    logTime("STEP 3 duration", t3);

    /* ===============================
       STEP 4: Upload extracted text
    =============================== */
    const t4 = Date.now();

    const txtName = baseName.replace(path.extname(baseName), ".txt");
    const txtTemp = path.join(os.tmpdir(), txtName);
    await fs.writeFile(txtTemp, extractedText);
    tempFiles.push(txtTemp);

    const textPath = `resumes/processed/${txtName}`;
    await bucket.upload(txtTemp, {
      destination: textPath,
      metadata: { contentType: "text/plain" },
    });

    logStep("STEP 4", `Extracted text uploaded → ${textPath}`);
    logTime("STEP 4 duration", t4);

    /* ===============================
       STEP 5: Parse resume JSON
    =============================== */
    const t5 = Date.now();

    let parsedData = null;
    try {
      parsedData = await parseResumeWithGemini(extractedText);
      logStep("STEP 5", "Resume parsed successfully");
    } catch (err) {
      console.warn(`[${requestId}] ⚠ Parsing failed: ${err.message}`);
    }

    const jsonName = baseName.replace(path.extname(baseName), ".json");
    const jsonTemp = path.join(os.tmpdir(), jsonName);
    await fs.writeFile(jsonTemp, JSON.stringify(parsedData || {}, null, 2));
    tempFiles.push(jsonTemp);

    const jsonPath = `resumes/extracted/${jsonName}`;
    await bucket.upload(jsonTemp, {
      destination: jsonPath,
      metadata: { contentType: "application/json" },
    });

    logStep("STEP 5", `JSON uploaded → ${jsonPath}`);
    logTime("STEP 5 duration", t5);

    /* ===============================
       STEP 6: Update default resume
    =============================== */
    const t6 = Date.now();

    await Resume.updateMany({ user: userId }, { isDefault: false });

    logStep("STEP 6", "Previous resumes marked non-default");
    logTime("STEP 6 duration", t6);

    /* ===============================
       STEP 7: Save to DB
    =============================== */
    const t7 = Date.now();

const resumeDoc = await Resume.create({
  user: userId,
  email,
  title: title || file.originalname,
  version,
  resumePath,
  previewPdfPath,   // ✅ ADD THIS
  textPath,
  jsonPath,
  parsedData,
  isDefault: true,
});

    logStep("STEP 7", `Resume saved with ID ${resumeDoc._id}`);
    logTime("STEP 7 duration", t7);

    /* ===============================
       STEP 8: Response
    =============================== */
    logStep("STEP 8", "Response sent to client");
    logTime("TOTAL PROCESS TIME", startTime);

    const displayTitle =
      resumeDoc.version > 1
        ? `${resumeDoc.title} (v${resumeDoc.version})`
        : resumeDoc.title;

    return res.status(201).json({
      success: true,
      message: "Resume uploaded & processed successfully",
      resume: {
        _id: resumeDoc._id,
        title: displayTitle,   // ✅ user-friendly title
        originalTitle: resumeDoc.title, // optional (useful for editing)
        version: resumeDoc.version,
        
        isDefault: resumeDoc.isDefault,
        previewUrl: `/api/resume/view/${resumeDoc._id}`,
        downloadUrl: `/api/resume/download/${resumeDoc._id}`,
      },
    });
  } catch (error) {
    console.error(`[${requestId}] ❌ Upload failed`, error);
    return res.status(500).json({
      success: false,
      message: "Resume processing failed",
    });
  } finally {
    /* ===============================
       STEP 9: Cleanup temp files
    =============================== */
    await Promise.all(tempFiles.map((f) => fs.unlink(f).catch(() => { })));
    console.log(`[${requestId}] 🧹 Temporary files cleaned`);
  }
});

export default router;