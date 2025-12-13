const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const userAuthenticate = require('../middleware/auth');
// Only admins can create, update, or delete services
router.post("/create", userAuthenticate.authenticate, userAuthenticate.admin, serviceController.createService);
router.put("/update/:id", userAuthenticate.authenticate, userAuthenticate.admin, serviceController.updateService);
router.patch("/update/:id/availability", userAuthenticate.authenticate, userAuthenticate.admin, serviceController.updateServiceAvailability);
router.delete("/delete/:id", userAuthenticate.authenticate, userAuthenticate.admin, serviceController.deleteService);

// Anyone authenticated can view services
router.get("/fetch", userAuthenticate.authenticate, serviceController.getAllServices);
router.get("/fetch/:id", userAuthenticate.authenticate, serviceController.getServicebyId);
module.exports = router;