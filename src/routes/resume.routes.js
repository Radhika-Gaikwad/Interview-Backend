import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import * as resumeController from "../controllers/resume.controller.js";

const router = express.Router();

/**
 * Resume APIs
 */

router.post("/", authMiddleware, resumeController.createResume);

router.get("/", authMiddleware, resumeController.getResumes);

router.get("/view/:id", authMiddleware, resumeController.viewResume);

router.get("/download/:id", authMiddleware, resumeController.downloadResume);

router.delete("/:id", authMiddleware, resumeController.deleteResume);

export default router;