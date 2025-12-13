const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const userAuthenticate = require('../middleware/auth');

// GET /api/bookings/my-bookings
router.get(
    '/my-bookings',
    userAuthenticate.authenticate,
    bookingController.getMyBookings // Use your controller
);

// GET /api/bookings/slots
router.get(
    '/slots',
    userAuthenticate.authenticate,
    bookingController.getAvailableSlots
);

// POST /api/bookings
router.post(
    '/create', // This matches the call to POST /api/bookings
    userAuthenticate.authenticate,
    bookingController.createBooking 
);

// PATCH /api/bookings/cancel/:bookingId
router.patch(
    '/cancel/:bookingId',
    userAuthenticate.authenticate,
    bookingController.cancelBooking
);
router.get(
  '/reviewable',
  userAuthenticate.authenticate, // User must be logged in
  bookingController.getReviewableBookings
);
// GET /api/bookings/my-bookings/all
router.get(
    '/my-bookings/all',
    userAuthenticate.authenticate,
    bookingController.getAllMyBookings
);
module.exports = router;