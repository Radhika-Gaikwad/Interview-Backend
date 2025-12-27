import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieSession from "cookie-session";

import connectDB from "./config/db.js";
import passport from "./config/passport.js";   // initializes strategies
import authRoutes from "./routes/auth.routes.js";

// Load environment variables
dotenv.config();

// Init express
const app = express();

// Middlewares
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());


// Cookie Session
app.use(
  cookieSession({
    name: "session",
    keys: [process.env.SESSION_SECRET || "session_secret"],
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  })
);

// Initialize passport
app.use(passport.initialize());

// NOTE: do NOT use passport.session() unless you want persistent login sessions
// app.use(passport.session());

// Routes
app.use("/auth", authRoutes);

// Default route
app.get("/", (req, res) => {
  res.send("Backend server is running 👍");
});

// Connect to DB
connectDB();

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
