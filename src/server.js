import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import sessionRoutes from "./routes/session.routes.js";
import resumeRoutes from "./routes/resume.routes.js";
import * as paymentController from "./controllers/payment.controller.js";
import uploadRoutes from "./routes/upload.routes.js";

if (process.env.NODE_ENV !== "production") {
  const dotenv = await import("dotenv");
  dotenv.config();
}

// Warn if critical env vars are missing (do not print secrets)
if (!process.env.JWT_SECRET) {
  console.error("Warning: JWT_SECRET is not set. Authentication will fail until configured.");
} else {
  console.log("JWT_SECRET loaded");
}

const app = express();
connectDB();
const allowedOrigins = [
  "http://localhost:5173",
  "https://34.54.116.200.nip.io",
  "https://interview-user.onrender.com"
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow REST tools, curl, server-to-server
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/resume", resumeRoutes);
app.get("/api/test", (req, res) => {
  res.json({ msg: "Backend is alive!" });
});
app.use("/api/upload", uploadRoutes);

app.post(
  "/api/webhook/stripe",
  express.raw({ type: "application/json" }),
  paymentController.stripeWebhook
);


const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));

