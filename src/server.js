import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import * as paymentController from "./controllers/payment.controller.js";

dotenv.config();
// Warn if critical env vars are missing (do not print secrets)
if (!process.env.JWT_SECRET) {
	console.error("Warning: JWT_SECRET is not set. Authentication will fail until configured.");
} else {
	console.log("JWT_SECRET loaded");
}

const app = express();
connectDB();
// Allow credentials (cookies) from the frontend origin
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
app.use(
	cors({
		origin: CLIENT_ORIGIN,
		credentials: true,
	})
);
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.post(
  "/api/webhook/stripe",
  express.raw({ type: "application/json" }),
  paymentController.stripeWebhook
);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
