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

  /* ---------------- Image upload ---------------- */
  function uploadImage(file) {
    var formData = new FormData();
    formData.append('image', file);
    return apiFetch('/api/admin/upload', { method: 'POST', body: formData }).then(function (data) {
      return data.url;
    });
  }

  // Wires a hidden <input type="file"> (inside a .upload-btn label) so
  // picking a file uploads it and fills the given text input with the URL.
  function wireUpload(fileInput, targetInput, statusFormId) {
    var label = fileInput.closest('.upload-btn');
    fileInput.addEventListener('change', function () {
      var file = fileInput.files[0];
      if (!file) return;
      if (label) label.classList.add('is-uploading');
      uploadImage(file)
        .then(function (url) {
          targetInput.value = url;
          if (statusFormId) showStatus(statusFormId, 'Image uploaded.');
        })
        .catch(function (err) {
          if (statusFormId) showStatus(statusFormId, err.message || 'Upload failed.', true);
          else alert(err.message || 'Upload failed.');
        })
        .finally(function () {
          if (label) label.classList.remove('is-uploading');
          fileInput.value = '';
        });
    });
  }

  // Wire the static "add" forms' upload buttons (data-target points at the
  // paired text input's id). Dynamically-rendered rows wire themselves
  // directly since they hold a live reference to their own input.
  document.querySelectorAll('.upload-btn[data-target]').forEach(function (label) {
    var fileInput = label.querySelector('input[type="file"]');
    var targetInput = document.getElementById(label.dataset.target);
    if (fileInput && targetInput) {
      var form = label.closest('form');
      wireUpload(fileInput, targetInput, form && form.id);
    }
  });

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

      var uploadLabel = document.createElement('label');
      uploadLabel.className = 'upload-btn';
      uploadLabel.textContent = 'Upload Image';
      var uploadInput = document.createElement('input');
      uploadInput.type = 'file';
      uploadInput.accept = 'image/*';
      uploadLabel.appendChild(uploadInput);
      wireUpload(uploadInput, urlInput, 'galleryAddForm');

      var videoInput = document.createElement('input');
      videoInput.type = 'text';
      videoInput.value = item.videoId || '';
      videoInput.placeholder = 'YouTube Video ID';

      var driveInput = document.createElement('input');
      driveInput.type = 'text';
      driveInput.value = item.driveFileId || '';
      driveInput.placeholder = 'Google Drive File ID';

      var saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'btn btn-outline btn-sm';
      saveBtn.textContent = 'Save';
      saveBtn.addEventListener('click', function () {
        apiFetch('/api/admin/gallery/' + item.id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: titleInput.value, imageUrl: urlInput.value, videoId: videoInput.value, driveFileId: driveInput.value }),
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
      row.appendChild(uploadLabel);
      row.appendChild(videoInput);
      row.appendChild(driveInput);
      row.appendChild(saveBtn);
      row.appendChild(deleteBtn);
      list.appendChild(row);
    });
  }

  document.getElementById('galleryAddForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var form = e.target;
    var payload = { title: form.title.value, imageUrl: form.imageUrl.value, videoId: form.videoId.value, driveFileId: form.driveFileId.value };
    apiFetch('/api/admin/gallery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function () {
        form.reset();
        showStatus('galleryAddForm', 'Episode added.');
        return loadContent();
      })
      .catch(function (err) { showStatus('galleryAddForm', err.message, true); });
  });

  /* ==================== Site switcher (Network + Specials) ==================== */
  var siteTabs = document.getElementById('siteTabs');
  var panelsNetwork = document.getElementById('panels-network');
  var panelsSpecials = document.getElementById('panels-specials');

  function setActiveSite(site) {
    document.querySelectorAll('.site-tab').forEach(function (tab) {
      tab.classList.toggle('active', tab.dataset.site === site);
    });
    if (panelsNetwork) panelsNetwork.style.display = site === 'network' ? 'grid' : 'none';
    if (panelsSpecials) panelsSpecials.style.display = site === 'specials' ? 'grid' : 'none';
  }

  if (siteTabs) {
    siteTabs.addEventListener('click', function (e) {
      var tab = e.target.closest('.site-tab');
      if (!tab) return;
      setActiveSite(tab.dataset.site);
    });
    setActiveSite(window.MB_ADMIN_DEFAULT_SITE || 'network');
  }

  /* ==================== MediaBlast Network content ==================== */
  function loadNetworkContent() {
    return apiFetch('/api/network/content').then(function (content) {
      if (content.hero) {
        setVal('netHeroTitle', content.hero.title);
        setVal('netHeroTagline', content.hero.tagline);
        setVal('netHeroCtaText', content.hero.ctaText);
        setVal('netHeroCtaLink', content.hero.ctaLink);
      }
      if (content.live) {
        setVal('netLiveStatus', content.live.status || 'offline');
        setVal('netLiveTitle', content.live.streamTitle);
        setVal('netLiveYoutube', content.live.youtubeLink);
        setVal('netLiveM3u8', content.live.m3u8Url);
        setVal('netLiveOffline', content.live.offlineVideoUrl);
        updateBadge('netLiveBadgePreview', content.live.status);
      }
      if (content.socials) {
        setVal('netSocialYoutube', content.socials.youtube);
        setVal('netSocialKingschat', content.socials.kingschat);
        setVal('netSocialTwitter', content.socials.twitter);
      }
      renderPrograms(content.programs || []);
      renderNews(content.news || []);
    });
  }

  function setVal(id, value) {
    var el = document.getElementById(id);
    if (el) el.value = value || '';
  }

  function updateBadge(id, status) {
    var badge = document.getElementById(id);
    if (!badge) return;
    if (status === 'live') {
      badge.className = 'badge-mini live';
      badge.textContent = 'LIVE';
    } else {
      badge.className = 'badge-mini offline';
      badge.textContent = 'OFFLINE';
    }
  }

  if (panelsNetwork) {
    loadNetworkContent().catch(function (err) {
      var list = document.getElementById('netProgramsList');
      if (list) list.innerHTML = '<p class="admin-status-msg error">Failed to load content: ' + err.message + '</p>';
    });
  }

  var netHeroForm = document.getElementById('netHeroForm');
  if (netHeroForm) {
    netHeroForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var payload = {
        title: document.getElementById('netHeroTitle').value,
        tagline: document.getElementById('netHeroTagline').value,
        ctaText: document.getElementById('netHeroCtaText').value,
        ctaLink: document.getElementById('netHeroCtaLink').value,
      };
      apiFetch('/api/admin/network/hero', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        .then(function () { showStatus('netHeroForm', 'Hero content saved.'); })
        .catch(function (err) { showStatus('netHeroForm', err.message, true); });
    });
  }

  var netLiveForm = document.getElementById('netLiveForm');
  if (netLiveForm) {
    netLiveForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var payload = {
        status: document.getElementById('netLiveStatus').value,
        streamTitle: document.getElementById('netLiveTitle').value,
        youtubeLink: document.getElementById('netLiveYoutube').value,
        m3u8Url: document.getElementById('netLiveM3u8').value,
        offlineVideoUrl: document.getElementById('netLiveOffline').value,
      };
      apiFetch('/api/admin/network/live', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        .then(function (data) {
          updateBadge('netLiveBadgePreview', data.status);
          showStatus('netLiveForm', 'Live settings saved.');
        })
        .catch(function (err) { showStatus('netLiveForm', err.message, true); });
    });
  }

  var netSocialsForm = document.getElementById('netSocialsForm');
  if (netSocialsForm) {
    netSocialsForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var payload = {
        youtube: document.getElementById('netSocialYoutube').value,
        kingschat: document.getElementById('netSocialKingschat').value,
        twitter: document.getElementById('netSocialTwitter').value,
      };
      apiFetch('/api/admin/network/socials', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        .then(function () { showStatus('netSocialsForm', 'Social links saved.'); })
        .catch(function (err) { showStatus('netSocialsForm', err.message, true); });
    });
  }

  function renderPrograms(items) {
    var list = document.getElementById('netProgramsList');
    if (!list) return;
    list.innerHTML = '';
    items.forEach(function (item) {
      var row = document.createElement('div');
      row.className = 'gallery-item-row';

      var titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.value = item.title;
      titleInput.placeholder = 'Title';

      var tagInput = document.createElement('input');
      tagInput.type = 'text';
      tagInput.value = item.tag || '';
      tagInput.placeholder = 'Tag';

      var descInput = document.createElement('input');
      descInput.type = 'text';
      descInput.value = item.description || '';
      descInput.placeholder = 'Description';

      var imageInput = document.createElement('input');
      imageInput.type = 'text';
      imageInput.value = item.imageUrl || '';
      imageInput.placeholder = 'Image URL';

      var uploadLabel = document.createElement('label');
      uploadLabel.className = 'upload-btn';
      uploadLabel.textContent = 'Upload Image';
      var uploadInput = document.createElement('input');
      uploadInput.type = 'file';
      uploadInput.accept = 'image/*';
      uploadLabel.appendChild(uploadInput);
      wireUpload(uploadInput, imageInput, 'netProgramAddForm');

      var videoInput = document.createElement('input');
      videoInput.type = 'text';
      videoInput.value = item.videoUrl || '';
      videoInput.placeholder = 'YouTube embed URL';

      var saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'btn btn-outline btn-sm';
      saveBtn.textContent = 'Save';
      saveBtn.addEventListener('click', function () {
        apiFetch('/api/admin/network/programs/' + item.id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: titleInput.value, tag: tagInput.value, description: descInput.value, imageUrl: imageInput.value, videoUrl: videoInput.value }),
        })
          .then(function () { showStatus('netProgramAddForm', 'Program updated.'); })
          .catch(function (err) { showStatus('netProgramAddForm', err.message, true); });
      });

      var deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn btn-danger btn-sm';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', function () {
        if (!confirm('Delete "' + item.title + '"?')) return;
        apiFetch('/api/admin/network/programs/' + item.id, { method: 'DELETE' })
          .then(function () { row.remove(); showStatus('netProgramAddForm', 'Program deleted.'); })
          .catch(function (err) { showStatus('netProgramAddForm', err.message, true); });
      });

      row.appendChild(titleInput);
      row.appendChild(tagInput);
      row.appendChild(descInput);
      row.appendChild(imageInput);
      row.appendChild(uploadLabel);
      row.appendChild(videoInput);
      row.appendChild(saveBtn);
      row.appendChild(deleteBtn);
      list.appendChild(row);
    });
  }

  var netProgramAddForm = document.getElementById('netProgramAddForm');
  if (netProgramAddForm) {
    netProgramAddForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var form = e.target;
      var payload = { title: form.title.value, tag: form.tag.value, description: form.description.value, imageUrl: form.imageUrl.value, videoUrl: form.videoUrl.value };
      apiFetch('/api/admin/network/programs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        .then(function () {
          form.reset();
          showStatus('netProgramAddForm', 'Program added.');
          return loadNetworkContent();
        })
        .catch(function (err) { showStatus('netProgramAddForm', err.message, true); });
    });
  }

  function renderNews(items) {
    var list = document.getElementById('netNewsList');
    if (!list) return;
    list.innerHTML = '';
    items.forEach(function (item) {
      var row = document.createElement('div');
      row.className = 'gallery-item-row';

      var titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.value = item.title;
      titleInput.placeholder = 'Title';

      var categoryInput = document.createElement('input');
      categoryInput.type = 'text';
      categoryInput.value = item.category || '';
      categoryInput.placeholder = 'Category';

      var imageInput = document.createElement('input');
      imageInput.type = 'text';
      imageInput.value = item.imageUrl || '';
      imageInput.placeholder = 'Image URL';

      var uploadLabel = document.createElement('label');
      uploadLabel.className = 'upload-btn';
      uploadLabel.textContent = 'Upload Image';
      var uploadInput = document.createElement('input');
      uploadInput.type = 'file';
      uploadInput.accept = 'image/*';
      uploadLabel.appendChild(uploadInput);
      wireUpload(uploadInput, imageInput, 'netNewsAddForm');

      var bodyInput = document.createElement('textarea');
      bodyInput.value = item.body || '';
      bodyInput.placeholder = 'Article body';
      bodyInput.rows = 4;

      var saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'btn btn-outline btn-sm';
      saveBtn.textContent = 'Save';
      saveBtn.addEventListener('click', function () {
        apiFetch('/api/admin/network/news/' + item.id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: titleInput.value, category: categoryInput.value, imageUrl: imageInput.value, body: bodyInput.value }),
        })
          .then(function () { showStatus('netNewsAddForm', 'Article updated.'); })
          .catch(function (err) { showStatus('netNewsAddForm', err.message, true); });
      });

      var deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn btn-danger btn-sm';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', function () {
        if (!confirm('Delete "' + item.title + '"?')) return;
        apiFetch('/api/admin/network/news/' + item.id, { method: 'DELETE' })
          .then(function () { row.remove(); showStatus('netNewsAddForm', 'Article deleted.'); })
          .catch(function (err) { showStatus('netNewsAddForm', err.message, true); });
      });

      row.appendChild(titleInput);
      row.appendChild(categoryInput);
      row.appendChild(imageInput);
      row.appendChild(uploadLabel);
      row.appendChild(bodyInput);
      row.appendChild(saveBtn);
      row.appendChild(deleteBtn);
      list.appendChild(row);
    });
  }

  var netNewsAddForm = document.getElementById('netNewsAddForm');
  if (netNewsAddForm) {
    netNewsAddForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var form = e.target;
      var payload = { title: form.title.value, category: form.category.value, imageUrl: form.imageUrl.value, body: form.body.value };
      apiFetch('/api/admin/network/news', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        .then(function () {
          form.reset();
          showStatus('netNewsAddForm', 'Article published.');
          return loadNetworkContent();
        })
        .catch(function (err) { showStatus('netNewsAddForm', err.message, true); });
    });
  }
})();
