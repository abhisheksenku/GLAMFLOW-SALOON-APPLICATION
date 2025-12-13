const { DataTypes } = require("sequelize");
const sequelize = require("../utilities/sql");

const Payment = sequelize.define("Payment", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  orderId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true, // This should be unique
  },
  paymentId: {
    type: DataTypes.STRING, // From the payment gateway
    allowNull: true,
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM("PENDING", "SUCCESSFUL", "FAILED"),
    allowNull: false,
    defaultValue: "PENDING",
  },
  
  // --- This is the link to the USER ---
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "Users",
      key: "id",
    },
  },
  
  // --- THIS IS THE CRITICAL MISSING LINK ---
  bookingId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true, // One payment per booking
    references: {
      model: "Bookings",
      key: "id",
    }
  }
});

module.exports = Payment;