// services/emailService.js
require("dotenv").config();
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

console.log("MAIL:", process.env.MAIL);
console.log("MAIL_PASSWORD:", process.env.MAIL_PASSWORD);
// ---------------

// Imports the Nodemailer library, which is the main tool for sending emails from Node.js.
const nodeMailer = require("nodemailer");

// ==================
// == CONFIGURATION ==
// ==================

// Creates a reusable 'transporter' object. This is the "mail truck"
// that knows *how* to connect to your email provider (Gmail) and send mail.
const transporter = nodeMailer.createTransport({
  // secure: true -> Use SSL/TLS encryption (required for port 465).
  secure: true,
  // host: 'smtp.gmail.com' -> The server address for Gmail's mail service.
  host: "smtp.gmail.com",
  // port: 465 -> The standard SSL port for SMTP (email sending).
  port: 465,
  // auth: -> The login credentials for your Gmail account.
  auth: {
    // user: process.env.MAIL -> Your full Gmail address (e.g., "you@gmail.com").
    // This MUST be the email address you are sending *from*.
    user: process.env.MAIL,
    // pass: process.env.MAIL_PASSWORD -> Your Gmail "App Password".
    // (Note: This is NOT your regular Gmail password. It's a special 16-digit
    // password you generate in your Google Account security settings).
    pass: process.env.MAIL_PASSWORD,
  },
});

// ==================
// == MAIN FUNCTION ==
// ==================

/**
 * An asynchronous function that sends an email.
 * This function can be imported and reused anywhere in the app (like authController).
 *
 * @param {object} options - An object containing the email details.
 * @param {string} options.toEmail - The recipient's email address.
 * @param {string} options.subject - The subject line of the email.
 * @param {string} options.html - The HTML version of the email body (for modern clients).
 * @param {string} options.text - The plain text version of the email body (for older clients).
 */
async function sendMail({ toEmail, subject, html, text }) {
  try {
    // --- 1. Send the Email ---
    // Tell the 'transporter' (our mail truck) to send the mail with these details.
    // We 'await' this, as it's an asynchronous network operation.
    const info = await transporter.sendMail({
      from: process.env.MAIL, // The sender (must be the same as your auth user).
      to: toEmail, // The recipient.
      subject: subject, // The subject line.
      html: html, // The HTML body.
      text: text, // The plain text fallback.
    });

    // --- 2. Log Success ---
    // If the email sends successfully, log the server's response.
    console.log("Email sent:", info.response);
    return info; // Return the success information.
  } catch (err) {
    // --- 3. Log Error ---
    // If 'transporter.sendMail' fails (e.g., wrong password, no connection),
    // this 'catch' block will run.
    console.error("Email error:", err);
    throw err; // Re-throw the error so the function that called sendMail
    // (e.g., requestPasswordReset) knows that it failed.
  }
}

// --- Helpers for formatting ---
const formatTime = (timeStr) => {
  if (!timeStr) return "N/A";
  const [hour, minute] = timeStr.split(":");
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
};
const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    month: "long", day: "numeric", year: "numeric",
  });
};

// ============================================================
// == 1. BOOKING CONFIRMATION EMAIL (sent after successful payment)
// ============================================================
async function sendBookingConfirmation(booking) {
  if (!booking?.User?.email) return console.error("Missing user email for booking confirmation.");

  const msg = {
    to: booking.User.email,
    from: process.env.SENDER_EMAIL,
    subject: "Your GlamFlow Appointment is Confirmed!",
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Hi ${booking.User.name},</h2>
        <p>Your payment was successful and your appointment is confirmed!</p>
        <hr>
        <p><strong>Service:</strong> ${booking.Service.name}</p>
        <p><strong>With:</strong> ${booking.Staff.User.name}</p>
        <p><strong>Date:</strong> ${formatDate(booking.date)}</p>
        <p><strong>Time:</strong> ${formatTime(booking.timeSlot)}</p>
        <hr>
        <p>Thank you for booking with <strong>GlamFlow</strong>.</p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`✅ Confirmation email sent to ${booking.User.email}`);
  } catch (err) {
    console.error("❌ SendGrid Confirmation Error:", err.response?.body || err.message);
  }
}

// ============================================================
// == 2. BOOKING REMINDER EMAIL (sent day before appointment)
// ============================================================
async function sendBookingReminder(booking) {
  if (!booking?.User?.email) return;

  const msg = {
    to: booking.User.email,
    from: process.env.SENDER_EMAIL,
    subject: "Reminder: Your GlamFlow Appointment is Tomorrow!",
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Hi ${booking.User.name},</h2>
        <p>This is a friendly reminder that your appointment is tomorrow.</p>
        <hr>
        <p><strong>Service:</strong> ${booking.Service.name}</p>
        <p><strong>With:</strong> ${booking.Staff.User.name}</p>
        <p><strong>When:</strong> ${formatDate(booking.date)} at ${formatTime(booking.timeSlot)}</p>
        <hr>
        <p>We look forward to seeing you at GlamFlow!</p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`✅ Reminder email sent to ${booking.User.email}`);
  } catch (err) {
    console.error("❌ SendGrid Reminder Error:", err.response?.body || err.message);
  }
}

// ============================================================
// == 3. PAYMENT REMINDER EMAIL (sent day after successful payment)
// ============================================================
async function sendPaymentReminderEmail(to, name, orderId, booking = null) {
  const bookingInfo = booking
    ? `<p><strong>Service:</strong> ${booking.Service?.name || "Service"} on ${formatDate(booking.date)} at ${formatTime(booking.timeSlot)}</p>`
    : "";

  const msg = {
    to,
    from: process.env.SENDER_EMAIL,
    subject: "Thanks for Your Payment – GlamFlow",
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Hi ${name},</h2>
        <p>We noticed your recent payment was successful. Thank you for choosing GlamFlow!</p>
        ${bookingInfo}
        <p><strong>Order ID:</strong> ${orderId}</p>
        <hr>
        <p>We look forward to serving you again soon.</p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`✅ Payment reminder email sent to ${to}`);
  } catch (err) {
    console.error("❌ SendGrid Payment Reminder Error:", err.response?.body || err.message);
  }
}

module.exports = {
  sendBookingConfirmation,
  sendBookingReminder,
  sendPaymentReminderEmail,
  sendMail
};
