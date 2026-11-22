(function () {
  // If already logged in, redirect away from login/register
  const token = getToken();
  const user = getUser();
  if (token && user && (window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('register.html'))) {
    const next = qs('next');
    if (next && !next.startsWith('//') && !next.includes('://')) {
      window.location.href = next;
    } else {
      window.location.href = homeForRole(user.role);
    }
    return;
  }

  document.addEventListener('DOMContentLoaded', () => {
    initLoginForm();
    initRegisterForm();
  });

  // Login form handler
  function initLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return;

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorBox = document.getElementById('auth-error');
    const submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (errorBox) { errorBox.hidden = true; errorBox.textContent = ''; }

      const email = emailInput.value.trim();
      const password = passwordInput.value;

      // Validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        showError('Please enter a valid email address.');
        emailInput.focus();
        return;
      }
      if (!password) {
        showError('Password is required.');
        passwordInput.focus();
        return;
      }

      setLoading(submitBtn, true, 'Signing in...');
      try {
        const data = await apiFetch('/api/auth/login', {
          method: 'POST',
          body: { email, password }
        });

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        showToast('Login successful!');

        const next = qs('next');
        if (next && !next.startsWith('//') && !next.includes('://')) {
          window.location.href = next;
        } else {
          window.location.href = homeForRole(data.user.role);
        }
      } catch (err) {
        showError(err.message || 'Login failed.');
        showToast(err.message || 'Login failed.', 'error');
      } finally {
        setLoading(submitBtn, false);
      }
    });

    function showError(msg) {
      if (errorBox) {
        errorBox.textContent = msg;
        errorBox.hidden = false;
      }
    }
  }

  // Register form handler
  function initRegisterForm() {
    const form = document.getElementById('register-form');
    if (!form) return;

    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm_password');
    const roleSelect = document.getElementById('role');
    const collegeInput = document.getElementById('college');
    const organiserNotice = document.getElementById('organiser-notice');
    const errorBox = document.getElementById('auth-error');
    const successBox = document.getElementById('auth-success');
    const submitBtn = form.querySelector('button[type="submit"]');

    // Show/hide organiser approval note
    if (roleSelect && organiserNotice) {
      roleSelect.addEventListener('change', () => {
        organiserNotice.hidden = roleSelect.value !== 'organiser';
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (errorBox) { errorBox.hidden = true; errorBox.textContent = ''; }
      if (successBox) { successBox.hidden = true; successBox.textContent = ''; }

      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      const confirmPassword = confirmPasswordInput.value;
      const role = roleSelect ? roleSelect.value : 'participant';
      const college = collegeInput ? collegeInput.value.trim() : '';

      // Validation
      if (!name || name.length < 2 || name.length > 100) {
        showError('Name must be between 2 and 100 characters.');
        nameInput.focus();
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        showError('Please enter a valid email address.');
        emailInput.focus();
        return;
      }

      if (!password || password.length < 8 || !/\d/.test(password)) {
        showError('Password must be at least 8 characters and include at least one number.');
        passwordInput.focus();
        return;
      }

      if (password !== confirmPassword) {
        showError('Passwords do not match.');
        confirmPasswordInput.focus();
        return;
      }

      if (!['participant', 'organiser', 'judge'].includes(role)) {
        showError('Please select a valid role.');
        return;
      }

      setLoading(submitBtn, true, 'Creating account...');
      try {
        const body = { name, email, password, role };
        if (college) body.college = college;

        const data = await apiFetch('/api/auth/register', {
          method: 'POST',
          body
        });

        form.reset();
        showToast(data.message || 'Registration successful!');

        if (successBox) {
          successBox.innerHTML = `
            <p><strong>${escapeHtml(data.message)}</strong></p>
            ${role === 'organiser' ? '<p class="muted">Your organiser account has been submitted for admin approval. Once approved, you will be able to log in.</p>' : ''}
            <p><a href="login.html" class="btn btn-primary">Proceed to Login</a></p>
          `;
          successBox.hidden = false;
        } else {
          setTimeout(() => {
            window.location.href = 'login.html';
          }, 1500);
        }
      } catch (err) {
        showError(err.message || 'Registration failed.');
        showToast(err.message || 'Registration failed.', 'error');
      } finally {
        setLoading(submitBtn, false);
      }
    });

    function showError(msg) {
      if (errorBox) {
        errorBox.textContent = msg;
        errorBox.hidden = false;
      }
    }
  }
})();
