// routes/authRoutes.js
import express from "express";
import passport from "passport";
import { signup, login, me, socialCallback } from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// Local auth
router.post("/signup", signup);
router.post("/login", login);

// Protected example
router.get("/me", protect, me);

/**
 * Social demo endpoints
 * If DEMO_SOCIAL=true, frontend can call /auth/demo/:provider to create & login a fake social user.
 *
 * Example request:
 * POST /auth/demo/google
 * body: { providerId: "google-demo-123", email: "demo@google.com", name: "Demo User", avatar: "..." }
 */
router.post("/demo/:provider", async (req, res) => {
  if (process.env.DEMO_SOCIAL !== "true") {
    return res.status(403).json({ message: "Demo social disabled" });
  }
  const provider = req.params.provider;
  // reuse controller's social callback pattern: attach body and call socialCallback
  req.body.provider = provider;
  req.body.providerId = req.body.providerId || `${provider}-demo-${Date.now()}`;
  req.body.demo = true;
  // call controller
  return socialCallback(req, res);
});

/**
 *  Passport-based OAuth routes:
 *  - When provider credentials are available, these routes will start the OAuth flow.
 *  - Callback URL should be configured in provider app and env variables.
 *
 *  NOTE: We provide example passport wiring below; ensure to configure passport strategies.
 */

// google
router.get("/google", (req, res, next) => {
  if (process.env.DEMO_SOCIAL === "true" && (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET)) {
    return res.status(501).json({ message: "Google OAuth not configured, use demo mode" });
  }
  passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});
router.get("/google/callback", passport.authenticate("google", { session: false, failureRedirect: "/auth/fail" }), socialCallback);

// facebook
router.get("/facebook", (req, res, next) => {
  if (process.env.DEMO_SOCIAL === "true" && (!process.env.FACEBOOK_CLIENT_ID || !process.env.FACEBOOK_CLIENT_SECRET)) {
    return res.status(501).json({ message: "Facebook OAuth not configured, use demo mode" });
  }
  passport.authenticate("facebook", { scope: ["email"] })(req, res, next);
});
router.get("/facebook/callback", passport.authenticate("facebook", { session: false, failureRedirect: "/auth/fail" }), socialCallback);

// linkedin
router.get("/linkedin", (req, res, next) => {
  if (process.env.DEMO_SOCIAL === "true" && (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET)) {
    return res.status(501).json({ message: "LinkedIn OAuth not configured, use demo mode" });
  }
  passport.authenticate("linkedin", { scope: ["r_emailaddress", "r_liteprofile"] })(req, res, next);
});
router.get("/linkedin/callback", passport.authenticate("linkedin", { session: false, failureRedirect: "/auth/fail" }), socialCallback);

// microsoft
router.get("/microsoft", (req, res, next) => {
  if (process.env.DEMO_SOCIAL === "true" && (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET)) {
    return res.status(501).json({ message: "Microsoft OAuth not configured, use demo mode" });
  }
  passport.authenticate("azure_ad_oauth2", { scope: ["profile", "email"] })(req, res, next);
});
router.get("/microsoft/callback", passport.authenticate("azure_ad_oauth2", { session: false, failureRedirect: "/auth/fail" }), socialCallback);

// fallback route
router.get("/fail", (req, res) => res.status(401).json({ message: "OAuth failed" }));

export default router;
