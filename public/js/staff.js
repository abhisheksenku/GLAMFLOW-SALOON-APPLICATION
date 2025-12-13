// =========================================================================
// ==  STAFF.JS - REFACTORED VERSION
// =========================================================================

// --- Global State ---
// These variables will hold our data once fetched from the API
let myProfile = null;
let myBookings = [];
let myReviews = [];
let myClients = []; // This will be derived from bookings
let myServices = [];
const token = sessionStorage.getItem("token"); // Get auth token
let notificationTimeout;
let allClients = [];
let selectedBookingSlot = null;
let reviewsCurrentPage = 1;
let reviewsTotalPages = 1;
// --- Pagination State for Services ---
let servicesCurrentPage = 1;
let servicesTotalPages = 1;
// --- Pagination State for Clients ---
let clientsCurrentPage = 1;
let clientsTotalPages = 1;
let reviewsOverallStats = { avg: 0, total: 0 };
let allReviewsForFeed = [];
let clientSearchTerm = "";
let reviewSearchTerm = "";
let serviceSearchTerm = "";
// In admin.js AND staff.js (top)

let socket = null;
let chatConversations = new Map(); // Stores all chats { 12: { name: "User 12", messages: [], unread: false } }
let currentChatTargetId = null; // The user ID of the currently open chat
// =========================================================================
// ==  DOM Elements
// =========================================================================
// We query all DOM elements once and store them in constants
const sidebar = document.querySelector(".sidebar");
const hamburger = document.querySelector(".hamburger");
const overlay = document.querySelector(".overlay");
const navLinks = document.querySelectorAll(".sidebar .nav a");
const contentSections = document.querySelectorAll(".page-content");
const dateTimeEl = document.getElementById("dateTime");
const logoutBtn = document.querySelector(".btn.logout");

// --- Page-specific Elements ---
const staffLogoEl = document.getElementById("staff-logo");
const staffLogoTopEl = document.getElementById("staff-logo-top");
const staffSidebarNameEl = document.getElementById("staff-sidebar-name");
const staffBrandTopNameEl = document.getElementById("staff-brand-top-name");
const staffAvatarEl = document.getElementById("staff-avatar");
const staffWelcomeNameEl = document.getElementById("staff-welcome-name");

// --- Dashboard Elements ---
const todaysAppointmentsEl = document.getElementById("todaysAppointments");
const nextClientInfoEl = document.getElementById("nextClientInfo");
const weeklyAppointmentsEl = document.getElementById("weeklyAppointments");
const myAvgRating = document.getElementById("myAvgRating");
const myTotalReviews = document.getElementById("myTotalReviews");
const todaysScheduleTableEl = document.getElementById("todaysScheduleTable");

// --- Schedule Elements ---
const myAppointmentsTableEl = document.getElementById("myAppointmentsTable");

// --- Clients Elements ---
const myClientsTableEl = document.getElementById("myClientsTable");
const clientsPageSearchInput = document.getElementById(
  "clientsPageSearchInput"
); // <-- ADD THIS
// --- Client Detail Elements ---
const clientDetailNameEl = document.getElementById("clientDetailName");
const clientDetailPhoneEl = document.getElementById("clientDetailPhone");
const clientDetailHistoryListEl = document.getElementById(
  "clientDetailHistoryList"
);
// --- Reviews Elements ---
const myAvgRatingFull = document.getElementById("myAvgRatingFull");
const myReviewsListEl = document.getElementById("myReviewsList");
const reviewsPageSearchInput = document.getElementById(
  "reviewsPageSearchInput"
);
// --- My Services Elements ---
const myServicesListEl = document.getElementById("myServicesList");
const servicesPageSearchInput = document.getElementById(
  "servicesPageSearchInput"
);
// --- Profile Elements ---
const profileForm = document.getElementById("profileForm");
const passwordForm = document.getElementById("passwordForm");
const staffNameInput = document.getElementById("staffName");
const staffSpecialtyInput = document.getElementById("staffSpecialty");
const staffBioInput = document.getElementById("staffBio");
const profileEditBtn = document.getElementById("editBtn");
const profileSaveBtn = document.getElementById("saveBtn");
const profileInputs = [staffSpecialtyInput, staffBioInput];
// --- Notification Elements ---
const notificationToast = document.getElementById("notification-toast");
const notificationMessage = document.getElementById("notification-message");
// --- Reschedule Modal Elements ---
const rescheduleModal = document.getElementById("rescheduleModal");
const rescheduleModalClose = document.getElementById("rescheduleModalClose");
const rescheduleModalCancel = document.getElementById("rescheduleModalCancel");
const rescheduleForm = document.getElementById("rescheduleForm");
const rescheduleClientName = document.getElementById("rescheduleClientName");
const rescheduleBookingId = document.getElementById("rescheduleBookingId");
const rescheduleDate = document.getElementById("rescheduleDate");
const rescheduleTime = document.getElementById("rescheduleTime");
// --- Notes Modal Elements ---
const notesModal = document.getElementById("notesModal");
const notesModalClose = document.getElementById("notesModalClose");
const notesModalCancel = document.getElementById("notesModalCancel");
const notesForm = document.getElementById("notesForm");
const notesClientName = document.getElementById("notesClientName");
const notesBookingId = document.getElementById("notesBookingId");
const bookingNotes = document.getElementById("bookingNotes");
// --- Availability Form Elements ---
const dashboardAvailabilityListEl = document.getElementById(
  "dashboardAvailabilityList"
);
const availabilityForm = document.getElementById("availabilityForm");
// --- New Booking Modal Elements ---
const showNewBookingModalBtn = document.getElementById(
  "showNewBookingModalBtn"
);
const newBookingModal = document.getElementById("newBookingModal");
const newBookingModalClose = document.getElementById("newBookingModalClose");
const newBookingCancel = document.getElementById("newBookingCancel");
const newBookingForm = document.getElementById("newBookingForm");
const newBookingSubmit = document.getElementById("newBookingSubmit");
// Modal State
const bookingServiceIdInput = document.getElementById("bookingServiceId");
const bookingClientIdInput = document.getElementById("bookingClientId");

// Step 1: Client
const bookingStep1 = document.getElementById("bookingStep1");
const clientSearchInput = document.getElementById("clientSearchInput");
const clientSearchResults = document.getElementById("clientSearchResults");
const selectedClientDisplay = document.getElementById("selectedClientDisplay");
const selectedClientName = document.getElementById("selectedClientName");
const changeClientBtn = document.getElementById("changeClientBtn");
// Step 1: New Client Form
const clientSearchContainer = document.getElementById("clientSearchContainer");
const newClientFormContainer = document.getElementById(
  "newClientFormContainer"
);
const showNewClientFormBtn = document.getElementById("showNewClientFormBtn");
const cancelNewClientBtn = document.getElementById("cancelNewClientBtn");
const saveNewClientBtn = document.getElementById("saveNewClientBtn");
const newClientName = document.getElementById("newClientName");
const newClientPhone = document.getElementById("newClientPhone");
const newClientEmail = document.getElementById("newClientEmail");

// Step 2: Service
const bookingStep2 = document.getElementById("bookingStep2");
const serviceSelect = document.getElementById("serviceSelect");

// Step 3: Date & Time
const bookingStep3 = document.getElementById("bookingStep3");
const bookingDateSelect = document.getElementById("bookingDateSelect");
const bookingTimeSlots = document.getElementById("bookingTimeSlots");
// --- Activity Feed Elements ---
const activityFeedListEl = document.getElementById("activityFeedList");
// --- Review Reply Modal Elements ---
const reviewReplyModal = document.getElementById("reviewReplyModal");
const reviewReplyModalClose = document.getElementById("reviewReplyModalClose");
const reviewReplyModalCancel = document.getElementById(
  "reviewReplyModalCancel"
);
const reviewReplyForm = document.getElementById("reviewReplyForm");
const replyReviewId = document.getElementById("replyReviewId");
const replyText = document.getElementById("replyText");

// --- Chat Modal Elements ---
const chatOpenBtn = document.getElementById("chat-open-btn");
const chatNotificationDot = document.getElementById("chat-notification-dot");
const chatModal = document.getElementById("chat-modal");
const chatCloseBtn = document.getElementById("chat-close-btn");
const chatUserList = document.getElementById("chat-user-list");
const chatWithName = document.getElementById("chat-with-name");
const chatMessages = document.getElementById("chat-messages");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatSubmitBtn = chatForm.querySelector(".btn-send");
// =========================================================================
// ==  Utility Functions
// =========================================================================
// Small, reusable helper functions

/**
 * Shows a pop-up notification message.
 * @param {string} message - The message to display.
 * @param {boolean} [isError=false] - True if the message is an error.
 */
function showNotification(message, isError = false) {
  // Clear any existing timer
  if (notificationTimeout) {
    clearTimeout(notificationTimeout);
  }

  // 1. Set the message
  notificationMessage.textContent = message;

  // 2. Set the style (error or success)
  if (isError) {
    notificationToast.classList.add("error");
    notificationToast.classList.remove("success");
  } else {
    notificationToast.classList.remove("error");
    notificationToast.classList.add("success");
  }

  // 3. Show the notification
  notificationToast.classList.add("show");

  // 4. Set a timer to hide it again
  notificationTimeout = setTimeout(() => {
    notificationToast.classList.remove("show");
  }, 3000);
}
const safeDate = (dateStr) => (dateStr ? new Date(dateStr) : null);

const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString("en-IN") : "N/A";

const formatTime = (timeStr) => {
  if (!timeStr) return "N/A";
  // Check if timeStr is in "HH:mm:ss" or "HH:mm" format
  const parts = timeStr.split(":");
  if (parts.length < 2) return "N/A";

  const [hour, minute] = parts;
  const date = new Date();
  date.setHours(hour, minute, 0, 0); // Set seconds and ms to 0

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

/**
 * Updates the date and time display in the top bar.
 */
function updateTime() {
  const now = new Date();
  const options = { weekday: "long", month: "long", day: "numeric" };
  if (dateTimeEl)
    dateTimeEl.textContent = now.toLocaleDateString("en-IN", options);
}

// =========================================================================
// ==  SPA Navigation
// =========================================================================
// Logic for controlling the single-page application behavior

/**
 * Shows a specific page content and highlights the active nav link.
 * @param {string} targetId - The ID of the page to show (e.g., "dashboard").
 */
function showPage(targetId) {
  contentSections.forEach((section) => section.classList.remove("active"));
  navLinks.forEach((link) => link.classList.remove("active"));

  const targetSection = document.getElementById(targetId + "-content");
  if (targetSection) targetSection.classList.add("active");

  const targetLink = document.querySelector(
    `.nav a[data-target="${targetId}"]`
  );
  if (targetLink) targetLink.classList.add("active");

  if (window.innerWidth <= 768) {
    sidebar.classList.remove("open");
    overlay.classList.remove("open");
  }
}

/**
 * Attaches event listeners for all navigation elements.
 */
function initNavigation() {
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      showPage(link.dataset.target);
    });
  });

  hamburger.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    overlay.classList.toggle("open");
  });

  overlay.addEventListener("click", () => {
    sidebar.classList.remove("open");
    overlay.classList.remove("open");
  });

  logoutBtn.addEventListener("click", handleLogout);
}

// =========================================================================
// ==  Authentication
// =========================================================================

/**
 * Handles the logout process.
 */
function handleLogout() {
  sessionStorage.removeItem("token");
  window.location.href = "/login";
}

/**
 * Fetches all necessary data from the API.
 */
async function fetchData() {
  try {
    // 1. REMOVED 'reviewsRes' from this line
    const [profileRes, bookingsRes, allReviewsRes] = await Promise.all([
      axios.get(`${BASE_URL}/api/staff/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(`${BASE_URL}/api/staff/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(`${BASE_URL}/api/staff/reviews?limit=1000`, {
        // Get all reviews
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    // 3. Store the data from the promises
    myProfile = profileRes.data;
    myBookings = bookingsRes.data;
    allReviewsForFeed = allReviewsRes.data.reviews;

    await fetchReviews(1);
    await fetchServices(1);
    await fetchClients(1);
  } catch (error) {
    console.error("Initialization failed:", error);
    if (error.response && [401, 403].includes(error.response.status)) {
      handleLogout();
    } else {
      showNotification("Could not load dashboard data.", true);
    }
  }
}
/**
 * Renders pagination controls for a section.
 * @param {string} containerId - The ID of the pagination container.
 * @param {number} totalPages - Total number of pages.
 * @param {number} currentPage - The active page.
 * @param {function} onPageClick - The function to call when a button is clicked.
 */
function renderPagination(containerId, totalPages, currentPage, onPageClick) {
  const container = document.getElementById(containerId);
  if (!container || totalPages <= 1) {
    if (container) container.innerHTML = ""; // Clear if it exists but not needed
    return;
  }

  let html = `
    <button id="${containerId}-prev" ${currentPage === 1 ? "disabled" : ""}>
      &larr; Prev
    </button>
    <span>Page ${currentPage} of ${totalPages}</span>
    <button id="${containerId}-next" ${
    currentPage === totalPages ? "disabled" : ""
  }>
      Next &rarr;
    </button>
  `;
  container.innerHTML = html;

  // Add event listeners
  const prevBtn = document.getElementById(`${containerId}-prev`);
  const nextBtn = document.getElementById(`${containerId}-next`);

  if (prevBtn) {
    prevBtn.addEventListener("click", () => onPageClick(currentPage - 1));
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", () => onPageClick(currentPage + 1));
  }
}
// =========================================================================
// ==  UI Rendering Functions
// =========================================================================
// Functions that take data and render it to the DOM

/**
 * Populates the main UI elements with the staff's name and avatar.
 */
function renderStaffUI() {
  if (!myProfile) return;
  const staffName = myProfile.User.name;
  const staffInitial = staffName.charAt(0);

  staffLogoEl.textContent = staffInitial;
  staffLogoTopEl.textContent = staffInitial;
  staffSidebarNameEl.textContent = staffName;
  staffBrandTopNameEl.textContent = staffName;
  staffAvatarEl.textContent = staffInitial;
  staffWelcomeNameEl.textContent = `Welcome back, ${staffName} 👋`;
}

/**
 * Renders the dashboard widgets and "Today's Schedule" table.
 */
function renderDashboard() {
  const now = new Date();
  const today = now.toISOString().split("T")[0]; // YYYY-MM-DD

  const myUpcomingAppointments = myBookings
    .filter(
      (a) => a.status === "confirmed" && new Date(a.date) >= new Date(today)
    )
    .sort(
      (a, b) =>
        new Date(a.date) - new Date(b.date) ||
        a.timeSlot.localeCompare(b.timeSlot)
    );

  const myTodaysAppts = myUpcomingAppointments.filter((a) =>
    a.date.startsWith(today)
  );

  todaysAppointmentsEl.textContent = myTodaysAppts.length;
  nextClientInfoEl.textContent =
    myTodaysAppts.length > 0 ? myTodaysAppts[0].User.name : "None";
  weeklyAppointmentsEl.textContent = myUpcomingAppointments.length;

  // Use the correct global stats, not the paginated list
  const avg = parseFloat(reviewsOverallStats.avg);
  const total = reviewsOverallStats.total;

  myAvgRating.textContent = avg;
  myTotalReviews.textContent = total === 1 ? `1 review` : `${total} reviews`;

  // Render table
  if (myTodaysAppts.length > 0) {
    todaysScheduleTableEl.innerHTML = myTodaysAppts
      .map(
        (a) => `
          <tr>
              <td>${formatTime(a.timeSlot)}</td>
              <td>${a.User.name}</td>
              <td>${a.Service.name}</td>
              <td class="status-cell">
            <select class="booking-status-select" data-booking-id="${a.id}">
              <option value="pending" ${
                a.status === "pending" ? "selected" : ""
              }>Pending</option>
              <option value="confirmed" ${
                a.status === "confirmed" ? "selected" : ""
              }>Confirmed</option>
              <option value="completed" ${
                a.status === "completed" ? "selected" : ""
              }>Completed</option>
              <option value="cancelled" ${
                a.status === "cancelled" ? "selected" : ""
              }>Cancelled</option>
            </select>
          </td>
              <td class="actions-cell">
                <button class="btn icon-btn edit-booking-btn" data-booking-id="${
                  a.id
                }" title="Reschedule">✏️</button>
                <button class="btn icon-btn notes-btn" data-booking-id="${
                  a.id
                }" title="Notes">📝</button>
              </td>
          </tr>
        `
      )
      .join("");
  } else {
    todaysScheduleTableEl.innerHTML = `<tr><td colspan="5">You have no appointments today.</td></tr>`;
  }
}

/**
 * Renders the "My Schedule" page with all upcoming appointments.
 */
function renderSchedule() {
  const myUpcomingAppointments = myBookings
    .filter((a) => a.status === "confirmed" || a.status === "pending")
    .sort(
      (a, b) =>
        new Date(a.date) - new Date(b.date) ||
        a.timeSlot.localeCompare(b.timeSlot)
    );

  if (myUpcomingAppointments.length > 0) {
    myAppointmentsTableEl.innerHTML = myUpcomingAppointments
      .map(
        (a) => `
          <tr>
              <td>${formatDate(a.date)}<br><small>${formatTime(
          a.timeSlot
        )}</small></td>
              <td>${a.User.name}</td>
              <td>${a.Service.name}</td>
              <td class="status-cell">
            <select class="booking-status-select" data-booking-id="${a.id}">
              <option value="pending" ${
                a.status === "pending" ? "selected" : ""
              }>Pending</option>
              <option value="confirmed" ${
                a.status === "confirmed" ? "selected" : ""
              }>Confirmed</option>
              <option value="completed" ${
                a.status === "completed" ? "selected" : ""
              }>Completed</option>
              <option value="cancelled" ${
                a.status === "cancelled" ? "selected" : ""
              }>Cancelled</option>
            </select>
          </td>
          <td class="actions-cell">
            <button class="btn icon-btn edit-booking-btn" data-booking-id="${
              a.id
            }" title="Reschedule">✏️</button>
          </td>
          </tr>
        `
      )
      .join("");
  } else {
    myAppointmentsTableEl.innerHTML = `<tr><td colspan="4">You have no upcoming appointments.</td></tr>`;
  }
}

/**
 * Renders the "My Reviews" page.
 */
function renderReviews() {
  // 1. Get stats from the new global variable
  const avg = parseFloat(reviewsOverallStats.avg);
  const total = reviewsOverallStats.total;

  const stars = "★".repeat(Math.round(avg)) + "☆".repeat(5 - Math.round(avg));
  const avgText =
    total === 0
      ? "No reviews yet"
      : `Average Rating: ${stars} (${avg} from ${total} reviews)`;

  // 2. Update the average rating display on the reviews page
  myAvgRatingFull.textContent = avgText;

  // 3. Update the dashboard stat card
  myAvgRating.textContent = avg;
  myTotalReviews.textContent = `${total} reviews`;

  // 4. Render the review list for the current page
  if (myReviews.length > 0) {
    myReviewsListEl.innerHTML = myReviews.map(renderReviewCard).join("");
  } else if (total === 0) {
    myReviewsListEl.innerHTML = `<p>You have no reviews yet.</p>`;
  } else {
    // This happens if you go to a page with no reviews, e.g., page 5
    myReviewsListEl.innerHTML = `<p>No reviews on this page.</p>`;
  }
}

/**
 * Renders the "My Profile" page forms with data.
 */
function renderProfile() {
  if (!myProfile) return;

  // --- 1. Populate Profile Form ---
  staffNameInput.value = myProfile.User.name;
  staffSpecialtyInput.value = myProfile.specialty || "";
  staffBioInput.value = myProfile.bio || "";

  // --- 2. Populate Availability Form (The New Grid) ---

  // Use the staff's schedule, or a default if it's missing
  const defaultSchedule = {
    Sunday: { isOff: true, startTime: "09:00", endTime: "17:00" },
    Monday: { isOff: false, startTime: "09:00", endTime: "17:00" },
    Tuesday: { isOff: false, startTime: "09:00", endTime: "17:00" },
    Wednesday: { isOff: false, startTime: "09:00", endTime: "17:00" },
    Thursday: { isOff: false, startTime: "09:00", endTime: "17:00" },
    Friday: { isOff: false, startTime: "09:00", endTime: "17:00" },
    Saturday: { isOff: false, startTime: "09:00", endTime: "17:00" },
  };
  const schedule = myProfile.weeklySchedule || defaultSchedule;

  // Find all 7 day-row divs in the form
  const dayRows = availabilityForm.querySelectorAll(".day-row");

  dayRows.forEach((row) => {
    const day = row.dataset.day; // e.g., "Sunday"
    if (!schedule[day]) return; // Skip if data is bad

    const dayData = schedule[day];

    // Find the inputs *within* this row
    const isOffInput = row.querySelector('[name="isOff"]');
    const startTimeInput = row.querySelector('[name="startTime"]');
    const endTimeInput = row.querySelector('[name="endTime"]');

    // Populate the inputs
    isOffInput.checked = dayData.isOff;
    startTimeInput.value = dayData.startTime;
    endTimeInput.value = dayData.endTime;

    // Call helper to disable/enable time inputs
    toggleDayRow(row, dayData.isOff);
  });
}
/**
 * Renders the "My Services" page.
 */
// function renderMyServices() {
//   if (!myServicesListEl) return;

//   if (myServices.length > 0) {
//     // Render as a simple list. You can make this a table later.
//     myServicesListEl.innerHTML =
//       "<ul>" +
//       myServices
//         .map(
//           (service) => `
//           <li>
//             <strong>${service.name}</strong>
//             (Duration: ${service.duration} min, Price: ₹${service.price})
//           </li>
//         `
//         )
//         .join("") +
//       "</ul>";
//   } else {
//     myServicesListEl.innerHTML = `<p>You are not currently assigned to any services. Please contact your admin.</p>`;
//   }
// }
function renderMyServices() {
  if (myServices.length > 0) {
    myServicesListEl.innerHTML = myServices
      .map(
        (service) => `
      <div class="service-card">
        <h3>${service.name}</h3>
        <p>${service.description}</p>
        <div class="service-card-footer">
          <span>Duration: ${service.duration} min</span>
          <span>Price: ₹${service.price}</span>
        </div>
      </div>
    `
      )
      .join("");
  } else {
    myServicesListEl.innerHTML = "<p>You are not assigned to any services.</p>";
  }
}
/**
 * Fetches and renders the "Client Detail" page for a specific client.
 * @param {string} clientId - The ID of the client to show.
 */
async function showClientDetails(clientId) {
  try {
    // 1. Call our new API route
    const response = await axios.get(
      `${BASE_URL}/api/staff/clients/${clientId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const { client, bookings } = response.data;

    // 2. Populate the header
    clientDetailNameEl.textContent = client.name;
    clientDetailPhoneEl.textContent = client.phone || "N/A";

    // 3. Render the appointment history
    if (bookings.length > 0) {
      clientDetailHistoryListEl.innerHTML = bookings
        .map(
          (a) => `
        <div class="history-item">
          <div class="history-item-header">
            <strong>${formatDate(a.date)}</strong> - ${a.Service.name}
            <span class="status ${a.status.toLowerCase()}">${a.status}</span>
          </div>
          <div class="history-item-notes">
            <strong>Notes:</strong>
            <p>${a.notes || "No notes for this appointment."}</p>
          </div>
        </div>
      `
        )
        .join("");
    } else {
      clientDetailHistoryListEl.innerHTML =
        "<p>This client has no appointment history with you.</p>";
    }

    // 4. Show the page
    showPage("client-detail");
  } catch (error) {
    // This will now catch the error from the API call
    console.error("Failed to load client details:", error);
    showNotification(
      error.response?.data?.message || "Could not load client details.",
      true
    );
    // Stay on the client list page
    showPage("clients");
  }
}
/**
 * Handles a change in a booking's status dropdown.
 */
async function handleStatusChange(e) {
  const selectElement = e.target;
  const bookingId = selectElement.dataset.bookingId;
  const newStatus = selectElement.value;

  // Optimistic UI: Style the select based on the new status immediately
  selectElement.className = `booking-status-select status-${newStatus}`;

  try {
    await axios.patch(
      `${BASE_URL}/api/staff/bookings/${bookingId}/status`,
      { status: newStatus },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Update the status in our global 'myBookings' array
    const bookingIndex = myBookings.findIndex((b) => b.id == bookingId);
    if (bookingIndex !== -1) {
      myBookings[bookingIndex].status = newStatus;
    }

    showNotification(`Booking status updated to ${newStatus}.`);

    // We must re-render the dashboard to update stats (like "Today's Appointments")
    renderDashboard();
    renderSchedule();
  } catch (error) {
    console.error("Failed to update booking status:", error);
    showNotification("Failed to update status. Please try again.", true);
    // Revert the dropdown on failure
    const booking = myBookings.find((b) => b.id == bookingId);
    if (booking) {
      selectElement.value = booking.status;
      selectElement.className = `booking-status-select status-${booking.status}`;
    }
  }
}
/**
 * Handles the submission of the "Update Availability" form.
 */
async function handleAvailabilityUpdate(e) {
  e.preventDefault();

  const newSchedule = {};

  // Find all 7 day-row divs
  const dayRows = availabilityForm.querySelectorAll(".day-row");

  // Loop through each row to build the schedule object
  dayRows.forEach((row) => {
    const day = row.dataset.day; // e.g., "Sunday"

    // Find the inputs within this row
    const isOffInput = row.querySelector('[name="isOff"]');
    const startTimeInput = row.querySelector('[name="startTime"]');
    const endTimeInput = row.querySelector('[name="endTime"]');

    // Add this day's data to our newSchedule object
    newSchedule[day] = {
      isOff: isOffInput.checked,
      startTime: startTimeInput.value,
      endTime: endTimeInput.value,
    };
  });

  try {
    const response = await axios.put(
      `${BASE_URL}/api/staff/availability`,
      { weeklySchedule: newSchedule }, // Send the new object
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Update global state with the new schedule
    myProfile.weeklySchedule = response.data.weeklySchedule;

    showNotification("Availability updated successfully!");

    // Re-render the dashboard widget to show the new times
    renderAvailabilityWidget();
  } catch (error) {
    console.error("Availability update failed:", error);
    showNotification(error.response?.data?.message || "Update failed.", true);
  }
}
/**
 * Toggles the disabled state and style of a day-row's time inputs.
 * @param {HTMLElement} row - The .day-row element.
 * @param {boolean} isOff - If the day is marked as off.
 */
function toggleDayRow(row, isOff) {
  const startTimeInput = row.querySelector('[name="startTime"]');
  const endTimeInput = row.querySelector('[name="endTime"]');

  if (isOff) {
    row.classList.add("is-off");
    startTimeInput.disabled = true;
    endTimeInput.disabled = true;
  } else {
    row.classList.remove("is-off");
    startTimeInput.disabled = false;
    endTimeInput.disabled = false;
  }
}

/**
 * Renders the "My Weekly Availability" widget on the dashboard.
 */
function renderAvailabilityWidget() {
  if (!myProfile || !myProfile.weeklySchedule) {
    dashboardAvailabilityListEl.innerHTML = "<p>Schedule not set.</p>";
    return;
  }

  const schedule = myProfile.weeklySchedule;
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  const html = days
    .map((day) => {
      const dayData = schedule[day];
      if (!dayData) return ""; // Safety check

      const timeString = dayData.isOff
        ? `<span>Off</span>`
        : `<span>${formatTime(dayData.startTime)} - ${formatTime(
            dayData.endTime
          )}</span>`;

      return `
      <div class="availability-item">
        <strong>${day.substring(0, 3)}</strong>
        ${timeString}
      </div>
    `;
    })
    .join("");

  dashboardAvailabilityListEl.innerHTML = html;
}
/**
 * Converts a date into a "time ago" string.
 * @param {Date} date - The date to format.
 * @returns {string} - e.g., "2 hours ago"
 */
function formatTimeAgo(date) {
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";

  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";

  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";

  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";

  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";

  return "Just now";
}
/**
 * Renders the "Recent Activity" feed on the dashboard.
 */
function renderActivityFeed() {
  if (!activityFeedListEl) return;

  // 1. Map bookings to a common feed format
  const bookingsFeed = myBookings.map((b) => ({
    type: "booking",
    date: new Date(b.createdAt),
    text: `New booking for <strong>${b.Service.name}</strong> with <strong>${b.User.name}</strong>.`,
    status: b.status,
  }));

  // 2. Map reviews to a common feed format
  const reviewsFeed = allReviewsForFeed.map((r) => ({
    type: "review",
    date: new Date(r.createdAt),
    text: `New <strong>${r.rating}-star review</strong> from <strong>${
      r.User ? r.User.name : "Anonymous"
    }</strong>.`,
  }));

  // 3. Combine, sort, and slice the feed
  const combinedFeed = [...bookingsFeed, ...reviewsFeed];

  // Sort by date, newest first
  combinedFeed.sort((a, b) => b.date - a.date);

  // Get just the 10 most recent items
  const recentFeed = combinedFeed.slice(0, 10);

  // 4. Render the HTML
  if (recentFeed.length === 0) {
    activityFeedListEl.innerHTML = `<p>No recent activity.</p>`;
    return;
  }

  activityFeedListEl.innerHTML = recentFeed
    .map((item) => {
      const icon = item.type === "booking" ? "📅" : "⭐";

      return `
      <div class="activity-item">
        <div class="activity-icon">${icon}</div>
        <div class="activity-content">
          <p class="activity-text">${item.text}</p>
          <span class="activity-time">${formatTimeAgo(item.date)}</span>
        </div>
      </div>
    `;
    })
    .join("");
}
/**
 * Fetches a specific page of services from the backend.
 */
async function fetchServices(page = 1, search = "") {
  serviceSearchTerm = search;
  try {
    const res = await axios.get(`${BASE_URL}/api/staff/my-services`, {
      params: { page: page, limit: 5, search: search }, // Request 10 per page
      headers: { Authorization: `Bearer ${token}` },
    });

    const { totalItems, totalPages, currentPage, services } = res.data;

    // Update global state
    myServices = services; // This now only holds one page
    servicesCurrentPage = currentPage;
    servicesTotalPages = totalPages;

    // Re-render
    renderMyServices();
    renderPagination(
      "servicesPagination",
      totalPages,
      currentPage,
      (page) => fetchServices(page, serviceSearchTerm) // <-- Pass stored term
    );
    // renderPagination(
    //   "servicesPagination",
    //   servicesTotalPages,
    //   servicesCurrentPage,
    //   fetchServices // Pass the function to call on click
    // );
  } catch (error) {
    console.error("Failed to fetch services:", error);
    myServicesListEl.innerHTML = "<p>Could not load services.</p>";
  }
}
/**
 * Renders the paginated list of clients into the table.
 */
function renderClientsList() {
  if (myClients.length > 0) {
    myClientsTableEl.innerHTML = myClients
      .map(
        (c) => `
      <tr>
        <td>
          <a href="#" class="client-detail-link" data-client-id="${c.id}">
            ${c.name}
          </a>
        </td>
        <td>${c.phone || "N/A"}</td>
        <td>${c.lastVisit ? formatDate(c.lastVisit) : "N/A"}</td>
        <td>${c.nextAppointment ? formatDate(c.nextAppointment) : "N/A"}</td>
      </tr>
    `
      )
      .join("");
  } else {
    myClientsTableEl.innerHTML = `
      <tr>
        <td colspan="4">You have no clients yet.</td>
      </tr>
    `;
  }
}
/**
 * Fetches a specific page of clients from the backend.
 */
async function fetchClients(page = 1, search = "") {
  clientSearchTerm = search;
  try {
    const res = await axios.get(`${BASE_URL}/api/staff/my-clients`, {
      params: { page: page, limit: 5, search: search },
      headers: { Authorization: `Bearer ${token}` },
    });

    const { totalItems, totalPages, currentPage, clients } = res.data;

    // Update global state
    myClients = clients; // This now holds one page
    clientsCurrentPage = currentPage;
    clientsTotalPages = totalPages;

    // Re-render
    renderClientsList(); // This is our new render function
    renderPagination(
      "clientsPagination",
      clientsTotalPages,
      clientsCurrentPage,
      (page) => fetchClients(page, clientSearchTerm)
    );
  } catch (error) {
    console.error("Failed to fetch clients:", error);
    myClientsTableEl.innerHTML = `<tr><td colspan="4">Could not load clients.</td></tr>`;
  }
}
/**
 * Handles saving a new client from the booking modal.
 */
async function handleSaveNewClient() {
  const name = newClientName.value;
  const phone = newClientPhone.value;
  const email = newClientEmail.value;

  if (!name || !phone) {
    showNotification("Name and Phone are required.", true);
    return;
  }

  saveNewClientBtn.disabled = true;
  saveNewClientBtn.textContent = "Saving...";

  try {
    const response = await axios.post(
      `${BASE_URL}/api/staff/clients`,
      { name, phone, email },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const newClient = response.data;

    // Add new client to the 'allClients' list so it can be found
    allClients.push(newClient);

    // Auto-select this new client!
    selectClient(newClient.id, newClient.name);
  } catch (error) {
    showNotification(
      error.response?.data?.message || "Failed to save client.",
      true
    );
  } finally {
    saveNewClientBtn.disabled = false;
    saveNewClientBtn.textContent = "Save Client";
  }
}
// =========================================================================
// ==  Event Listeners & Form Handlers
// =========================================================================
// Functions that handle user interactions (clicks, submits)

/**
 * Attaches submit listeners to the forms on the Profile page.
 */
function initProfileForms() {
  // Edit button listener
  profileEditBtn.addEventListener("click", () => {
    profileInputs.forEach((input) => (input.disabled = false));
    profileEditBtn.style.display = "none";
    profileSaveBtn.style.display = "inline-block";
  });

  // Profile Save button listener
  profileForm.addEventListener("submit", handleProfileUpdate);

  // Password Save button listener
  passwordForm.addEventListener("submit", handlePasswordUpdate);
  availabilityForm.addEventListener("submit", handleAvailabilityUpdate);
  // Add live toggling for the availability grid
  availabilityForm.addEventListener("change", (e) => {
    if (e.target.name === "isOff") {
      const row = e.target.closest(".day-row");
      toggleDayRow(row, e.target.checked);
    }
  });
}
function initEventListeners() {
  // We attach ONE listener to the whole main container
  const mainContent = document.querySelector(".main");

  mainContent.addEventListener("change", (e) => {
    // Check if the thing that changed matches our status dropdown
    if (e.target.classList.contains("booking-status-select")) {
      handleStatusChange(e);
    }
  });
  mainContent.addEventListener("click", (e) => {
    // Check for edit button click
    const editButton = e.target.closest(".edit-booking-btn");
    if (editButton) {
      e.preventDefault();
      openRescheduleModal(editButton.dataset.bookingId);
      return;
    }
    const notesButton = e.target.closest(".notes-btn");
    if (notesButton) {
      e.preventDefault();
      openNotesModal(notesButton.dataset.bookingId);
      return; // Stop further checks
    }
    const clientLink = e.target.closest(".client-detail-link");
    if (clientLink) {
      e.preventDefault();
      showClientDetails(clientLink.dataset.clientId);
      return;
    }
    const backButton = e.target.closest(".back-to-clients");
    if (backButton) {
      e.preventDefault();
      showPage(backButton.dataset.target); // Reads 'clients' from data-target
      return;
    }
    // Review reply button
    const replyBtn = e.target.closest(".reply-btn");
    if (replyBtn) {
      const id = replyBtn.dataset.reviewId;
      replyReviewId.value = id;
      replyText.value = "";
      reviewReplyModal.style.display = "flex";
    }
  });
  reviewReplyModalClose.addEventListener("click", () => {
    reviewReplyModal.style.display = "none";
  });

  reviewReplyModalCancel.addEventListener("click", () => {
    reviewReplyModal.style.display = "none";
  });
  reviewReplyForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = replyReviewId.value;
    const text = replyText.value;

    try {
      await axios.post(
        `${BASE_URL}/api/staff/reviews/${id}/reply`,
        { reply: text },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showNotification("Reply added");
      reviewReplyModal.style.display = "none";

      // Reload current page of reviews
      fetchReviews(reviewsCurrentPage, reviewSearchTerm);
    } catch (err) {
      showNotification("Failed to save reply", true);
    }
  });

  // --- LISTENERS FOR MODAL BUTTONS ---
  rescheduleModalClose.addEventListener("click", closeRescheduleModal);
  rescheduleModalCancel.addEventListener("click", closeRescheduleModal);
  rescheduleForm.addEventListener("submit", handleRescheduleSubmit);
  // --- LISTENERS FOR NOTES MODAL BUTTONS ---
  notesModalClose.addEventListener("click", closeNotesModal);
  notesModalCancel.addEventListener("click", closeNotesModal);
  notesForm.addEventListener("submit", handleNotesSubmit);
  // --- ADD ALL LISTENERS FOR NEW BOOKING MODAL ---
  showNewBookingModalBtn.addEventListener("click", openNewBookingModal);
  newBookingModalClose.addEventListener("click", closeNewBookingModal);
  newBookingCancel.addEventListener("click", closeNewBookingModal);
  newBookingForm.addEventListener("submit", handleNewBookingSubmit);

  // Listener for client search
  clientSearchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    if (query.length < 2) {
      clientSearchResults.innerHTML = "";
      return;
    }
    const filteredClients = allClients.filter(
      (client) =>
        client.name.toLowerCase().includes(query) ||
        (client.phone && client.phone.includes(query))
    );
    renderClientResults(filteredClients);
  });

  // Listener for clicking a client in the results
  clientSearchResults.addEventListener("click", (e) => {
    const item = e.target.closest(".result-item");
    if (item && item.dataset.clientId) {
      selectClient(item.dataset.clientId, item.dataset.clientName);
    }
  });

  // Listener for "Change" client button
  changeClientBtn.addEventListener("click", () => {
    bookingClientIdInput.value = "";
    clientSearchContainer.style.display = "block"; // <-- CORRECTED
    selectedClientDisplay.style.display = "none";
    bookingStep2.style.display = "none";
    bookingStep3.style.display = "none";
    validateBookingForm();
  });
  // Listener for service select
  serviceSelect.addEventListener("change", () => {
    const serviceId = serviceSelect.value;
    if (serviceId) {
      bookingServiceIdInput.value = serviceId;
      bookingStep3.style.display = "block";
      getBookingSlots(); // Fetch slots
    } else {
      bookingServiceIdInput.value = "";
      bookingStep3.style.display = "none";
    }
    validateBookingForm();
  });

  // Listener for date select
  bookingDateSelect.addEventListener("change", () => {
    getBookingSlots(); // Re-fetch slots
    validateBookingForm();
  });

  // Listener for clicking a time slot
  bookingTimeSlots.addEventListener("click", (e) => {
    const button = e.target.closest(".time-slot-btn");
    if (button) {
      // Remove 'selected' from all other buttons
      document.querySelectorAll(".time-slot-btn.selected").forEach((btn) => {
        btn.classList.remove("selected");
      });
      // Add 'selected' to the clicked button
      button.classList.add("selected");
      selectedBookingSlot = button.dataset.slot;
      validateBookingForm();
    }
  });
  showNewClientFormBtn.addEventListener("click", () => {
    clientSearchContainer.style.display = "none";
    newClientFormContainer.style.display = "block";
  });
  let clientSearchTimeout;
  clientsPageSearchInput.addEventListener("input", (e) => {
    clearTimeout(clientSearchTimeout);
    const searchTerm = e.target.value;
    // Wait 500ms after user stops typing
    clientSearchTimeout = setTimeout(() => {
      fetchClients(1, searchTerm); // Go back to page 1
    }, 500);
  });
  let reviewSearchTimeout;
  reviewsPageSearchInput.addEventListener("input", (e) => {
    clearTimeout(reviewSearchTimeout);
    const searchTerm = e.target.value;
    reviewSearchTimeout = setTimeout(() => {
      fetchReviews(1, searchTerm); // Go back to page 1
    }, 500);
  });
  let serviceSearchTimeout;
  servicesPageSearchInput.addEventListener("input", (e) => {
    clearTimeout(serviceSearchTimeout);
    const searchTerm = e.target.value;
    serviceSearchTimeout = setTimeout(() => {
      fetchServices(1, searchTerm); // Go back to page 1
    }, 500);
  });
  // Listener for "Cancel" new client
  cancelNewClientBtn.addEventListener("click", () => {
    clientSearchContainer.style.display = "block";
    newClientFormContainer.style.display = "none";
  });

  // Listener for "Save" new client
  saveNewClientBtn.addEventListener("click", handleSaveNewClient);
  chatOpenBtn.addEventListener("click", () => {
    chatModal.classList.add("chat-modal-visible");
    chatModal.classList.remove("chat-modal-hidden");
  });

  chatCloseBtn.addEventListener("click", () => {
    chatModal.classList.remove("chat-modal-visible");
    chatModal.classList.add("chat-modal-hidden");
  });

  // Listen for clicks on the user list
  chatUserList.addEventListener("click", (e) => {
    const userItem = e.target.closest(".chat-user-item");
    if (userItem) {
      const userId = parseInt(userItem.dataset.userId);
      selectConversation(userId);
    }
  });

  // Listen for form submit
  chatForm.addEventListener("submit", handleSupportFormSubmit);
}

/**
 * Handles the submission of the "Update Profile" form.
 */
async function handleProfileUpdate(e) {
  e.preventDefault();
  profileSaveBtn.textContent = "Saving...";
  profileSaveBtn.disabled = true;

  const updatedData = {
    specialty: staffSpecialtyInput.value,
    bio: staffBioInput.value,
  };

  try {
    const response = await axios.put(
      `${BASE_URL}/api/staff/profile/update`,
      updatedData,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    myProfile = response.data.staff; // Update global state
    showNotification("Profile updated successfully!");

    // Reset form state
    profileInputs.forEach((input) => (input.disabled = true));
    profileSaveBtn.style.display = "none";
    profileEditBtn.style.display = "inline-block";
  } catch (error) {
    console.error("Profile update failed:", error);
    showNotification("Update failed. Please try again.", true);
  } finally {
    profileSaveBtn.textContent = "Save";
    profileSaveBtn.disabled = false;
  }
}

/**
 * Handles the submission of the "Update Password" form.
 */
async function handlePasswordUpdate(e) {
  e.preventDefault();
  const currentPassword = document.getElementById("currentPassword").value;
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (newPassword !== confirmPassword) {
    showNotification("New passwords do not match.", true);
    return;
  }

  const passwordData = { currentPassword, newPassword, confirmPassword };

  try {
    await axios.put(`${BASE_URL}/api/staff/update-password`, passwordData, {
      headers: { Authorization: `Bearer ${token}` },
    });

    showNotification("Password updated successfully!");
    passwordForm.reset(); // Clear the form
  } catch (error) {
    const msg = error.response?.data?.message || "Update failed.";
    showNotification(msg, true);
  }
}
/**
 * Opens the reschedule modal and populates it with booking data.
 * @param {string} bookingId - The ID of the booking to edit.
 */
function openRescheduleModal(bookingId) {
  const booking = myBookings.find((b) => b.id == bookingId);
  if (!booking) {
    showNotification("Could not find booking details.", true);
    return;
  }

  // Populate the form
  rescheduleClientName.textContent = booking.User.name;
  rescheduleBookingId.value = booking.id;

  // Format the date for the <input type="date"> (YYYY-MM-DD)
  rescheduleDate.value = new Date(booking.date).toISOString().split("T")[0];

  // Format the time for the <input type="time"> (HH:mm)
  rescheduleTime.value = booking.timeSlot.substring(0, 5); // Assumes "HH:mm" format

  // Show the modal
  rescheduleModal.style.display = "flex";
}

/**
 * Hides the reschedule modal.
 */
function closeRescheduleModal() {
  rescheduleModal.style.display = "none";
  rescheduleForm.reset();
}

/**
 * Handles the submission of the reschedule form.
 */
async function handleRescheduleSubmit(e) {
  e.preventDefault();
  const bookingId = rescheduleBookingId.value;
  const newDate = rescheduleDate.value;
  const newTime = rescheduleTime.value;

  // Re-format time to match our database (HH:mm:ss or HH:mm)
  // Let's stick to HH:mm for simplicity
  const newTimeSlot = newTime;

  const updatedData = {
    date: newDate,
    timeSlot: newTimeSlot,
  };

  try {
    const response = await axios.patch(
      `${BASE_URL}/api/staff/bookings/${bookingId}`,
      updatedData,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Update the booking in our global 'myBookings' array
    const bookingIndex = myBookings.findIndex((b) => b.id == bookingId);
    if (bookingIndex !== -1) {
      // Merge the old booking with the new data from the server
      myBookings[bookingIndex] = {
        ...myBookings[bookingIndex],
        ...response.data.booking,
      };
    }

    showNotification("Booking rescheduled successfully!");
    closeRescheduleModal();

    // Re-render both tables to show the new date/time
    renderDashboard();
    renderSchedule();
  } catch (error) {
    console.error("Failed to reschedule booking:", error);
    showNotification(
      error.response?.data?.message || "Reschedule failed.",
      true
    );
  }
}
/**
 * Opens the notes modal and populates it with booking data.
 * @param {string} bookingId - The ID of the booking to edit notes for.
 */
function openNotesModal(bookingId) {
  const booking = myBookings.find((b) => b.id == bookingId);
  if (!booking) {
    showNotification("Could not find booking details.", true);
    return;
  }

  // Populate the form
  notesClientName.textContent = booking.User.name;
  notesBookingId.value = booking.id;
  // Set the textarea value to existing notes, or empty string if null
  bookingNotes.value = booking.notes || "";

  // Show the modal
  notesModal.style.display = "flex";
}

/**
 * Hides the notes modal.
 */
function closeNotesModal() {
  notesModal.style.display = "none";
  notesForm.reset();
}

/**
 * Handles the submission of the notes form.
 */
async function handleNotesSubmit(e) {
  e.preventDefault();
  const bookingId = notesBookingId.value;
  const newNotes = bookingNotes.value;

  const updatedData = {
    notes: newNotes,
  };

  try {
    const response = await axios.patch(
      `${BASE_URL}/api/staff/bookings/${bookingId}/notes`,
      updatedData,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Update the booking in our global 'myBookings' array
    const bookingIndex = myBookings.findIndex((b) => b.id == bookingId);
    if (bookingIndex !== -1) {
      myBookings[bookingIndex].notes = response.data.booking.notes;
    }

    showNotification("Notes updated successfully!");
    closeNotesModal();
    // No re-render needed, as notes aren't visible in the table
  } catch (error) {
    console.error("Failed to update notes:", error);
    showNotification(
      error.response?.data?.message || "Failed to save notes.",
      true
    );
  }
}
/**
 * Opens the new booking modal and prepares Step 1.
 */
async function openNewBookingModal() {
  // Reset the form completely
  newBookingForm.reset();
  bookingClientIdInput.value = "";
  bookingServiceIdInput.value = "";
  selectedBookingSlot = null;
  newBookingSubmit.disabled = true;

  // Reset visibility
  clientSearchInput.style.display = "block"; // <-- This is part of clientSearchContainer
  clientSearchContainer.style.display = "block"; // <-- Show search
  newClientFormContainer.style.display = "none"; // <-- Hide new client form
  selectedClientDisplay.style.display = "none";

  // Show the right steps
  bookingStep1.style.display = "block";
  bookingStep2.style.display = "none";
  bookingStep3.style.display = "none";

  // Load clients
  try {
    const response = await axios.get(`${BASE_URL}/api/staff/clients`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    allClients = response.data;
    clientSearchResults.innerHTML = ""; // Clear old results
  } catch (error) {
    console.error("Failed to load clients:", error);
    showNotification("Could not load client list.", true);
  }

  // Load services (we already have this in 'myServices')
  serviceSelect.innerHTML =
    '<option value="">-- Please select a service --</option>';
  myServices.forEach((service) => {
    serviceSelect.innerHTML += `
      <option value="${service.id}" data-duration="${service.duration}">
        ${service.name} (${service.duration} min)
      </option>
    `;
  });

  newBookingModal.style.display = "flex";
}

/**
 * Closes the new booking modal.
 */
function closeNewBookingModal() {
  newBookingModal.style.display = "none";
  allClients = [];
}

/**
 * Renders the client search results.
 * @param {Array} clients - A list of client objects to display.
 */
function renderClientResults(clients) {
  if (clients.length === 0) {
    clientSearchResults.innerHTML =
      '<div class="result-item muted">No clients found.</div>';
    return;
  }
  clientSearchResults.innerHTML = clients
    .map(
      (client) => `
    <div class="result-item" data-client-id="${client.id}" data-client-name="${
        client.name
      }">
      <strong>${client.name}</strong>
      <span>${client.phone || client.email}</span>
    </div>
  `
    )
    .join("");
}

/**
 * Selects a client and moves to Step 2.
 * @param {string} clientId - The selected client's ID.
 * @param {string} clientName - The selected client's name.
 */
function selectClient(clientId, clientName) {
  // Set state
  bookingClientIdInput.value = clientId;
  selectedClientName.textContent = clientName;

  // Update UI
  clientSearchContainer.style.display = "none"; // <-- Hide search container
  newClientFormContainer.style.display = "none"; // <-- Hide new client form
  clientSearchResults.innerHTML = "";
  clientSearchInput.value = "";
  selectedClientDisplay.style.display = "flex"; // <-- Show selected
  // Move to next step
  bookingStep2.style.display = "block";
}

/**
 * Fetches and displays available time slots.
 */
async function getBookingSlots() {
  const serviceId = bookingServiceIdInput.value;
  const date = bookingDateSelect.value;
  const staffId = myProfile.id; // We need the Staff ID

  if (!serviceId || !date || !staffId) {
    bookingTimeSlots.innerHTML =
      '<p class="muted">Please select a service and date first.</p>';
    return;
  }

  bookingTimeSlots.innerHTML = '<p class="muted">Loading slots...</p>';
  selectedBookingSlot = null;
  validateBookingForm();

  try {
    const response = await axios.get(`${BASE_URL}/api/bookings/slots`, {
      params: { date, serviceId, staffId },
      headers: { Authorization: `Bearer ${token}` },
    });

    const slots = response.data;
    if (slots.length === 0) {
      bookingTimeSlots.innerHTML =
        '<p class="muted">No available slots on this day.</p>';
      return;
    }

    bookingTimeSlots.innerHTML = slots
      .map(
        (slot) => `
      <button type="button" class="btn time-slot-btn" data-slot="${slot}">
        ${formatTime(slot)}
      </button>
    `
      )
      .join("");
  } catch (error) {
    console.error("Failed to fetch slots:", error);
    bookingTimeSlots.innerHTML =
      '<p class="danger">Could not load time slots.</p>';
  }
}

/**
 * Checks if all required fields are filled to enable the submit button.
 */
function validateBookingForm() {
  const clientId = bookingClientIdInput.value;
  const serviceId = bookingServiceIdInput.value;
  const date = bookingDateSelect.value;

  if (clientId && serviceId && date && selectedBookingSlot) {
    newBookingSubmit.disabled = false;
  } else {
    newBookingSubmit.disabled = true;
  }
}
/**
 * Handles the final submission of the new booking.
 */
async function handleNewBookingSubmit(e) {
  e.preventDefault();

  const bookingData = {
    clientId: bookingClientIdInput.value,
    serviceId: bookingServiceIdInput.value,
    date: bookingDateSelect.value,
    timeSlot: selectedBookingSlot,
  };

  try {
    await axios.post(`${BASE_URL}/api/staff/bookings`, bookingData, {
      headers: { Authorization: `Bearer ${token}` },
    });

    showNotification("Booking created successfully!");
    closeNewBookingModal();

    // Refresh dashboard data
    const bookingsRes = await axios.get(`${BASE_URL}/api/staff/bookings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    myBookings = bookingsRes.data;

    // Re-render tables
    renderDashboard();
    renderSchedule();
  } catch (error) {
    console.error("Failed to create booking:", error);
    showNotification(
      error.response?.data?.message || "Failed to create booking.",
      true
    );
  }
}
/**
 * Fetches a specific page of reviews from the backend.
 */
async function fetchReviews(page = 1, search = "") {
  reviewSearchTerm = search;
  try {
    const res = await axios.get(`${BASE_URL}/api/staff/reviews`, {
      params: { page: page, limit: 5, search: search },
      headers: { Authorization: `Bearer ${token}` },
    });

    // v-- DESTRUCTURE THE NEW DATA --v
    const { totalItems, averageRating, totalPages, currentPage, reviews } =
      res.data;

    // Update global state
    myReviews = reviews;
    reviewsCurrentPage = currentPage;
    reviewsTotalPages = totalPages;
    reviewsOverallStats = { avg: averageRating, total: totalItems }; // <-- STORE IT

    // Re-render the list AND the pagination controls
    renderReviews(); // This will now use the new global stats
    renderPagination(
      "reviewsPagination",
      totalPages,
      currentPage,
      (page) => fetchReviews(page, reviewSearchTerm) // <-- Pass stored term
    );
    // renderPagination(
    //   "reviewsPagination",
    //   reviewsTotalPages,
    //   reviewsCurrentPage,
    //   fetchReviews
    // );
  } catch (error) {
    console.error("Failed to fetch reviews:", error);
    myReviewsListEl.innerHTML = "<p>Could not load reviews.</p>";
  }
}
/**
 * Renders a single review card.
 * @param {object} r - The review object.
 * @returns {string} - The HTML for the review card.
 */
function renderReviewCard(r) {
  return `
    <div class="review">
      <strong>${r.User ? r.User.name : "Anonymous"}</strong> wrote:
      <div class="review-rating">${"★".repeat(r.rating)}${"☆".repeat(
    5 - r.rating
  )}</div>
      <p class="review-comment">"${r.comment}"</p>

      ${
        r.reply
          ? `
          <div class="review-reply">
            <strong>Your Reply:</strong>
            <p>${r.reply}</p>
          </div>
        `
          : `
          <button class="btn reply-btn" data-review-id="${r.id}">
            Reply
          </button>
        `
      }
    </div>
  `;
}

// In admin.js AND staff.js (FUNCTIONS section)

/**
 * Initializes the Socket.IO connection and event listeners.
 */
function initSocket() {
  const token = sessionStorage.getItem("token");
  if (!token) return;

  socket = io(BASE_URL, {
    auth: { token: token },
  });

  socket.on("connect", () =>
    console.log("Socket.io connected (Staff/Admin):", socket.id)
  );
  socket.on("disconnect", () => console.log("Socket.io disconnected."));
  socket.on("chat_error", (err) => showNotification(err.message, true));

  // --- THIS IS THE KEY LISTENER ---
  // Listen for messages FROM customers
  socket.on("new_customer_message", (message) => {
    handleNewChatMessage(message, false);
  });

  // Listen for messages FROM support (ourself or other staff)
  socket.on("new_support_message", (message) => {
    handleNewChatMessage(message, true);
  });
}

/**
 * Universal handler for all incoming messages.
 * @param {object} message - The message payload from the server.
 * @param {boolean} isSupportMessage - True if from support, false if from customer.
 */
async function handleNewChatMessage(message, isSupportMessage) {
  // 1. Identify the conversation this message belongs to
  // If from a customer, it's their ID. If from support, it's the person they sent *to*.
  const convoId = isSupportMessage ? message.toUserId : message.fromUserId;

  // 2. Get or create the conversation in our Map
  let convo = chatConversations.get(convoId);
  if (!convo) {
    // This is a new chat. We need to fetch the customer's name.
    const clientName = await fetchClientName(convoId);
    convo = { name: clientName, messages: [], unread: false };
    chatConversations.set(convoId, convo);
  }

  // 3. Add the message to the conversation
  convo.messages.push(message);

  // 4. Handle "unread" status
  if (!isSupportMessage && currentChatTargetId !== convoId) {
    convo.unread = true; // Mark as unread if it's from a customer and we're not watching
    chatNotificationDot.classList.remove("chat-dot-hidden"); // Show main dot
  }

  // 5. Re-render the list of conversations
  renderConversationList();

  // 6. If this is the *active* chat, render the new message
  if (currentChatTargetId === convoId) {
    renderChatMessage(message);
  }
}

/**
 * Renders the list of active conversations in the chat sidebar.
 */
function renderConversationList() {
  if (chatConversations.size === 0) {
    chatUserList.innerHTML = '<p class="muted">No active chats.</p>';
    return;
  }

  // Sort by most recent message
  const sortedConversations = Array.from(chatConversations.entries()).sort(
    (a, b) => {
      const lastMsgA = a[1].messages[a[1].messages.length - 1];
      const lastMsgB = b[1].messages[b[1].messages.length - 1];
      return new Date(lastMsgB.timestamp) - new Date(lastMsgA.timestamp);
    }
  );

  chatUserList.innerHTML = sortedConversations
    .map(([userId, convo]) => {
      const isActive = userId === currentChatTargetId ? "active" : "";
      const hasUnread = convo.unread ? '<span class="unread-dot"></span>' : "";

      return `
      <div class="chat-user-item ${isActive}" data-user-id="${userId}">
        ${convo.name}
        ${hasUnread}
      </div>
    `;
    })
    .join("");
}

/**
 * Renders a single message into the main chat window.
 * @param {object} message - The message object
 */
function renderChatMessage(message) {
  // If myProfile isn't loaded, try to get it (only in admin.js)
  if (!myProfile && typeof getMyProfile === "function") {
    myProfile = getMyProfile(); // Assumes admin.js has this
  }

  // Determine if the message is from the *customer* or *support*
  // 'fromRole' only exists on support messages.
  const isSupportMessage =
    message.fromRole === "staff" || message.fromRole === "admin";

  const msgDiv = document.createElement("div");
  msgDiv.className = isSupportMessage ? "message-support" : "message-user"; // Swapped
  msgDiv.textContent = message.text;

  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Clears and renders all messages for a selected conversation.
 * @param {number} userId - The ID of the customer to chat with.
 */
function selectConversation(userId) {
  // 1. Set global state
  currentChatTargetId = userId;
  const convo = chatConversations.get(userId);
  if (!convo) return;

  // 2. Mark as read
  convo.unread = false;

  // 3. Update UI
  chatWithName.textContent = `Chat with ${convo.name}`;
  chatInput.disabled = false;
  chatSubmitBtn.disabled = false;

  // 4. Re-render lists
  renderConversationList(); // Removes the unread dot

  // 5. Render messages
  chatMessages.innerHTML = ""; // Clear window
  convo.messages.forEach((msg) => renderChatMessage(msg));

  // 6. Check if main notification dot should be hidden
  if ([...chatConversations.values()].every((c) => !c.unread)) {
    chatNotificationDot.classList.add("chat-dot-hidden");
  }
}

/**
 * Handles the submission of the support reply form.
 */
function handleSupportFormSubmit(e) {
  e.preventDefault();
  const text = chatInput.value;

  if (text.trim() && currentChatTargetId && socket) {
    // Emit the 'support_message'
    socket.emit("support_message", {
      text: text,
      targetUserId: currentChatTargetId,
    });
    chatInput.value = ""; // Clear input
  }
}

/**
 * Helper to fetch a client's name from their ID.
 * Caches names to avoid re-fetching.
 */
const clientNameCache = new Map();
async function fetchClientName(userId) {
  if (clientNameCache.has(userId)) {
    return clientNameCache.get(userId);
  }
  try {
    // Use the admin route to get user info
    const response = await axios.get(`${BASE_URL}/api/admin/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const name = response.data.user.name || `Customer ${userId}`;
    clientNameCache.set(userId, name);
    return name;
  } catch (err) {
    console.error("Failed to fetch client name:", err);
    return `Customer ${userId}`; // Fallback
  }
}
// =========================================================================
// ==  App Entry Point
// =========================================================================

/**
 * Main function to initialize the application.
 */
async function main() {
  if (!token) {
    window.location.href = "/login"; // Check token immediately
    return;
  }

  // 1. Fetch all data
  await fetchData();

  // 2. Render all static UI components
  renderStaffUI();
  renderDashboard();
  renderAvailabilityWidget();
  renderSchedule();
  renderReviews();
  renderProfile(); // Renders the form data
  renderMyServices();
  renderActivityFeed();

  // 3. Initialize all interactive components
  initNavigation();
  initProfileForms(); // Attaches form listeners
  initEventListeners();
  initSocket();
  updateTime(); // Set the date

  // 4. Show the default page
  showPage("dashboard");
}

// Run the application
document.addEventListener("DOMContentLoaded", main);
