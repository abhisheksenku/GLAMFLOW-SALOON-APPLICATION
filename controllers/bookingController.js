const User = require("../models/user");
const Staff = require("../models/staff");
const Service = require("../models/service");
const Booking = require("../models/booking");
const Review = require("../models/review");
const sequelize = require("../utilities/sql");
const { Op } = require("sequelize"); 

// =======================================
// ==   TIME SLOT HELPER FUNCTIONS      ==
// =======================================

/**
 * Converts a "HH:mm" time string to minutes since midnight.
 * e.g., "09:30" -> 570
 */
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Converts minutes since midnight back to a "HH:mm" string.
 * e.g., 570 -> "09:30"
 */
function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  // Pad with leading zeros
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Generates all possible time slots for a given day.
 * @param {string} startTime - e.g., "09:00"
 * @param {string} endTime - e.g., "17:00"
 * @param {number} duration - e.g., 30 (in minutes)
 * @returns {string[]} - e.g., ["09:00", "09:30", ..., "16:30"]
 */
function generateTimeSlots(startTime, endTime, duration) {
  const slots = [];
  let currentMinute = timeToMinutes(startTime);
  const endMinute = timeToMinutes(endTime);

  while (currentMinute + duration <= endMinute) {
    slots.push(minutesToTime(currentMinute));
    currentMinute += duration;
  }
  return slots;
}
// ===== Customer creates a booking =====
const createBooking = async (req, res) => {
  const { serviceId, staffId, date, timeSlot } = req.body;
  const userId = req.user.id;

  try {
    // Create booking but mark as PENDING PAYMENT
    const newBooking = await Booking.create({
      userId,
      serviceId,
      staffId,
      date,
      timeSlot,
      status: "pending_payment",
    });

    // return booking ID so frontend can start payment
    return res.status(201).json({
      message: "Booking created. Proceed to payment.",
      bookingId: newBooking.id,
    });

  } catch (error) {
    console.error("Create Booking Error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ===== Get all bookings (admin) =====
const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.findAll({
      include: [User, Staff, Service]
    });
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
// ===== Get bookings of logged-in customer =====
const getMyBookings = async (req, res) => {
  try {
    const userId = req.user.id;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const offset = (page - 1) * limit;

    const { count, rows } = await Booking.findAndCountAll({
      where: { userId },
      include: [
        { model: Service, as: "Service" },
        {
          model: Staff,
          as: "Staff",
          include: { model: User, as: "User", attributes: ["name"] }
        }
      ],
      order: [["date", "DESC"]],
      limit,
      offset
    });

    return res.status(200).json({
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      bookings: rows
    });

  } catch (error) {
    console.error("Get My Bookings Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ===== Update booking status (admin) =====
const updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body; // pending, confirmed, completed, cancelled
    const allowedStatus = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!status || !allowedStatus.includes(status)) {
        return res.status(400).json({ message: "Invalid status provided" });
    }

    const booking = await Booking.findByPk(bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    booking.status = status || booking.status;
    await booking.save();

    res.status(200).json({ message: "Booking status updated", booking });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
// ===== Delete booking (admin or customer) =====
const deleteBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findByPk(bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // Optionally check if req.user is owner or admin
    await booking.destroy();
    res.status(200).json({ message: "Booking deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
// ===== Get bookings assigned to logged-in staff =====
const getStaffBookings = async (req, res) => {
  try {
    // 1. Get the logged-in user's ID
    const userId = req.user.id; 

    // 2. Find their Staff profile to get their Staff ID
    const staff = await Staff.findOne({ where: { userId: userId } });
    if (!staff) {
      return res.status(404).json({ message: "Staff profile not found." });
    }
    const staffId = staff.id; // This is the correct ID to use

    // 3. Find all bookings using the staffId AND add aliases
    const bookings = await Booking.findAll({
      where: { staffId: staffId }, // Use the staff.id
      order: [['date', 'ASC'], ['timeSlot', 'ASC']], // Good to add sorting
      include: [
        { model: User, as: 'User', attributes: ['id','name', 'phone'] }, // Added attributes
        { model: Service, as: 'Service', attributes: ['name'] }  // Added attributes
      ]
    });

    res.status(200).json(bookings);
  } catch (error) {
    console.error("Get Staff Bookings Error:", error); // Log the specific error
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
/**
 * @desc    Get details of a specific booking owned by the logged-in user
 * @route   GET /bookings/:id
 * @access  Private
 */
const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id; // From JWT auth middleware

    const booking = await Booking.findOne({
      where: {
        id: id,
        userId: userId, // CRITICAL: Ensures users can only access their own bookings
      },
      include: [
        {
          model: Service,
          attributes: ['id', 'name', 'duration', 'price'],
        },
        {
          model: Staff,
          attributes: ['id'],
          include: [{
            model: User, // Include the staff member's name
            attributes: ['id', 'name']
          }]
        }
      ]
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found or you are not authorized to view it." });
    }

    res.status(200).json(booking);
  } catch (error) {
    console.error("Get Booking By ID Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Get details of a specific booking assigned to the logged-in staff member
 * @route   GET /staff/bookings/:id
 * @access  Private/Staff
 */
const getBookingByIdStaff = async (req, res) => {
  try {
    const { id } = req.params;
    // We get the logged-in user's associated staff ID from the staff middleware
    const staffId = req.user.staffId; 

    const booking = await Booking.findOne({
      where: {
        id: id,
        staffId: staffId, // Ensures staff can only see their OWN bookings
      },
      include: [
        {
          model: User, // Include the customer's details
          attributes: ['id', 'name', 'email', 'phone'],
        },
        {
          model: Service, // Include the service details
          attributes: ['id', 'name', 'duration', 'price'],
        },
      ],
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found or you do not have permission to view it." });
    }

    res.status(200).json(booking);
  } catch (error) {
    console.error("Get Staff Booking By ID Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
/**
 * @desc    Cancel a booking owned by the logged-in user
 * @route   PATCH /bookings/:id/cancel
 * @access  Private
 */
const cancelBooking = async (req, res) => {
  try {
    // 1. Read 'bookingId' from the URL params (changed from 'id')
    const { bookingId } = req.params; 
    const userId = req.user.id; 

    // 2. Find the booking by its ID (changed from 'id')
    const booking = await Booking.findByPk(bookingId); 

    // Check if the booking exists
    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    // 3. IMPORTANT: Authorize the user (This logic is perfect)
    if (booking.userId !== userId) {
      return res.status(403).json({ message: "You are not authorized to cancel this booking." });
    }

    // 4. Check status (This logic is also perfect)
    if (booking.status === 'completed' || booking.status === 'cancelled') {
      return res.status(400).json({ message: `Cannot cancel a booking that is already ${booking.status}.` });
    }

    // 5. Update and save
    booking.status = 'cancelled';
    await booking.save();

    res.status(200).json({ message: "Booking has been successfully cancelled.", booking });

  } catch (error) {
    console.error("Cancel Booking Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
/**
 * Update a booking's details (date, time, staff)
 * Admin access only.
 */
const updateBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { date, timeSlot, staffId } = req.body;

    // 1. Find the booking
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // 2. CRUCIAL: Check status before allowing edit
    if (booking.status === 'completed' || booking.status === 'cancelled') {
      return res.status(400).json({ 
        message: "Cannot edit an appointment that is already completed or cancelled." 
      });
    }

    // 3. Apply updates
    // Only update fields that were actually sent in the request
    if (date) booking.date = date;
    if (timeSlot) booking.timeSlot = timeSlot;
    if (staffId) booking.staffId = staffId;

    // 4. Save the changes
    await booking.save();

    // 5. Fetch the fully updated booking with associations to send back
    // This ensures the frontend has the fresh, complete data
    const updatedBooking = await Booking.findByPk(bookingId, {
      include: [
        { model: User, as: 'User', attributes: ['id', 'name'] },
        { model: Service, as: 'Service', attributes: ['id', 'name'] },
        {
          model: Staff,
          as: 'Staff',
          include: [{ model: User, as: 'User', attributes: ['id', 'name'] }]
        }
      ]
    });

    res.status(200).json({ 
      message: "Booking updated successfully", 
      booking: updatedBooking 
    });

  } catch (error) {
    console.error("Update Booking Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
/**
 * Allows a staff member to update the status of THEIR OWN booking.
 */
const updateMyBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;
    const userId = req.user.id; // Logged-in user's ID

    // 1. Find the logged-in staff member's profile
    const staff = await Staff.findOne({ where: { userId: userId } });
    if (!staff) {
      return res.status(404).json({ message: "Staff profile not found." });
    }

    // 2. Find the booking
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    // 3. SECURITY CHECK: Verify this booking belongs to this staff member
    if (booking.staffId !== staff.id) {
      return res.status(403).json({ 
        message: "Forbidden: You do not have permission to update this booking." 
      });
    }

    // 4. Update the status
    booking.status = status;
    await booking.save();

    res.status(200).json({ 
      message: "Booking status updated successfully.", 
      booking: booking 
    });

  } catch (error) {
    console.error("Update My Booking Status Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
/**
 * Allows a staff member to reschedule THEIR OWN booking (date and time).
 */
const rescheduleMyBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { date, timeSlot } = req.body;
    const userId = req.user.id; // Logged-in user's ID

    // 1. Validate incoming data
    if (!date || !timeSlot) {
      return res.status(400).json({ message: "Date and time slot are required." });
    }

    // 2. Find the logged-in staff member's profile
    const staff = await Staff.findOne({ where: { userId: userId } });
    if (!staff) {
      return res.status(404).json({ message: "Staff profile not found." });
    }

    // 3. Find the booking
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    // 4. SECURITY CHECK: Verify this booking belongs to this staff member
    if (booking.staffId !== staff.id) {
      return res.status(403).json({ 
        message: "Forbidden: You do not have permission to update this booking." 
      });
    }

    // 5. Update the date and time
    booking.date = date;
    booking.timeSlot = timeSlot;
    await booking.save();

    res.status(200).json({ 
      message: "Booking rescheduled successfully.", 
      booking: booking 
    });

  } catch (error) {
    console.error("Reschedule My Booking Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
/**
 * Allows a staff member to add/update notes for THEIR OWN booking.
 */
const updateMyBookingNotes = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { notes } = req.body; // Expecting an object { notes: "..." }
    const userId = req.user.id; // Logged-in user's ID

    // 1. Find the logged-in staff member's profile
    const staff = await Staff.findOne({ where: { userId: userId } });
    if (!staff) {
      return res.status(404).json({ message: "Staff profile not found." });
    }

    // 2. Find the booking
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    // 3. SECURITY CHECK: Verify this booking belongs to this staff member
    if (booking.staffId !== staff.id) {
      return res.status(403).json({ 
        message: "Forbidden: You do not have permission to update these notes." 
      });
    }

    // 4. Update the notes
    booking.notes = notes; // This will save the text or null
    await booking.save();

    res.status(200).json({ 
      message: "Booking notes updated successfully.", 
      booking: booking 
    });

  } catch (error) {
    console.error("Update My Booking Notes Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
/**
 * (Refactored) Gets available time slots for a specific
 * staff, service, and date, based on their new weeklySchedule.
 */
const getAvailableSlots = async (req, res) => {
  const { date, serviceId, staffId } = req.query;

  if (!date || !serviceId || !staffId) {
    return res.status(400).json({ message: 'Date, service, and staff are required.' });
  }

  try {
    // --- 1. Get all data in parallel ---
    const [service, staff, existingBookings] = await Promise.all([
      Service.findByPk(serviceId),
      Staff.findByPk(staffId),
      Booking.findAll({
        where: {
          staffId: staffId,
          date: date,
          status: ['confirmed', 'pending'] // Only check for active bookings
        }
      })
    ]);

    if (!service) return res.status(404).json({ message: 'Service not found.' });
    if (!staff) return res.status(404).json({ message: 'Staff not found.' });
    if (!staff.weeklySchedule) {
      console.error(`Staff ${staffId} has no weeklySchedule defined.`);
      return res.status(500).json({ message: 'Staff schedule is not set up.' });
    }

    // --- 2. Determine the day of the week ---
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    // T-Z Fix: Parse date as local by adding 'T00:00:00'
    const requestedDate = new Date(`${date}T00:00:00`); 
    const dayOfWeek = dayNames[requestedDate.getDay()];

    // --- 3. Find the staff's schedule FOR THAT DAY ---
    const scheduleForDay = staff.weeklySchedule[dayOfWeek];
    if (!scheduleForDay) {
      console.error(`Staff ${staffId} has no schedule for ${dayOfWeek}.`);
      return res.status(500).json({ message: `Schedule for ${dayOfWeek} is missing.` });
    }

    // --- 4. Check if the staff is OFF ---
    if (scheduleForDay.isOff) {
      return res.json([]); // Return empty array; staff is off
    }

    // --- 5. Generate all possible slots for the day ---
    const { startTime, endTime } = scheduleForDay;
    const { duration } = service;
    if (typeof generateTimeSlots !== 'function' || typeof timeToMinutes !== 'function') {
      console.error("Helper functions generateTimeSlots or timeToMinutes are missing.");
      return res.status(500).json({ message: 'Server configuration error.' });
    }
    const allSlots = generateTimeSlots(startTime, endTime, duration);

    // --- 6. Filter out busy slots ---
    // Create a Set for fast lookup of busy times (e.g., "10:00", "14:30")
    const busySlots = new Set(
      existingBookings.map(b => b.timeSlot.substring(0, 5))
    );
    let availableSlots = allSlots.filter(slot => !busySlots.has(slot));

    // --- 7. (CRITICAL) Filter out slots in the past (if the date is today) ---
    const today = new Date();
    // Check if the requested date is today
    if (requestedDate.toDateString() === today.toDateString()) {
      const nowInMinutes = today.getHours() * 60 + today.getMinutes();
      availableSlots = availableSlots.filter(slot => {
        return timeToMinutes(slot) > nowInMinutes;
      });
    }

    // --- 8. Send the final list ---
    res.status(200).json(availableSlots);

  } catch (error) {
    console.error('Error getting available slots:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
/**
 * Gets a list of the user's completed bookings that they have NOT yet reviewed.
 */
const getReviewableBookings = async (req, res) => {
  try {
    const userId = req.user.id;

    const userReviews = await Review.findAll({
      where: { userId: userId },
      attributes: ['bookingId'],
    });

    const reviewedBookingIds = new Set(userReviews.map(r => r.bookingId));

    const completedBookings = await Booking.findAll({
      where: { userId, status: 'completed' },
      include: [
        { model: Service, as: 'Service', attributes: ['name'] },
        {
          model: Staff,
          as: 'Staff',
          include: { model: User, as: 'User', attributes: ['name'] }
        }
      ],
      order: [['date', 'DESC']],
    });

    const reviewableBookings = completedBookings.filter(
      b => !reviewedBookingIds.has(b.id)
    );

    res.status(200).json(reviewableBookings); // <-- FIXED

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getAllMyBookings = async (req, res) => {
  try {
    const userId = req.user.id;

    const bookings = await Booking.findAll({
      where: { userId },
      include: [
        { model: Service, as: 'Service' },
        { 
          model: Staff,
          as: 'Staff',
          include: { model: User, as: 'User', attributes: ['name'] }
        }
      ],
      order: [['date', 'DESC']]
    });

    res.status(200).json(bookings || []);   // <-- FIX HERE

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  createBooking,
  getAllBookings,
  getMyBookings,
  updateBookingStatus,
  deleteBooking,
  getStaffBookings,
  getBookingById,
  getBookingByIdStaff,
  cancelBooking,
  updateBooking,
  updateMyBookingStatus,
  rescheduleMyBooking,
  updateMyBookingNotes,
  getAvailableSlots,
  getReviewableBookings,
  getAllMyBookings
};