// models/User.js
import mongoose from "mongoose";

const socialSchema = new mongoose.Schema({
  provider: String, // 'google' | 'facebook' | 'linkedin' | 'microsoft' etc.
  id: String,
  email: String,
  name: String,
  avatar: String,
});

const userSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  password: { type: String }, // hashed password for local auth
  role: { type: String, default: "user" },
  resumeUrl: { type: String },
  socials: [socialSchema], // store multiple provider records
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
export default User;
