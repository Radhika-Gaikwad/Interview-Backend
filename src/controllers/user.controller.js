import * as userService from "../Services/UserService.js";
import redis from "../config/redis.js";

/* ================= CACHE HELPERS ================= */

// Clear user cache (used after update + payment)
const clearUserCache = async (userId) => {
  try {
    const keys = await redis.keys(`user:${userId}*`);
    if (keys.length) {
      await redis.del(keys);
    }
  } catch (err) {
    console.error("User cache clear error:", err);
  }
};

/* ================= GET PROFILE (CACHEABLE) ================= */

export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await userService.getUserById(userId);

    // Optional CDN/browser cache
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

    // ❗ Invalidate cache after update
    await clearUserCache(userId);

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

    const data = await userService.getUserCredits(userId);

    // Optional CDN/browser cache
    res.set("Cache-Control", "private, max-age=60");

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