/**
 * Global front-end config.
 * When the backend is deployed separately (e.g. Render) from the static
 * frontend (e.g. Netlify/Vercel), set API_BASE to the backend's public URL.
 * Leave as '' when frontend and backend are served from the same origin.
 */
window.MB_CONFIG = {
  API_BASE: 'https://mediablastspecialsbackend.onrender.com', // e.g. 'https://mediablast-backend.onrender.com'
  FORMSPREE_FORM_ID: 'https://formspree.io/f/mykryjzp', // replace before deployment, see README
  YOUTUBE_CHANNEL_URL: 'https://www.youtube.com/@mediablastnetwork',
};
