// In routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const userAuthenticate = require('../middleware/auth'); 

// 1. Import the controller file
const paymentController = require('../controllers/paymentController');

// --- Routes for Customer Booking Flow ---

// POST /api/payments/pay
// (Called when "Book Now" is clicked)
router.post(
  '/initiate-payment',
  userAuthenticate.authenticate, 
  paymentController.initiatePayment // Use the correct controller
);

// POST /api/payments/payment-success
// (Called by frontend after Cashfree modal is successful)
router.post(
  '/payment-success',
  userAuthenticate.authenticate, 
  paymentController.handlePaymentSuccess // Use the correct controller
);

// POST /api/payments/payment-failed
// (Called by frontend if Cashfree modal fails)
router.post(
  '/payment-failed',
  userAuthenticate.authenticate, 
  paymentController.handlePaymentFailure // Use the correct controller
);

// --- Routes for Dashboard/History Pages ---

// GET /api/payments/my-payments
// (Called by complete.js to fill the "Payment History" page)
router.get(
  '/my-payments',
  userAuthenticate.authenticate,
  paymentController.getMyPayments
);

// GET /api/payments/reports/revenue (Moved from adminRoutes)
// (Called by admin.js to fill the revenue chart)
router.get(
  '/reports/revenue', 
  userAuthenticate.authenticate, 
  userAuthenticate.admin, // This is an admin-only route
  paymentController.getRevenueReport
);
router.get(
  "/my-payments/paginated",
  userAuthenticate.authenticate,
  paymentController.getMyPaymentsPaginated
);
router.get("/:id/invoice/pdf", userAuthenticate.authenticate, paymentController.generateInvoicePDF);


module.exports = router;