// models/review.js
const { DataTypes, Op } = require("sequelize");
const sequelize = require("../utilities/sql");

const Review = sequelize.define(
  "Review",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 },
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    reply: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    replyAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    replyByStaffId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "Staffs", key: "id" },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },

    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "Users", key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    staffId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "Staffs", key: "id" },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
    serviceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "Services", key: "id" },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
    bookingId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "Bookings", key: "id" },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
  },
  {
    timestamps: true,
    indexes: [
      { fields: ["userId"] },
      { fields: ["staffId"] },
      { fields: ["serviceId"] },
      // unique constraint to prevent duplicate review per booking by same user:
      {
        unique: true,
        fields: ["bookingId", "userId"],
        where: { bookingId: { [Op.ne]: null } },
      },
    ],
  }
);

module.exports = Review;
