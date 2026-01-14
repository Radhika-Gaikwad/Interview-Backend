import bcrypt from "bcryptjs";
import User from "../Model/User.js";

/**
 * Register with email + password
 */
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

/**
 * Login with email + password
 */
const loginUser = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user || user.authProvider !== "local") {
    throw new Error("Invalid credentials");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Invalid credentials");
  }

  return user;
};

/**
 * Normalize provider from Auth0
 */
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


/**
 * Social login (Google, LinkedIn, Microsoft, etc.)
 */
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

const authService = {
  registerUser,
  loginUser,
  socialLogin,
};

export default authService;

