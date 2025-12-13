const { DataTypes } = require("sequelize");
const sequelize = require("../utilities/sql");

const StaffService = sequelize.define(
  "StaffService",
  {},
  {
    
    timestamps: true,
  }
);

module.exports = StaffService;
