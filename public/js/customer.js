// =========================================================================
// ==  customer.JS - REFACTORED CUSTOMER DASHBOARD
// =========================================================================

document.addEventListener("DOMContentLoaded", main);

// --- Global State ---
const token = sessionStorage.getItem("token");
let userProfile = {};
let myBookings = [];
let allServices = [];
let allStaff = [];
let selectedSlot = null;
let notificationTimeout;
let currentRating = 0;
let dashboardStats = {};
let socket = null;
let myPaginatedBookings = [];
let bookingCurrentPage = 1;
let bookingTotalPages = 1;
let paginatedPayments = [];
let paymentsCurrentPage = 1;
let paymentsTotalPages = 1;
let paginatedReviews = [];
let reviewsCurrentPage = 1;
let reviewsTotalPages = 1;
let editingReviewId = null;
let myPastReviews = []; // holds full, non-paginated reviews for quick lookup
let servicesPaginationData = { currentPage: 1, totalPages: 1 };
const breadcrumbMap = {
  home: ["Dashboard"],
  profile: ["Profile"],
  booking: ["Booking"],
  "all-appointments": ["All Appointments"],
  payments: ["Payments"],
  services: ["Services"],
  feedback: ["Feedback"],
  "all-reviews": ["All Reviews"],
};

// =========================================================================
// ==  DOM Element Queries
// =========================================================================

// --- Core App ---
const sidebar = document.querySelector(".sidebar");
const hamburger = document.querySelector(".hamburger");
const overlay = document.querySelector(".overlay");
const navLinks = document.querySelectorAll(".sidebar .nav a");
const contentSections = document.querySelectorAll(".page-content");
const dateTimeEl = document.getElementById("dateTime");
const shortcuts = document.querySelector(".shortcuts");
const logoutBtn = document.querySelector(".btn.logout");

// --- Home Page ---
const upcomingCountEl = document.getElementById("upcomingCount");
const nextApptEl = document.getElementById("nextAppt");
const pendingPaymentsEl = document.getElementById("pendingPayments");
const newReviewsEl = document.getElementById("newReviews");
const avgRatingHomeEl = document.getElementById("avgRatingHome");
const avatarEl = document.getElementById("avatar");
const usernameEl = document.getElementById("username");

// --- Profile Page ---
const profileForm = document.getElementById("profileForm");
const passwordForm = document.getElementById("passwordForm");
const profileNameInput = document.getElementById("name");
const profileEmailInput = document.getElementById("email");
const profileMobileInput = document.getElementById("mobile");
const profileEditBtn = document.getElementById("editBtn");
const profileSaveBtn = document.getElementById("saveBtn");
const profileInputs = [profileNameInput, profileEmailInput, profileMobileInput];
const showDeleteModalBtn = document.getElementById("showDeleteModalBtn");
const deleteAccountModal = document.getElementById("deleteAccountModal");
const deleteAccountForm = document.getElementById("deleteAccountForm");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

// --- Booking Page ---
const bookingForm = document.getElementById("bookingForm");
const serviceDropdown = document.getElementById("service");
const staffDropdown = document.getElementById("staff");
const dateInput = document.getElementById("date");
const slotsContainer = document.getElementById("slots");
const apptListContainer = document.getElementById("apptList");
const viewAllBookingsBtn = document.getElementById("viewAllBookingsBtn");
const backToBookingBtn = document.getElementById("backToBookingBtn");
const allAppointmentsTableEl = document.getElementById("allAppointmentsTable");

// --- Payments Page ---
const paymentTableEl = document.getElementById("paymentTable");

// --- Services Page ---
const serviceListContainer = document.getElementById("servicesList");

// --- Feedback Page ---
const avgRatingEl = document.getElementById("avgRating");
const reviewableBookingsListEl = document.getElementById(
  "reviewableBookingsList"
);
const myPastReviewsListEl = document.getElementById("myPastReviewsList");
const reviewModal = document.getElementById("reviewModal");
const reviewModalClose = document.getElementById("reviewModalClose");
const reviewModalCancel = document.getElementById("reviewModalCancel");
const reviewModalTitle = document.getElementById("reviewModalTitle");
const reviewModalSubtitle = document.getElementById("reviewModalSubtitle");
const reviewForm = document.getElementById("reviewForm");
const reviewModalStars = document.getElementById("reviewModalStars");
const reviewCommentInput = document.getElementById("reviewComment");
const reviewBookingIdInput = document.getElementById("reviewBookingId");

// --- Chat Modal Elements ---
const chatOpenBtn = document.getElementById("chat-open-btn");
const chatModal = document.getElementById("chat-modal");
const chatCloseBtn = document.getElementById("chat-close-btn");
const chatMessages = document.getElementById("chat-messages");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");

// --- Notification Toast ---
const notificationToast =
  document.getElementById("notificationToast") || createToast();
const notificationMessage = document.getElementById("notificationMessage") || {
  textContent: "",
};
const breadcrumbsEl = document.getElementById("breadcrumbs");
const filterDateEl = document.getElementById("filterDate");
const filterPaymentsBtn = document.getElementById("filterPaymentsBtn");
const serviceSearchInput = document.getElementById("serviceSearchInput");

// =========================================================================
// ==  FUNCTIONS
// =========================================================================

function createToast() {
  const toast = document.createElement("div");
  toast.id = "notificationToast";
  toast.className = "toast";
  const message = document.createElement("span");
  message.id = "notificationMessage";
  toast.appendChild(message);
  document.body.appendChild(toast);
  return toast;
}

// --- Core App & Navigation ---
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

function updateTime() {
  const now = new Date();
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  if (dateTimeEl) {
    dateTimeEl.textContent = now.toLocaleDateString("en-IN", options);
  }
}

function showNotification(message, isError = false) {
  if (notificationTimeout) clearTimeout(notificationTimeout);
  notificationMessage.textContent = message;
  notificationToast.className = isError
    ? "toast show error"
    : "toast show success";
  notificationTimeout = setTimeout(() => {
    notificationToast.classList.remove("show");
  }, 3000);
}

function updateBreadcrumbs(parts) {
  if (!breadcrumbsEl) return;
  let html = "";
  parts.forEach((part, index) => {
    if (index > 0) html += `<span class="separator"> / </span>`;
    if (part.target && index < parts.length - 1) {
      html += `<a href="#" data-nav-target="${part.target}">${part.text}</a>`;
    } else {
      html += `<span>${part.text}</span>`;
    }
  });
  breadcrumbsEl.innerHTML = html;
}
function updateBreadcrumbsFromMap(pageId) {
  const parts = breadcrumbMap[pageId] || ["Dashboard"];

  breadcrumbsEl.innerHTML = parts
    .map((p, i) =>
      i < parts.length - 1
        ? `<a href="#" data-nav-target="${
            Object.keys(breadcrumbMap)[i]
          }">${p}</a>`
        : `<span>${p}</span>`
    )
    .join(`<span class="separator"> / </span>`);
}
const formatTime = (timeStr) => {
  if (!timeStr) return "N/A";
  const parts = timeStr.split(":");
  if (parts.length < 2) return "N/A";
  const [hour, minute] = parts;
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

function handleLogout() {
  sessionStorage.removeItem("token");
  window.location.href = "/login";
}

function showConfirmationModal(message) {
  return new Promise((resolve) => {
    const modal = document.getElementById("confirmationModal");
    const confirmBtn = document.getElementById("confirmBtn");
    const cancelBtn = document.getElementById("cancelBtn");
    const messageEl = document.getElementById("confirmMessage");

    if (!modal || !confirmBtn || !cancelBtn || !messageEl) {
      console.error("Confirmation modal elements not found!");
      return resolve(false);
    }

    messageEl.textContent = message;
    modal.classList.add("active");

    const onConfirm = () => cleanup(true);
    const onCancel = () => cleanup(false);

    function cleanup(result) {
      modal.classList.remove("active");
      confirmBtn.removeEventListener("click", onConfirm);
      cancelBtn.removeEventListener("click", onCancel);
      resolve(result);
    }

    confirmBtn.addEventListener("click", onConfirm);
    cancelBtn.addEventListener("click", onCancel);
  });
}

function renderPagination(containerId, totalPages, currentPage, onPageClick) {
  const container = document.getElementById(containerId);
  if (!container || totalPages <= 1) {
    if (container) container.innerHTML = "";
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

  const prevBtn = document.getElementById(`${containerId}-prev`);
  const nextBtn = document.getElementById(`${containerId}-next`);

  if (prevBtn)
    prevBtn.addEventListener("click", () => onPageClick(currentPage - 1));
  if (nextBtn)
    nextBtn.addEventListener("click", () => onPageClick(currentPage + 1));
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// --- Data Fetching ---
async function fetchData() {
  try {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    const [profileRes, bookingsRes, servicesRes, staffRes, statsRes] =
      await Promise.all([
        axios.get(`${BASE_URL}/api/users/profile`),
        axios.get(`${BASE_URL}/api/bookings/my-bookings/all`),
        axios.get(`${BASE_URL}/api/services/fetch`),
        axios.get(`${BASE_URL}/api/staff/fetch`),
        axios.get(`${BASE_URL}/api/users/dashboard-stats`),
      ]);

    userProfile = profileRes.data;
    myBookings = bookingsRes.data;
    allServices = servicesRes.data.services || servicesRes.data || [];
    allStaff = staffRes.data;
    dashboardStats = statsRes.data;
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    if (error.response && [401, 403].includes(error.response.status)) {
      handleLogout();
    } else {
      showNotification("Could not load app data. Please refresh.", true);
    }
  }
}

async function fetchMyPaginatedBookings(page = 1) {
  try {
    const res = await axios.get(`${BASE_URL}/api/bookings/my-bookings`, {
      params: { page, limit: 5 },
    });

    const { totalItems, totalPages, currentPage, bookings } = res.data;

    myPaginatedBookings = bookings;
    bookingCurrentPage = currentPage;
    bookingTotalPages = totalPages;

    renderAllAppointmentsTable();
    renderPagination(
      "appointmentsPagination",
      bookingTotalPages,
      bookingCurrentPage,
      fetchMyPaginatedBookings
    );
  } catch (error) {
    console.error("Failed to fetch paginated bookings:", error);
    allAppointmentsTableEl.innerHTML = `<tr><td colspan="5">Could not load appointments.</td></tr>`;
  }
}

async function fetchPayments(page = 1, date = "") {
  try {
    const res = await axios.get(
      `${BASE_URL}/api/payments/my-payments/paginated`,
      {
        params: { page, limit: 5, date },
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const { payments, currentPage, totalPages } = res.data;

    paginatedPayments = payments;
    paymentsCurrentPage = currentPage;
    paymentsTotalPages = totalPages;

    renderPaymentsPage();
    renderPagination(
      "paymentsPagination",
      paymentsTotalPages,
      paymentsCurrentPage,
      (newPage) => fetchPayments(newPage, date)
    );
  } catch (err) {
    console.error("Failed to fetch payments:", err);
    paymentTableEl.innerHTML = `<tr><td colspan="6">Unable to load payments.</td></tr>`;
  }
}

async function fetchServices(page = 1, search = "") {
  try {
    const res = await axios.get(`${BASE_URL}/api/services/fetch`, {
      params: { page, limit: 6, search },
    });

    servicesPaginationData = res.data;
    allServices = res.data.services;

    renderServicesPage();
    renderPagination(
      "servicesPagination",
      servicesPaginationData.totalPages,
      servicesPaginationData.currentPage,
      (newPage) => fetchServices(newPage, serviceSearchInput.value.trim())
    );
  } catch (err) {
    console.error("Fetch services error:", err);
  }
}

async function fetchPaginatedReviews(page = 1) {
  try {
    const res = await axios.get(
      `${BASE_URL}/api/reviews/my-reviews/paginated`,
      {
        params: { page },
      }
    );

    const { reviews, currentPage, totalPages } = res.data;

    paginatedReviews = reviews;
    reviewsCurrentPage = currentPage;
    reviewsTotalPages = totalPages;

    renderAllReviewsPage();
    renderPagination(
      "reviewsPagination",
      reviewsTotalPages,
      reviewsCurrentPage,
      fetchPaginatedReviews
    );
  } catch (err) {
    console.error("Failed to fetch reviews:", err);
  }
}

// --- Rendering Functions ---
function renderAllPages() {
  renderHomePage();
  renderProfilePage();
  renderBookingPage();
  renderFeedbackPage();
  renderPaymentsPage();
}

function renderHomePage() {
  if (!userProfile.name) return;

  usernameEl.textContent = `Welcome back, ${userProfile.name.split(" ")[0]} 👋`;
  avatarEl.textContent = userProfile.name.charAt(0).toUpperCase();

  const upcoming = myBookings.filter(
    (b) => b.status === "confirmed" || b.status === "pending"
  );
  upcomingCountEl.textContent = upcoming.length;
  if (upcoming.length > 0) {
    const next = upcoming[0];
    nextApptEl.textContent = `${
      next.Service?.name || "Appointment"
    } on ${formatDate(next.date)}`;
  } else {
    nextApptEl.textContent = "None";
  }

  pendingPaymentsEl.textContent = `₹${(
    dashboardStats.totalPaymentsThisMonth || 0
  ).toLocaleString("en-IN")}`;
  newReviewsEl.textContent = dashboardStats.totalReviews ?? 0;
  const avgRating = parseFloat(dashboardStats.averageRating);
  avgRatingHomeEl.textContent =
    isNaN(avgRating) || avgRating === 0 ? "N/A" : `⭐ ${avgRating}`;
}

function renderProfilePage() {
  if (!userProfile.name) return;

  profileNameInput.value = userProfile.name;
  profileEmailInput.value = userProfile.email;
  profileMobileInput.value = userProfile.phone || "";

  const avatarText = document.getElementById("avatarText");
  if (avatarText) {
    avatarText.textContent = userProfile.name
      ? userProfile.name.charAt(0).toUpperCase()
      : "U";
  }
}

function renderBookingPage() {
  serviceDropdown.innerHTML =
    '<option value="">-- Select a Service --</option>';
  allServices.forEach((service) => {
    serviceDropdown.innerHTML += `<option value="${service.id}">${service.name} (₹${service.price})</option>`;
  });

  staffDropdown.innerHTML = '<option value="">-- Any Available --</option>';
  allStaff.forEach((staff) => {
    staffDropdown.innerHTML += `<option value="${staff.id}">${staff.User.name} (${staff.specialty})</option>`;
  });

  const upcoming = myBookings
    .filter((b) => b.status === "confirmed" || b.status === "pending")
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const top3Upcoming = upcoming.slice(0, 3);
  if (top3Upcoming.length === 0) {
    apptListContainer.innerHTML = "<p>No upcoming appointments.</p>";
    return;
  }

  apptListContainer.innerHTML = top3Upcoming
    .map(
      (appt) => `
    <div class="appt-item">
      <div class="appt-item-details">
        <strong>${appt.Service.name}</strong>
        <span>${formatDate(appt.date)} at ${formatTime(appt.timeSlot)} with ${
        appt.Staff.User.name
      }</span>
      </div>
      <div class="appt-item-actions">
        <button class="btn-link danger cancel-btn" data-booking-id="${
          appt.id
        }">Cancel</button>
      </div>
    </div>
  `
    )
    .join("");
}

function renderAllAppointmentsTable() {
  if (myPaginatedBookings.length === 0) {
    allAppointmentsTableEl.innerHTML =
      '<tr><td colspan="5">You have no appointments.</td></tr>';
    return;
  }

  allAppointmentsTableEl.innerHTML = myPaginatedBookings
    .map(
      (appt) => `
    <tr>
      <td>${formatDate(appt.date)}<br><small>${formatTime(
        appt.timeSlot
      )}</small></td>
      <td>${appt.Service.name}</td>
      <td>${appt.Staff.User.name}</td>
      <td><span class="status ${appt.status.toLowerCase()}">${
        appt.status
      }</span></td>
      <td class="actions-cell">
        ${
          appt.status !== "cancelled" && appt.status !== "completed"
            ? `<button class="btn-link danger cancel-btn" data-booking-id="${appt.id}">Cancel</button>`
            : "-"
        }
      </td>
    </tr>
  `
    )
    .join("");
}

function renderServicesPage() {
  serviceListContainer.innerHTML = allServices
    .map(
      (s) => `
      <div class="service-card">
        <div class="service-icon" style="
          background-color: #d63384;
          color: white;
          font-weight: bold;
          font-size: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 150px;
          border-radius: 10px;
        ">
          ${s.name}
        </div>
        <div class="service-card-content">
          <h3>${s.name}</h3>
          <p>${s.description}</p>
          <div class="service-card-footer">
            <span class="service-card-price">₹${s.price}</span>
            <button class="btn secondary" data-target="booking" data-service-id="${s.id}">Book Now</button>
          </div>
        </div>
      </div>
    `
    )
    .join("");
}

async function renderFeedbackPage() {
  try {
    const [reviewableRes, pastRes] = await Promise.all([
      axios.get(`${BASE_URL}/api/bookings/reviewable`),
      axios.get(`${BASE_URL}/api/reviews/my-reviews`),
    ]);

    const reviewableBookings = reviewableRes.data;
    const pastReviews = pastRes.data;
    myPastReviews = pastReviews;

    // To-review list
    if (reviewableBookings.length === 0) {
      reviewableBookingsListEl.innerHTML =
        "<p>You have no appointments to review.</p>";
    } else {
      reviewableBookingsListEl.innerHTML = reviewableBookings
        .map(
          (booking) => `
        <div class="reviewable-item">
          <div class="details">
            <strong>${booking.Service.name}</strong>
            <span>with ${booking.Staff.User.name} on ${formatDate(
            booking.date
          )}</span>
          </div>
          <button class="btn leave-review-btn" 
                  data-booking-id="${booking.id}"
                  data-service-name="${booking.Service.name}"
                  data-staff-name="${booking.Staff.User.name}">
            Leave a Review
          </button>
        </div>
      `
        )
        .join("");
    }

    // Past reviews (top 3 + buttons)
    if (pastReviews.length === 0) {
      myPastReviewsListEl.innerHTML =
        "<p>You have not left any reviews yet.</p>";
    } else {
      const top3 = pastReviews.slice(0, 3);

      myPastReviewsListEl.innerHTML = top3
        .map(
          (review) => `
    <div class="review-item">
      <div class="details">
        <strong>${review.Booking.Service.name}</strong>
        <span>with ${review.Booking.Staff.User.name} on ${formatDate(
            review.Booking.date
          )}</span>
        <div class="review-rating">${"★".repeat(review.rating)}${"☆".repeat(
            5 - review.rating
          )}</div>
        <p class="review-comment">"${review.comment || "No comment"}"</p>
        ${
          review.reply
            ? `<div class="staff-reply">
                <strong>Staff Response:</strong>
                <p>${review.reply}</p>
              </div>`
            : ""
        }
        <div class="review-actions" style="text-align:right;margin-top:6px;">
          <button class="btn-link edit-review-btn" data-review-id="${
            review.id
          }">Edit</button>
          <button class="btn-link danger delete-review-btn" data-review-id="${
            review.id
          }">Delete</button>
        </div>
      </div>
    </div>
  `
        )
        .join("");

      myPastReviewsListEl.innerHTML += `
        <button id="viewAllReviewsBtn" class="btn secondary" style="margin-top: 16px">
          View All Reviews
        </button>
      `;
    }
  } catch (error) {
    console.error("Failed to load feedback page:", error);
    reviewableBookingsListEl.innerHTML =
      "<p class='danger'>Could not load reviews.</p>";
    myPastReviewsListEl.innerHTML =
      "<p class='danger'>Could not load reviews.</p>";
  }
}

function renderAllReviewsPage() {
  const container = document.getElementById("allReviewsList");

  if (paginatedReviews.length === 0) {
    container.innerHTML = "<p>No reviews available.</p>";
    return;
  }

  container.innerHTML = paginatedReviews
    .map(
      (review) => `
    <div class="review-item">
      <div class="details">
        <strong>${review.Booking.Service.name}</strong>
        <span>with ${review.Booking.Staff.User.name} on ${formatDate(
        review.Booking.date
      )}</span>
        <div class="review-rating">${"★".repeat(review.rating)}${"☆".repeat(
        5 - review.rating
      )}</div>
        <p class="review-comment">"${review.comment || "No comment"}"</p>
        ${
          review.reply
            ? `<div class="staff-reply">
                <strong>Staff Response:</strong>
                <p>${review.reply}</p>
              </div>`
            : ""
        }
        <div class="review-actions" style="text-align:right;margin-top:6px;">
          <button class="btn-link edit-review-btn" data-review-id="${
            review.id
          }">Edit</button>
          <button class="btn-link danger delete-review-btn" data-review-id="${
            review.id
          }">Delete</button>
        </div>
      </div>
    </div>
  `
    )
    .join("");
}

function renderPaymentsPage() {
  if (paginatedPayments.length === 0) {
    paymentTableEl.innerHTML =
      '<tr><td colspan="6">No payments found.</td></tr>';
    return;
  }

  paymentTableEl.innerHTML = paginatedPayments
    .map(
      (p) => `
      <tr>
        <td>${formatDate(p.createdAt)}</td>
        <td>${p.Booking?.Service?.name || "N/A"}</td>
        <td>₹${p.amount}</td>
        <td>${p.method}</td>
        <td><span class="status ${p.status.toLowerCase()}">${
        p.status
      }</span></td>
        <td>
          <button class="btn secondary view-invoice-btn" data-payment-id="${
            p.id
          }">
          Invoice
          </button>
        </td>
      </tr>`
    )
    .join("");
}

// --- Booking Form Logic ---
async function fetchAndRenderSlots() {
  const serviceId = serviceDropdown.value;
  const staffId = staffDropdown.value;
  const date = dateInput.value;

  if (!serviceId || !date) {
    slotsContainer.innerHTML = `<p class="muted">Please select a service and a date.</p>`;
    return;
  }

  let staffIdToFetch = staffId;
  if (!staffIdToFetch) {
    const service = allServices.find((s) => s.id == serviceId);
    if (service && service.Staffs && service.Staffs.length > 0) {
      staffIdToFetch = service.Staffs[0].id;
    } else {
      slotsContainer.innerHTML = `<p class="danger">No staff available for this service.</p>`;
      return;
    }
  }

  slotsContainer.innerHTML = `<p class="muted">Loading slots...</p>`;

  try {
    const response = await axios.get(`${BASE_URL}/api/bookings/slots`, {
      params: { serviceId, staffId: staffIdToFetch, date },
    });

    const slots = response.data;
    if (slots.length === 0) {
      slotsContainer.innerHTML = `<p class="muted">No available slots on this day.</p>`;
      return;
    }

    slotsContainer.innerHTML = slots
      .map(
        (slot) =>
          `<div class="slot" data-slot-value="${slot}">${formatTime(
            slot
          )}</div>`
      )
      .join("");
  } catch (error) {
    console.error("Failed to fetch slots:", error);
    slotsContainer.innerHTML = `<p class="danger">Could not load time slots.</p>`;
  }
}

async function handleBookingSubmit(e) {
  e.preventDefault();

  const serviceId = serviceDropdown.value;
  let staffId = staffDropdown.value;
  const date = dateInput.value;

  if (!serviceId || !date || !selectedSlot) {
    showNotification("Please select a service, date, and time slot.", true);
    return;
  }

  if (!staffId) {
    const service = allServices.find((s) => s.id == serviceId);
    if (service && service.Staffs && service.Staffs.length > 0) {
      staffId = service.Staffs[0].id;
    }
  }

  const bookingData = {
    serviceId: parseInt(serviceId),
    staffId: parseInt(staffId),
    date,
    timeSlot: selectedSlot,
  };

  try {
    const response = await axios.post(
      `${BASE_URL}/api/payments/initiate-payment`,
      bookingData,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const { paymentSessionId, orderId } = response.data;
    if (!paymentSessionId || !orderId)
      throw new Error("Payment session could not be created.");

    const cashfree = new Cashfree({ mode: "sandbox" });
    const result = await cashfree.checkout({
      paymentSessionId,
      redirectTarget: "_modal",
    });

    if (result.error) {
      console.error("Checkout error:", result.error);
      await axios.post(
        `${BASE_URL}/api/payments/payment-failed`,
        { orderId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showNotification("Payment failed or cancelled.", true);
      return;
    }

    if (result.paymentDetails) {
      const paymentId = result.paymentDetails.paymentId;
      await axios.post(
        `${BASE_URL}/api/payments/payment-success`,
        { orderId, paymentId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showNotification("Payment successful! Booking confirmed.");

      await fetchData();
      renderBookingPage();
      renderPaymentsPage();
    }

    bookingForm.reset();
    slotsContainer.innerHTML = `<p class="muted">Please select a service and a date.</p>`;
    selectedSlot = null;
  } catch (error) {
    console.error("Booking/payment failed:", error);
    showNotification(
      error.response?.data?.message || "Booking or payment failed.",
      true
    );
  }
}

async function handleCancelBooking(bookingId) {
  const confirmed = await showConfirmationModal(
    "Are you sure you want to cancel this appointment?"
  );
  if (!confirmed) return;

  try {
    await axios.patch(`${BASE_URL}/api/bookings/cancel/${bookingId}`);

    const index = myBookings.findIndex((b) => b.id == bookingId);
    if (index > -1) myBookings[index].status = "cancelled";

    await fetchMyPaginatedBookings(bookingCurrentPage);
    renderBookingPage();
    showNotification("Appointment cancelled.");
  } catch (error) {
    console.error("Failed to cancel booking:", error);
    showNotification(
      error.response?.data?.message || "Failed to cancel.",
      true
    );
  }
}

// --- Reviews: Create/Edit/Delete ---
function openReviewModal(bookingId, serviceName, staffName) {
  editingReviewId = null;
  currentRating = 0;

  reviewForm.reset();
  reviewBookingIdInput.value = bookingId;

  reviewModalTitle.textContent = `Review: ${serviceName}`;
  reviewModalSubtitle.textContent = `with ${staffName}`;

  reviewModalStars
    .querySelectorAll(".star")
    .forEach((s) => s.classList.remove("selected"));

  document.getElementById("reviewSubmitBtn").textContent = "Submit Review";

  reviewModal.classList.add("active"); // <-- IMPORTANT FIX
}

function openEditReview(review) {
  editingReviewId = review.id;

  reviewBookingIdInput.value = review.bookingId;
  reviewCommentInput.value = review.comment || "";

  currentRating = review.rating;
  reviewModalStars.querySelectorAll(".star").forEach((star, idx) => {
    star.classList.toggle("selected", idx < currentRating);
  });

  reviewModalTitle.textContent = `Edit Review: ${review.Booking.Service.name}`;
  reviewModalSubtitle.textContent = `with ${review.Booking.Staff.User.name}`;

  document.getElementById("reviewSubmitBtn").textContent = "Save Changes";

  // Fix: show modal correctly
  reviewModal.classList.add("active");
}

function closeReviewModal() {
  reviewModal.classList.remove("active");
}

async function handleReviewSubmit(e) {
  e.preventDefault();

  const comment = reviewCommentInput.value;

  if (currentRating === 0) {
    showNotification("Please select a star rating.", true);
    return;
  }

  try {
    if (editingReviewId) {
      await axios.put(`${BASE_URL}/api/reviews/${editingReviewId}`, {
        rating: currentRating,
        comment,
      });
      showNotification("Review updated successfully.");
    } else {
      const bookingId = parseInt(reviewBookingIdInput.value);
      await axios.post(`${BASE_URL}/api/reviews/create`, {
        rating: currentRating,
        comment,
        bookingId,
      });
      showNotification("Thank you for your review!");
    }

    closeReviewModal();
    renderFeedbackPage();
    fetchPaginatedReviews(reviewsCurrentPage);
  } catch (error) {
    console.error("Review error:", error);
    showNotification(error.response?.data?.message || "Failed.", true);
  }
}

async function handleDeleteReview(id) {
  const confirmed = await showConfirmationModal(
    "Are you sure you want to delete this review?"
  );
  if (!confirmed) return;

  try {
    await axios.delete(`${BASE_URL}/api/reviews/${id}`);
    showNotification("Review deleted.");
    renderFeedbackPage();
    fetchPaginatedReviews(reviewsCurrentPage);
  } catch (err) {
    console.error("Delete failed:", err);
    showNotification("Failed to delete review.", true);
  }
}

// --- Chat ---
function initSocket() {
  socket = io(BASE_URL, {
    auth: { token },
  });

  socket.on("connect", () => {
    console.log("Socket.io connected:", socket.id);
  });

  socket.on("disconnect", () => {
    console.log("Socket.io disconnected.");
  });

  socket.on("auth_error", (err) => {
    console.error("Socket Auth Error:", err.message);
    showNotification("Chat session expired. Please refresh.", true);
  });

  socket.on("chat_error", (err) => {
    showNotification(err.message, true);
  });

  socket.on("new_support_message", (message) => {
    renderChatMessage(message);
  });

  chatOpenBtn.addEventListener("click", () => {
    chatModal.classList.add("chat-modal-visible");
    chatOpenBtn.style.display = "none";
  });

  chatCloseBtn.addEventListener("click", () => {
    chatModal.classList.remove("chat-modal-visible");
    chatOpenBtn.style.display = "flex";
  });

  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = chatInput.value;
    if (text.trim()) {
      socket.emit("customer_message", { text });
      chatInput.value = "";
    }
  });
}

function renderChatMessage(message) {
  const isUserMessage = message.fromUserId === userProfile.id;
  const msgDiv = document.createElement("div");
  msgDiv.className = isUserMessage ? "message-user" : "message-support";
  msgDiv.textContent = message.text;
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// =========================================================================
// ==  EVENT LISTENERS
// =========================================================================

function initEventListeners() {
  // Shortcuts and service card buttons
  function handleNavButton(e) {
    const btn = e.target.closest("[data-target]");
    if (!btn) return;

    const target = btn.dataset.target;

    if (target === "payments") fetchPayments(1);
    if (target === "services") fetchServices(1, "");
    if (target === "booking") renderBookingPage();

    showPage(target);
    updateBreadcrumbsFromMap(target);

    // autofill only after booking page is rendered
    if (target === "booking" && btn.dataset.serviceId) {
      serviceDropdown.value = btn.dataset.serviceId;
      fetchAndRenderSlots();
    }
  }

  // Navigation
  if (shortcuts) shortcuts.addEventListener("click", handleNavButton);
  navLinks.forEach((link) => link.addEventListener("click", handleNavButton));

  // Breadcrumb clicks
  if (breadcrumbsEl) {
    breadcrumbsEl.addEventListener("click", (e) => {
      const a = e.target.closest("a[data-nav-target]");
      if (!a) return;

      e.preventDefault();

      const target = a.dataset.navTarget;

      showPage(target);
      updateBreadcrumbsFromMap(target);
    });
  }

  hamburger.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    overlay.classList.toggle("open");
  });

  overlay.addEventListener("click", () => {
    sidebar.classList.remove("open");
    overlay.classList.remove("open");
  });

  if (serviceListContainer)
    serviceListContainer.addEventListener("click", handleNavButton);

  logoutBtn.addEventListener("click", handleLogout);

  // Booking
  serviceDropdown.addEventListener("change", fetchAndRenderSlots);
  staffDropdown.addEventListener("change", fetchAndRenderSlots);
  dateInput.addEventListener("change", fetchAndRenderSlots);
  bookingForm.addEventListener("submit", handleBookingSubmit);

  slotsContainer.addEventListener("click", (e) => {
    if (!e.target.classList.contains("slot")) return;
    slotsContainer
      .querySelectorAll(".slot")
      .forEach((s) => s.classList.remove("selected"));
    e.target.classList.add("selected");
    selectedSlot = e.target.dataset.slotValue;
  });

  apptListContainer.addEventListener("click", (e) => {
    if (!e.target.classList.contains("cancel-btn")) return;
    const bookingId = e.target.dataset.bookingId;
    handleCancelBooking(bookingId);
  });

  allAppointmentsTableEl.addEventListener("click", (e) => {
    if (!e.target.classList.contains("cancel-btn")) return;
    const bookingId = e.target.dataset.bookingId;
    handleCancelBooking(bookingId);
  });

  // Services search
  if (serviceSearchInput) {
    serviceSearchInput.addEventListener(
      "input",
      debounce(() => {
        fetchServices(1, serviceSearchInput.value.trim());
      }, 300)
    );
  }

  // Appointments view all
  viewAllBookingsBtn.addEventListener("click", () => {
    fetchMyPaginatedBookings(1);
    showPage("all-appointments");
    updateBreadcrumbs([
      { text: "Booking", target: "booking" },
      { text: "All Appointments" },
    ]);
  });

  backToBookingBtn.addEventListener("click", () => {
    showPage("booking");
    updateBreadcrumbs([{ text: "Booking" }]);
  });

  // Payments filter
  if (filterPaymentsBtn) {
    filterPaymentsBtn.addEventListener("click", () => {
      const date = filterDateEl.value;
      fetchPayments(1, date);
    });
  }

  // Profile
  profileEditBtn.addEventListener("click", () => {
    profileInputs.forEach((input) => (input.disabled = false));
    profileEditBtn.style.display = "none";
    profileSaveBtn.style.display = "inline-block";
  });

  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const updatedData = {
      name: profileNameInput.value,
      email: profileEmailInput.value,
      phone: profileMobileInput.value,
    };

    profileSaveBtn.disabled = true;
    profileSaveBtn.textContent = "Saving...";

    try {
      const response = await axios.put(
        `${BASE_URL}/api/users/profile`,
        updatedData
      );
      userProfile = response.data;
      renderHomePage();
      showNotification("Profile updated successfully!");
    } catch (error) {
      console.error("Profile update failed:", error);
      showNotification(error.response?.data?.message || "Update failed.", true);
    } finally {
      profileInputs.forEach((input) => (input.disabled = true));
      profileEditBtn.style.display = "inline-block";
      profileSaveBtn.style.display = "none";
      profileSaveBtn.disabled = false;
      profileSaveBtn.textContent = "Save";
    }
  });

  passwordForm.addEventListener("submit", async (e) => {
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
      const response = await axios.put(
        `${BASE_URL}/api/users/update-password`,
        passwordData
      );
      showNotification(response.data.message);
      passwordForm.reset();
    } catch (error) {
      console.error("Password update failed:", error);
      showNotification(error.response?.data?.message || "Update failed.", true);
    }
  });

  // Reviews
  reviewableBookingsListEl.addEventListener("click", (e) => {
    console.log("CLICK EVENT ON REVIEWABLE LIST", e.target);

    const button = e.target.closest(".leave-review-btn");
    console.log("FOUND BUTTON?", button);

    if (!button) return;

    console.log("BUTTON DATA:", button.dataset);

    const { bookingId, serviceName, staffName } = button.dataset;
    openReviewModal(bookingId, serviceName, staffName);
  });

  reviewModalClose.addEventListener("click", closeReviewModal);
  reviewModalCancel.addEventListener("click", closeReviewModal);

  // Single handler handles create or edit (checks editingReviewId)
  reviewForm.addEventListener("submit", handleReviewSubmit);

  reviewModalStars.addEventListener("click", (e) => {
    const star = e.target.closest(".star");
    if (!star) return;
    currentRating = parseInt(star.dataset.value);
    reviewModalStars.querySelectorAll(".star").forEach((s, i) => {
      s.classList.toggle("selected", i < currentRating);
    });
  });

  // View all reviews button in top-3 section
  myPastReviewsListEl.addEventListener("click", (e) => {
    if (e.target.id !== "viewAllReviewsBtn") return;
    fetchPaginatedReviews(1);
    showPage("all-reviews");
    updateBreadcrumbs([
      { text: "Feedback", target: "feedback" },
      { text: "All Reviews" },
    ]);
  });

  // Back from all reviews
  const backBtn = document.getElementById("backToFeedbackBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      showPage("feedback");
      updateBreadcrumbs([{ text: "Feedback" }]);
    });
  }

  // Edit/Delete on both top-3 and full lists
  document.addEventListener("click", (e) => {
    console.log("CLICKED:", e.target);

    if (e.target.classList.contains("edit-review-btn")) {
      console.log("✔ EDIT BUTTON CLICKED");
      console.log("reviewId =", e.target.dataset.reviewId);

      const id = e.target.dataset.reviewId;

      const review =
        paginatedReviews.find((r) => r.id == id) ||
        myPastReviews.find((r) => r.id == id) ||
        null;

      console.log("FOUND REVIEW OBJECT:", review);

      if (review) openEditReview(review);
      else console.log("✘ REVIEW NOT FOUND");
    }

    if (e.target.classList.contains("delete-review-btn")) {
      console.log("✔ DELETE BUTTON CLICKED");
      console.log("reviewId =", e.target.dataset.reviewId);

      const id = e.target.dataset.reviewId;

      handleDeleteReview(id);
    }
  });

  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("view-invoice-btn")) {
      const id = e.target.dataset.paymentId;
      window.open(`${BASE_URL}/api/payments/${id}/invoice/pdf`, "_blank");
    }
  });
}

// =========================================================================
// ==  APP INITIALIZATION (ENTRY POINT)
// =========================================================================

async function main() {
  if (!token) {
    window.location.href = "/login";
    return;
  }

  await fetchData();
  renderAllPages();
  initEventListeners();
  initSocket();

  updateTime();
  setInterval(updateTime, 60000);

  showPage("home");
}
