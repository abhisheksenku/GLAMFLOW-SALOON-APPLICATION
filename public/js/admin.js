document.addEventListener("DOMContentLoaded", function () {
  // =========================================================================
  // == GLOBAL SCOPE & INITIAL CHECKS ==
  // =========================================================================
  const token = sessionStorage.getItem("token");
  if (!token) {
    window.location.href = "/login"; // Redirect if not logged in
    return;
  }
  const logoutBtn = document.querySelector(".btn.logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      sessionStorage.removeItem("token");
      window.location.href = "/login";
    });
  }

  // --- Global Data Store ---
  let allClients = [];
  let allStaff = [];
  let allServices = [];
  let allAppointments = [];
  let allPayments = [];
  let allReviews = [];

  let clientSearchTimeout;
  let staffSearchTimeout;
  let serviceSearchTimeout;
  let clientSearchTerm = ""; // <-- ADD THIS
  let clientsCurrentPage = 1; // <-- ADD THIS
  let clientsTotalPages = 1; // <-- ADD THIS
  let staffCurrentPage = 1;
  let staffTotalPages = 1;
  let staffSearchTerm = "";
  let servicesCurrentPage = 1;
  let servicesTotalPages = 1;
  let serviceSearchTerm = "";
  let paymentsCurrentPage = 1;
  let paymentsTotalPages = 1;
  let paymentSearchTerm = "";
  let apptCurrentPage = 1;
  let apptTotalPages = 1;
  let apptSearchTerm = "";
  let reviewsCurrentPage = 1;
  let reviewsTotalPages = 1;
  let reviewsSearchTerm = "";

  let socket = null;
  let chatConversations = new Map(); // Stores all chats { 12: { name: "User 12", messages: [], unread: false } }
  let currentChatTargetId = null; // The user ID of the currently open chat
  let myProfile = null; // We need this to get the staff/admin ID
  // =========================================================================
  // == GLOBAL HELPER FUNCTIONS ==
  // =========================================================================

  // --- Data Helpers ---
  // const findById = (arr, id) => arr.find((item) => item.id == id) || {}; // Use == for potential string/number mismatch
  const safeDate = (dateStr) => {
    const d = new Date(dateStr);
    return isNaN(d) ? null : d;
  };
  const formatDate = (date) =>
    date ? date.toLocaleDateString("en-IN") : "N/A";
  const formatTime = (date) =>
    date
      ? date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
      : "N/A";

  function renderPagination(containerId, totalPages, currentPage, onPageClick) {
    console.log(
      "PAGINATION_RENDER",
      containerId,
      "totalPages=",
      totalPages,
      "currentPage=",
      currentPage
    );
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

    if (prevBtn) {
      console.log("PAGINATION_CLICK", containerId, "-> page", currentPage - 1);
      prevBtn.addEventListener("click", () => onPageClick(currentPage - 1));
    }
    if (nextBtn) {
      console.log("PAGINATION_CLICK", containerId, "-> page", currentPage + 1);
      nextBtn.addEventListener("click", () => onPageClick(currentPage + 1));
    }
  }
  // --- API Fetch Wrapper --
  async function fetchClients(page = 1, status = "active", search = "") {
    clientSearchTerm = search;
    try {
      const res = await axios.get(`${BASE_URL}/api/admin/fetch/users`, {
        params: {
          page: page,
          limit: 5, // <-- Set to 5 for "no scrolling"
          status: status,
          search: search, // We'll add search logic later
        },
        headers: { Authorization: `Bearer ${token}` },
      });

      const { totalItems, totalPages, currentPage, users } = res.data;

      // Update global state
      allClients = users; // This now only holds one page
      clientsCurrentPage = currentPage;
      clientsTotalPages = totalPages;
      userStatusFilter.value = status; // Keep dropdown in sync

      // Re-render
      renderClientsList(); // Render the table with the new page of users
      renderPagination(
        "clientsPagination",
        clientsTotalPages,
        clientsCurrentPage,
        (newPage) => fetchClients(newPage, status, clientSearchTerm) // Pass the function to call on click
      );
    } catch (error) {
      console.error("Failed to fetch clients:", error);
      clientsTableBody.innerHTML = `<tr><td colspan="7">Could not load clients.</td></tr>`;
    }
  }

  async function fetchStaff(page = 1, search = "") {
    staffSearchTerm = search; // Store state
    try {
      const res = await axios.get(`${BASE_URL}/api/admin/fetch/staffs`, {
        params: {
          page: page,
          limit: 6, // 6 cards per page
          search: search,
        },
        headers: { Authorization: `Bearer ${token}` },
      });

      const { totalItems, totalPages, currentPage, staff } = res.data;

      allStaff = staff; // Update global state
      staffCurrentPage = currentPage;
      staffTotalPages = totalPages;

      renderStaffList(); // Render the 6 cards
      renderPagination(
        "staffPagination",
        staffTotalPages,
        staffCurrentPage,
        (newPage) => fetchStaff(newPage, staffSearchTerm)
      );
    } catch (error) {
      console.error("Failed to fetch staff:", error);
      document.getElementById(
        "staffList"
      ).innerHTML = `<p>Could not load staff.</p>`;
    }
  }

  async function fetchServices(page = 1, search = "") {
    serviceSearchTerm = search; // Store state
    try {
      const res = await axios.get(`${BASE_URL}/api/admin/fetch/services`, {
        params: {
          page: page,
          limit: 6, // 6 cards per page
          search: search,
        },
        headers: { Authorization: `Bearer ${token}` },
      });

      const { totalItems, totalPages, currentPage, services } = res.data;

      allServices = services; // Update global state
      servicesCurrentPage = currentPage;
      servicesTotalPages = totalPages;

      renderServicesList(); // Render the 6 cards
      renderPagination(
        "servicesPagination",
        servicesTotalPages,
        servicesCurrentPage,
        (newPage) => fetchServices(newPage, serviceSearchTerm)
      );
    } catch (error) {
      console.error("Failed to fetch services:", error);
      document.getElementById(
        "serviceList"
      ).innerHTML = `<p>Could not load services.</p>`;
    }
  }

  async function fetchPayments(page = 1, search = "") {
    paymentSearchTerm = search;
    try {
      const res = await axios.get(`${BASE_URL}/api/admin/fetch/payments`, {
        params: {
          page: page,
          limit: 5, // 10 per page
          search: search, // For later
        },
        headers: { Authorization: `Bearer ${token}` },
      });

      const { totalItems, totalPages, currentPage, payments } = res.data;

      allPayments = payments; // Update global state
      paymentsCurrentPage = currentPage;
      paymentsTotalPages = totalPages;

      renderPaymentsTable(); // Render the table with the new page of users
      renderPagination(
        "paymentsPagination",
        paymentsTotalPages,
        paymentsCurrentPage,
        (newPage) => fetchPayments(newPage, paymentSearchTerm)
      );
    } catch (error) {
      console.error("Failed to fetch payments:", error);
      paymentTable.innerHTML = `<tr><td colspan="6">Could not load payments.</td></tr>`;
    }
  }
  async function fetchAppointments(page = 1, search = "") {
    console.log(
      "FETCH_APPOINTMENTS",
      "requestedPage=",
      page,
      "search=",
      search
    );
    apptSearchTerm = search;

    try {
      const res = await axios.get(`${BASE_URL}/api/admin/fetch/bookings`, {
        params: {
          page,
          limit: 10,
          search,
        },
        headers: { Authorization: `Bearer ${token}` },
      });

      const { bookings, totalPages, currentPage } = res.data;

      allAppointments = bookings;
      apptCurrentPage = currentPage;
      apptTotalPages = totalPages;

      renderAppointmentsTable(allAppointments);

      renderPagination(
        "appointmentsPagination",
        apptTotalPages,
        apptCurrentPage,
        (newPage) => fetchAppointments(newPage, apptSearchTerm)
      );
    } catch (err) {
      console.error("Failed to fetch appointments:", err);
    }
  }
  async function fetchReviews(page = 1, search = "") {
    console.log("FETCH_REVIEWS", "requestedPage=", page, "search=", search);
    reviewsSearchTerm = search;

    try {
      const res = await axios.get(`${BASE_URL}/api/admin/fetch/reviews`, {
        params: { page, limit: 10, search },
        headers: { Authorization: `Bearer ${token}` },
      });

      const { reviews, totalPages, currentPage } = res.data;

      allReviews = reviews;
      reviewsCurrentPage = currentPage;
      reviewsTotalPages = totalPages;

      renderReviewsPage();

      renderPagination(
        "reviewsPagination",
        reviewsTotalPages,
        reviewsCurrentPage,
        (newPage) => fetchReviews(newPage, reviewsSearchTerm)
      );
    } catch (err) {
      console.error("Failed to fetch reviews:", err);
    }
  }

  async function fetchData(endpoint) {
    try {
      // Assuming BASE_URL is defined globally (e.g., in config.js)
      const res = await axios.get(`${BASE_URL}/api/admin/fetch/${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }, // Send token with fetch requests
      });
      return res.data;
    } catch (err) {
      console.error(`Error fetching ${endpoint}:`, err);
      if (err.response && err.response.status === 401) {
        // Handle unauthorized access (e.g., token expired)
        sessionStorage.removeItem("token");
        window.location.href = "/login";
      }
      return []; // Return empty array on error
    }
  }

  // --- UI Notification Helper ---
  const showNotification = (message, isError = false) => {
    const notification = document.createElement("div");
    notification.className = `notification ${isError ? "error" : "success"}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  };

  // --- Confirmation Modal Helper ---
  const showConfirmationModal = (message) => {
    return new Promise((resolve) => {
      const modal = document.getElementById("confirmationModal");
      const confirmBtn = document.getElementById("confirmBtn");
      const cancelBtn = document.getElementById("cancelBtn");
      const messageEl = document.getElementById("confirmMessage");

      if (!modal || !confirmBtn || !cancelBtn || !messageEl) {
        console.error("Confirmation modal elements not found!");
        return resolve(false); // Ensure promise resolves even if modal broken
      }

      messageEl.textContent = message;
      modal.classList.add("active");

      const onConfirm = () => cleanup(true);
      const onCancel = () => cleanup(false);
      const cleanup = (result) => {
        modal.classList.remove("active");
        confirmBtn.removeEventListener("click", onConfirm);
        cancelBtn.removeEventListener("click", onCancel);
        resolve(result);
      };

      confirmBtn.addEventListener("click", onConfirm);
      cancelBtn.addEventListener("click", onCancel);
    });
  };
  function renderWeeklySchedule(weeklySchedule) {
    const container = document.getElementById("weeklyScheduleContainer");
    container.innerHTML = "";

    const days = Object.keys(weeklySchedule);

    days.forEach((day) => {
      const sched = weeklySchedule[day];

      container.innerHTML += `
      <div class="day-row">
        <strong>${day}</strong>

        <label>
          <input type="checkbox" class="day-off-toggle" data-day="${day}" ${
        sched.isOff ? "checked" : ""
      }>
          Day Off
        </label>

        <input type="time" class="start-time" data-day="${day}" value="${
        sched.startTime
      }" ${sched.isOff ? "disabled" : ""}>

        <input type="time" class="end-time" data-day="${day}" value="${
        sched.endTime
      }" ${sched.isOff ? "disabled" : ""}>
      </div>
    `;
    });
  }

  // =========================================================================
  // == NAVIGATION & SPA (Single Page Application) LOGIC ==
  // =========================================================================

  // --- DOM Elements ---
  const sidebar = document.querySelector(".sidebar");
  const hamburger = document.querySelector(".hamburger");
  const overlay = document.querySelector(".overlay");
  const navLinks = document.querySelectorAll(".sidebar .nav a");
  const contentSections = document.querySelectorAll(".page-content");
  const dateTimeEl = document.getElementById("dateTime");
  const allViews = document.querySelectorAll(".page-content"); // Used by showView
  const breadcrumbsEl = document.getElementById("breadcrumbs");

  // --- Functions ---
  function updateBreadcrumbs(parts) {
    // parts = [{text: 'Services', target: 'services'}, {text: 'Add New'}]
    if (!breadcrumbsEl) return;

    let html = "";
    parts.forEach((part, index) => {
      if (index > 0) {
        html += `<span class="separator"> / </span>`; // Add separator
      }

      if (part.target && index < parts.length - 1) {
        // Make it a clickable link if it has a target and isn't the last item
        html += `<a href="#" data-nav-target="${part.target}">${part.text}</a>`;
      } else {
        // Last item or non-clickable item
        html += `<span>${part.text}</span>`;
      }
    });
    breadcrumbsEl.innerHTML = html;
  }
  function showPage(targetId) {
    contentSections.forEach((s) => s.classList.remove("active"));
    navLinks.forEach((l) => l.classList.remove("active"));

    const targetSection = document.getElementById(targetId + "-content");
    const targetLink = document.querySelector(
      `.nav a[data-target="${targetId}"]`
    );

    if (targetSection) targetSection.classList.add("active");
    if (targetLink) targetLink.classList.add("active");

    // Close sidebar on mobile after navigation
    if (window.innerWidth <= 768) {
      sidebar.classList.remove("open");
      overlay.classList.remove("open");
    }
    const breadcrumbText = targetLink
      ? targetLink.textContent
      : targetId.charAt(0).toUpperCase() + targetId.slice(1); // Get text from link or capitalize ID
    updateBreadcrumbs([{ text: breadcrumbText }]);
    if (targetId === "services") {
      // Decide which sub-view to show by default when clicking Services in sidebar
      showServiceView("add"); // Show 'add' form by default
    } else if (targetId === "clients") {
      //showClientView("list"); // Show 'list' view by default
      updateBreadcrumbs([{ text: "Clients" }]);
    } else if (targetId === "staff") {
      // Set default breadcrumbs when clicking 'Staff' in sidebar
      updateBreadcrumbs([{ text: "Staff" }]);
      showView("staff-content");
    } else if (targetId === "appointments") {
      // <-- ADD THIS
      updateBreadcrumbs([{ text: "Appointments" }]);
      showView("appointments-content"); // Show appointments list
    } else if (targetId === "revenue") {
      showRevenueView("dashboard");
    }
  }

  // Helper to switch between sub-views within a page (like Client Details/Edit)
  const showView = (viewId) => {
    allViews.forEach((view) => view.classList.remove("active"));
    const viewToShow = document.getElementById(viewId);
    if (viewToShow) viewToShow.classList.add("active");
  };

  function updateTime() {
    if (!dateTimeEl) return;
    const now = new Date();
    dateTimeEl.textContent = now.toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // --- Event Listeners ---
  navLinks.forEach((l) =>
    l.addEventListener("click", (e) => {
      e.preventDefault();
      showPage(l.getAttribute("data-target"));
    })
  );

  hamburger.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    overlay.classList.toggle("open");
  });

  overlay.addEventListener("click", () => {
    sidebar.classList.remove("open");
    overlay.classList.remove("open");
  });
  if (breadcrumbsEl) {
    breadcrumbsEl.addEventListener("click", (event) => {
      if (event.target.tagName === "A" && event.target.dataset.navTarget) {
        event.preventDefault();
        const targetId = event.target.dataset.navTarget;
        // When clicking a breadcrumb link, typically go back to the main section's default view
        showPage(targetId);
        // Example: If clicking 'Services' breadcrumb link, showPage('services') runs,
        // which will then call showServiceView('add') (based on Step C). Adjust as needed.
      }
    });
  }
  document.addEventListener("change", (e) => {
    if (e.target.classList.contains("day-off-toggle")) {
      const day = e.target.dataset.day;
      const isOff = e.target.checked;

      const startInput = document.querySelector(
        `.start-time[data-day="${day}"]`
      );
      const endInput = document.querySelector(`.end-time[data-day="${day}"]`);

      startInput.disabled = isOff;
      endInput.disabled = isOff;
    }
  });

  // --- Initial Setup ---
  updateTime();
  setInterval(updateTime, 60000); // Update time every minute

  // =========================================================================
  // == DASHBOARD SECTION (#dashboard-content) ==
  // =========================================================================

  // --- DOM Elements ---
  // (Elements are accessed directly in renderDashboard via getElementById)

  // --- Functions ---
  function renderDashboard() {
    const todayStr = new Date().toISOString().split("T")[0];

    const todaysAppointments = (allAppointments || []).filter((a) => {
      // Assuming your API returns 'startTime' as a full ISO string or Date object
      const date = safeDate(a.startTime);
      return date && date.toISOString().split("T")[0] === todayStr;
    });

    // Sort today's appointments by time for accurate 'next' display
    todaysAppointments.sort(
      (a, b) => new Date(a.startTime) - new Date(b.startTime)
    );

    const confirmedTodays = todaysAppointments.filter(
      (a) => a.status === "confirmed"
    ); // Match ENUM

    document.getElementById("todaysAppointments").textContent =
      confirmedTodays.length;

    // Find the *next* confirmed appointment based on current time
    const now = new Date();
    const nextAppt = confirmedTodays.find((a) => new Date(a.startTime) > now);

    document.getElementById("nextAppointmentInfo").textContent = nextAppt
      ? `${nextAppt.Service?.name || "N/A"} at ${formatTime(
          safeDate(nextAppt.startTime)
        )}`
      : "None upcoming";

    // Assuming payments are linked to bookings and bookings have dates
    const todaysRevenue = (allPayments || [])
      .filter((p) => {
        const bookingDate = safeDate(p.Booking?.startTime); // Check payment via booking date
        return (
          bookingDate &&
          bookingDate.toISOString().split("T")[0] === todayStr &&
          p.status === "SUCCESSFUL"
        ); // Only count completed payments today
      })
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    document.getElementById(
      "todaysRevenue"
    ).textContent = `₹${todaysRevenue.toLocaleString("en-IN")}`;

    // Client count (assuming allClients holds active users)
    document.getElementById("totalClientsCount").textContent = (
      allClients || []
    ).filter((c) => !c.deletedAt).length; // Count only non-deleted

    const validReviews = (allReviews || []).filter((r) => r.rating > 0);
    const avgRating =
      validReviews.length > 0
        ? (
            validReviews.reduce((s, r) => s + r.rating, 0) / validReviews.length
          ).toFixed(1)
        : "N/A";

    document.getElementById("avgRatingHome").textContent =
      avgRating !== "N/A" ? `⭐ ${avgRating}` : "N/A";
    document.getElementById("totalReviewsCount").textContent =
      validReviews.length;

    // --- Today's Schedule Table ---
    const scheduleTable = document.getElementById("todaysScheduleTable");
    if (!scheduleTable) return;

    scheduleTable.innerHTML =
      todaysAppointments.length === 0
        ? '<tr><td colspan="5">No appointments scheduled for today.</td></tr>'
        : todaysAppointments
            .map(
              (a) => `
              <tr>
                <td>${formatTime(safeDate(a.startTime)) || "N/A"}</td>
                <td>${a.User?.name || "N/A"}</td>
                <td>${a.Service?.name || "N/A"}</td>
                <td>${a.Staff?.User?.name || "N/A"}</td>
                <td><span class="status ${a.status?.toLowerCase() || ""}">${
                a.status || "N/A"
              }</span></td>
              </tr>`
            )
            .join("");
  }

  const initDashboardPage = () => renderDashboard(); // Simple init function

  // --- Event Listeners ---
  // (None specific to the dashboard cards/table itself yet)

  // =========================================================================
  // == APPOINTMENTS SECTION (#appointments-content) ==
  // =========================================================================

  // --- DOM Elements ---
  const allAppointmentsTable = document.getElementById("allAppointmentsTable");
  const appointmentEditView = document.getElementById(
    "appointment-edit-content"
  );
  const backToApptListBtn = document.getElementById("backToApptListBtn");
  const editAppointmentForm = document.getElementById("editAppointmentForm");
  const editBookingId = document.getElementById("editBookingId");
  const editApptClientName = document.getElementById("editApptClientName");
  const editApptServiceName = document.getElementById("editApptServiceName");
  const editApptDate = document.getElementById("editApptDate");
  const editApptTimeSlot = document.getElementById("editApptTimeSlot");
  const editApptStaff = document.getElementById("editApptStaff");
  const apptFilterDate = document.getElementById("apptFilterDate");
  const apptFilterStaff = document.getElementById("apptFilterStaff");
  const apptFilterStatus = document.getElementById("apptFilterStatus");
  const applyApptFilterBtn = document.getElementById("applyApptFilterBtn");
  const resetApptFilterBtn = document.getElementById("resetApptFilterBtn");
  const showCreateApptBtn = document.getElementById("showCreateApptBtn");
  const appointmentCreateView = document.getElementById(
    "appointment-create-content"
  );
  const backToApptListBtn_Create = document.getElementById(
    "backToApptListBtn_Create"
  );
  const createAppointmentForm = document.getElementById(
    "createAppointmentForm"
  );
  const createApptClient = document.getElementById("createApptClient");
  const createApptService = document.getElementById("createApptService");
  const createApptStaff = document.getElementById("createApptStaff");
  const createApptDate = document.getElementById("createApptDate");
  const createApptTimeSlot = document.getElementById("createApptTimeSlot");
  // --- Functions ---
  function renderAppointmentsTable(appointmentsToRender) {
    if (!allAppointmentsTable) return;
    // .sort((a, b) => new Date(b.startTime) - new Date(a.startTime)) // Sort newest first
    allAppointmentsTable.innerHTML = (appointmentsToRender || [])
      .sort((a, b) => new Date(a.date) - new Date(b.date)) // Sort by date (oldest first is usually better for lists)
      .map(
        (a) => `
         <tr>
           <td>${formatDate(safeDate(a.date))}<br><small>${
          a.timeSlot
        }</small></td>
           <td>${a.User?.name || "N/A"}</td>
           <td>${a.Service?.name || "N/A"}</td>
           <td>${a.Staff?.User?.name || "N/A"}</td>
           <td><span class="status ${a.status?.toLowerCase() || ""}">${
          a.status || "N/A"
        }</span></td>
           <td class="appt-actions">
             <button class="appt-status-btn" data-booking-id="${
               a.id
             }" data-status="confirmed" title="Confirm" ${
          a.status === "confirmed" || a.status === "completed" ? "disabled" : ""
        }>✔️</button>

             <button class="appt-status-btn" data-booking-id="${
               a.id
             }" data-status="cancelled" title="Cancel" ${
          a.status === "cancelled" || a.status === "completed" ? "disabled" : ""
        }>❌</button>
             <button class="edit-appt-btn" data-booking-id="${
               a.id
             }" title="Edit"${
          a.status === "completed" || a.status === "cancelled" ? "disabled" : ""
        }>🖊️</button>
           </td>
         </tr>`
      )
      .join("");
    if (appointmentsToRender.length === 0) {
      allAppointmentsTable.innerHTML =
        '<tr><td colspan="6">No appointments found.</td></tr>';
    }
  }
  // const initAppointmentsPage = () => renderAppointmentsTable();
  const initAppointmentsPage = () => {
    // 1. Populate the staff filter dropdown
    populateStaffFilter();

    // 2. Render the table with ALL appointments
    renderAppointmentsTable(allAppointments);
  };
  async function showAppointmentEditView(bookingId) {
    try {
      // 1. Find the booking data from our local array
      const booking = allAppointments.find((a) => a.id == bookingId);
      if (!booking) {
        showNotification("Error: Could not find appointment data.", true);
        return;
      }

      // 2. Populate the read-only fields
      editBookingId.value = booking.id;
      editApptClientName.textContent = booking.User?.name || "N/A";
      editApptServiceName.textContent = booking.Service?.name || "N/A";

      // 3. Populate the form fields

      // Format the date for the <input type="date">
      const dateObj = safeDate(booking.date);
      if (dateObj) {
        // Format as YYYY-MM-DD
        editApptDate.value = dateObj.toISOString().split("T")[0];
      }

      editApptTimeSlot.value = booking.timeSlot || "";

      // 4. Populate the Staff dropdown
      editApptStaff.innerHTML = (allStaff || [])
        .map(
          (staff) =>
            `<option value="${staff.id}">
           ${staff.User?.name || "Unknown Staff"} (${
              staff.specialty || "Staff"
            })
         </option>`
        )
        .join("");

      // Set the dropdown to the currently assigned staff member
      editApptStaff.value = booking.staffId || "";

      // 5. Update Breadcrumbs
      updateBreadcrumbs([
        { text: "Appointments", target: "appointments" },
        { text: "Edit" },
      ]);

      // 6. Switch Views
      showView("appointment-edit-content");
    } catch (error) {
      console.error("Error opening edit appointment view:", error);
      showNotification("Could not load edit view.", true);
    }
  }
  function populateStaffFilter() {
    if (!apptFilterStaff || !allStaff) return;

    // Start with the default option
    let optionsHtml = '<option value="">All Staff</option>';

    optionsHtml += allStaff
      .map((staff) => {
        // Use the nested User object for the name
        const staffName = staff.User?.name || "Unknown Staff";
        return `<option value="${staff.id}">${staffName}</option>`;
      })
      .join("");

    apptFilterStaff.innerHTML = optionsHtml;
  }

  /**
   * Applies filters to the allAppointments list and re-renders the table
   */
  function applyAppointmentFilters() {
    // 1. Get all filter values
    const date = apptFilterDate.value;
    const staffId = apptFilterStaff.value;
    const status = apptFilterStatus.value;

    // 2. Start with the full list
    let filteredAppointments = allAppointments;

    // 3. Apply filters one by one
    if (date) {
      // This checks if the appointment's date string starts with the YYYY-MM-DD value
      filteredAppointments = filteredAppointments.filter(
        (a) => a.date && a.date.startsWith(date)
      );
    }
    if (staffId) {
      // Use == to compare string (from dropdown) to number (from data)
      filteredAppointments = filteredAppointments.filter(
        (a) => a.staffId == staffId
      );
    }
    if (status) {
      filteredAppointments = filteredAppointments.filter(
        (a) => a.status === status
      );
    }

    // 4. Re-render the table with the filtered list
    renderAppointmentsTable(filteredAppointments);
  }
  function showAppointmentCreateView() {
    // 1. Reset the form
    if (createAppointmentForm) createAppointmentForm.reset();

    // 2. Populate Clients dropdown
    // We use allClients (which should be fetched on load)
    if (createApptClient && allClients) {
      createApptClient.innerHTML =
        '<option value="">Select a client...</option>' +
        allClients
          .filter((c) => c.role !== "admin" && c.deletedAt === null) // Filter for active clients/staff
          .map(
            (client) => `<option value="${client.id}">${client.name}</option>`
          )
          .join("");
    }

    // 3. Populate Services dropdown
    if (createApptService && allServices) {
      createApptService.innerHTML =
        '<option value="">Select a service...</option>' +
        allServices
          .filter((s) => s.available) // Only show available services
          .map(
            (service) =>
              `<option value="${service.id}">${service.name}</option>`
          )
          .join("");
    }

    // 4. Populate Staff dropdown
    if (createApptStaff) {
      createApptStaff.innerHTML =
        '<option value="">Select a service first...</option>';
      createApptStaff.disabled = true; // Disable it
    }

    // 5. Update Breadcrumbs
    updateBreadcrumbs([
      { text: "Appointments", target: "appointments" },
      { text: "Create New" },
    ]);

    // 6. Switch Views
    showView("appointment-create-content");
  }
  // --- Event Listeners ---
  if (allAppointmentsTable) {
    allAppointmentsTable.addEventListener("click", async (event) => {
      const statusButton = event.target.closest(".appt-status-btn");

      // --- Handle Status Clicks (Confirm/Cancel) ---
      if (statusButton) {
        event.preventDefault();
        const bookingId = statusButton.dataset.bookingId;
        const newStatus = statusButton.dataset.status; // 'confirmed' or 'cancelled'

        // 1. Get confirmation
        const actionText = newStatus === "cancelled" ? "Cancel" : "Confirm";
        const confirmed = await showConfirmationModal(
          `${actionText} this appointment?`
        );

        if (!confirmed) return; // User clicked 'Cancel' in modal

        // 2. Send API Request
        try {
          const response = await axios.patch(
            `${BASE_URL}/api/admin/bookings/${bookingId}/status`,
            { status: newStatus },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          // 3. Update local data
          const updatedBooking = response.data.booking;
          const index = allAppointments.findIndex((a) => a.id == bookingId);
          if (index !== -1) {
            allAppointments[index] = {
              ...allAppointments[index],
              ...updatedBooking,
            };
          }

          showNotification(`Appointment ${newStatus}.`);

          // 4. Re-render UI
          applyAppointmentFilters();
          renderDashboard(); // Re-render dashboard in case it was a 'today' appointment
        } catch (error) {
          console.error("Failed to update booking status:", error);
          showNotification("Update failed. Please try again.", true);
        }
      }

      // --- Handle Edit Click (Placeholder for next step) ---
      const editButton = event.target.closest(".edit-appt-btn");
      if (editButton) {
        event.preventDefault();
        const bookingId = editButton.dataset.bookingId;
        showAppointmentEditView(bookingId);
        //console.log(`Edit clicked for booking ${bookingId} (Logic TBD)`);
        // We will implement this modal/logic next
      }
    });
  }
  // Handle "Back" button click
  if (backToApptListBtn) {
    backToApptListBtn.addEventListener("click", () => {
      showView("appointments-content"); // Show the main list
      updateBreadcrumbs([{ text: "Appointments" }]); // Reset breadcrumbs
    });
  }
  // Handle "Save Changes" form submission
  if (editAppointmentForm) {
    editAppointmentForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const bookingId = editBookingId.value;
      const updatedData = {
        date: editApptDate.value,
        timeSlot: editApptTimeSlot.value,
        staffId: parseInt(editApptStaff.value, 10),
      };

      try {
        // 1. Send PUT request to the backend
        const response = await axios.put(
          `${BASE_URL}/api/admin/bookings/${bookingId}`,
          updatedData,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // 2. Update local data
        const updatedBooking = response.data.booking;
        const index = allAppointments.findIndex((a) => a.id == bookingId);
        if (index !== -1) {
          allAppointments[index] = updatedBooking; // Replace old with new
        }

        showNotification("Appointment updated successfully!");

        // 3. Re-render table and go back to list
        applyAppointmentFilters();
        showView("appointments-content");
        updateBreadcrumbs([{ text: "Appointments" }]);
      } catch (error) {
        const msg =
          error.response?.data?.message || "Update failed. Please try again.";
        showNotification(msg, true);
      }
    });
  }
  if (applyApptFilterBtn) {
    applyApptFilterBtn.addEventListener("click", applyAppointmentFilters);
  }

  // Handle "Reset" button click
  if (resetApptFilterBtn) {
    resetApptFilterBtn.addEventListener("click", () => {
      // 1. Clear the filter inputs
      apptFilterDate.value = "";
      apptFilterStaff.value = "";
      apptFilterStatus.value = "";

      // 2. Re-render the table with the full, unfiltered list
      renderAppointmentsTable(allAppointments);
    });
  }
  // --- Listeners for Create View ---

  // Handle "Create Appointment" button click
  if (showCreateApptBtn) {
    showCreateApptBtn.addEventListener("click", showAppointmentCreateView);
  }

  // Handle "Back" button click from Create view
  if (backToApptListBtn_Create) {
    backToApptListBtn_Create.addEventListener("click", () => {
      showView("appointments-content"); // Show the main list
      updateBreadcrumbs([{ text: "Appointments" }]); // Reset breadcrumbs
    });
  }

  // Handle the "Create" form submission
  if (createAppointmentForm) {
    createAppointmentForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const newBookingData = {
        userId: parseInt(createApptClient.value, 10),
        serviceId: parseInt(createApptService.value, 10),
        staffId: parseInt(createApptStaff.value, 10),
        date: createApptDate.value,
        timeSlot: createApptTimeSlot.value,
      };

      try {
        // 1. Send POST request
        const response = await axios.post(
          `${BASE_URL}/api/admin/bookings/create`,
          newBookingData,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // 2. Add new booking to local data
        const newBooking = response.data.booking;
        allAppointments.push(newBooking); // Add to the main array

        showNotification("Appointment created successfully!");

        // 3. Re-apply filters (which also re-renders) and go back
        applyAppointmentFilters();
        showView("appointments-content");
        updateBreadcrumbs([{ text: "Appointments" }]);
      } catch (error) {
        const msg =
          error.response?.data?.message || "Creation failed. Please try again.";
        showNotification(msg, true);
      }
    });
  }
  // --- NEW LISTENER for Create Form ---

  // Listen for changes on the "Service" dropdown
  if (createApptService) {
    createApptService.addEventListener("change", async () => {
      const serviceId = createApptService.value;

      if (!serviceId) {
        // If user deselects service, reset staff dropdown
        createApptStaff.innerHTML =
          '<option value="">Select a service first...</option>';
        createApptStaff.disabled = true;
        return;
      }

      try {
        // 1. Call the new API endpoint
        const response = await axios.get(
          `${BASE_URL}/api/admin/services/${serviceId}/staff`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const staffList = response.data;

        // 2. Populate Staff dropdown
        if (staffList.length > 0) {
          createApptStaff.innerHTML =
            '<option value="">Select a staff member...</option>' +
            staffList
              .map(
                (staff) =>
                  // staff.User.name is available because we included it in the controller
                  `<option value="${staff.id}">${staff.User.name}</option>`
              )
              .join("");
          createApptStaff.disabled = false; // Enable the dropdown
        } else {
          createApptStaff.innerHTML =
            '<option value="">No staff perform this service</option>';
          createApptStaff.disabled = true;
        }
      } catch (error) {
        console.error("Failed to fetch staff for service:", error);
        createApptStaff.innerHTML =
          '<option value="">Error loading staff</option>';
        createApptStaff.disabled = true;
      }
    });
  }
  // =========================================================================
  // ==  CLIENTS SECTION (#clients-content & #client-detail-content) ==
  // =========================================================================

  // --- DOM Elements ---
  const clientsTableBody = document.getElementById("clientsTable");
  const userStatusFilter = document.getElementById("userStatusFilter");
  const clientSearchInput = document.getElementById("clientSearchInput");
  const staffPageSearchInput = document.getElementById("staffPageSearchInput");
  const servicesPageSearchInput = document.getElementById(
    "servicesPageSearchInput"
  );
  const selectAllCheckbox = document.getElementById("selectAllCheckbox");
  const bulkActionContainer = document.getElementById("bulkActionContainer");
  const deactivateSelectedBtn = document.getElementById(
    "deactivateSelectedBtn"
  );
  const restoreBtn = document.getElementById("restoreSelectedBtn");
  // Detail/Edit View Elements
  const clientDisplayView = document.getElementById("client-display-view");
  const clientEditView = document.getElementById("client-edit-view");
  const editUserBtn = document.getElementById("editUserBtn");
  const cancelEditBtn = document.getElementById("cancelEditBtn"); // For Client Edit
  const editUserForm = document.getElementById("editUserForm");
  const backToClientsBtn = document.getElementById("backToClientsBtn");
  let currentUserId = null; // Store ID of client being viewed/edited

  // --- Functions ---
  function renderClientsList() {
    if (!userStatusFilter || !clientsTableBody) return;

    const status = userStatusFilter.value;
    const searchTerm = clientSearchInput.value.toLowerCase();

    let usersToRender = (allClients || []).filter((user) =>
      status === "deleted" ? user.deletedAt : !user.deletedAt
    );

    if (usersToRender.length === 0) {
      clientsTableBody.innerHTML = `<tr><td colspan="7">No ${
        status === "deleted" ? "deactivated" : "active"
      } users found ${searchTerm ? "matching search" : ""}.</td></tr>`;
      return;
    }

    const tableHtml = usersToRender
      .map((user) => {
        const actionButton =
          status === "deleted"
            ? `<button class="btn secondary restore-btn" data-user-id="${user.id}">Restore</button>`
            : `<button class="btn danger deactivate-btn" data-user-id="${user.id}">Deactivate</button>`;

        // Count bookings *locally* if included in fetch, otherwise default to 0
        const bookingCount = user.Bookings ? user.Bookings.length : 0;

        return `
          <tr>
            <td><input type="checkbox" class="client-checkbox" data-user-id="${
              user.id
            }"></td>
            <td><a href="#" class="table-link view-client-btn" data-user-id="${
              user.id
            }">${user.name}</a></td>
            <td>${user.email}</td>
            <td>${user.role}</td>
            <td>${bookingCount}</td>
            <td>${formatDate(safeDate(user.createdAt))}</td>
            <td>${actionButton}</td>
          </tr>`;
      })
      .join("");
    clientsTableBody.innerHTML = tableHtml;
    updateBulkActionUI(); // Ensure bulk actions are updated after render
    selectAllCheckbox.checked = false; // Uncheck select all after filtering/rendering
  }

  const showClientDetails = async (userId) => {
    if (!clientDisplayView || !clientEditView) return; // Ensure views exist

    currentUserId = userId;
    try {
      const response = await axios.get(
        `${BASE_URL}/api/admin/users/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const { user, bookings, staffProfile } = response.data; // Directly get user data

      // Populate Detail View
      document.getElementById("detailUserName").textContent = user.name;
      document.getElementById("detailUserEmail").textContent = user.email;
      document.getElementById("detailUserPhone").textContent = user.phone;
      document.getElementById("detailUserRole").textContent = user.role;
      document.getElementById("detailUserMemberSince").textContent = formatDate(
        safeDate(user.createdAt)
      );

      // Populate Edit Form (ready for edit click)
      document.getElementById(
        "editViewTitle"
      ).textContent = `Edit ${user.name}`;
      document.getElementById("editUserName").value = user.name;
      document.getElementById("editUserEmail").value = user.email;
      document.getElementById("editUserPhone").value = user.phone;
      document.getElementById("editUserRole").value = user.role;

      // Show/Hide Staff Specific Details
      const staffDetailsSection = document.getElementById(
        "staffDetailsSection"
      );
      if (user.Staff) {
        const schedule = user.Staff.weeklySchedule || {};

        const hoursDisplay = Object.entries(schedule)
          .map(([day, val]) => {
            if (val.isOff) return `${day}: Off`;
            return `${day}: ${val.startTime} - ${val.endTime}`;
          })
          .join(" | ");

        document.getElementById("detailStaffHours").textContent = hoursDisplay;

        staffDetailsSection.style.display = "block";
      } else {
        staffDetailsSection.style.display = "none";
      }

      showClientView("detail", [
        { text: "Clients", target: "clients" }, // Make 'Clients' clickable
        { text: user.name }, // Show the client's name
      ]);

      // Show Detail View, Hide Edit View initially
      clientDisplayView.style.display = "block";
      clientEditView.style.display = "none";
      showView("client-detail-content"); // Switch to the detail page section
    } catch (error) {
      console.error(`Failed to fetch details for user ${userId}:`, error);
      showNotification("Could not load client details.", true);
      showView("clients-content"); // Go back to list if details fail
    }
  };
  function showClientView(viewToShow, breadcrumbParts = []) {
    if (viewToShow === "list") {
      // 1. Show the main client list page
      showView("clients-content"); // Use global showView helper
      // 2. Update breadcrumbs
      updateBreadcrumbs([{ text: "Clients" }]);
    } else if (viewToShow === "detail") {
      // 1. Show the client detail page
      showView("client-detail-content"); // Use global showView helper
      // 2. Update breadcrumbs
      updateBreadcrumbs(breadcrumbParts); // e.g., [{ text: "Clients", target: "clients" }, { text: "Client Name" }]
    }
  }
  const updateBulkActionUI = () => {
    if (
      !bulkActionContainer ||
      !deactivateSelectedBtn ||
      !restoreBtn ||
      !userStatusFilter
    )
      return;

    const selectedCheckboxes = document.querySelectorAll(
      ".client-checkbox:checked"
    );
    const status = userStatusFilter.value;

    if (selectedCheckboxes.length > 0) {
      bulkActionContainer.style.display = "flex"; // Use flex for better alignment
      if (status === "deleted") {
        deactivateSelectedBtn.style.display = "none";
        restoreBtn.style.display = "inline-block";
        restoreBtn.textContent = `Restore (${selectedCheckboxes.length})`;
      } else {
        deactivateSelectedBtn.style.display = "inline-block";
        restoreBtn.style.display = "none";
        deactivateSelectedBtn.textContent = `Deactivate (${selectedCheckboxes.length})`;
      }
    } else {
      bulkActionContainer.style.display = "none";
    }
  };

  // --- Event Listeners ---
  if (clientsTableBody) {
    clientsTableBody.addEventListener("click", async (event) => {
      const target = event.target;

      // View Client Details
      if (target.classList.contains("view-client-btn")) {
        event.preventDefault();
        showClientDetails(target.dataset.userId);
      }

      // Deactivate Single Client
      if (target.classList.contains("deactivate-btn")) {
        const userId = target.dataset.userId;
        const confirmed = await showConfirmationModal(
          "Deactivate this user? They can be restored later."
        );
        if (confirmed) {
          try {
            await axios.delete(
              `${BASE_URL}/api/admin/users/${userId}/deactivate`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            showNotification("User deactivated.");
            // Remove from local list and re-render instantly
            allClients = allClients.filter((u) => u.id != userId);
            renderClientsList();
          } catch (err) {
            showNotification("Failed to deactivate.", true);
          }
        }
      }

      // Restore Single Client
      if (target.classList.contains("restore-btn")) {
        const userId = target.dataset.userId;
        // No confirmation usually needed for restore
        try {
          await axios.post(
            `${BASE_URL}/api/admin/users/${userId}/restore`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
          showNotification("User restored.");
          // Remove from local list (since it's no longer 'deleted') and re-render
          allClients = allClients.filter((u) => u.id != userId);
          renderClientsList();
        } catch (err) {
          showNotification("Failed to restore.", true);
        }
      }
    });

    // Update bulk UI when checkboxes change
    clientsTableBody.addEventListener("change", (event) => {
      if (event.target.classList.contains("client-checkbox")) {
        updateBulkActionUI();
      }
    });
  }

  // Edit/Cancel Buttons in Detail View
  if (editUserBtn)
    editUserBtn.addEventListener("click", () => {
      if (clientDisplayView) clientDisplayView.style.display = "none";
      if (clientEditView) clientEditView.style.display = "block";
    });
  if (cancelEditBtn)
    cancelEditBtn.addEventListener("click", () => {
      if (clientDisplayView) clientDisplayView.style.display = "block";
      if (clientEditView) clientEditView.style.display = "none";
      updateBreadcrumbs([
        { text: "Clients", target: "clients" },
        { text: currentViewingUser.name },
      ]);
    });
  if (backToClientsBtn)
    backToClientsBtn.addEventListener("click", () => showClientView("list"));

  // Client Edit Form Submission
  if (editUserForm)
    editUserForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!currentUserId) return;

      const updatedData = {
        name: document.getElementById("editUserName").value,
        email: document.getElementById("editUserEmail").value,
        phone: document.getElementById("editUserPhone").value,
        role: document.getElementById("editUserRole").value,
      };

      try {
        await axios.put(
          `${BASE_URL}/api/admin/users/update/${currentUserId}`,
          updatedData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showNotification("User updated successfully!");
        // Update local data for immediate reflection in the list if needed
        const index = allClients.findIndex((u) => u.id == currentUserId);
        if (index !== -1) {
          allClients[index] = { ...allClients[index], ...updatedData }; // Merge changes
        }
        await showClientDetails(currentUserId); // Re-fetch and show details view
      } catch (error) {
        const msg = error.response?.data?.message || "Update failed.";
        showNotification(msg, true);
      }
    });

  // Client List Filters & Search
  // if (userStatusFilter) userStatusFilter.addEventListener("change", renderClientsList); // Fetching is handled in initializeApp or a dedicated refresh function now
  if (userStatusFilter) {
    userStatusFilter.addEventListener("change", () => {
      const status = userStatusFilter.value;
      const search = clientSearchInput.value; // Keep current search term
      fetchClients(1, status, search); // Re-fetch clients from backend
    });
  }

  clientSearchInput.addEventListener("input", (e) => {
    clearTimeout(clientSearchTimeout);
    const searchTerm = e.target.value;
    const status = userStatusFilter.value; // Get current status
    // Wait 500ms after user stops typing
    clientSearchTimeout = setTimeout(() => {
      fetchClients(1, status, searchTerm); // Go back to page 1
    }, 500);
  });
  staffPageSearchInput.addEventListener("input", (e) => {
    clearTimeout(staffSearchTimeout);
    const searchTerm = e.target.value;
    staffSearchTimeout = setTimeout(() => {
      fetchStaff(1, searchTerm); // Fetch page 1
    }, 500);
  });
  servicesPageSearchInput.addEventListener("input", (e) => {
    clearTimeout(serviceSearchTimeout);
    const searchTerm = e.target.value;
    serviceSearchTimeout = setTimeout(() => {
      fetchServices(1, searchTerm); // Fetch page 1
    }, 500);
  });

  if (selectAllCheckbox)
    selectAllCheckbox.addEventListener("change", () => {
      document
        .querySelectorAll(".client-checkbox")
        .forEach((cb) => (cb.checked = selectAllCheckbox.checked));
      updateBulkActionUI();
    });

  // Bulk Actions
  if (restoreBtn)
    restoreBtn.addEventListener("click", async () => {
      const selectedIds = Array.from(
        document.querySelectorAll(".client-checkbox:checked")
      ).map((cb) => cb.dataset.userId);
      if (selectedIds.length === 0) return;
      const confirmed = await showConfirmationModal(
        `Restore ${selectedIds.length} user(s)?`
      );
      if (confirmed) {
        try {
          await Promise.all(
            selectedIds.map((id) =>
              axios.post(
                `${BASE_URL}/api/admin/users/${id}/restore`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
              )
            )
          );
          showNotification(`${selectedIds.length} user(s) restored.`);
          // Remove restored users from local list and re-render
          allClients = allClients.filter(
            (u) => !selectedIds.includes(String(u.id))
          );
          renderClientsList();
        } catch (err) {
          showNotification("Bulk restore failed.", true);
        }
      }
    });

  if (deactivateSelectedBtn)
    deactivateSelectedBtn.addEventListener("click", async () => {
      const selectedIds = Array.from(
        document.querySelectorAll(".client-checkbox:checked")
      ).map((cb) => cb.dataset.userId);
      if (selectedIds.length === 0) return;
      const confirmed = await showConfirmationModal(
        `Deactivate ${selectedIds.length} user(s)?`
      );
      if (confirmed) {
        try {
          await Promise.all(
            selectedIds.map((id) =>
              axios.delete(`${BASE_URL}/api/admin/users/${id}/deactivate`, {
                headers: { Authorization: `Bearer ${token}` },
              })
            )
          );
          showNotification(`${selectedIds.length} user(s) deactivated.`);
          // Remove deactivated users from local list and re-render
          allClients = allClients.filter(
            (u) => !selectedIds.includes(String(u.id))
          );
          renderClientsList();
        } catch (err) {
          showNotification("Bulk deactivation failed.", true);
        }
      }
    });

  // =========================================================================
  // == STAFF SECTION (#staff-content) ==
  // =========================================================================

  // --- DOM Elements ---
  const staffListContainer = document.getElementById("staffList"); // Renamed for clarity
  const backToStaffListBtn = document.getElementById("backToStaffListBtn");
  const staffDisplayView = document.getElementById("staff-display-view");
  const editStaffProfileBtn = document.getElementById("editStaffProfileBtn");
  const removeStaffRoleBtn = document.getElementById("removeStaffRoleBtn");
  const staffEditView = document.getElementById("staff-edit-view");
  const editStaffForm = document.getElementById("editStaffForm");
  const cancelEditStaffBtn = document.getElementById("cancelEditStaffBtn");
  const editStaffNameHeader = document.getElementById("editStaffNameHeader");

  // These TWO exist in your form
  const editStaffSpecialty = document.getElementById("editStaffSpecialty");
  const editStaffBio = document.getElementById("editStaffBio");

  // NEW for weekly schedule container
  const weeklyScheduleContainer = document.getElementById(
    "weeklyScheduleContainer"
  );

  // Services checkbox list
  const editStaffServicesList = document.getElementById(
    "editStaffServicesList"
  );
  let currentStaffId = null; // Store ID of staff being viewed
  let currentStaffUserId = null; // Store the associated User ID
  let currentStaffProfile = null; //to store the full staff object when viewing
  // --- Functions ---
  async function showStaffDetails(staffId) {
    try {
      const response = await axios.get(
        `${BASE_URL}/api/admin/staff/${staffId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const staff = response.data;
      currentStaffProfile = staff;

      currentStaffId = staff.id;
      currentStaffUserId = staff.User.id;

      // User info
      document.getElementById("detailStaffName").textContent = staff.User.name;
      document.getElementById("detailStaffEmail").textContent =
        staff.User.email;
      document.getElementById("detailStaffPhone").textContent =
        staff.User.phone;

      // Staff info
      document.getElementById("detailStaffSpecialty").textContent =
        staff.specialty || "Not set";
      document.getElementById("detailStaffBio").textContent =
        staff.bio || "No bio provided.";

      //Weekly schedule
      const schedule = staff.weeklySchedule || {};
      const scheduleHTML = Object.entries(schedule)
        .map(([day, d]) =>
          d.isOff
            ? `<div>${day}: Off</div>`
            : `<div>${day}: ${d.startTime} - ${d.endTime}</div>`
        )
        .join("");

      document.getElementById("detailStaffHours_staff").innerHTML =
        scheduleHTML;
      // Services
      const servicesList = document.getElementById("detailStaffServicesList");
      if (staff.Services?.length) {
        servicesList.innerHTML = staff.Services.map(
          (s) => `<li>${s.name}</li>`
        ).join("");
      } else {
        servicesList.innerHTML = "<li>No services assigned.</li>";
      }

      updateBreadcrumbs([
        { text: "Staff", target: "staff" },
        { text: staff.User.name },
      ]);

      staffDisplayView.style.display = "block";
      staffEditView.style.display = "none";
      showView("staff-detail-content");
    } catch (err) {
      console.error("Failed to fetch staff:", err);
      showNotification("Could not load staff.", true);
    }
  }

  function renderStaffList() {
    if (!staffListContainer) return;
    staffListContainer.innerHTML = (allStaff || [])
      .map((s) => {
        // Find the associated User object from allClients
        // const staffUser = allClients.find((u) => u.id === s.userId);
        // Use the User object directly attached to the staff data
        const userName = s.User?.name || "Unknown Staff"; // Use s.User
        const userImg = s.User?.img; // Use s.User
        return `
              <div class="service-card view-staff-profile" data-staff-id="${
                s.id
              }" data-user-id="${
          s.userId
        }" style="cursor: pointer;" title="View ${userName}'s profile">
                <div class="service-icon"
              style="
                background-color:#d63384;
                color:white;
                font-weight:bold;
                font-size:1.5rem;
                display:flex;
                align-items:center;
                justify-content:center;
                height:200px;
                width:100%;
                border-radius:10px;
                text-align:center;
                padding:10px;
              ">
            ${userName}
          </div>
             <div class="service-card-content">
               <h3>${userName}</h3>
               <p>${s.specialty || "Specialist"}</p> 
               <div class="manage-actions">
                 <button class="btn danger remove-staff-role-btn" data-staff-id="${
                   s.id
                 }" data-user-id="${s.userId}">Remove Role</button> 
               </div>
             </div>
           </div>`;
      })
      .join("");
    if (allStaff.length === 0) {
      staffListContainer.innerHTML = "<p>No staff members found.</p>";
    }
  }
  // --- Event Listeners ---
  // Placeholder for Edit/Remove Staff buttons
  staffListContainer.addEventListener("click", async (event) => {
    // Find the button that was clicked
    const clickedCard = event.target.closest("[data-staff-id]");
    const removeButton = event.target.closest(".remove-staff-role-btn");

    if (clickedCard) {
      event.preventDefault();
      const staffId = clickedCard.dataset.staffId;
      // const userId = editButton.dataset.userId; // We get userId from the new API call

      // Call the new function to show the detail page
      showStaffDetails(staffId);
    }

    if (removeButton) {
      // This is for the *next* task (Removing Role)
      // We'll implement this click logic later.
      console.log("Remove role clicked (logic TBD)");
      // const staffId = removeButton.dataset.staffId;
      // const userId = removeButton.dataset.userId;
    }
  });
  if (backToStaffListBtn) {
    backToStaffListBtn.addEventListener("click", () => {
      showView("staff-content"); // Show the main staff list
      updateBreadcrumbs([{ text: "Staff" }]); // Reset breadcrumbs
      currentStaffId = null; // Clear stored IDs
      currentStaffUserId = null;
    });
  }
  if (editStaffProfileBtn) {
    editStaffProfileBtn.addEventListener("click", () => {
      if (!currentStaffProfile) return;

      const staff = currentStaffProfile;

      editStaffNameHeader.textContent = `Edit ${staff.User.name}'s Profile`;
      editStaffSpecialty.value = staff.specialty || "";
      editStaffBio.value = staff.bio || "";

      // Weekly schedule edit UI
      const schedule = staff.weeklySchedule || {};
      const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];

      const scheduleEl = document.getElementById("weeklyScheduleContainer");

      scheduleEl.innerHTML = days
        .map((day) => {
          const d = schedule[day] || {
            isOff: false,
            startTime: "09:00",
            endTime: "17:00",
          };

          return `
          <div class="day-row">
            <strong>${day}</strong>
            <label>
              <input type="checkbox" class="day-off-toggle" data-day="${day}" ${
            d.isOff ? "checked" : ""
          }>
              Day Off
            </label>
            <input type="time" class="start-time" data-day="${day}" value="${
            d.startTime || ""
          }" ${d.isOff ? "disabled" : ""}>
            <input type="time" class="end-time" data-day="${day}" value="${
            d.endTime || ""
          }" ${d.isOff ? "disabled" : ""}>
          </div>
        `;
        })
        .join("");

      // Services edit UI
      const staffServiceIds = new Set(staff.Services.map((s) => s.id));
      const servicesEl = document.getElementById("editStaffServicesList");

      servicesEl.innerHTML = allServices
        .filter((s) => s.available)
        .map((service) => {
          const checked = staffServiceIds.has(service.id) ? "checked" : "";
          return `
          <label>
            <input type="checkbox" value="${service.id}" ${checked}>
            ${service.name}
          </label>
        `;
        })
        .join("");

      updateBreadcrumbs([
        { text: "Staff", target: "staff" },
        { text: staff.User.name, target: "staff-detail" },
        { text: "Edit" },
      ]);

      staffDisplayView.style.display = "none";
      staffEditView.style.display = "block";
    });
  }

  // 2. Click "Cancel" button in edit form
  if (cancelEditStaffBtn) {
    cancelEditStaffBtn.addEventListener("click", () => {
      // 1. Toggle views
      staffDisplayView.style.display = "block";
      staffEditView.style.display = "none";

      // 2. Reset Breadcrumbs
      updateBreadcrumbs([
        { text: "Staff", target: "staff" },
        { text: currentStaffProfile.User.name },
      ]);
    });
  }

  // 3. Submit the edit form
  if (editStaffForm) {
    editStaffForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const weeklySchedule = {};
      const rows = document.querySelectorAll(
        "#weeklyScheduleContainer .day-row"
      );

      rows.forEach((row) => {
        const day = row.querySelector("strong").textContent;
        const isOff = row.querySelector(".day-off-toggle").checked;
        const start = row.querySelector(".start-time").value;
        const end = row.querySelector(".end-time").value;

        weeklySchedule[day] = {
          isOff,
          startTime: isOff
            ? null
            : start || staff.weeklySchedule[day].startTime,
          endTime: isOff ? null : end || staff.weeklySchedule[day].endTime,
        };
      });

      // Collect services
      const selectedServiceIds = Array.from(
        document.querySelectorAll(
          '#editStaffServicesList input[type="checkbox"]:checked'
        )
      ).map((cb) => parseInt(cb.value));

      const payload = {
        specialty: editStaffSpecialty.value,
        bio: editStaffBio.value,
        weeklySchedule,
        services: selectedServiceIds,
      };

      console.log("FRONTEND SENDING:", payload);

      await axios.put(
        `${BASE_URL}/api/admin/update/staff/${currentStaffId}`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      showNotification("Updated successfully");
      // refresh local staff data
      await showStaffDetails(currentStaffId); // reload detail view

      // switch back to detail page
      staffDisplayView.style.display = "block";
      staffEditView.style.display = "none";

      // breadcrumbs reset
      updateBreadcrumbs([
        { text: "Staff", target: "staff" },
        { text: currentStaffProfile.User.name },
      ]);
    });
  }
  if (removeStaffRoleBtn) {
    removeStaffRoleBtn.addEventListener("click", async () => {
      // 1. Check for valid IDs
      if (!currentStaffId || !currentStaffUserId) {
        showNotification("Error: No staff member selected.", true);
        return;
      }

      // 2. Get the staff member's name for the modal
      const staffName = currentStaffProfile?.User?.name || "this staff member";

      // 3. Show confirmation modal
      const confirmed = await showConfirmationModal(
        `Remove staff role from ${staffName}? This will change their role back to 'customer'.`
      );

      if (!confirmed) {
        return; // User cancelled
      }

      // 4. Proceed with deletion
      try {
        await axios.delete(
          `${BASE_URL}/api/admin/staff/role/${currentStaffId}`, // Use the new route
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // 5. Success: Notify and navigate
        showNotification("Staff role removed successfully.");

        // Update local 'allStaff' array
        allStaff = allStaff.filter((s) => s.id != currentStaffId);
        // Re-render the staff list (in the background)
        renderStaffList();

        // Go back to the main staff list view
        showView("staff-content");
        updateBreadcrumbs([{ text: "Staff" }]); // Reset breadcrumbs

        // Clear global IDs
        currentStaffId = null;
        currentStaffUserId = null;
        currentStaffProfile = null;
      } catch (error) {
        console.error("Failed to remove staff role:", error);
        showNotification(
          "Failed to remove staff role. Please try again.",
          true
        );
      }
    });
  }

  // 4. Handle "Staff / [Name]" breadcrumb click
  if (breadcrumbsEl) {
    breadcrumbsEl.addEventListener("click", (event) => {
      if (
        event.target.tagName === "A" &&
        event.target.dataset.navTarget === "staff-detail"
      ) {
        event.preventDefault();
        // Just show the display view, don't re-fetch
        staffDisplayView.style.display = "block";
        staffEditView.style.display = "none";
        updateBreadcrumbs([
          { text: "Staff", target: "staff" },
          { text: currentStaffProfile.User.name },
        ]);
      }
    });
  }
  // =========================================================================
  // ==  SERVICES SECTION (#services-content) ==
  // =========================================================================

  // --- DOM Elements ---
  const serviceListContainer = document.getElementById("serviceList"); // Renamed
  const serviceForm = document.getElementById("serviceForm");
  const editingServiceIdInput = document.getElementById("editingServiceId"); // Hidden input
  const saveServiceBtn = document.getElementById("saveServiceBtn");
  const cancelServiceEditBtn = document.getElementById("cancelServiceEditBtn"); // Unique cancel button
  // --- Elements for View Switching ---
  const serviceAddView = document.getElementById("service-add-view");
  const serviceManageView = document.getElementById("service-manage-view");
  const showManageServicesBtn = document.getElementById(
    "showManageServicesBtn"
  );
  const showAddServiceBtn = document.getElementById("showAddServiceBtn");
  // --- Functions ---
  // --- Function to switch between Add and Manage views ---
  function showServiceView(viewToShow) {
    // 'add' or 'manage'
    if (!serviceAddView || !serviceManageView) return;

    serviceAddView.classList.remove("active");
    serviceManageView.classList.remove("active");

    if (viewToShow === "add") {
      serviceAddView.classList.add("active");
      updateBreadcrumbs([
        { text: "Services", target: "services" }, // Make 'Services' clickable
        { text: "Add New" },
      ]);
      // No need to reset form here, reset happens on cancel/save or explicitly when clicking 'Add New'
    } else {
      // Default to 'manage'
      serviceManageView.classList.add("active");
      updateBreadcrumbs([
        { text: "Services", target: "services" }, // Make 'Services' clickable
        { text: "Manage Services" },
      ]);
    }
  }
  function renderServicesList() {
    if (!serviceListContainer) return;
    serviceListContainer.innerHTML = (allServices || [])
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
             <h3>${s.name || "Service Name"}</h3>
             <p>${s.description || "No description."}</p>
             <div class="service-card-footer">
               <span class="service-card-price">₹${(
                 s.price || 0
               ).toLocaleString("en-IN")}</span>
               <label class="switch" title="Toggle availability">
                 <input type="checkbox" class="availability-toggle" data-service-id="${
                   s.id
                 }" ${s.available ? "checked" : ""}>
                 <span class="slider"></span>
               </label>
             </div>
             <div class="manage-actions">
               <button class="btn secondary edit-service-btn" data-service-id="${
                 s.id
               }">Edit</button>
               <button class="btn danger delete-service-btn" data-service-id="${
                 s.id
               }">Delete</button>
             </div>
           </div>
         </div>`
      )
      .join("");
    if (allServices.length === 0) {
      serviceListContainer.innerHTML =
        "<p>No services found. Add one using the form above.</p>";
    }
  }

  const resetServiceForm = () => {
    if (
      !serviceForm ||
      !editingServiceIdInput ||
      !saveServiceBtn ||
      !cancelServiceEditBtn
    )
      return;
    serviceForm.reset();
    editingServiceIdInput.value = ""; // Clear hidden ID
    saveServiceBtn.textContent = "Save Service";
    cancelServiceEditBtn.style.display = "none"; // Hide cancel button
  };

  // --- initServicesPage to show 'manage' view by default ---
  const initServicesPage = () => {
    showServiceView("add"); // Show the manage view initially
  };

  // --- Event Listeners ---
  if (showManageServicesBtn) {
    showManageServicesBtn.addEventListener("click", () =>
      showServiceView("manage")
    );
  }
  if (showAddServiceBtn) {
    showAddServiceBtn.addEventListener("click", () => {
      resetServiceForm(); // Reset form when explicitly clicking Add New
      showServiceView("add");
    });
  }
  if (serviceListContainer) {
    // --- MODIFIED: Edit button listener ---
    serviceListContainer.addEventListener("click", async (event) => {
      // Handle Edit Button Click
      if (event.target.classList.contains("edit-service-btn")) {
        const serviceId = event.target.dataset.serviceId;
        const serviceToEdit = allServices.find((s) => s.id == serviceId);
        if (serviceToEdit && serviceForm) {
          // Populate form (same as before)
          document.getElementById("serviceName").value = serviceToEdit.name;
          document.getElementById("serviceDescription").value =
            serviceToEdit.description || "";
          document.getElementById("serviceDuration").value =
            serviceToEdit.duration;
          document.getElementById("servicePrice").value = serviceToEdit.price;
          editingServiceIdInput.value = serviceToEdit.id; // Set hidden ID
          saveServiceBtn.textContent = "Update Service";
          cancelServiceEditBtn.style.display = "inline-block"; // Show Cancel

          // *** Switch to the Add/Edit view ***
          showServiceView("add");
        }
      }

      // Handle Delete Button Click (Keep existing logic)
      if (event.target.classList.contains("delete-service-btn")) {
        const serviceId = event.target.dataset.serviceId;
        const serviceName =
          allServices.find((s) => s.id == serviceId)?.name || "this service";
        const confirmed = await showConfirmationModal(
          `Delete "${serviceName}"? This cannot be undone.`
        );
        if (confirmed) {
          try {
            await axios.delete(
              `${BASE_URL}/api/admin/services/delete/${serviceId}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            showNotification("Service deleted.");
            allServices = allServices.filter((s) => s.id != serviceId);
            renderServicesList(); // Re-render list
            // If user was editing the deleted item, reset form and go to manage view
            if (editingServiceIdInput.value === serviceId) {
              resetServiceForm();
              showServiceView("manage");
            }
          } catch (err) {
            showNotification("Failed to delete service.", true);
          }
        }
      }
    });

    // Handle Availability Toggle Change (Keep existing logic)
    serviceListContainer.addEventListener("change", async (event) => {
      if (event.target.classList.contains("availability-toggle")) {
        const serviceId = event.target.dataset.serviceId;
        const newAvailability = event.target.checked;
        try {
          await axios.patch(
            `${BASE_URL}/api/admin/services/update/${serviceId}/availability`,
            { available: newAvailability },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const index = allServices.findIndex((s) => s.id == serviceId);
          if (index !== -1) allServices[index].available = newAvailability;
          showNotification("Availability updated.");
        } catch (error) {
          showNotification("Update failed.", true);
          event.target.checked = !newAvailability;
        }
      }
    });
  }
  // Handle Service Form Submission (Create/Update)
  if (serviceForm) {
    serviceForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const serviceData = {
        name: document.getElementById("serviceName").value,
        description: document.getElementById("serviceDescription").value,
        duration: parseInt(document.getElementById("serviceDuration").value),
        price: parseFloat(document.getElementById("servicePrice").value),
      };
      const editingId = editingServiceIdInput.value;

      try {
        let response;
        let notificationMessage = "";
        if (editingId) {
          // UPDATE
          response = await axios.put(
            `${BASE_URL}/api/admin/services/update/${editingId}`,
            serviceData,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const index = allServices.findIndex((s) => s.id == editingId);
          if (index !== -1) allServices[index] = response.data.service;
          notificationMessage = "Service updated.";
        } else {
          // CREATE
          response = await axios.post(
            `${BASE_URL}/api/admin/services/create`,
            serviceData,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          allServices.push(response.data.service);
          notificationMessage = "Service created.";
        }

        showNotification(notificationMessage); // Show success message
        renderServicesList(); // Re-render the list with changes
        resetServiceForm(); // Reset the form fields

        // *** Switch back to Manage view after success ***
        showServiceView("manage");
      } catch (error) {
        const msg = error.response?.data?.message || "Operation failed.";
        showNotification(msg, true);
      }
    });
  }

  // Cancel button for service edit form
  if (cancelServiceEditBtn) {
    cancelServiceEditBtn.addEventListener("click", () => {
      resetServiceForm(); // Reset form fields
      showServiceView("manage"); // Switch back to the manage view
    });
  }
  // =========================================================================
  // == REVENUE SECTION (#revenue-content) ==
  // =========================================================================

  // --- DOM Elements ---
  const paymentTable = document.getElementById("paymentTable"); // Use the correct ID
  const revenueChartCanvas = document.getElementById("revenueChart");
  const revenueDashboardView = document.getElementById(
    "revenue-dashboard-view"
  );
  const revenueTransactionsView = document.getElementById(
    "revenue-transactions-view"
  );
  const showTransactionsBtn = document.getElementById("showTransactionsBtn");
  const backToRevenueBtn = document.getElementById("backToRevenueBtn");
  function showRevenueView(viewToShow) {
    revenueDashboardView.classList.remove("active");
    revenueTransactionsView.classList.remove("active");

    if (viewToShow === "transactions") {
      revenueTransactionsView.classList.add("active");
      updateBreadcrumbs([
        { text: "Revenue", target: "revenue" },
        { text: "All Transactions" },
      ]);
    } else {
      // Default to dashboard
      revenueDashboardView.classList.add("active");
      updateBreadcrumbs([{ text: "Revenue" }]);
    }
  }
  function renderPaymentsTable() {
    if (!paymentTable) return;

    if (allPayments.length === 0) {
      paymentTable.innerHTML = `<tr><td colspan="6">No transactions found.</td></tr>`;
      return;
    }

    paymentTable.innerHTML = allPayments
      .map(
        (p) => `
    <tr>
      <td>${formatDate(safeDate(p.createdAt))}<br>
      <small>${formatTime(safeDate(p.createdAt))}</small>
      </td>
      <td>${p.User?.name || "N/A"}</td>
      <td>${p.Booking?.Service?.name || "N/A"}</td>
      <td>₹${(p.amount || 0).toLocaleString("en-IN")}</td>
      <td>${p.method || "N/A"}</td>
      <td><span class="status ${p.status?.toLowerCase() || ""}">${
          p.status || "N/A"
        }</span></td>
    </tr>
  `
      )
      .join("");
  }
  async function renderDashboardStats() {
    try {
      const statsRes = await axios.get(
        `${BASE_URL}/api/admin/dashboard/stats`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Calculate average service price
      const totalRevenue = statsRes.data.totalRevenue || 0;
      const totalBookings = statsRes.data.totalBookings || 1; // Use 1 to avoid divide by zero
      const avgPrice = (totalRevenue / totalBookings).toFixed(0);

      // Now render the stat cards with this data
      document.getElementById(
        "monthlyRevenue"
      ).textContent = `₹${totalRevenue.toLocaleString("en-IN")}`;
      document.getElementById("monthlyTransactions").textContent =
        statsRes.data.totalBookings;
      document.getElementById(
        "avgServicePrice"
      ).textContent = `₹${avgPrice.toLocaleString("en-IN")}`;
    } catch (err) {
      console.error("Failed to fetch dashboard stats:", err);
      // Set cards to error state
      document.getElementById("monthlyRevenue").textContent = "Error";
      document.getElementById("monthlyTransactions").textContent = "Error";
      document.getElementById("avgServicePrice").textContent = "Error";
    }
  }
  // --- function to render the chart ---
  let revenueChartInstance = null; // Variable to hold the chart instance
  async function renderRevenueChart() {
    if (!revenueChartCanvas) return; // Make sure canvas exists

    try {
      // Fetch formatted data from your backend
      const response = await axios.get(
        `${BASE_URL}/api/admin/reports/revenue`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const chartData = response.data; // Expecting { labels: [...], data: [...] }

      // If a chart instance already exists, destroy it first
      if (revenueChartInstance) {
        revenueChartInstance.destroy();
      }

      // Create the chart using Chart.js
      const ctx = revenueChartCanvas.getContext("2d");
      revenueChartInstance = new Chart(ctx, {
        type: "bar", // Or 'bar'
        data: {
          labels: chartData.labels, // Labels from API (e.g., "Jan 2024")
          datasets: [
            {
              label: "Monthly Revenue (₹)",
              data: chartData.data, // Data points from API (e.g., 5000)
              borderColor: "rgb(255, 107, 129)", // Your --primary color
              backgroundColor: "rgba(255, 107, 129, 0.2)", // Lighter version for fill
              tension: 0.1,
              borderWidth: 1,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false, // Allows chart to fill container
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                // Format Y-axis ticks as currency
                callback: function (value) {
                  return "₹" + value.toLocaleString("en-IN");
                },
              },
            },
          },
          plugins: {
            legend: {
              display: false, // Hide the legend if only one dataset
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  let label = context.dataset.label || "";
                  if (label) {
                    label += ": ";
                  }
                  if (context.parsed.y !== null) {
                    label += "₹" + context.parsed.y.toLocaleString("en-IN");
                  }
                  return label;
                },
              },
            },
          },
        },
      });
    } catch (error) {
      console.error("Error fetching or rendering revenue chart:", error);
      // Optionally display an error message on the canvas
      const ctx = revenueChartCanvas.getContext("2d");
      ctx.font = "16px Arial";
      ctx.fillStyle = "grey";
      ctx.textAlign = "center";
      ctx.fillText(
        "Could not load chart data.",
        revenueChartCanvas.width / 2,
        revenueChartCanvas.height / 2
      );
    }
  }
  const initRevenuePage = () => {
    renderRevenueChart();
  };

  // --- Event Listeners ---
  showTransactionsBtn.addEventListener("click", () => {
    showRevenueView("transactions");
  });
  backToRevenueBtn.addEventListener("click", () => {
    showRevenueView("dashboard");
  });

  // =========================================================================
  // ==  REVIEWS SECTION (#reviews-content) ==
  // =========================================================================

  // --- DOM Elements ---
  const reviewsContainer = document.getElementById("reviews"); // Use the ID from HTML
  const avgRatingEl = document.getElementById("avgRating"); // Use the ID from HTML

  // --- Functions ---
  function renderReviewsPage() {
    if (!reviewsContainer || !avgRatingEl) return;

    const validReviews = (allReviews || []).filter((r) => r.rating > 0);
    const avg =
      validReviews.length > 0
        ? validReviews.reduce((s, r) => s + r.rating, 0) / validReviews.length
        : 0;

    avgRatingEl.textContent =
      avg === 0
        ? "No reviews yet"
        : `Average Rating: ${"★".repeat(Math.round(avg))}${"☆".repeat(
            5 - Math.round(avg)
          )} (${avg.toFixed(1)})`;

    reviewsContainer.innerHTML = validReviews
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // Show newest first
      .map(
        (r) => `
          <div class="review">
            <strong>${r.User?.name || "Anonymous"}</strong> reviewed 
            <strong>${r.Service?.name || "a service"}</strong> 
            (by ${r.Staff?.User?.name || "N/A"}) 
            on ${formatDate(safeDate(r.createdAt))}

            <div class="review-rating">${"★".repeat(r.rating || 0)}${"☆".repeat(
          5 - (r.rating || 0)
        )}</div>
            <p class="review-comment">${r.comment || "No comment."}</p>
            ${
              r.reply
                ? `<div class="staff-reply">
                      <strong>Staff Response:</strong>
                      <p>${r.reply}</p>
                    </div>`
                : ""
            }
            <div class="manage-actions" style="justify-content: flex-end;">
                <button class="btn danger delete-review-btn" data-review-id="${
                  r.id
                }">Delete</button>
            </div>
          </div>`
      )
      .join("");
    if (validReviews.length === 0) {
      reviewsContainer.innerHTML = "<p>No customer reviews received yet.</p>";
    }
  }
  const initReviewsPage = () => renderReviewsPage();

  // --- Event Listeners ---
  if (reviewsContainer) {
    reviewsContainer.addEventListener("click", async (event) => {
      if (event.target.classList.contains("delete-review-btn")) {
        const reviewId = event.target.dataset.reviewId;
        const confirmed = await showConfirmationModal(
          "Delete this review permanently?"
        );
        if (confirmed) {
          try {
            await axios.delete(
              `${BASE_URL}/api/admin/reviews/delete/${reviewId}`,
              {
                // Assuming DELETE /api/admin/reviews/:id
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            showNotification("Review deleted.");
            allReviews = allReviews.filter((r) => r.id != reviewId);
            renderReviewsPage(); // Re-render
          } catch (err) {
            showNotification("Failed to delete review.", true);
          }
        }
      }
    });
  }
  // In admin.js AND staff.js (DOM Elements)

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
        const hasUnread = convo.unread
          ? '<span class="unread-dot"></span>'
          : "";

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
      const response = await axios.get(
        `${BASE_URL}/api/admin/users/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const name = response.data.user.name || `Customer ${userId}`;
      clientNameCache.set(userId, name);
      return name;
    } catch (err) {
      console.error("Failed to fetch client name:", err);
      return `Customer ${userId}`; // Fallback
    }
  }
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

  // =========================================================================
  // ==  APP INITIALIZATION ==
  // =========================================================================

  async function initializeApp() {
    // Show loading state? (Optional)
    // document.getElementById("loadingIndicator").style.display = 'block';

    try {
      // Fetch all data concurrently
      await fetchClients(1, "active");
      await fetchStaff(1);
      await fetchServices(1);
      await fetchPayments(1);
      await fetchAppointments(1);
      await fetchReviews(1);
      await renderDashboardStats();

      // Initialize all page sections with the data
      initDashboardPage();
      initAppointmentsPage();
      initServicesPage();
      initRevenuePage();
      initReviewsPage();
      initSocket();
      // TODO: initSettingsPage();

      // Show the default page (Dashboard)
      showPage("dashboard");
    } catch (error) {
      console.error("Initialization failed:", error);
      showNotification(
        "Failed to load initial data. Please try refreshing.",
        true
      );
      // Maybe show an error message on the page
    } finally {
      // Hide loading state? (Optional)
      // document.getElementById("loadingIndicator").style.display = 'none';
    }
  }

  // Run the app initialization
  initializeApp();
}); // End DOMContentLoaded
