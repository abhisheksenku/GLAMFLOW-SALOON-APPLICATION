const User = require("./user");
const Payment = require("./order");
const Staff = require("./staff");
const Service = require("./service");
const StaffService = require("./staffServices");
const Booking = require("./booking");
const Review = require("./review");
const Message = require("./message");

// ===== USER ↔ STAFF =====
User.hasOne(Staff, {
  foreignKey: "userId",
  as: "Staff",
  onDelete: "CASCADE",
});
Staff.belongsTo(User, {
  foreignKey: "userId",
  as: "User",
});

// ===== STAFF ↔ SERVICE (Many-to-Many) =====
Staff.belongsToMany(Service, {
  through: StaffService,
  as: "Services",
});
Service.belongsToMany(Staff, {
  through: StaffService,
  as: "Staffs",
});

// ===== USER ↔ BOOKING =====
User.hasMany(Booking, {
  foreignKey: "userId",
  as: "Bookings",
});
Booking.belongsTo(User, {
  foreignKey: "userId",
  as: "User",
});

// ===== STAFF ↔ BOOKING =====
Staff.hasMany(Booking, {
  foreignKey: "staffId",
  as: "Bookings",
});
Booking.belongsTo(Staff, {
  foreignKey: "staffId",
  as: "Staff",
});

// ===== SERVICE ↔ BOOKING (Added) =====
Service.hasMany(Booking, {
  foreignKey: "serviceId",
  as: "Bookings",
});
Booking.belongsTo(Service, {
  foreignKey: "serviceId",
  as: "Service",
});

// ===== USER ↔ PAYMENT =====
User.hasMany(Payment, {
  foreignKey: "userId",
  as: "Orders",
});
Payment.belongsTo(User, {
  foreignKey: "userId",
  as: "User",
});

// ===== PAYMENT ↔ BOOKING (Added) =====
Booking.hasOne(Payment, {
  foreignKey: "bookingId",
  as: "Payment",
});
Payment.belongsTo(Booking, {
  foreignKey: "bookingId",
  as: "Booking",
});

// ===== REVIEWS =====
User.hasMany(Review, { foreignKey: "userId", as: "Reviews" });
Review.belongsTo(User, { foreignKey: "userId", as: "User" });

Staff.hasMany(Review, { foreignKey: "staffId", as: "Reviews" });
Review.belongsTo(Staff, { foreignKey: "staffId", as: "Staff" });

Service.hasMany(Review, { foreignKey: "serviceId", as: "Reviews" });
Review.belongsTo(Service, { foreignKey: "serviceId", as: "Service" });

Booking.hasOne(Review, { foreignKey: "bookingId", as: "Review" });
Review.belongsTo(Booking, { foreignKey: "bookingId", as: "Booking" });

Staff.hasMany(Review, { foreignKey: "replyByStaffId", as: "ReplyReviews" });
Review.belongsTo(Staff, { foreignKey: "replyByStaffId", as: "ReplyBy" });


// ===== MESSAGES =====
User.hasMany(Message, { foreignKey: "fromUserId", as: "SentMessages" });
User.hasMany(Message, { foreignKey: "toUserId", as: "ReceivedMessages" });
Message.belongsTo(User, { foreignKey: "fromUserId", as: "Sender" });
Message.belongsTo(User, { foreignKey: "toUserId", as: "Receiver" });

// ===== EXPORT =====
module.exports = {
  User,
  Staff,
  Payment,
  Service,
  StaffService,
  Booking,
  Review,
  Message,
};
