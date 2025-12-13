require("dotenv").config();

const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_NAME, // Name of your database (from .env)
  process.env.DB_USER, // Database username (from .env)
  process.env.DB_PASSWORD, // Database password (from .env)
  {
    host: process.env.DB_HOST, // Database host (localhost or remote server)
    dialect: process.env.DB_DIALECT, // Type of database (e.g., 'mysql', 'postgres', 'sqlite')
  }
);

(async () => {
  try {
    // Test the database connection
    // 'authenticate' tries to connect to the database with the provided credentials
    await sequelize.authenticate();
    console.log("Database connection established successfully."); // Success message
  } catch (error) {
    // If connection fails, log the error
    console.error("Unable to connect to the database:", error);
  }
})();

module.exports = sequelize;