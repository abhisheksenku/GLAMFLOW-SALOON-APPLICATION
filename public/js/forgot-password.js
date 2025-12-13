document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('forgotPasswordForm');

  // Create message and error elements dynamically
  const messageEl = document.createElement('p');
  messageEl.id = 'message';
  messageEl.style.color = 'green';
  form.appendChild(messageEl);

  const errorEl = document.createElement('p');
  errorEl.id = 'error';
  errorEl.style.color = 'red';
  form.appendChild(errorEl);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = form.email.value.trim();
    messageEl.textContent = '';
    errorEl.textContent = '';

    if (!email) {
      errorEl.textContent = 'Please enter your email.';
      return;
    }

    try {
      const response = await axios.post(
        `${BASE_URL}/api/auth/forgot-password`,
        { email },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const result = response.data;
      messageEl.textContent = result.message || 'Reset link sent to your email.';
      form.reset();
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        errorEl.textContent = err.response.data.error;
      } else {
        errorEl.textContent = 'Error connecting to server.';
      }
      console.error(err);
    }
  });
});