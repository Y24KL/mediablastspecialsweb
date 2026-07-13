(function () {
  'use strict';

  var API_BASE = (window.MB_CONFIG && window.MB_CONFIG.API_BASE) || '';

  // Already logged in? go straight to the dashboard.
  if (localStorage.getItem('mb_admin_token')) {
    window.location.href = 'dashboard.html';
    return;
  }

  var form = document.getElementById('loginForm');
  var statusBox = document.getElementById('loginStatus');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    statusBox.className = 'form-status';
    statusBox.textContent = '';

    if (!API_BASE) {
      statusBox.className = 'form-status error';
      statusBox.textContent = 'Backend API is not configured. Set API_BASE in js/config.js.';
      return;
    }

    var submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in…';

    var email = form.email.value.trim();
    var password = form.password.value;

    fetch(API_BASE + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.error || 'Login failed.');
          return data;
        });
      })
      .then(function (data) {
        localStorage.setItem('mb_admin_token', data.token);
        window.location.href = 'dashboard.html';
      })
      .catch(function (err) {
        statusBox.className = 'form-status error';
        statusBox.textContent = err.message || 'Login failed.';
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
      });
  });
})();
