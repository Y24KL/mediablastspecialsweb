(function () {
  'use strict';

  var API_BASE = (window.MB_CONFIG && window.MB_CONFIG.API_BASE) || '';
  var CHANNEL_URL = (window.MB_CONFIG && window.MB_CONFIG.YOUTUBE_CHANNEL_URL) || '#';

  var DEFAULT_LIVE = {
    videoId: 'jfKfPfyJRdk', // placeholder — replace via admin portal
    status: 'offline',
    nextStreamAt: null,
    channelUrl: CHANNEL_URL,
  };

  var statusBadge = document.getElementById('statusBadge');
  var playerFrame = document.getElementById('playerFrame');
  var offlinePanel = document.getElementById('offlinePanel');
  var countdownEl = document.getElementById('countdown');
  var joinBtn = document.getElementById('joinConversationBtn');
  var fullscreenBtn = document.getElementById('fullscreenBtn');
  var player = null;
  var countdownTimer = null;

  function renderStatus(status) {
    statusBadge.innerHTML = '';
    if (status === 'live') {
      statusBadge.className = 'live-status-badge is-live';
      var dot = document.createElement('span');
      dot.className = 'pulse-dot';
      statusBadge.appendChild(dot);
      statusBadge.appendChild(document.createTextNode('LIVE NOW'));
      playerFrame.style.display = 'block';
      offlinePanel.style.display = 'none';
    } else {
      statusBadge.className = 'live-status-badge is-offline';
      statusBadge.appendChild(document.createTextNode('OFFLINE'));
      playerFrame.style.display = 'none';
      offlinePanel.style.display = 'flex';
    }
  }

  function startCountdown(targetIso) {
    if (countdownTimer) clearInterval(countdownTimer);
    if (!targetIso) {
      countdownEl.textContent = 'Next stream time coming soon';
      return;
    }
    var target = new Date(targetIso).getTime();

    function tick() {
      var diff = target - Date.now();
      if (diff <= 0) {
        countdownEl.textContent = 'Starting soon…';
        clearInterval(countdownTimer);
        return;
      }
      var d = Math.floor(diff / 86400000);
      var h = Math.floor((diff % 86400000) / 3600000);
      var m = Math.floor((diff % 3600000) / 60000);
      var s = Math.floor((diff % 60000) / 1000);
      var parts = [];
      if (d) parts.push(d + 'd');
      parts.push((h < 10 ? '0' : '') + h + 'h');
      parts.push((m < 10 ? '0' : '') + m + 'm');
      parts.push((s < 10 ? '0' : '') + s + 's');
      countdownEl.textContent = parts.join(' ');
    }
    tick();
    countdownTimer = setInterval(tick, 1000);
  }

  function loadYouTubeApi(callback) {
    if (window.YT && window.YT.Player) { callback(); return; }
    var tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = callback;
  }

  function mountPlayer(videoId) {
    loadYouTubeApi(function () {
      player = new YT.Player('yt-player', {
        videoId: videoId,
        playerVars: { autoplay: 0, rel: 0, modestbranding: 1 },
        host: 'https://www.youtube.com',
      });
    });
  }

  function applyLiveConfig(cfg) {
    renderStatus(cfg.status);
    if (cfg.status === 'live') {
      mountPlayer(cfg.videoId);
    } else {
      startCountdown(cfg.nextStreamAt);
    }
    if (joinBtn) joinBtn.setAttribute('href', cfg.channelUrl || CHANNEL_URL);
  }

  applyLiveConfig(DEFAULT_LIVE);

  if (API_BASE) {
    fetch(API_BASE + '/api/content')
      .then(function (res) { if (!res.ok) throw new Error('bad response'); return res.json(); })
      .then(function (content) {
        if (content && content.live) applyLiveConfig(content.live);
      })
      .catch(function () { /* keep default fallback */ });
  }

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', function () {
      var el = document.getElementById('yt-player') || playerFrame;
      if (el.requestFullscreen) el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    });
  }
})();
