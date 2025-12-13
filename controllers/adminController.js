const User = require("../models/user");
const Staff = require("../models/staff");
const Service = require("../models/service");
const Booking = require("../models/booking");
const Review = require("../models/review");
const Payment = require("../models/order");  

const sequelize = require("../utilities/sql");
const { Op } = require("sequelize");
const adminUpdateUser = async (req, res) => {
  // Start a transaction
  const t = await sequelize.transaction();
  try {
    const { id: userId } = req.params;
    const { name, email, phone, role } = req.body;

    // 1. Find the user within the transaction and lock the row for updates
    const user = await User.findByPk(userId, { transaction: t, lock: true });
    if (!user) {
      await t.rollback(); // No need to continue, so roll back
      return res.status(404).json({ message: "User not found" });
    }

    const previousRole = user.role;

    // 2. Perform email uniqueness validation (from the original adminUpdateUser)
    if (email && email !== user.email) {
      const existingUser = await User.findOne({
        where: { email, id: { [Op.ne]: userId } },
        transaction: t, // Perform check within the transaction
      });
      if (existingUser) {
        await t.rollback();
        return res
          .status(409)
          .json({ message: "Email is already in use by another account." });
      }
      user.email = email;
    }

    // 3. Apply all updates
    user.name = name || user.name;
    user.phone = phone || user.phone;
    if (role && ["customer", "staff", "admin"].includes(role)) {
      user.role = role;
    }

    // 4. Handle side-effects of role change
    if (user.role === "staff" && previousRole !== "staff") {
      // Use the cleaner findOrCreate method
      await Staff.findOrCreate({
        where: { userId: user.id },
        transaction: t,
      });
    } else if (user.role !== "staff" && previousRole === "staff") {
      const staffProfile = await Staff.findOne({
        where: { userId: user.id },
        transaction: t,
      });
      if (staffProfile) {
        await staffProfile.destroy({ transaction: t });
      }
    }

    // 5. Save the updated user record
    await user.save({ transaction: t });

    // 6. If everything succeeded, commit the transaction
    await t.commit();

    res.status(200).json({
      message: "User updated successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    // 7. If any step failed, roll back all database changes
    await t.rollback();
    console.error("Admin Update User Error:", error);
    res.status(500).json({
      message: "Server error during user update.",
      error: error.message,
    });
  }
};

/**
 * @desc    Get a list of all payments with associated user and booking details (Admin)
 * @route   GET /admin/payments
 * @access  Private/Admin
 */
const getAllPayments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const search = req.query.search || "";
    const offset = (page - 1) * limit;

    const where = search ? { orderId: { [Op.like]: `%${search}%` } } : {};

    const { count, rows } = await Payment.findAndCountAll({
      where,
      offset,
      limit,
      order: [["createdAt", "DESC"]],
      include: [
        { model: User, as: "User", attributes: ["name", "email"] },
        {
          model: Booking,
          as: "Booking",
          include: [{ model: Service, as: "Service" }],
        },
      ],
    });

    res.status(200).json({
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
      payments: rows,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Get a list of all reviews with associated user, service, and staff details (Admin)
 * @route   GET /admin/reviews
 * @access  Private/Admin
 */
const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.findAll({
      // Order by the most recent reviews first
      order: [["createdAt", "DESC"]],
      include: [
        {
          // Include the User (customer) who wrote the review
          model: User,
          as: "User",
          attributes: ["id", "name", "email"],
        },
        {
          // Include the Service being reviewed
          model: Service,
          as: "Service",
          attributes: ["id", "name"],
        },
        {
          // Include the Staff member being reviewed
          model: Staff,
          as: "Staff",
          include: [
            {
              // And the staff member's user details (their name)
              model: User,
              as: "User",
              attributes: ["id", "name"],
            },
          ],
          attributes: { exclude: ["createdAt", "updatedAt"] },
        },
      ],
    });

    res.status(200).json(reviews);
  } catch (error) {
    console.error("Get All Reviews Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
/**
 * @desc    Delete a review by its ID (Admin)
 * @route   DELETE /admin/reviews/:id
 * @access  Private/Admin
 */
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const review = await Review.findByPk(id);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    await review.destroy();

    res.status(200).json({ message: "Review deleted successfully" });
  } catch (error) {
    console.error("Delete Review Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
/**
 * @desc    Create a booking on behalf of a customer (Admin)
 * @route   POST /admin/bookings
 * @access  Private/Admin
 */
const createAdminBooking = async (req, res) => {
  try {
    const { userId, staffId, serviceId, date, timeSlot } = req.body;

    // 1. Basic input validation
    if (!userId || !staffId || !serviceId || !date || !timeSlot) {
      return res.status(400).json({
        message:
          "Please provide all required fields: userId, staffId, serviceId, date, and timeSlot.",
      });
    }

    // 2. Check for booking conflicts to prevent double booking
    const existingBooking = await Booking.findOne({
      where: {
        staffId: staffId,
        date: date,
        timeSlot: timeSlot,
      },
    });

    if (existingBooking) {
      return res.status(409).json({
        message:
          "This time slot is already booked for the selected staff member.",
      });
    }

    // 3. Create the new booking
    const newBooking = await Booking.create({
      userId,
      staffId,
      serviceId,
      date,
      timeSlot,
      status: "confirmed", // Admin-created bookings can be confirmed by default
    });

    res.status(201).json({
      message: "Booking created successfully.",
      booking: newBooking,
    });
  } catch (error) {
    console.error("Create Booking Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
/**
 * @desc    Manually create a reminder for a specific booking (Admin)
 * @route   POST /admin/reminders/manual
 * @access  Private/Admin
 */
const createManualReminder = async (req, res) => {
  try {
    const { bookingId, message, sendAt } = req.body;

    // 1. Validate input
    if (!bookingId || !message || !sendAt) {
      return res
        .status(400)
        .json({ message: "Please provide bookingId, message, and sendAt." });
    }

    // 2. Find the associated booking to get the userId and ensure it exists
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    // 3. Create the reminder, associating it with the correct user and booking
    const reminder = await Reminder.create({
      bookingId: booking.id,
      userId: booking.userId,
      message,
      sendAt,
      status: "pending",
    });

    res
      .status(201)
      .json({ message: "Reminder created successfully", reminder });
  } catch (error) {
    console.error("Create Manual Reminder Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
/**
 * @desc    Unassign a service from a staff member (Admin)
 * @route   DELETE /admin/staff/:staffId/services/:serviceId
 * @access  Private/Admin
 */
const unassignServiceFromStaff = async (req, res) => {
  try {
    const { staffId, serviceId } = req.params;

    // Find the specific entry in the join table (StaffService)
    const association = await StaffService.findOne({
      where: {
        StaffId: staffId,
        ServiceId: serviceId,
      },
    });

    if (!association) {
      return res.status(404).json({
        message: "Service assignment not found for this staff member.",
      });
    }

    // Delete the association
    await association.destroy();

    res
      .status(200)
      .json({ message: "Service successfully unassigned from staff member." });
  } catch (error) {
    console.error("Unassign Service From Staff Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
/**
 * @desc    Get a list of all users (Admin)
 * @route   GET /admin/users
 * @access  Private/Admin
 */
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";
    const status = req.query.status || "";

    let where = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      offset,
      limit,
      order: [["createdAt", "DESC"]],
      attributes: { exclude: ["password", "resetToken", "resetTokenExpiry"] },
    });

    res.status(200).json({
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
      users: rows,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Get a single user by their ID (Admin)
 * @route   GET /admin/users/:id
 * @access  Private/Admin
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id, {
      // Exclude sensitive information
      attributes: { exclude: ["password", "resetToken", "resetTokenExpiry"] },
      include: [
        {
          // Include the Staff model if a user has a staff profile
          model: Staff,
          as: "Staff",
          required: false,
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const bookings = await Booking.findAll({
      where: { userId: id },
      include: [{ model: Service, as: "Service", attributes: ["name"] }],
    });

    res.status(200).json({
      user: user, // The user object (with Staff nested)
      bookings: bookings, // The list of bookings
      staffProfile: user.Staff, // Send staff profile separately too (as in your code)
    });
  } catch (error) {
    console.error("Get User By ID Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
/**
 * @desc    Delete a user by their ID (Admin)
 * @route   DELETE /admin/users/:id
 * @access  Private/Admin
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Thanks to the 'onDelete: CASCADE' in our User-Staff association,
    // deleting the user will automatically delete their associated staff profile.
    await user.destroy();

    res.status(200).json({ message: "User account has been deactivated." });
  } catch (error) {
    console.error("Delete User Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
// ==========================
const getAllStaff = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const offset = (page - 1) * limit;

    const { count, rows } = await Staff.findAndCountAll({
      offset,
      limit,
      order: [["createdAt", "DESC"]],
      include: [
        { model: User, as: "User", attributes: ["name", "email"] },
        { model: Service, as: "Services", through: { attributes: [] } }
      ],
    });

    res.status(200).json({
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
      staff: rows,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Promote a user to the 'staff' role (Admin)
 * @route   POST /admin/users/:id/promote-to-staff
 * @access  Private/Admin
 */
const promoteUserToStaff = async (req, res) => {
  // Use a transaction to ensure both operations (update User, create Staff) succeed or fail together.
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;

    // 1. Find the user within the transaction
    const user = await User.findByPk(id, { transaction: t });

    if (!user) {
      await t.rollback();
      return res.status(404).json({ message: "User not found." });
    }

    // 2. Check if the user is already a staff member to prevent errors
    if (user.role === "staff") {
      await t.rollback();
      return res
        .status(409)
        .json({ message: "User is already a staff member." });
    }

    // 3. Update the user's role and save the change
    user.role = "staff";
    await user.save({ transaction: t });

    // 4. Create the associated Staff profile
    // This uses default values from your Staff model unless you pass them in the body
    await Staff.create(
      {
        userId: user.id,
      },
      { transaction: t }
    );

    // 5. If all operations were successful, commit the transaction
    await t.commit();

    res.status(200).json({ message: "User successfully promoted to staff." });
  } catch (error) {
    // 6. If any operation fails, roll back all changes
    await t.rollback();
    console.error("Promote User To Staff Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
/**
 * @desc    Get key dashboard statistics (Admin)
 * @route   GET /admin/dashboard/stats
 * @access  Private/Admin
 */
const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Promise.all allows us to run all these queries in parallel for efficiency
    const [
      totalUsers,
      totalStaff,
      totalBookings,
      totalRevenue,
      newUsersThisMonth,
      bookingsThisMonth,
    ] = await Promise.all([
      User.count(),
      Staff.count(),
      Booking.count(),
      Payment.sum("amount", { where: { status: "completed" } }),
      User.count({ where: { createdAt: { [Op.gte]: firstDayOfMonth } } }),
      Booking.count({ where: { createdAt: { [Op.gte]: firstDayOfMonth } } }),
    ]);

    res.status(200).json({
      totalUsers,
      totalStaff,
      totalBookings,
      totalRevenue: totalRevenue || 0, // Handle case where there are no payments
      newUsersThisMonth,
      bookingsThisMonth,
    });
  } catch (error) {
    console.error("Get Dashboard Stats Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
/**
 * @desc    Generate a revenue report for a given date range (Admin)
 * @route   GET /admin/reports/revenue
 * @access  Private/Admin
 */
const getRevenueReport = async (req, res) => {
  try {
    // Look for startDate and endDate in query params, e.g., /revenue?startDate=2025-01-01&endDate=2025-01-31
    const { startDate: startDateString, endDate: endDateString } = req.query;

    // Default to the last 30 days if no date range is provided
    let endDate = endDateString ? new Date(endDateString) : new Date();
    let startDate = startDateString ? new Date(startDateString) : new Date();
    if (!startDateString) {
      startDate.setDate(endDate.getDate() - 30);
    }

    // Set time to end of the day for accurate 'between' query
    endDate.setHours(23, 59, 59, 999);

    const whereClause = {
      status: "completed",
      createdAt: {
        [Op.between]: [startDate, endDate],
      },
    };

    // Calculate the total revenue for the entire period
    const totalRevenue = await Payment.sum("amount", { where: whereClause });

    // Get a breakdown of revenue grouped by day
    const revenueByDay = await Payment.findAll({
      where: whereClause,
      attributes: [
        [sequelize.fn("date", sequelize.col("createdAt")), "date"],
        [sequelize.fn("sum", sequelize.col("amount")), "dailyRevenue"],
      ],
      group: [sequelize.fn("date", sequelize.col("createdAt"))],
      order: [[sequelize.fn("date", sequelize.col("createdAt")), "ASC"]],
      raw: true,
    });

    res.status(200).json({
      reportPeriod: {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      },
      totalRevenue: totalRevenue || 0,
      dailyBreakdown: revenueByDay,
    });
  } catch (error) {
    console.error("Get Revenue Report Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
/**
 * @desc    Generate a staff performance report (Admin)
 * @route   GET /admin/reports/staff-performance
 * @access  Private/Admin
 */
const getStaffPerformanceReport = async (req, res) => {
  try {
    const { startDate: startDateString, endDate: endDateString } = req.query;

    let endDate = endDateString ? new Date(endDateString) : new Date();
    let startDate = startDateString ? new Date(startDateString) : new Date();
    if (!startDateString) {
      startDate.setDate(endDate.getDate() - 30);
    }
    endDate.setHours(23, 59, 59, 999);

    const staffPerformance = await Staff.findAll({
      attributes: [
        [sequelize.col("User.name"), "staffName"],
        [sequelize.fn("COUNT", sequelize.col("Bookings.id")), "totalBookings"],
        [sequelize.fn("AVG", sequelize.col("Reviews.rating")), "averageRating"],
      ],
      include: [
        {
          model: User,
          attributes: [],
          required: true,
        },
        {
          model: Booking,
          attributes: [],
          required: false, // Use LEFT JOIN to include staff with 0 bookings
          where: {
            status: "completed",
            date: { [Op.between]: [startDate, endDate] },
          },
        },
        {
          model: Review,
          attributes: [],
          required: false, // Use LEFT JOIN to include staff with 0 reviews
        },
      ],
      group: ["Staff.id", "User.name"],
      order: [[sequelize.literal("totalBookings"), "DESC"]],
      // Sub-query is important for complex aggregations to work correctly
      subQuery: false,
    });

    // Clean up the raw data from Sequelize
    const report = staffPerformance.map((staff) => ({
      staffName: staff.get("staffName"),
      totalBookings: parseInt(staff.get("totalBookings"), 10),
      // Format the average rating to 2 decimal places
      averageRating: staff.get("averageRating")
        ? parseFloat(parseFloat(staff.get("averageRating")).toFixed(2))
        : null,
    }));

    res.status(200).json({
      reportPeriod: {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      },
      performance: report,
    });
  } catch (error) {
    console.error("Get Staff Performance Report Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getAllServicesAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";

    const where = search ? { name: { [Op.like]: `%${search}%` } } : {};

    const { count, rows } = await Service.findAndCountAll({
      where,
      offset,
      limit,
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
      services: rows,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ===== Get all bookings (admin) =====
const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.findAll({
      order: [
        ["date", "ASC"],
        ["timeSlot", "ASC"],
      ],
      include: [
        {
          model: User,
          as: "User",
          attributes: {
            exclude: ["password", "resetToken", "resetTokenExpiry"],
          },
        },
        {
          model: Staff,
          as: "Staff",
          include: [
            {
              model: User,
              as: "User",
              attributes: {
                exclude: ["password", "resetToken", "resetTokenExpiry"],
              },
            },
          ],
        },
        {
          model: Service,
          as: "Service",
        },
      ],
    });

    // map timeSlot to time for frontend compatibility
    const bookingsWithTime = bookings.map((b) => ({
      ...b.toJSON(),
      time: b.timeSlot,
    }));

    res.status(200).json(bookingsWithTime);
  } catch (error) {
    console.error("Get All Bookings Error:", error);
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
    const userId = req.user.id; // From JWT auth middleware

    const payments = await Payment.findAll({
      where: { userId: userId },
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Booking,

          attributes: ["id", "date", "timeSlot"],
          include: [
            {
              model: Service,
              attributes: ["id", "name", "price"],
            },
          ],
        },
      ],
    });

    res.status(200).json(payments);
  } catch (error) {
    console.error("Get My Payments Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const restoreUser = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Find the user including soft-deleted records
    const user = await User.findByPk(id, { paranoid: false });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // 2. Check if the user is already active
    if (user.deletedAt === null) {
      return res
        .status(400)
        .json({ message: "User account is already active." });
    }

    // 3. Restore the soft-deleted user (sets deletedAt = null)
    await user.restore();

    // 4. Respond with success message
    res.status(200).json({
      message: "User account restored successfully.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Restore User Error:", error);
    res.status(500).json({
      message: "Server error while restoring user.",
      error: error.message,
    });
  }
};
const removeStaffRole = async (req, res) => {
  // Get staffId from params (assuming route is /staff/role/:id)
  const { id: staffId } = req.params;

  // 1. Start a transaction
  const t = await sequelize.transaction();

  try {
    // 2. Find the staff profile within the transaction
    const staff = await Staff.findByPk(staffId, { transaction: t });

    if (!staff) {
      await t.rollback(); // No staff found, so roll back
      return res.status(404).json({ message: "Staff profile not found" });
    }

    // Get the associated User's ID before destroying the staff record
    const userId = staff.userId;

    // 3. Delete the Staff record
    await staff.destroy({ transaction: t });

    // 4. Find the associated User
    const user = await User.findByPk(userId, { transaction: t, lock: true });

    if (user) {
      // 5. Update the User's role back to 'customer'
      user.role = "customer";
      await user.save({ transaction: t });
    }
    // Note: If the user wasn't found, we still proceed to commit
    // because the main goal (deleting the staff role) is done.

    // 6. If all steps succeeded, commit the transaction
    await t.commit();

    res.status(200).json({
      message:
        "Staff role removed successfully. User role updated to 'customer'.",
    });
  } catch (error) {
    // 7. If any step failed, roll back all changes
    await t.rollback();
    console.error("Remove Staff Role Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
const createBooking = async (req, res) => {
  try {
    // 1. Get ALL data from the body
    //    Admin MUST specify which user they are booking for.
    const { userId, staffId, serviceId, date, timeSlot } = req.body;

    // 2. [Validation] Check if all required IDs are present
    if (!userId || !staffId || !serviceId || !date || !timeSlot) {
      return res.status(400).json({
        message:
          "Missing required fields: userId, staffId, serviceId, date, and timeSlot.",
      });
    }

    // 3. Create the booking
    //    We set the status to 'confirmed' by default, as the admin is creating it.
    const newBooking = await Booking.create({
      userId,
      staffId,
      serviceId,
      date,
      timeSlot,
      status: "confirmed", // Default status when admin books
    });

    // 4. Fetch the full booking details to return
    //    (This keeps it consistent with your edit/update responses)
    const createdBooking = await Booking.findByPk(newBooking.id, {
      include: [
        { model: User, as: "User", attributes: ["id", "name"] },
        { model: Service, as: "Service", attributes: ["id", "name"] },
        {
          model: Staff,
          as: "Staff",
          include: [{ model: User, as: "User", attributes: ["id", "name"] }],
        },
      ],
    });

    res.status(201).json({
      message: "Booking created successfully",
      booking: createdBooking, // Send back the full object
    });
  } catch (error) {
    console.error("Create Booking Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
// =========================
// PAGINATED BOOKINGS (ADMIN)
// =========================
const getPaginatedBookings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Booking.findAndCountAll({
      limit,
      offset,
      order: [["date", "DESC"]],
      include: [
        { model: User, as: "User", attributes: ["name", "email"] },
        {
          model: Staff,
          as: "Staff",
          include: [{ model: User, as: "User", attributes: ["name"] }],
        },
        { model: Service, as: "Service", attributes: ["name"] },
      ],
    });

    res.status(200).json({
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
      bookings: rows,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// =========================
// PAGINATED REVIEWS (ADMIN)
// =========================
const getPaginatedReviews = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Review.findAndCountAll({
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      include: [
        { model: User, as: "User", attributes: ["name"] },
        { model: Service, as: "Service", attributes: ["name"] },
        { model: Booking, as: "Booking", attributes: ["date", "timeSlot"] },
      ],
    });

    res.status(200).json({
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
      reviews: rows,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  adminUpdateUser,
  getAllPayments,
  getAllReviews,
  deleteReview,
  createAdminBooking,
  createManualReminder,
  unassignServiceFromStaff,
  getAllUsers,
  getUserById,
  deleteUser,
  promoteUserToStaff,
  getDashboardStats,
  getRevenueReport,
  getStaffPerformanceReport,
  getAllStaff,
  getAllServicesAdmin,
  getAllBookings,
  getMyPayments,
  restoreUser,
  removeStaffRole,
  createBooking,
  getPaginatedBookings,
  getPaginatedReviews,
};
