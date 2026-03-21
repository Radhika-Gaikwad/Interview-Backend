import * as userService from "../Services/UserService.js";

/**
 * GET /api/users/me
 * Get logged-in user profile
 */
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;   // ✅ FIX

    const user = await userService.getUserById(userId);

    res.json({ user });
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;   // ✅ FIX

    const updatedUser = await userService.updateUserById(
      userId,
      req.body
    );

    res.json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const fetchUserCredits = async (req, res) => {
  try {
    const userId = req.user.id;

    const data = await userService.getUserCredits(userId);

    res.status(200).json({
      success: true,
      message: "Credits fetched successfully",
      data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

