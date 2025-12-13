document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("resetPasswordForm");
  const messageEl = document.getElementById("message");
  const errorEl = document.getElementById("error");

  // Extract token from URL path (/reset-password/:token)
  const pathParts = window.location.pathname.split("/");
  const token = pathParts[pathParts.length - 1];

  if (!token) {
    errorEl.textContent = "Invalid or missing reset token.";
    form.style.display = "none";
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const newPassword = form.newPassword.value.trim();
    const confirmPassword = form.confirmPassword.value.trim();

    messageEl.textContent = "";
    errorEl.textContent = "";

    if (!newPassword || !confirmPassword) {
      errorEl.textContent = "Please enter and confirm your new password.";
      return;
    }

    if (newPassword !== confirmPassword) {
      errorEl.textContent = "Passwords do not match.";
      return;
    }

    try {
      const res = await axios.post(`${BASE_URL}/api/auth/reset-password/${token}`, {
        newPassword,
        confirmPassword,
      });

      messageEl.textContent = res.data.message || "Password reset successful!";
      form.reset();
      showNotification("Your password has been successfully updated!", false);
    } catch (err) {
      errorEl.textContent =
        err.response?.data?.error || "Something went wrong. Try again.";
    }
  });
});