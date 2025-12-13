const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const reviewController = require("../controllers/reviewController");

// CREATE review
router.post(
  '/create',    // FIX
  auth.authenticate,
  reviewController.createReview
);

// GET all my reviews
router.get(
  '/my-reviews',
  auth.authenticate,
  reviewController.getMyReviews
);

// GET paginated
router.get(
  '/my-reviews/paginated',
  auth.authenticate,
  reviewController.getMyReviewsPaginated
);

// UPDATE review
router.put(
  '/:id',     // ADD
  auth.authenticate,
  reviewController.updateReview
);

// DELETE review
router.delete(
  '/:id',     // ADD
  auth.authenticate,
  reviewController.deleteReview
);

module.exports = router;
