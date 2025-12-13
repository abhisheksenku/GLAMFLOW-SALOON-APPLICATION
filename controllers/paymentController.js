const User = require("../models/user");
const Staff = require("../models/staff");
const Service = require("../models/service");
const Booking = require("../models/booking");
const Review = require("../models/review");
const PDFDocument = require("pdfkit");
const moment = require("moment");
const sequelize = require("../utilities/sql");
const { Op } = require("sequelize");
const Payment = require("../models/order");

const { createOrder } = require("../services/paymentService");

const { sendBookingConfirmation, sendPaymentReminderEmail } = require("../services/emailService");
const { getPaymentStatus } = require("../services/paymentService");

const initiatePayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { serviceId, staffId, date, timeSlot } = req.body;

    if (!serviceId || !staffId || !date || !timeSlot) {
      return res.status(400).json({ message: "Missing booking details." });
    }

    // Create pending booking
    const booking = await Booking.create({
      userId,
      serviceId,
      staffId,
      date,
      timeSlot,
      status: "pending",
    });

    // Create orderId for Cashfree
    const orderId = "ORD_" + booking.id + "_" + Date.now();

    // Fetch service price
    const service = await Service.findByPk(serviceId);
    const amount = service.price;

    // Create payment record
    await Payment.create({
      orderId,
      bookingId: booking.id,
      userId,
      amount,
      status: "PENDING",
    });

    // REAL CASHFREE PAYMENT SESSION ID
    const paymentSessionId = await createOrder(
      orderId,
      amount,
      "INR",
      String(userId),
      req.user.phone || "9999999999"
    );

    return res.status(200).json({
      paymentSessionId,
      orderId,
      bookingId: booking.id,
      amount
    });

  } catch (err) {
    console.error("Initiate Payment Error:", err);
    return res.status(500).json({
      message: "Payment initiation failed",
      error: err.message
    });
  }
};


/**
 * @desc    Create a payment record for a specific booking
 * @route   POST /payments/booking/:bookingId
 * @access  Private
 */
const createPaymentForBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { amount, method } = req.body;
    const userId = req.user.id; // From JWT auth middleware

    // 1. Basic input validation
    if (!amount || !method) {
      return res
        .status(400)
        .json({ message: "Please provide a payment amount and method." });
    }

    // 2. Find the booking to ensure it exists
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    // 3. Authorization: Check if the logged-in user owns the booking
    if (booking.userId !== userId) {
      return res
        .status(403)
        .json({
          message: "You are not authorized to make a payment for this booking.",
        });
    }

    // 4. Business Logic: Prevent duplicate payments for a single booking
    const existingPayment = await Payment.findOne({
      where: { bookingId: bookingId },
    });
    if (existingPayment) {
      return res
        .status(409)
        .json({
          message: "A payment has already been recorded for this booking.",
        });
    }

    // 5. Create the payment record
    const newPayment = await Payment.create({
      amount,
      method,
      status: "completed", // Or 'pending' depending on your payment gateway logic
      bookingId: booking.id,
      userId: userId,
    });

    res
      .status(201)
      .json({ message: "Payment recorded successfully.", payment: newPayment });
  } catch (error) {
    console.error("Create Payment Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
/**
 * @desc    Get all payments made by the currently logged-in user
 * @route   GET /payments/my-payments
 * @access  Private
 */
const getMyPayments = async (req, res) => {
  try {
    const userId = req.user.id;

    const payments = await Payment.findAll({
      where: { userId: userId },
      include: [
        {
          model: Booking,
          as: 'Booking',
          attributes: ['id'], // We only need the booking...
          include: {
            model: Service, // ...to find the service name
            as: 'Service',
            attributes: ['name']
          }
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json(payments);

  } catch (error) {
    console.error("Get My Payments Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
const getRevenueReport = async (req, res) => {
  try {
    // Example: Get monthly revenue for the last 12 months
    const twelveMonthsAgo = moment().subtract(12, "months").toDate();

    const monthlyRevenue = await Payment.findAll({
      attributes: [
        // Extract month and year, sum amount
        [sequelize.fn("YEAR", sequelize.col("createdAt")), "year"],
        [sequelize.fn("MONTH", sequelize.col("createdAt")), "month"],
        [sequelize.fn("SUM", sequelize.col("amount")), "totalRevenue"],
      ],
      where: {
        status: "completed",
        createdAt: {
          [Op.gte]: twelveMonthsAgo, // Filter for last 12 months
        },
      },
      group: ["year", "month"], // Group by year and month
      order: [
        ["year", "ASC"],
        ["month", "ASC"],
      ],
      raw: true, // Get plain JSON objects
    });

    // Format data for Chart.js (e.g., ["Jan 2024", "Feb 2024"], [5000, 6500])
    const labels = monthlyRevenue.map((item) => {
      // Ensure month is two digits (e.g., '01', '05', '11')
      const monthPadded = String(item.month).padStart(2, "0");
      // Create moment object using the standard YYYY-MM-DD format
      return moment(`${item.year}-${monthPadded}-01`).format("MMM YYYY");
    });
    const data = monthlyRevenue.map((item) => item.totalRevenue);

    res.status(200).json({ labels, data });
  } catch (error) {
    console.error("Revenue Report Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const handlePaymentSuccess = async (req, res) => {
  try {
    const { orderId } = req.body;

    const payment = await Payment.findOne({ where: { orderId } });
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    // Verify with Cashfree (CRITICAL FIX)
    const status = await getPaymentStatus(orderId);

    if (status !== "Success") {
      return res.status(400).json({ message: "Payment not successful" });
    }

    payment.status = "SUCCESSFUL";
    await payment.save();

    const booking = await Booking.findByPk(payment.bookingId, {
      include: [
        { model: User, as: "User", attributes: ["name", "email"] },
        { model: Service, as: "Service", attributes: ["name"] },
        {
          model: Staff,
          as: "Staff",
          include: { model: User, as: "User", attributes: ["name"] }
        }
      ]
    });

    // Confirm Booking
    booking.status = "confirmed";
    await booking.save();

    // EMAILS
    sendBookingConfirmation(booking);
    sendPaymentReminderEmail(
      booking.User.email,
      booking.User.name,
      orderId,
      booking
    );

    return res.status(200).json({ message: "Payment recorded and booking confirmed." });

  } catch (err) {
    console.error("Payment Success Handler Error:", err);
    return res.status(500).json({ message: "Error updating payment", error: err.message });
  }
};

const handlePaymentFailure = async (req, res) => {
  try {
    const { orderId } = req.body;

    const payment = await Payment.findOne({ where: { orderId } });
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    payment.status = "FAILED";
    await payment.save();

    await Booking.update(
      { status: "cancelled" },
      { where: { id: payment.bookingId } }
    );

    return res.status(200).json({ message: "Payment marked as failed and booking cancelled." });

  } catch (err) {
    console.error("Payment Failure Error:", err);
    return res.status(500).json({ message: "Error updating payment", error: err.message });
  }
};

const getMyPaymentsPaginated = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit;

    const { count, rows } = await Payment.findAndCountAll({
      where: { userId },
      include: [
        {
          model: Booking,
          as: "Booking",
          include: {
            model: Service,
            as: "Service",
            attributes: ["name"]
          }
        }
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset
    });

    return res.status(200).json({
      payments: rows,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
    });
  } catch (err) {
    return res.status(500).json({ message: "Error fetching payments", error: err.message });
  }
};


const generateInvoicePDF = async (req, res) => {
  try {
    const paymentId = req.params.id;

    const payment = await Payment.findByPk(paymentId, {
      include: [
        {
          model: Booking,
          as: "Booking",
          include: { model: Service, as: "Service" }
        }
      ]
    });

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=invoice_${paymentId}.pdf`);

    doc.fontSize(20).text("Invoice", { underline: true });
    doc.moveDown();

    doc.text(`Invoice ID: ${paymentId}`);
    doc.text(`Order ID: ${payment.orderId}`);
    doc.text(`Service: ${payment.Booking.Service.name}`);
    doc.text(`Amount: ₹${payment.amount}`);
    doc.text(`Status: ${payment.status}`);
    doc.text(`Date: ${payment.createdAt.toDateString()}`);

    doc.end();
    doc.pipe(res);

  } catch (err) {
    return res.status(500).json({ message: "Invoice generation failed", error: err.message });
  }
};

module.exports = {
  createPaymentForBooking,
  getMyPayments,
  getRevenueReport,
  initiatePayment,
handlePaymentSuccess,
handlePaymentFailure,
getMyPaymentsPaginated,
generateInvoicePDF
};