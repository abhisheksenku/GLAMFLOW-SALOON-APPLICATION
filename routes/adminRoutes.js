const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const serviceController = require('../controllers/serviceController');
const reviewController = require('../controllers/reviewController');
const paymentController = require('../controllers/paymentController');
const staffController = require("../controllers/staffController");
const bookingController = require("../controllers/bookingController");
const userAuthenticate = require("../middleware/auth");
router.get('/fetch/users',userAuthenticate.authenticate,userAuthenticate.admin,adminController.getAllUsers);
router.get('/fetch/staffs',userAuthenticate.authenticate,userAuthenticate.admin,adminController.getAllStaff);
router.get('/fetch/services',userAuthenticate.authenticate,userAuthenticate.admin,adminController.getAllServicesAdmin);
// router.get('/fetch/bookings',userAuthenticate.authenticate,userAuthenticate.admin,adminController.getAllBookings);
router.get('/fetch/payments',userAuthenticate.authenticate,userAuthenticate.admin,adminController.getAllPayments);
// router.get('/fetch/reviews',userAuthenticate.authenticate,userAuthenticate.admin,adminController.getAllReviews);
router.get('/users/:id',userAuthenticate.authenticate,userAuthenticate.admin,adminController.getUserById);
router.put('/users/update/:id',userAuthenticate.authenticate,userAuthenticate.admin,adminController.adminUpdateUser);
router.delete('/users/:id/deactivate',userAuthenticate.authenticate,userAuthenticate.admin,adminController.deleteUser);
router.post('/users/:id/restore',userAuthenticate.authenticate,userAuthenticate.admin,adminController.restoreUser);

router.post("/services/create", userAuthenticate.authenticate, userAuthenticate.admin, serviceController.createService);
router.put("/services/update/:id", userAuthenticate.authenticate, userAuthenticate.admin, serviceController.updateService);
router.patch("/services/update/:id/availability", userAuthenticate.authenticate, userAuthenticate.admin, serviceController.updateServiceAvailability);
router.delete("/services/delete/:id",userAuthenticate.authenticate,userAuthenticate.admin,serviceController.deleteService);
router.delete("/reviews/delete/:id",userAuthenticate.authenticate,userAuthenticate.admin,reviewController.deleteReview);

router.get("/reports/revenue", userAuthenticate.authenticate, userAuthenticate.admin,paymentController.getRevenueReport)

router.put("/update/staff/:id",userAuthenticate.authenticate,userAuthenticate.admin,staffController.adminUpdateStaffProfile )
router.get('/staff/:id',
    userAuthenticate.authenticate,
    userAuthenticate.admin,
    staffController.getStaffById 
);
router.delete('/staff/role/:id', userAuthenticate.authenticate, userAuthenticate.admin, adminController.removeStaffRole);
router.patch('/bookings/:bookingId/status',
    userAuthenticate.authenticate,
    userAuthenticate.admin,
    bookingController.updateBookingStatus
);
router.put('/bookings/:bookingId',
    userAuthenticate.authenticate,
    userAuthenticate.admin,
    bookingController.updateBooking 
);
router.post('/bookings/create',
    userAuthenticate.authenticate,
    userAuthenticate.admin,
    adminController.createBooking 
);
router.get('/services/:serviceId/staff',
    userAuthenticate.authenticate,
    userAuthenticate.admin,
    staffController.getStaffByService
);
router.get(
  '/dashboard/stats',
  userAuthenticate.authenticate,
  userAuthenticate.admin,
  adminController.getDashboardStats
);
router.get("/fetch/bookings", userAuthenticate.authenticate,userAuthenticate.admin, adminController.getPaginatedBookings);
router.get("/fetch/reviews", userAuthenticate.authenticate,userAuthenticate.admin, adminController.getPaginatedReviews);


module.exports = router;