const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const saltRounds = 10;
const User = require("../models/user");
const { Op } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const { sendMail } = require("../services/emailService");
const generateAccessToken = (loggeduser) => {
  const payload = {
    user: {
      id: loggeduser.id,
      role: loggeduser.role,
    },
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
};
const signupUser = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password) {
      return res
        .status(400)
        .json({ message: "Please provide all required fields." });
    }
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User with this email already exists." });
    }
    const password_hash = await bcrypt.hash(password, saltRounds);
    const newUser = await User.create({
      name,
      email,
      phone,
      password: password_hash,
    });
    res
      .status(201)
      .json({ message: "User registered successfully!", userId: newUser.id });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required." });
    }
    const loggeduser = await User.findOne({ where: { email } });
    if (!loggeduser) {
      return res.status(401).json({ message: "Invalid credentials." });
    }
    const isPasswordValid = await bcrypt.compare(password, loggeduser.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // Generate JWT token for the authenticated user
    const token = generateAccessToken(loggeduser);
    res
      .status(200)
      .cookie("token", token, {
        httpOnly: true, // Cookie not accessible via JS (prevents XSS attacks)
        secure: false, // Set true in production (HTTPS only)
        sameSite: "strict", // Prevents CSRF attacks
      })
      .json({
        message: "Login successful",
        token, // Include JWT in response body as well
        user: loggeduser,
      });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
const requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    const user = await User.findOne({ where: { email } });
    if (!user)
      return res
        .status(200) // don't reveal whether email exists
        .json({ message: "If this email exists, a reset link has been sent." });

    const token = uuidv4();
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await user.update({
      resetToken: token,
      resetTokenExpiry: expiry,
    });

    const resetLink = `http://localhost:3000/reset-password/${token}`;

    try {
      await sendMail({
        toEmail: email,
        subject: "Reset your password",
        html: `<p>Hello,</p>
               <p>You requested a password reset. Click below:</p>
               <a href="${resetLink}">Reset Password</a>
               <p>Link expires in 15 minutes.</p>`,
        text: `Visit the following link to reset your password: ${resetLink}`,
      });
    } catch (err) {
      console.error("Email sending failed:", err);
      return res.status(500).json({ error: "Failed to send reset email" });
    }

    res
      .status(200)
      .json({ message: "If this email exists, a reset link has been sent." });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// --- Reset password using token ---
const updatenewPassword = async (req, res) => {
  const { token } = req.params;
  const { newPassword, confirmPassword } = req.body;

  if (!token) return res.status(400).json({ error: "Token is required" });
  if (!newPassword || !confirmPassword)
    return res.status(400).json({ error: "All fields are required" });
  if (newPassword !== confirmPassword)
    return res.status(400).json({ error: "Passwords do not match" });

  try {
    const user = await User.findOne({
      where: {
        resetToken: token,
        resetTokenExpiry: { [Op.gt]: new Date() }, // not expired
      },
    });

    if (!user)
      return res
        .status(400)
        .json({ error: "Token expired or invalid" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await user.update({
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    });

    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
module.exports ={
    signupUser,
    loginUser,
    requestPasswordReset,
    updatenewPassword
}