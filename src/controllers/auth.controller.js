import { signJwt as generateToken, getJwtExpiryMs } from "../utils/jwt.utils.js";
import authService from "../Services/AuthService.js";

export const signup = async (req, res) => {
  try {
    const user = await authService.registerUser(req.body);
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });


    // Set HttpOnly cookie for the JWT (recommended)
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: getJwtExpiryMs(),
    });

    res.status(201).json({
      message: "Signup successful",
      token, // included for backward compatibility
      user,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const user = await authService.loginUser(
      req.body.email,
      req.body.password
    );
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });


    // Set cookie and return token for compatibility
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: getJwtExpiryMs(),
    });

    res.json({ message: "Login successful", token, user });
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
};

export const socialAuth = async (req, res) => {
  try {
    console.log("socialAuth payload:", req.body);
    const user = await authService.socialLogin(req.body);
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });


    // Set HttpOnly cookie and return token
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: getJwtExpiryMs(),
    });

    res.json({ token, user });
  } catch (err) {
    console.error("socialAuth error:", err.message);
    res.status(400).json({ message: err.message });
  }
};

export const me = async (req, res) => {
  try {
    // `auth.middleware` sets `req.user` from the JWT
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    return res.json({ user: req.user });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// DEBUG: returns cookies received from the client (temporary helper)
export const debugCookies = (req, res) => {
  try {
    return res.json({ cookies: req.cookies });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};
