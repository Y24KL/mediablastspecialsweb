(function () {
  'use strict';

  var API_BASE = (window.MB_CONFIG && window.MB_CONFIG.API_BASE) || '';

  /* ---------------- Mobile nav ---------------- */
  var navToggle = document.querySelector('.nav-toggle');
  var navLinks = document.querySelector('.nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      navLinks.classList.toggle('open');
    });
    navLinks.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { navLinks.classList.remove('open'); });
    });
  }

  /* ---------------- Scroll reveal ---------------- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in-view'); });
  }

  /* ---------------- Footer year ---------------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------------- Dynamic content (hero tagline / gallery) ---------------- */
  function applyContent(content) {
    if (!content) return;

    if (content.hero) {
      var taglineEl = document.querySelector('[data-field="hero-tagline"]');
      var ctaEl = document.querySelector('[data-field="hero-cta"]');
      if (taglineEl && content.hero.tagline) taglineEl.textContent = content.hero.tagline;
      if (ctaEl && content.hero.ctaText) {
        ctaEl.textContent = content.hero.ctaText;
        if (content.hero.ctaLink) ctaEl.setAttribute('href', content.hero.ctaLink);
      }
    }

    if (Array.isArray(content.gallery) && content.gallery.length) {
      var track = document.getElementById('carouselTrack');
      if (track) {
        var items = content.gallery;
        var doubled = items.concat(items); // seamless loop
        track.innerHTML = doubled.map(function (item) {
          var bg = item.imageUrl ? 'background-image:url(\'' + item.imageUrl + '\');' : '';
          return '<div class="gallery-card" style="' + bg + (item.imageUrl ? '' : 'background:linear-gradient(135deg, var(--royal-blue), var(--navy));') + '">' +
            '<span>' + escapeHtml(item.title || '') + '</span></div>';
        }).join('');
      }
    }

    if (content.socials) {
      Object.keys(content.socials).forEach(function (key) {
        var el = document.querySelector('[data-social="' + key + '"]');
        if (el && content.socials[key]) el.setAttribute('href', content.socials[key]);
      });
    }
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  if (API_BASE) {
    fetch(API_BASE + '/api/content')
      .then(function (res) { if (!res.ok) throw new Error('bad response'); return res.json(); })
      .then(applyContent)
      .catch(function () { /* keep static fallback content already in HTML */ });
  }

  /* ---------------- Contact form (Formspree) ---------------- */
  var form = document.getElementById('contactForm');
  if (form) {
    var statusBox = document.getElementById('formStatus');
    var formId = (window.MB_CONFIG && window.MB_CONFIG.FORMSPREE_FORM_ID) || 'YOUR_FORM_ID';
    form.setAttribute('action', 'https://formspree.io/f/' + formId);

    var fields = {
      name: form.querySelector('[name="name"]'),
      email: form.querySelector('[name="email"]'),
      phone: form.querySelector('[name="phone"]'),
      message: form.querySelector('[name="message"]'),
    };

    function setFieldError(field, msg) {
      var errEl = form.querySelector('.field-error[data-for="' + field.name + '"]');
      if (errEl) errEl.textContent = msg || '';
    }

    function validate() {
      var valid = true;

      if (!fields.name.value.trim()) {
        setFieldError(fields.name, 'Please enter your name.');
        valid = false;
      } else setFieldError(fields.name, '');

      var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(fields.email.value.trim())) {
        setFieldError(fields.email, 'Please enter a valid email.');
        valid = false;
      } else setFieldError(fields.email, '');

      if (!fields.message.value.trim()) {
        setFieldError(fields.message, 'Please enter a message.');
        valid = false;
      } else setFieldError(fields.message, '');

      return valid;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      statusBox.className = 'form-status';
      statusBox.textContent = '';

      if (!validate()) return;

      var submitBtn = form.querySelector('button[type="submit"]');
      var originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';

      var formId = (window.MB_CONFIG && window.MB_CONFIG.FORMSPREE_FORM_ID) || 'YOUR_FORM_ID';
      if (formId === 'YOUR_FORM_ID') {
        statusBox.className = 'form-status error';
        statusBox.textContent = 'Form is not connected yet — set FORMSPREE_FORM_ID in js/config.js.';
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
      }

      fetch(form.action, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new FormData(form),
      }).then(function (response) {
        if (response.ok) {
          statusBox.className = 'form-status success';
          statusBox.textContent = 'Thanks! Your message has been sent — we\'ll be in touch soon.';
          form.reset();
        } else {
          return response.json().then(function (data) {
            var msg = (data && data.errors && data.errors.map(function (e) { return e.message; }).join(', ')) || 'Something went wrong. Please try again.';
            throw new Error(msg);
          });
        }
      }).catch(function (err) {
        statusBox.className = 'form-status error';
        statusBox.textContent = err.message || 'Something went wrong. Please try again.';
      }).finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      });
    });

    ['input', 'blur'].forEach(function (evt) {
      Object.values(fields).forEach(function (f) {
        if (f) f.addEventListener(evt, function () { if (form.dataset.touched) validate(); });
      });
    });
    form.addEventListener('submit', function () { form.dataset.touched = '1'; });
  }
})();
