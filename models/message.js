// models/message.js
const { DataTypes } = require("sequelize");
const sequelize = require("../utilities/sql");

const Message = sequelize.define(
  "Message",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    fromUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Users", // sender (customer or staff)
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    toUserId: {
      type: DataTypes.INTEGER,
      allowNull: true, // null → message to support team
      references: {
        model: "Users", // receiver (specific user or null)
        key: "id",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
    conversationId: {
      type: DataTypes.INTEGER,
      allowNull: false, // groups messages per chat thread
    },
  },
  {
    timestamps: true, // adds createdAt, updatedAt
    indexes: [
      { fields: ["conversationId"] },
      { fields: ["fromUserId"] },
      { fields: ["toUserId"] },
    ],
  }
);

module.exports = Message;
