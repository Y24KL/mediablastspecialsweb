import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

export const contentRouter = Router();

/* ---------------- Public ---------------- */

contentRouter.get('/content', (req, res) => {
  const { hero, live, gallery, socials } = db.data;
  res.json({ hero, live, gallery, socials });
});

/* ---------------- Admin: hero ---------------- */

contentRouter.put('/admin/hero', requireAuth, async (req, res) => {
  const { tagline, ctaText, ctaLink } = req.body || {};
  if (tagline !== undefined) db.data.hero.tagline = String(tagline);
  if (ctaText !== undefined) db.data.hero.ctaText = String(ctaText);
  if (ctaLink !== undefined) db.data.hero.ctaLink = String(ctaLink);
  await db.write();
  res.json(db.data.hero);
});

/* ---------------- Admin: live stream ---------------- */

contentRouter.put('/admin/live', requireAuth, async (req, res) => {
  const { videoId, status, nextStreamAt, channelUrl } = req.body || {};
  if (videoId !== undefined) db.data.live.videoId = String(videoId);
  if (status !== undefined) {
    if (!['live', 'offline'].includes(status)) {
      return res.status(400).json({ error: 'status must be "live" or "offline".' });
    }
    db.data.live.status = status;
  }
  if (nextStreamAt !== undefined) db.data.live.nextStreamAt = nextStreamAt || null;
  if (channelUrl !== undefined) db.data.live.channelUrl = String(channelUrl);
  await db.write();
  res.json(db.data.live);
});

/* ---------------- Admin: socials ---------------- */

contentRouter.put('/admin/socials', requireAuth, async (req, res) => {
  const allowed = ['youtube', 'instagram', 'kingschat', 'twitter'];
  for (const key of allowed) {
    if (req.body && req.body[key] !== undefined) {
      db.data.socials[key] = String(req.body[key]);
    }
  }
  await db.write();
  res.json(db.data.socials);
});

/* ---------------- Admin: gallery CRUD ---------------- */

contentRouter.get('/admin/gallery', requireAuth, (req, res) => {
  res.json(db.data.gallery);
});

contentRouter.post('/admin/gallery', requireAuth, async (req, res) => {
  const { title, imageUrl, videoId } = req.body || {};
  if (!title) return res.status(400).json({ error: 'title is required.' });

  const nextId = db.data.gallery.reduce((max, item) => Math.max(max, item.id), 0) + 1;
  const item = {
    id: nextId,
    title: String(title),
    imageUrl: imageUrl ? String(imageUrl) : '',
    videoId: videoId ? String(videoId) : '',
  };
  db.data.gallery.push(item);
  await db.write();
  res.status(201).json(item);
});

contentRouter.put('/admin/gallery/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const item = db.data.gallery.find((g) => g.id === id);
  if (!item) return res.status(404).json({ error: 'Gallery item not found.' });

  const { title, imageUrl, videoId } = req.body || {};
  if (title !== undefined) item.title = String(title);
  if (imageUrl !== undefined) item.imageUrl = String(imageUrl);
  if (videoId !== undefined) item.videoId = String(videoId);
  await db.write();
  res.json(item);
});

contentRouter.delete('/admin/gallery/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const before = db.data.gallery.length;
  db.data.gallery = db.data.gallery.filter((g) => g.id !== id);
  if (db.data.gallery.length === before) {
    return res.status(404).json({ error: 'Gallery item not found.' });
  }
  await db.write();
  res.status(204).end();
});
