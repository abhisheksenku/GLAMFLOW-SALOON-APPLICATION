const User = require("../models/user");
const Staff = require("../models/staff");
const Service = require("../models/service");
const Booking = require("../models/booking");

const Review = require("../models/review");
const sequelize = require("../utilities/sql");
const { Op } = require("sequelize"); 
/**
 * @desc    Create a new review for a completed booking
 * @route   POST /reviews
 * @access  Private
 */
const createReview = async (req, res) => {
  const { rating, comment, bookingId } = req.body;
  const userId = req.user.id;

  if (!rating || !bookingId) {
    return res.status(400).json({ message: 'Rating and Booking ID are required.' });
  }

  try {
    // 1. Find the booking to get the staffId
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    // 2. Security Check: Make sure this user owns this booking
    if (booking.userId !== userId) {
      return res.status(403).json({ message: 'You are not authorized to review this booking.' });
    }
    
    // 3. Check if a review already exists for this booking
    const existingReview = await Review.findOne({ where: { bookingId: bookingId } });
    if (existingReview) {
      return res.status(409).json({ message: 'You have already reviewed this booking.' });
    }

    // 4. Create the new review
    const newReview = await Review.create({
      rating,
      comment,
      bookingId,
      userId,
      staffId: booking.staffId, // Get staffId from the booking
    });

    res.status(201).json({ message: 'Thank you for your review!', review: newReview });

  } catch (error) {
    console.error("Create Review Error:", error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
/**
 * @desc    Get all reviews written by the currently logged-in user
 * @route   GET /reviews/my-reviews
 * @access  Private
 */
const getMyReviews = async (req, res) => {
  try {
    const userId = req.user.id;

    const reviews = await Review.findAll({
      where: { userId: userId },
      include: [
        // Include the booking and its details
        {
          model: Booking,
          as: 'Booking',
          include: [
            { model: Service, as: 'Service', attributes: ['name'] },
            { 
              model: Staff, 
              as: 'Staff', 
              include: { model: User, as: 'User', attributes: ['name'] } 
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json(reviews);

  } catch (error) {
    console.error("Get My Reviews Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
/**
 * @desc    Update a review written by the logged-in user
 * @route   PUT /reviews/:id
 * @access  Private
 */
const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id; // From JWT auth middleware

    // Find the review by its primary key
    const review = await Review.findByPk(id);

    // 1. Check if the review exists
    if (!review) {
      return res.status(404).json({ message: "Review not found." });
    }

    // 2. Authorization: Ensure the logged-in user is the author of the review
    if (review.userId !== userId) {
      return res.status(403).json({ message: "You are not authorized to update this review." });
    }

    // 3. Update the review with new values (if provided)
    review.rating = rating || review.rating;
    review.comment = comment || review.comment;

    await review.save();

    res.status(200).json({ message: "Review updated successfully.", review });

  } catch (error) {
    // Handle potential validation errors from the model (e.g., rating not between 1-5)
    if (error.name === 'SequelizeValidationError') {
        const messages = error.errors.map(err => err.message);
        return res.status(400).json({ message: "Validation error", errors: messages });
    }
    console.error("Update Review Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
/**
 * @desc    Delete a review written by the logged-in user
 * @route   DELETE /reviews/:id
 * @access  Private
 */
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;   // admin / staff / user

    const review = await Review.findByPk(id);
    if (!review) {
      return res.status(404).json({ message: "Review not found." });
    }

    const isAuthor = review.userId === userId;
    const isAdmin = userRole === "admin";
    const isStaffWhoReplied = review.replyByStaffId === userId;

    // Authorization check
    if (!isAuthor && !isAdmin && !isStaffWhoReplied) {
      return res.status(403).json({ message: "You are not authorized to delete this review." });
    }

    await review.destroy();
    return res.status(200).json({ message: "Review deleted successfully." });

  } catch (error) {
    console.error("Delete Review Error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getMyReviewsPaginated = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit;

    const { count, rows } = await Review.findAndCountAll({
      where: { userId },
      include: [
        {
          model: Booking,
          include: [
            {
              model: Service,
              as: "Service",
              attributes: ["name"]
            },
            {
              model: Staff,
              as: "Staff",
              include: {
                model: User,
                as: "User",
                attributes: ["name"]
              }
            }
          ]
        }
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset
    });

    return res.status(200).json({
      reviews: rows,
      currentPage: page,
      totalPages: Math.ceil(count / limit)
    });

  } catch (err) {
    console.error("Paginated Reviews Error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};


module.exports ={
    createReview,
    getMyReviews,
    updateReview,
    deleteReview,
    getMyReviewsPaginated
}