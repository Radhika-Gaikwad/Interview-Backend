import express from "express";
import auth from "../middleware/auth.middleware.js";
import * as sessionController from "../controllers/session.controller.js";

const router = express.Router();

// All routes require authentication
router.post("/", auth, sessionController.createSession);
router.get("/", auth, sessionController.listMySessions);
router.get("/:id", auth, sessionController.getSession);
router.put("/:id", auth, sessionController.updateSession);
router.delete("/:id", auth, sessionController.deleteSession);
// Connect / start the session (checks credits >= 0.5)
router.post("/:id/connect", auth, sessionController.startSession);
// End session and deduct credits based on duration
router.post("/:id/end", auth, sessionController.endSession);
router.post("/:id/duplicate", auth, sessionController.duplicateSession);

export default router;
