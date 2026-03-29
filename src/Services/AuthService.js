import bcrypt from "bcryptjs";
import User from "../Model/User.js";
import crypto from "crypto";
import { sendOtpEmail } from "../utils/sendEmail.js";


const registerUser = async (data) => {
  const existingUser = await User.findOne({ email: data.email });
  if (existingUser) {
    throw new Error("Email already registered");
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const user = await User.create({
    fullName: data.fullName,
    email: data.email,
    password: hashedPassword,
    role: data.role || "Job Seeker",
    authProvider: "local",
  });

  return user;
};


const loginUser = async (email, password) => {

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    throw new Error("Invalid credentials");
  }

  if (!user.password) {
    throw new Error("Please login using Google or reset password");
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new Error("Invalid credentials");
  }

  return user;
};

const normalizeProvider = (provider) => {
  if (!provider) return "local";
  const p = provider.toLowerCase();

  if (p.includes("google")) return "google";
  if (p.includes("github")) return "github";
  if (p.includes("linkedin")) return "linkedin";
  if (p.includes("windowslive") || p.includes("microsoft"))
    return "microsoft";

  return "local";
};

const socialLogin = async ({ email, name, provider, providerId }) => {
  if (!email) {
    throw new Error("Email is required for social login");
  }

  const authProvider = normalizeProvider(provider);

  let user = await User.findOne({ email });

  // 🔹 First-time social login
  if (!user) {
    console.log("Creating user with provider:", authProvider);
    user = await User.create({
      email,
      fullName: name || email.split("@")[0], // ✅ REQUIRED FIELD SAFE
      role: "Job Seeker",                    // ✅ HARD-CODE DEFAULT ROLE
      authProvider,
      authProviderId: providerId,
    });

    return user;
  }

  // 🔹 Existing user but provider not set (edge case)
  if (!user.authProvider || user.authProvider === "local") {
    user.authProvider = authProvider;
    user.authProviderId = providerId;
    await user.save();
  }

  return user;
};


export const changePassword = async (userId, newPassword) => {
  const user = await User.findById(userId).select("+password");
  if (!user) throw new Error("User not found");

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  user.password = hashedPassword;

  await user.save();
};

export const resetPasswordWithOtp = async (email, otp, newPassword) => {
  const user = await User.findOne({
    email,
    resetOtp: otp,
    resetOtpExpiry: { $gt: Date.now() },
  }).select("+password");

  if (!user) throw new Error("Invalid or expired OTP");

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  user.password = hashedPassword;

  // ⭐ allow password login
  user.authProvider = "local";
  user.authProviderId = undefined;

  user.resetOtp = undefined;
  user.resetOtpExpiry = undefined;

  await user.save();
};

export const forgotPassword = async (email) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error("User not found");
  }

  const otp = crypto.randomInt(100000, 999999).toString();

  user.resetOtp = otp;
  user.resetOtpExpiry = Date.now() + 10 * 60 * 1000; // 10 min

  await user.save();

  await sendOtpEmail(email, otp);
};

const authService = {
  registerUser,
  loginUser,
  socialLogin,
  changePassword,
  forgotPassword,
  resetPasswordWithOtp,
};

export default authService;

