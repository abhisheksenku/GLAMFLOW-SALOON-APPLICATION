const jwt = require("jsonwebtoken");
const User = require("../models/user");
require("dotenv").config();

const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header or cookies
    let token = req.header("Authorization") || req.cookies.token;
    if (token && token.startsWith("Bearer ")) {
      token = token.slice(7); // remove 'Bearer ' prefix
    }
    console.log("Token received:", token);

    if (!token) {
      // return res.redirect("/login"); // or use res.status(401).json({ message: 'No token provided' });
      return res.status(401).json({ message: "No token provided" });
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded JWT:", decoded);

    // Extract userId from token
    const userId = decoded.user.id;
    const user = await User.findByPk(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    req.user = user; // attach user to request object
    next();
  } catch (error) {
    console.error("Authentication error:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token expired" });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    res.status(500).json({ success: false, message: "Authentication failed" });
  }
};
// Middleware to check for admin role
const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Not authorized as an admin" });
  }
};
const staff = async (req, res, next) => {
  if (req.user && req.user.role === "staff") {
    next();
  } else {
    res.status(403).json({ message: "Not authorized as staff" });
  }
};
module.exports = { authenticate, admin, staff };