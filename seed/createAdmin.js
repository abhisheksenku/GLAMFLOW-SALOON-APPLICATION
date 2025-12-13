const bcrypt = require("bcrypt");
const User = require("../models/user");

const createAdmin = async () => {
  const passwordHash = await bcrypt.hash("Admin@123", 10);
  await User.create({
    name: "Super Admin",
    email: "admin@example.com",
    phone: "9999999999",
    password: passwordHash,
    role: "admin",
  });
};
module.exports = createAdmin;