const bcrypt = require("bcrypt");
const saltRounds = 10;
const User = require("../models/user");
const Staff = require("../models/staff");
const Service = require("../models/service");
const Booking = require("../models/booking");
const Payment = require("../models/order");
const Review = require("../models/review");
const { Op } = require("sequelize");
const sequelize = require("../utilities/sql");
/**
 * @description Get the profile of the currently logged-in user
 * @route GET /api/user/profile/me
 * @access Private
 */
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id; //we get this from JWT middleware
    const user = await User.findByPk(userId, {
      attributes: ["id", "name", "email", "phone", "role", "createdAt"],
      include: {
        model: Staff,
        as: "Staff",
      },
    });
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, phone } = req.body;

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (email && email !== user.email) {
      const existingUser = await User.findOne({
        where: {
          email: email,
          id: { [Op.ne]: userId }, // Check for an email that is NOT owned by the current user
        },
      });

      if (existingUser) {
        return res
          .status(409)
          .json({ message: "Email address is already in use." });
      }
      user.email = email; // Only update if the check passes
    }
    user.name = name || user.name;
    user.phone = phone || user.phone;

    await user.save();
    const safeUserResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };
    res.status(200).json({
      message: "Profile updated successfully",
      user: safeUserResponse,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
/**
 * Allows a logged-in user to update their own password.
 */
const updatePassword = async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword, confirmPassword } = req.body;

  // 1. Validation
  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: "All fields are required." });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "New passwords do not match." });
  }
  if (newPassword.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters." });
  }

  try {
    // 2. Find the user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // 3. Check their current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current password." });
    }

    // 4. Hash and save the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Update Password Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.user.id;
    if (!password) {
      return res
        .status(400)
        .json({ message: "Password is required to confirm account deletion." });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Incorrect password. Account deletion failed." });
    }
    await user.destroy();
    res
      .status(200)
      .json({ message: "Your account has been successfully deleted." });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
/**
 * Gets stats for the customer's dashboard (home page).
 */
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Get total payment amount this month
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const paymentStats = await Payment.findOne({
      where: {
        userId: userId,
        status: "completed",
        createdAt: {
          [Op.between]: [startOfMonth, endOfMonth],
        },
      },
      attributes: [
        [sequelize.fn("SUM", sequelize.col("amount")), "totalAmount"],
      ],
      raw: true,
    });

    // 2. Get review count and average rating
    const reviewStats = await Review.findOne({
      where: { userId: userId },
      attributes: [
        [sequelize.fn("COUNT", sequelize.col("id")), "totalReviews"],
        [sequelize.fn("AVG", sequelize.col("rating")), "averageRating"],
      ],
      raw: true,
    });

    // --- 3. THIS IS THE CORRECTED PART ---
    // Safely check if the stats objects exist before reading them
    const totalPayments =
      paymentStats && paymentStats.totalAmount
        ? parseFloat(paymentStats.totalAmount)
        : 0;

    const totalReviews =
      reviewStats && reviewStats.totalReviews
        ? parseInt(reviewStats.totalReviews, 10)
        : 0;

    const avgRating =
      reviewStats && reviewStats.averageRating
        ? parseFloat(reviewStats.averageRating).toFixed(1)
        : "0.0";

    // 4. Send all stats as one object
    res.status(200).json({
      totalPaymentsThisMonth: totalPayments,
      totalReviews: totalReviews,
      averageRating: avgRating,
    });
  } catch (error) {
    console.error("Get Dashboard Stats Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
module.exports = {
  getProfile,
  updateUserProfile,
  updatePassword,
  deleteAccount,
  getDashboardStats,
};
