const { DataTypes } = require("sequelize");
const sequelize = require("../utilities/sql");

const Booking = sequelize.define(
  "Booking",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    timeSlot: {
      type: DataTypes.STRING, // e.g. "10:30-11:00"
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("pending", "confirmed", "completed", "cancelled"),
      defaultValue: "pending",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    staffId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Staffs",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    serviceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "Services",
        key: "id",
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = Booking;
