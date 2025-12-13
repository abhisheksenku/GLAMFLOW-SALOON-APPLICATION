const User = require("../models/user");
const Staff = require("../models/staff");
const Service = require("../models/service");
const Review = require("../models/review");
const sequelize = require("../utilities/sql");
const Booking = require("../models/booking");
const { Op } = require("sequelize");

// ===== Get all staff =====
const getAllStaff = async (req, res) => {
  try {
    const staff = await Staff.findAll({
      include: [
        {
          model: User,
          as: "User", // <-- THIS WAS MISSING
          attributes: {
            exclude: ["password", "resetToken", "resetTokenExpiry"],
          },
        },
        {
          model: Service,
          as: "Services", // <-- THIS WAS MISSING
          through: { attributes: [] },
        },
      ],
    });
    res.status(200).json(staff);
  } catch (error) {
    // This will log the specific SQL error to your server console
    console.error("GET ALL STAFF ERROR:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ===== Get a single staff member =====
const getStaffById = async (req, res) => {
  try {
    const staff = await Staff.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: "User",
          attributes: {
            exclude: ["password", "resetToken", "resetTokenExpiry"],
          },
        },
        {
          model: Service,
          as: "Services",
          through: { attributes: [] },
        },
      ],
    });
    if (!staff) return res.status(404).json({ message: "Staff not found" });
    res.status(200).json(staff);
  } catch (error) {
    console.error("Get Staff By ID Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ===== Delete staff =====
const deleteStaff = async (req, res) => {
  try {
    const staff = await Staff.findByPk(req.params.id);
    if (!staff) return res.status(404).json({ message: "Staff not found" });

    await staff.destroy();
    res.status(200).json({ message: "Staff deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ===== Assign services to staff =====
const assignServicesToStaff = async (req, res) => {
  try {
    const staff = await Staff.findByPk(req.params.id);
    if (!staff) return res.status(404).json({ message: "Staff not found" });

    const { serviceIds } = req.body; // Array of service IDs
    if (!Array.isArray(serviceIds))
      return res.status(400).json({ message: "serviceIds must be an array" });

    // Associate services
    await staff.setServices(serviceIds); // Sequelize automatically updates StaffService join table
    const updatedStaff = await Staff.findByPk(req.params.id, {
      include: { model: Service, through: { attributes: [] } },
    });

    res
      .status(200)
      .json({ message: "Services assigned to staff", staff: updatedStaff });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ===== Update staff availability =====
const updateStaffAvailability = async (req, res) => {
  try {
    const staff = await Staff.findByPk(req.params.id);
    if (!staff) return res.status(404).json({ message: "Staff not found" });

    const { startTime, endTime, offDays } = req.body;
    staff.startTime = startTime || staff.startTime;
    staff.endTime = endTime || staff.endTime;
    staff.offDays = offDays || staff.offDays;

    await staff.save();
    res.status(200).json({ message: "Staff availability updated", staff });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
// const getStaffServices = async (req, res) => {
//   try {
//     const staffId = req.user.id; // assuming staff is logged in
//     const staff = await Staff.findOne({
//       where: { userId: staffId },
//       include: [
//         {
//           model: Service,
//           as: 'Services', // <-- FIX: Add the 'as' alias here
//           through: { attributes: [] } // Hides the join table
//         }
//       ],
//     });

//     if (!staff) return res.status(404).json({ message: "Staff not found" });
//     res.status(200).json(staff.Services);
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };
/**
 * Gets a paginated list of services assigned to the logged-in staff member.
 */
const getStaffServices = async (req, res) => {
  try {
    const userId = req.user.id;

    // --- Pagination params ---
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5; // 10 per page
    const offset = (page - 1) * limit;
    const { search } = req.query;

    // 1. Find the staff member's profile
    const staff = await Staff.findOne({ where: { userId: userId } });
    if (!staff) {
      return res.status(404).json({ message: "Staff profile not found." });
    }

    // --- 2. Build the where clause for Service ---
    let serviceWhere = {};
    if (search) {
      serviceWhere[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }

    // 3. Find and count all services
    const { count, rows } = await Service.findAndCountAll({
      where: serviceWhere, // <-- 3. Use new where
      include: [
        {
          model: Staff,
          as: "Staffs",
          where: { id: staff.id },
          attributes: [],
        },
      ],
      limit: limit,
      offset: offset,
      distinct: true,
    });

    // 4. Return paginated data
    res.status(200).json({
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      services: rows,
    });
  } catch (error) {
    console.error("Get Staff Services Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
/**
 * @desc    Get the profile of the currently logged-in staff member
 * @route   GET /staff/profile/me
 * @access  Private/Staff
 */
const getStaffProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // This query will now automatically include 'weeklySchedule'
    // and exclude the old, removed columns.
    const staff = await Staff.findOne({
      where: { userId: userId },
      include: [
        {
          model: User,
          as: "User",
          attributes: ["name", "email", "phone"],
        },
      ],
    });

    if (!staff) {
      return res.status(404).json({ message: "Staff profile not found." });
    }

    // The staff object will contain the 'weeklySchedule'
    res.status(200).json(staff);
  } catch (error) {
    console.error("Get Staff Profile Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
/**
 * @desc    Get the schedule for the currently logged-in staff member, filterable by date.
 * @route   GET /staff/schedule/me?date=YYYY-MM-DD
 * @access  Private/Staff
 */
const getStaffSchedule = async (req, res) => {
  try {
    // We assume a staff-specific middleware provides the staffId on the req.user object
    const staffId = req.user.staffId;
    const { date } = req.query;

    // Base query to find bookings for this staff member
    const whereClause = {
      staffId: staffId,
      // Exclude bookings that are already cancelled
      status: { [Op.not]: "cancelled" },
    };

    // If a specific date is provided in the query, filter for that day
    if (date) {
      // Basic validation for the date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res
          .status(400)
          .json({ message: "Invalid date format. Please use YYYY-MM-DD." });
      }
      whereClause.date = date;
    } else {
      // If no date is provided, default to showing today's and all future bookings
      const today = new Date().toISOString().split("T")[0];
      whereClause.date = { [Op.gte]: today };
    }

    const schedule = await Booking.findAll({
      where: whereClause,
      // Order the schedule chronologically
      order: [
        ["date", "ASC"],
        ["timeSlot", "ASC"],
      ],
      include: [
        {
          model: User, // Include customer details
          attributes: ["id", "name", "phone"],
        },
        {
          model: Service, // Include service details
          attributes: ["id", "name", "duration"],
        },
      ],
    });

    res.status(200).json(schedule);
  } catch (error) {
    console.error("Get Staff Schedule Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
/**
 * @desc    Get all services provided by a specific staff member
 * @route   GET /staff/:id/services
 * @access  Public
 */
const getServicesForStaff = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the staff member by their primary key
    const staff = await Staff.findByPk(id, {
      // Include the associated services
      include: [
        {
          model: Service,
          // Optional: specify which attributes you want from the Service model
          attributes: ["id", "name", "description", "duration", "price"],
          // This hides the data from the intermediate 'StaffService' join table
          through: { attributes: [] },
        },
      ],
    });

    if (!staff) {
      return res.status(404).json({ message: "Staff not found" });
    }

    // Respond with just the array of services for that staff member
    res.status(200).json(staff.Services);
  } catch (error) {
    console.error("Get Services For Staff Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
/**
 * @desc    Get all reviews for a specific staff member
 * @route   GET /staff/:id/reviews
 * @access  Public
 */
const getReviewsForStaff = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;
    const offset = (page - 1) * limit;
    const { search } = req.query;

    const staff = await Staff.findOne({ where: { userId: userId } });
    if (!staff) {
      return res.status(404).json({ message: "Staff profile not found." });
    }
    // --- 2. Build the where clause ---
    let reviewWhere = { staffId: staff.id };
    if (search) {
      reviewWhere.comment = { [Op.like]: `%${search}%` };
    }

    // 3. Get paginated rows AND total count
    const { count, rows } = await Review.findAndCountAll({
      where: reviewWhere, // <-- 3. Use the new where clause
      include: [
        { model: User, as: "User", attributes: ["name"] },
        { model: Service, as: "Service", attributes: ["name"] },
      ],
      order: [["createdAt", "DESC"]],
      limit: limit,
      offset: offset,
      distinct: true,
    });

    // ... (rest of the function is the same, calculating average, etc.)
    let averageRating = 0;
    if (count > 0) {
      const totalRating = await Review.sum("rating", {
        where: { staffId: staff.id },
      });
      averageRating = (totalRating / count).toFixed(1);
    }

    res.status(200).json({
      totalItems: count,
      averageRating: averageRating,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      reviews: rows,
    });
  } catch (error) {
    console.error("Get Reviews For Staff Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
/**
 * @desc    Get the available time slots for a staff member on a specific date
 * @route   GET /staff/:id/availability
 * @access  Public
 */
const getStaffAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query; // Expects a date string like "2025-10-25"

    if (!date) {
      return res
        .status(400)
        .json({ message: "A date query parameter is required." });
    }

    const staff = await Staff.findByPk(id);
    if (!staff) {
      return res.status(404).json({ message: "Staff not found." });
    }

    // Check if the requested date is an off-day for the staff
    const requestedDate = new Date(date);
    const dayOfWeek = requestedDate
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();
    if (staff.offDays.includes(dayOfWeek)) {
      return res.status(200).json([]); // It's an off-day, so no slots are available
    }

    // Fetch all bookings for this staff member on the given date
    const bookings = await Booking.findAll({
      where: {
        staffId: id,
        date: date,
      },
    });
    const bookedSlots = new Set(bookings.map((b) => b.timeSlot.split("-")[0]));

    // Generate all potential time slots for the day
    const availableSlots = [];
    const slotDuration = 30; // Assuming a standard 30-minute slot
    const [startHour, startMinute] = staff.startTime.split(":").map(Number);
    const [endHour, endMinute] = staff.endTime.split(":").map(Number);

    const startTime = new Date(`${date}T00:00:00`);
    startTime.setHours(startHour, startMinute);

    const endTime = new Date(`${date}T00:00:00`);
    endTime.setHours(endHour, endMinute);

    let currentSlot = new Date(startTime);
    while (currentSlot < endTime) {
      const slotTime = currentSlot.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      });

      if (!bookedSlots.has(slotTime)) {
        availableSlots.push(slotTime);
      }

      currentSlot.setMinutes(currentSlot.getMinutes() + slotDuration);
    }

    res.status(200).json(availableSlots);
  } catch (error) {
    console.error("Get Staff Availability Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
const adminUpdateStaffProfile = async (req, res) => {
  console.log("BACKEND RECEIVED:", req.body);
  const { id: staffId } = req.params;

  // Get ALL fields from the body
  const { specialty, bio, startTime, endTime, offDays, services } = req.body;

  // 1. Start a transaction
  const t = await sequelize.transaction();

  try {
    // 2. Find the staff profile
    const staff = await Staff.findByPk(staffId, { transaction: t });
    if (!staff) {
      await t.rollback();
      return res.status(404).json({ message: "Staff profile not found." });
    }

    // 3. Update all regular fields
    staff.specialty = specialty || staff.specialty;
    staff.bio = bio || staff.bio;
    staff.startTime = startTime || staff.startTime;
    staff.endTime = endTime || staff.endTime;
    staff.offDays = offDays || staff.offDays;

    // 4. Save the profile changes
    await staff.save({ transaction: t });

    // 5. Update the services (if the 'services' array was sent)
    // This is the magic part!
    if (services && Array.isArray(services)) {
      // 'setServices' automatically handles the join table.
      // It will remove old associations and add all the new ones.
      // 'services' must be an array of Service IDs, e.g., [1, 3, 5]
      await staff.setServices(services, { transaction: t });
    }

    // 6. If all succeeded, commit the transaction
    await t.commit();

    // 7. Get the fresh, fully-updated data to send back
    const updatedStaff = await Staff.findByPk(staffId, {
      include: [
        { model: User, as: "User", attributes: ["name", "email", "phone"] },
        { model: Service, as: "Services", through: { attributes: [] } }, // 'Services' alias
      ],
    });

    res.status(200).json({
      message: "Staff profile updated successfully.",
      staff: updatedStaff,
    });
  } catch (error) {
    // 8. If anything failed, roll back all changes
    await t.rollback();
    console.error("Update Staff Profile Error:", error);
    res.status(500).json({
      message: "Server error updating staff profile.",
      error: error.message,
    });
  }
};
// Add this new function to your staffController
const getStaffByService = async (req, res) => {
  try {
    const { serviceId } = req.params;

    // 1. Find the Service and include its associated Staff
    const service = await Service.findByPk(serviceId, {
      include: [
        {
          model: Staff,
          as: "Staffs", // Use the alias you defined!
          include: [
            {
              model: User,
              as: "User", // Include the User model for the staff's name
              attributes: ["id", "name"],
            },
          ],
          through: { attributes: [] }, // Don't include the join table
        },
      ],
    });

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    // 2. Return just the array of staff
    res.status(200).json(service.Staffs || []);
  } catch (error) {
    console.error("Get Staff By Service Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
const updateMyStaffProfile = async (req, res) => {
  try {
    // 1. Get the logged-in user's ID from the token
    const userId = req.user.id;
    const { specialty, bio } = req.body;

    // 2. Find their Staff profile
    const staff = await Staff.findOne({ where: { userId: userId } });
    if (!staff) {
      return res.status(404).json({ message: "Staff profile not found." });
    }

    // 3. Update only the "safe" fields
    staff.specialty = specialty;
    staff.bio = bio;
    await staff.save();

    res.status(200).json({
      message: "Profile updated successfully.",
      staff: staff,
    });
  } catch (error) {
    console.error("Update My Staff Profile Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
/**
 * Gets a specific client's details AND their booking history
 * relevant to the logged-in staff member.
 */
const getMyClientDetails = async (req, res) => {
  try {
    const { clientId } = req.params; // The ID of the client we're looking up
    const userId = req.user.id; // The logged-in staff member's User ID

    // 1. Find the logged-in staff member's profile
    const staff = await Staff.findOne({ where: { userId: userId } });
    if (!staff) {
      return res.status(404).json({ message: "Staff profile not found." });
    }

    // 2. Find the client's basic details
    const client = await User.findByPk(clientId, {
      attributes: ["id", "name", "phone", "email", "createdAt"], // Only send safe info
    });
    if (!client) {
      return res.status(404).json({ message: "Client not found." });
    }

    // 3. Find all bookings that are for THIS client AND THIS staff member
    const bookings = await Booking.findAll({
      where: {
        userId: clientId, // Must match the client
        staffId: staff.id, // Must match the logged-in staff
      },
      include: [{ model: Service, as: "Service", attributes: ["name"] }],
      order: [["date", "DESC"]], // Newest first
    });

    // 4. Send all the data back
    res.status(200).json({
      client: client,
      bookings: bookings,
    });
  } catch (error) {
    console.error("Get My Client Details Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
/**
 * Allows a staff member to update their own working hours and off days.
 */
const updateMyAvailability = async (req, res) => {
  try {
    const userId = req.user.id;
    // We now expect a single 'weeklySchedule' object in the body
    const { weeklySchedule } = req.body;

    // 1. Basic Validation
    if (!weeklySchedule) {
      return res.status(400).json({
        message: "A weekly schedule object is required.",
      });
    }

    // (Optional but recommended) Validate the object structure
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    for (const day of days) {
      if (
        !weeklySchedule[day] ||
        typeof weeklySchedule[day].isOff !== "boolean" ||
        !weeklySchedule[day].startTime ||
        !weeklySchedule[day].endTime
      ) {
        return res
          .status(400)
          .json({ message: `Invalid schedule format for ${day}.` });
      }
    }

    // 2. Find the staff member's profile
    const staff = await Staff.findOne({ where: { userId: userId } });
    if (!staff) {
      return res.status(404).json({ message: "Staff profile not found." });
    }

    // 3. Update the field (Sequelize handles the JSON conversion)
    staff.weeklySchedule = weeklySchedule;

    await staff.save();

    res.status(200).json({
      message: "Availability updated successfully.",
      // Send the updated schedule back
      weeklySchedule: staff.weeklySchedule,
    });
  } catch (error) {
    console.error("Update My Availability Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
/**
 * Gets a list of all clients (customers) in the system.
 * Used by staff to search for a client when creating a booking.
 */
const getAllClients = async (req, res) => {
  try {
    const clients = await User.findAll({
      where: { role: "customer" },
      attributes: ["id", "name", "phone", "email"],
      order: [["name", "ASC"]],
    });
    res.status(200).json(clients);
  } catch (error) {
    console.error("Get All Clients Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
/**
 * Allows a staff member to create a new booking for a client.
 * Assumes the client already exists.
 */
const createBookingByStaff = async (req, res) => {
  const { serviceId, clientId, date, timeSlot, notes } = req.body;
  const staffId = req.user.staff.id; // Get staff ID from their own login

  let bookingDetails; // Variable to hold the full details

  try {
    // --- Step 1: Create the Booking ---
    const newBooking = await Booking.create({
      serviceId: parseInt(serviceId),
      userId: parseInt(clientId), // Use the client's ID from the form
      staffId: staffId, // Use the staff's own ID
      date,
      timeSlot,
      notes: notes || null,
      status: "confirmed",
    });

    // --- Step 2: Fetch Full Details for Email ---
    // This is critical for getting the client's email, staff's name, etc.
    bookingDetails = await Booking.findByPk(newBooking.id, {
      include: [
        {
          model: User,
          as: "User", // This is the CLIENT
          attributes: ["name", "email"],
        },
        {
          model: Service,
          as: "Service",
          attributes: ["name"],
        },
        {
          model: Staff,
          as: "Staff", // This is the STAFF MEMBER
          include: {
            model: User,
            as: "User",
            attributes: ["name"],
          },
        },
      ],
    });
  } catch (dbError) {
    console.error("Staff booking creation failed:", dbError);
    return res
      .status(500)
      .json({ message: "Server error while creating booking." });
  }

  // --- Step 3: Send Confirmation Email ---
  try {
    // We call the exact same function! Reusability!
    await emailService.sendBookingConfirmation(bookingDetails);
  } catch (emailError) {
    // Don't fail the request if the email fails. Just log it.
    console.error(
      "Failed to send confirmation email (but booking was saved):",
      emailError.message
    );
  }

  // --- Step 4: Send Response to Staff Dashboard ---
  res.status(201).json({
    message: "Booking created for client successfully.",
    booking: bookingDetails,
  });
};
/**
 * Gets a paginated list of a staff member's unique clients.
 */
const getMyClientsPaginated = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;
    const offset = (page - 1) * limit;
    const { search } = req.query;
    // 1. Find staff profile
    const staff = await Staff.findOne({ where: { userId: userId } });
    if (!staff) {
      return res.status(404).json({ message: "Staff profile not found." });
    }
    const staffId = staff.id;

    // 2. Find all unique client IDs this staff has bookings for
    const allClientIds = (
      await Booking.findAll({
        where: { staffId: staffId },
        attributes: [
          [sequelize.fn("DISTINCT", sequelize.col("userId")), "userId"],
        ],
        raw: true,
      })
    ).map((c) => c.userId);

    const totalClients = allClientIds.length;
    if (totalClients === 0) {
      return res.status(200).json({
        totalItems: 0,
        totalPages: 0,
        currentPage: 1,
        clients: [],
      });
    }
    // 3. Define the search criteria for the User model
    let userSearchWhere = {
      id: { [Op.in]: allClientIds }, // Base: must be one of the staff's clients
    };

    if (search) {
      userSearchWhere[Op.or] = [
        // <-- 2. Add search logic
        { name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
      ];
    }

    // 4. Find and count all users matching the criteria
    const { count, rows: paginatedClients } = await User.findAndCountAll({
      where: userSearchWhere,
      attributes: ["id", "name", "phone"],
      limit: limit,
      offset: offset,
      order: [["name", "ASC"]],
      distinct: true,
    });

    // 5. Find last/next visit for *only* these paginated clients
    const clientsData = await Promise.all(
      paginatedClients.map(async (client) => {
        const lastVisit = await Booking.findOne({
          where: { userId: client.id, staffId: staffId, status: "completed" },
          order: [["date", "DESC"]],
        });
        const nextAppt = await Booking.findOne({
          where: {
            userId: client.id,
            staffId: staffId,
            status: { [Op.in]: ["confirmed", "pending"] },
          },
          order: [["date", "ASC"]],
        });

        return {
          id: client.id,
          name: client.name,
          phone: client.phone,
          lastVisit: lastVisit ? lastVisit.date : null,
          nextAppointment: nextAppt ? nextAppt.date : null,
        };
      })
    );

    // 6. Return the paginated data
    res.status(200).json({
      totalItems: count, // This is now the 'filtered' count
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      clients: clientsData,
    });
  } catch (error) {
    console.error("Get My Clients Paginated Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
/**
 * Allows a staff member to create a new client (customer).
 */
const createClientByStaff = async (req, res) => {
  const { name, phone, email } = req.body;

  if (!name || (!phone && !email)) {
    return res
      .status(400)
      .json({ message: "Client name and either phone or email are required." });
  }

  try {
    // Check if client already exists (by phone or email if provided)
    const searchCriteria = [];
    if (phone) searchCriteria.push({ phone: phone });
    if (email) searchCriteria.push({ email: email });

    const existingUser = await User.findOne({
      where: {
        [Op.or]: searchCriteria,
        role: "customer",
      },
    });

    if (existingUser) {
      return res
        .status(409)
        .json({ message: "A client with this phone or email already exists." });
    }

    // Create a dummy password for the new user
    // They can reset it later if they want to log in
    const tempPassword = `temp_${Date.now()}`;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create the new user
    const newClient = await User.create({
      name,
      phone,
      email,
      password: hashedPassword,
      role: "customer",
    });

    // Send back the new client's data (without the password)
    res.status(201).json({
      id: newClient.id,
      name: newClient.name,
      phone: newClient.phone,
      email: newClient.email,
    });
  } catch (error) {
    console.error("Create Client By Staff Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
const replyToReview = async (req, res) => {
  try {
    const reviewId = req.params.id;
    const { reply } = req.body;
    const userId = req.user.id;

    if (!reply || reply.trim() === "") {
      return res.status(400).json({ message: "Reply cannot be empty." });
    }

    // staff profile
    const staff = await Staff.findOne({ where: { userId } });
    if (!staff) {
      return res.status(404).json({ message: "Staff profile not found." });
    }

    // review
    const review = await Review.findByPk(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found." });
    }

    // ensure this is THEIR review
    if (review.staffId !== staff.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to reply to this review." });
    }

    // save reply
    review.reply = reply.trim();
    await review.save();

    return res.status(200).json({
      message: "Reply added successfully",
      review,
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  getAllStaff,
  getStaffById,
  deleteStaff,
  assignServicesToStaff,
  updateStaffAvailability,
  getStaffServices,
  getStaffProfile,
  getStaffSchedule,
  getServicesForStaff,
  getReviewsForStaff,
  getStaffAvailability,
  adminUpdateStaffProfile,
  getStaffByService,
  updateMyStaffProfile,
  getMyClientDetails,
  updateMyAvailability,
  getAllClients,
  createBookingByStaff,
  getMyClientsPaginated,
  createClientByStaff,
  replyToReview
};