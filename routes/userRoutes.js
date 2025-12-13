const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const userAuthenticate = require("../middleware/auth");

// GET /api/users/profile
router.get(
  "/profile",
  userAuthenticate.authenticate,
  userController.getProfile 
);

// PUT /api/users/profile
router.put(
  "/profile",
  userAuthenticate.authenticate,
  userController.updateUserProfile // Assuming this is your update function
);

// PUT /api/users/update-password
router.put(
  "/update-password", // Changed from /profile/update-password/me
  userAuthenticate.authenticate,
  userController.updatePassword
);

// DELETE /api/users/profile
router.delete(
  "/profile", // Changed from /profile/delete/me
  userAuthenticate.authenticate,
  userController.deleteAccount
);
router.get(
  '/dashboard-stats',
  userAuthenticate.authenticate,
  userController.getDashboardStats // <-- 2. USE
);
module.exports = router;