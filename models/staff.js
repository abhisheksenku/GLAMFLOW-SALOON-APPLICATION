const { DataTypes } = require("sequelize");
const sequelize = require("../utilities/sql");
const Staff = sequelize.define(
  "Staff",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
    },
    specialty: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    weeklySchedule: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {
        Sunday: { isOff: true, startTime: "09:00", endTime: "17:00" },
        Monday: { isOff: false, startTime: "09:00", endTime: "17:00" },
        Tuesday: { isOff: false, startTime: "09:00", endTime: "17:00" },
        Wednesday: { isOff: false, startTime: "09:00", endTime: "17:00" },
        Thursday: { isOff: false, startTime: "09:00", endTime: "17:00" },
        Friday: { isOff: false, startTime: "09:00", endTime: "17:00" },
        Saturday: { isOff: false, startTime: "09:00", endTime: "17:00" },
      },
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
  },
  {
    timestamps: true,
  }
);
module.exports = Staff;
