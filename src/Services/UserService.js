import User from "../Model/User.js";

/**
 * Get user profile by ID
 */
export const getUserById = async (userId) => {
  const user = await User.findById(userId).select("-password");
  if (!user) {
    throw new Error("User not found");
  }
  return user;
};

/**
 * Update user profile
 */
export const updateUserById = async (userId, updateData) => {
  const allowedUpdates = [
    "fullName",
    "role",
    "resumeUrl",
    "onboardingCompleted",
  ];

  const filteredData = {};
  allowedUpdates.forEach((key) => {
    if (updateData[key] !== undefined) {
      filteredData[key] = updateData[key];
    }
  });

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: filteredData },
    { new: true, runValidators: true }
  ).select("-password");

  if (!updatedUser) {
    throw new Error("User not found");
  }

  return updatedUser;
};
