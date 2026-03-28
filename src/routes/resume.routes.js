import express from "express";
import auth from "../middleware/auth.middleware.js";
import * as resumeController from "../controllers/resume.controller.js";
import { cacheMiddleware } from "../middleware/cache.middleware.js";

const router = express.Router();

/**
 * ✅ Apply auth globally
 */
router.use(auth);

/* ================= NON-CACHE ================= */

// Create resume
router.post("/", resumeController.createResume);

// Download (should NOT be cached)
router.get("/download/:id", resumeController.downloadResume);

// Delete resume
router.delete("/:id", resumeController.deleteResume);

/* ================= CACHEABLE ================= */

// List resumes (pagination)
router.get(
  "/",
  cacheMiddleware("resume:list", 120), // 2 min cache
  resumeController.getResumes
);

// View resume (signed URL - short cache)
router.get(
  "/view/:id",
  cacheMiddleware("resume:view", 60), // 1 min cache
  resumeController.viewResume
);

export default router;