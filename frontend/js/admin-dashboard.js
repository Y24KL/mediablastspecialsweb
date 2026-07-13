(function () {
  'use strict';

  var API_BASE = (window.MB_CONFIG && window.MB_CONFIG.API_BASE) || '';
  var token = localStorage.getItem('mb_admin_token');

  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  function authHeaders(extra) {
    return Object.assign({ Authorization: 'Bearer ' + token }, extra || {});
  }

  function logout() {
    localStorage.removeItem('mb_admin_token');
    window.location.href = 'login.html';
  }

  document.getElementById('logoutBtn').addEventListener('click', logout);

  function apiFetch(path, options) {
    options = options || {};
    options.headers = authHeaders(options.headers || {});
    return fetch(API_BASE + path, options).then(function (res) {
      if (res.status === 401) {
        logout();
        throw new Error('Session expired.');
      }
      if (res.status === 204) return null;
      return res.json().then(function (data) {
        if (!res.ok) throw new Error((data && data.error) || 'Request failed.');
        return data;
      });
    });
  }

  function showStatus(formId, msg, isError) {
    var el = document.querySelector('[data-status-for="' + formId + '"]');
    if (!el) return;
    el.className = 'admin-status-msg ' + (isError ? 'error' : 'success');
    el.textContent = msg;
    setTimeout(function () { el.textContent = ''; el.className = 'admin-status-msg'; }, 3500);
  }

  /* ---------------- Verify session + load current user ---------------- */
  apiFetch('/api/auth/me')
    .then(function (data) {
      document.getElementById('adminEmail').textContent = data.email;
    })
    .catch(function () { /* handled by apiFetch redirect */ });

  /* ---------------- Load content into forms ---------------- */
  function loadContent() {
    return apiFetch('/api/content').then(function (content) {
      if (content.hero) {
        document.getElementById('heroTagline').value = content.hero.tagline || '';
        document.getElementById('heroCtaText').value = content.hero.ctaText || '';
        document.getElementById('heroCtaLink').value = content.hero.ctaLink || '';
      }
      if (content.live) {
        document.getElementById('liveVideoId').value = content.live.videoId || '';
        document.getElementById('liveStatus').value = content.live.status || 'offline';
        document.getElementById('liveChannel').value = content.live.channelUrl || '';
        if (content.live.nextStreamAt) {
          document.getElementById('liveNext').value = toLocalDatetimeInput(content.live.nextStreamAt);
        }
        updateLiveBadge(content.live.status);
      }
      if (content.socials) {
        document.getElementById('socialYoutube').value = content.socials.youtube || '';
        document.getElementById('socialInstagram').value = content.socials.instagram || '';
        document.getElementById('socialKingschat').value = content.socials.kingschat || '';
        document.getElementById('socialTwitter').value = content.socials.twitter || '';
      }
      renderGallery(content.gallery || []);
    });
  }

  function toLocalDatetimeInput(iso) {
    var d = new Date(iso);
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function updateLiveBadge(status) {
    var badge = document.getElementById('liveBadgePreview');
    if (status === 'live') {
      badge.className = 'badge-mini live';
      badge.textContent = 'LIVE';
    } else {
      badge.className = 'badge-mini offline';
      badge.textContent = 'OFFLINE';
    }
  }

  loadContent().catch(function (err) {
    var list = document.getElementById('galleryList');
    list.innerHTML = '<p class="admin-status-msg error">Failed to load content: ' + err.message + '</p>';
  });

  /* ---------------- Hero form ---------------- */
  document.getElementById('heroForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var payload = {
      tagline: document.getElementById('heroTagline').value,
      ctaText: document.getElementById('heroCtaText').value,
      ctaLink: document.getElementById('heroCtaLink').value,
    };
    apiFetch('/api/admin/hero', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function () { showStatus('heroForm', 'Hero content saved.'); })
      .catch(function (err) { showStatus('heroForm', err.message, true); });
  });

  /* ---------------- Live stream form ---------------- */
  document.getElementById('liveForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var nextVal = document.getElementById('liveNext').value;
    var payload = {
      videoId: document.getElementById('liveVideoId').value,
      status: document.getElementById('liveStatus').value,
      nextStreamAt: nextVal ? new Date(nextVal).toISOString() : null,
      channelUrl: document.getElementById('liveChannel').value,
    };
    apiFetch('/api/admin/live', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (data) {
        updateLiveBadge(data.status);
        showStatus('liveForm', 'Live settings saved.');
      })
      .catch(function (err) { showStatus('liveForm', err.message, true); });
  });

  /* ---------------- Socials form ---------------- */
  document.getElementById('socialsForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var payload = {
      youtube: document.getElementById('socialYoutube').value,
      instagram: document.getElementById('socialInstagram').value,
      kingschat: document.getElementById('socialKingschat').value,
      twitter: document.getElementById('socialTwitter').value,
    };
    apiFetch('/api/admin/socials', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function () { showStatus('socialsForm', 'Social links saved.'); })
      .catch(function (err) { showStatus('socialsForm', err.message, true); });
  });

  /* ---------------- Gallery ---------------- */
  function renderGallery(items) {
    var list = document.getElementById('galleryList');
    list.innerHTML = '';
    items.forEach(function (item) {
      var row = document.createElement('div');
      row.className = 'gallery-item-row';

      var titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.value = item.title;
      titleInput.placeholder = 'Title';

      var urlInput = document.createElement('input');
      urlInput.type = 'text';
      urlInput.value = item.imageUrl || '';
      urlInput.placeholder = 'Image URL';

      var videoInput = document.createElement('input');
      videoInput.type = 'text';
      videoInput.value = item.videoId || '';
      videoInput.placeholder = 'YouTube Video ID';

      var saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'btn btn-outline btn-sm';
      saveBtn.textContent = 'Save';
      saveBtn.addEventListener('click', function () {
        apiFetch('/api/admin/gallery/' + item.id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: titleInput.value, imageUrl: urlInput.value, videoId: videoInput.value }),
        })
          .then(function () { showStatus('galleryAddForm', 'Episode updated.'); })
          .catch(function (err) { showStatus('galleryAddForm', err.message, true); });
      });

      var deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn btn-danger btn-sm';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', function () {
        if (!confirm('Delete "' + item.title + '"?')) return;
        apiFetch('/api/admin/gallery/' + item.id, { method: 'DELETE' })
          .then(function () { row.remove(); showStatus('galleryAddForm', 'Episode deleted.'); })
          .catch(function (err) { showStatus('galleryAddForm', err.message, true); });
      });

      row.appendChild(titleInput);
      row.appendChild(urlInput);
      row.appendChild(videoInput);
      row.appendChild(saveBtn);
      row.appendChild(deleteBtn);
      list.appendChild(row);
    });
  }

  document.getElementById('galleryAddForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var form = e.target;
    var payload = { title: form.title.value, imageUrl: form.imageUrl.value, videoId: form.videoId.value };
    apiFetch('/api/admin/gallery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function () {
        form.reset();
        showStatus('galleryAddForm', 'Episode added.');
        return loadContent();
      })
      .catch(function (err) { showStatus('galleryAddForm', err.message, true); });
  });
})();
