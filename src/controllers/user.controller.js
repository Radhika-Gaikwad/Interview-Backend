import * as userService from "../Services/UserService.js";
import crypto from "crypto";
import User from "../Model/User.js";



/* ================= GET PROFILE (CACHEABLE) ================= */

export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // ✅ VERY LIGHT QUERY (only updatedAt)
    const meta = await User.findById(userId)
      .select("updatedAt")
      .lean();

    if (!meta) {
      return res.status(404).json({ message: "User not found" });
    }

    const etag = meta.updatedAt?.toISOString();

    // ✅ RETURN EARLY (NO FULL DB CALL)
    if (req.headers["if-none-match"] === etag) {
      return res.status(304).end(); // ⚡ ~10ms
    }

    // ❗ Only now fetch full data
    const user = await userService.getUserById(userId);

    res.set("ETag", etag);
    res.set("Cache-Control", "private, max-age=60");

    return res.json({ user });

  } catch (err) {
    return res.status(404).json({ message: err.message });
  }
};

/* ================= UPDATE PROFILE ================= */

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const updatedUser = await userService.updateUserById(
      userId,
      req.body
    );

  

    return res.json({
      message: "Profile updated successfully",
      user: updatedUser,
    });

  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

/* ================= GET USER CREDITS (CACHEABLE) ================= */

export const fetchUserCredits = async (req, res) => {
  try {
    const userId = req.user.id;

    // ✅ ONLY FETCH updatedAt + credits
    const meta = await User.findById(userId)
      .select("updatedAt credits")
      .lean();

    if (!meta) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const etag = `${meta.updatedAt?.toISOString()}-${meta.credits}`;

    // ✅ EARLY RETURN
    if (req.headers["if-none-match"] === etag) {
      return res.status(304).end(); // ⚡ no DB/service call
    }

    // ❗ Only now call service
    const data = await userService.getUserCredits(userId);

    res.set("ETag", etag);
    res.set("Cache-Control", "private, max-age=30"); // shorter for credits

    return res.status(200).json({
      success: true,
      message: "Credits fetched successfully",
      data,
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};