const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const reviewController = require('../controllers/reviewController');
const paymentController = require('../controllers/paymentController');
const staffController = require("../controllers/staffController");
const bookingController = require("../controllers/bookingController");
const userAuthenticate = require('../middleware/auth');
const userController = require("../controllers/userController");


router.get('/my-services',userAuthenticate.authenticate,userAuthenticate.staff, staffController.getStaffServices);
router.get(
    '/profile', 
    userAuthenticate.authenticate, 
    userAuthenticate.staff, 
    staffController.getStaffProfile 
);
router.get(
    '/bookings', 
    userAuthenticate.authenticate, 
    userAuthenticate.staff, 
    bookingController.getStaffBookings 
);
router.get(
    '/reviews', 
    userAuthenticate.authenticate, 
    userAuthenticate.staff, 
    staffController.getReviewsForStaff 
);

router.put(
    '/profile/update', 
    userAuthenticate.authenticate, 
    userAuthenticate.staff, 
    staffController.updateMyStaffProfile 
);
router.put(
    '/update-password',
    userAuthenticate.authenticate,
    userAuthenticate.staff,
    userController.updatePassword 
);
router.patch(
    '/bookings/:bookingId/status',
    userAuthenticate.authenticate,
    userAuthenticate.staff,
    bookingController.updateMyBookingStatus 
);
router.patch(
    '/bookings/:bookingId',
    userAuthenticate.authenticate,
    userAuthenticate.staff,
    bookingController.rescheduleMyBooking 
);
router.patch(
    '/bookings/:bookingId/notes',
    userAuthenticate.authenticate,
    userAuthenticate.staff,
    bookingController.updateMyBookingNotes 
);
router.get(
    '/clients/:clientId',
    userAuthenticate.authenticate,
    userAuthenticate.staff,
    staffController.getMyClientDetails 
);
router.put(
    '/availability',
    userAuthenticate.authenticate,
    userAuthenticate.staff,
    staffController.updateMyAvailability 
);
router.get(
    '/clients',
    userAuthenticate.authenticate,
    userAuthenticate.staff,
    staffController.getAllClients // <-- 2. Use the new controller
);
router.post(
    '/bookings',
    userAuthenticate.authenticate,
    userAuthenticate.staff,
    staffController.createBookingByStaff // <-- 2. Use the new controller
);
router.get(
    '/my-clients',
    userAuthenticate.authenticate,
    userAuthenticate.staff,
    staffController.getMyClientsPaginated // <-- 2. USE
);
router.post(
    '/clients',
    userAuthenticate.authenticate,
    userAuthenticate.staff,
    staffController.createClientByStaff // <-- 2. USE
);
router.get(
    '/fetch',
    userAuthenticate.authenticate,
    staffController.getAllStaff // <-- 2. USE
);
router.post("/reviews/:id/reply", 
    userAuthenticate.authenticate,
    userAuthenticate.staff, staffController.replyToReview);

module.exports = router;