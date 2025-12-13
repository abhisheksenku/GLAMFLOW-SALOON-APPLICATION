// runSeed.js (or in your main server start file temporarily)
const createAdmin = require("../seed/createAdmin");

createAdmin()
  .then(() => {
    console.log("Default admin created");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error creating admin:", err);
    process.exit(1);
  });