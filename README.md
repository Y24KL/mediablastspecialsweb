# MediaBlast Specials — Website

Single-page marketing site for MediaBlast Specials with a Watch Live page and
an admin portal for managing content.

## Structure

```
frontend/          Static site (HTML/CSS/vanilla JS)
  index.html        Hero, About/Specials, Gallery, Contact, Footer
  watch-live.html    YouTube live stream page
  admin/             Admin login + dashboard (protected)
  css/style.css
  js/                config.js, main.js, watch-live.js, admin-login.js, admin-dashboard.js
backend/            Node/Express API for admin auth + content
  server.js
  routes/            auth.js, content.js
  middleware/auth.js
  db.js              lowdb JSON storage
```

## Frontend setup

The frontend is plain static HTML/CSS/JS — no build step. Just open
`frontend/index.html` or serve the `frontend/` folder with any static host.

Before deploying, edit `frontend/js/config.js`:

```js
window.MB_CONFIG = {
  API_BASE: '',                 // backend URL, e.g. https://mediablast-backend.onrender.com
  FORMSPREE_FORM_ID: 'YOUR_FORM_ID', // your real Formspree form ID
  YOUTUBE_CHANNEL_URL: '...',   // your channel URL
};
```

- **`API_BASE`**: leave empty (`''`) if the backend is served from the same
  origin as the frontend. Otherwise set it to the backend's public URL. If
  left unset/unreachable, the site falls back to the static placeholder
  content baked into the HTML (hero tagline, gallery, offline live badge) —
  so the marketing pages still work without a backend, only the admin portal
  requires it.
- **`FORMSPREE_FORM_ID`**: sign up at [formspree.io](https://formspree.io),
  create a form, and paste its ID here (the contact form is disabled with an
  inline message until this is set).

## Backend setup

```bash
cd backend
npm install
cp .env.example .env
# edit .env: set JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, CORS_ORIGIN
npm start
```

The API runs on `http://localhost:4000` by default (`PORT` in `.env`).
`CORS_ORIGIN` should be the URL the frontend is served from (comma-separate
multiple origins if needed).

The admin account is seeded/synced from `ADMIN_EMAIL` / `ADMIN_PASSWORD` on
every server boot — change those env vars and restart to rotate credentials.
Passwords are hashed with bcrypt before being stored; nothing is stored in
plaintext.

### API endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | — | `{ email, password }` → `{ token }` |
| GET | `/api/auth/me` | Bearer | Verify current session |
| GET | `/api/content` | — | Public: hero, live, gallery, socials |
| PUT | `/api/admin/hero` | Bearer | Update tagline/CTA |
| PUT | `/api/admin/live` | Bearer | Update video ID / live-offline status / next stream time / channel URL |
| GET/POST | `/api/admin/gallery` | Bearer | List / add gallery items |
| PUT/DELETE | `/api/admin/gallery/:id` | Bearer | Update / remove a gallery item |
| PUT | `/api/admin/socials` | Bearer | Update social links |
| GET | `/api/network/content` | — | Public: MediaBlast Network's hero, live, programs, socials, news |
| PUT | `/api/admin/network/hero` | Bearer | Update Network hero title/tagline/CTA |
| PUT | `/api/admin/network/live` | Bearer | Update Network live-stream status/YouTube link/m3u8 URL/offline video/title |
| GET/POST | `/api/admin/network/programs` | Bearer | List / add Network programs |
| PUT/DELETE | `/api/admin/network/programs/:id` | Bearer | Update / remove a Network program |
| PUT | `/api/admin/network/socials` | Bearer | Update Network social links |
| GET/POST | `/api/admin/network/news` | Bearer | List / add News articles (new articles are prepended, newest first) |
| PUT/DELETE | `/api/admin/network/news/:id` | Bearer | Update / remove a News article |
| POST | `/api/admin/upload` | Bearer | Multipart form field `image` (jpg/png/webp/gif, max 5MB) → `{ url }`. Used by both dashboards' image-upload buttons; the returned URL is absolute since uploads are served from this backend, not the frontend hosts. |

This one backend and one admin login manage **both** MediaBlast Specials
(fields above) and MediaBlast Network (the `network`-prefixed routes) — the
same `db.json` just carries a namespaced `network` object alongside the
existing top-level fields, so nothing about Specials' existing API shape
changed.

Content is stored in `backend/data/db.json` (gitignored, created on first run).
Uploaded images are stored in `backend/uploads/` (also gitignored, created on
first run) and served statically at `/uploads/<filename>`.

## Admin portal

Visit `/admin/login.html` (not linked from the public nav). Sign in with the
`ADMIN_EMAIL` / `ADMIN_PASSWORD` from the backend `.env`. The dashboard lets
you:

- Edit the hero tagline and CTA button
- Toggle the Watch Live stream between live/offline, set the YouTube video ID,
  next-stream time, and channel URL
- Add/edit/delete gallery/showcase items
- Edit social links
- Jump to the Formspree dashboard for contact submissions

## Watch Live page

Uses the [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference)
so views count toward real YouTube watch time. Status (`live`/`offline`),
video ID, and next-stream countdown are pulled from `/api/content` and
managed via the admin portal. Falls back to a static offline placeholder if
the backend isn't reachable.

## Deployment

- **Frontend**: deploy the `frontend/` folder to Netlify, Vercel, or similar
  static hosting.
- **Backend**: deploy the `backend/` folder to Render (or any Node host).
  Set the environment variables from `.env.example` in the host's dashboard.
  Note: `backend/data/db.json` and `backend/uploads/` are local disk storage —
  use a host with a persistent disk (e.g. a Render persistent disk) or swap
  in hosted database/object storage if you need data and uploaded images to
  survive redeploys.
- Update `frontend/js/config.js` with the deployed backend URL and the real
  Formspree form ID before going live.
