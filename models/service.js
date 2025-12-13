const { DataTypes } = require("sequelize");
const sequelize = require("../utilities/sql");
const Service = sequelize.define(
  "Service",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
    }, // in minutes
    price: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    available: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    startTime: {
      type: DataTypes.TIME,
      defaultValue: "09:00",
    }, // working hours start
    endTime: {
      type: DataTypes.TIME,
      defaultValue: "18:00",
    }, // working hours end
    offDays: {
      type: DataTypes.JSON,
      defaultValue: [],
    }, // e.g., ["Sunday", "2025-10-15"]
  },
  {
    timestamps: true,
  }
);
module.exports = Service;