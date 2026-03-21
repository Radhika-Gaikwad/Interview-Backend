import express from "express";
import auth from "../middleware/auth.middleware.js";
import * as userController from "../controllers/user.controller.js";
import * as paymentController from "../controllers/payment.controller.js";

const router = express.Router();

// Get logged-in user profile
router.get("/me", auth, userController.getProfile);

// Update logged-in user profile
router.put("/me", auth, userController.updateProfile);

// Buy credits (Stripe checkout)
router.post("/buy-credits", auth, paymentController.createCheckout);

// Verify checkout after Stripe redirect
router.post("/verify-checkout", auth, paymentController.verifyCheckout);

// ✅ Get user credits (FIXED)
router.get("/credits", auth, userController.fetchUserCredits);

export default router;