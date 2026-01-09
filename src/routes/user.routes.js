import express from "express";
import auth from "../middleware/auth.middleware.js";
import * as userController from "../controllers/user.controller.js";
import * as paymentController from "../controllers/payment.controller.js";
const router = express.Router();

router.get("/me", auth, userController.getProfile);

// Update logged-in user profile
router.put("/me", auth, userController.updateProfile);

router.post("/buy-credits", auth, paymentController.createCheckout);
// verify Checkout Session (called from client after returning from Stripe success_url)
router.post("/verify-checkout", auth, paymentController.verifyCheckout);

export default router;
