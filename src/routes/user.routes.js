import express from "express";
import auth from "../middleware/auth.middleware.js";
import * as userController from "../controllers/user.controller.js";
import * as paymentController from "../controllers/payment.controller.js";
import { cacheMiddleware } from "../middleware/cache.middleware.js";

const router = express.Router();

/* ================= USER ================= */

// Profile (cached)
router.get(
  "/me",
  auth,
  cacheMiddleware("user:profile", 120),
  userController.getProfile
);

// Update profile (no cache)
router.put("/me", auth, userController.updateProfile);

/* ================= PAYMENTS ================= */

router.post("/buy-credits", auth, paymentController.createCheckout);

router.post("/verify-checkout", auth, paymentController.verifyCheckout);

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  paymentController.stripeWebhook
);

/* ================= CREDITS ================= */

// Credits (cached)
router.get(
  "/credits",
  auth,
  cacheMiddleware("user:credits", 60),
  userController.fetchUserCredits
);

export default router;