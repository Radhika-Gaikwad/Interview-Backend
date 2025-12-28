import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieSession from "cookie-session";

import connectDB from "./config/db.js";
import passport from "./config/passport.js";
import authRoutes from "./routes/auth.routes.js";

// Load environment variables
dotenv.config();

// Init express
const app = express();

/* ===================== IMPORTANT (RENDER FIX) ===================== */
app.set("trust proxy", 1); // MUST be before middleware
/* ================================================================ */

// Middlewares
app.use(
  cors({
    origin: true, // or your frontend URL
    credentials: true,
  })
);

app.use(express.json());

// Cookie Session (required for OAuth state)
app.use(
  cookieSession({
    name: "session",
    keys: [process.env.SESSION_SECRET || "session_secret"],
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production", // HTTPS only in prod
  })
);

// Initialize passport (NO session persistence)
app.use(passport.initialize());
// ❌ Do NOT use passport.session()

// Routes
app.use("/auth", authRoutes);

// Health check
app.get("/", (req, res) => {
  res.send("Backend server is running 👍");
});

// Connect to DB
connectDB();

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
});
