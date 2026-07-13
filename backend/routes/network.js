import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

export const networkRouter = Router();

/* ---------------- Public ---------------- */

networkRouter.get('/network/content', (req, res) => {
  const { hero, live, programs, socials, news } = db.data.network;
  res.json({ hero, live, programs, socials, news });
});

/* ---------------- Admin: hero ---------------- */

networkRouter.put('/admin/network/hero', requireAuth, async (req, res) => {
  const { title, tagline, ctaText, ctaLink } = req.body || {};
  if (title !== undefined) db.data.network.hero.title = String(title);
  if (tagline !== undefined) db.data.network.hero.tagline = String(tagline);
  if (ctaText !== undefined) db.data.network.hero.ctaText = String(ctaText);
  if (ctaLink !== undefined) db.data.network.hero.ctaLink = String(ctaLink);
  await db.write();
  res.json(db.data.network.hero);
});

/* ---------------- Admin: live stream ---------------- */

networkRouter.put('/admin/network/live', requireAuth, async (req, res) => {
  const { status, youtubeLink, m3u8Url, offlineVideoUrl, streamTitle } = req.body || {};
  if (status !== undefined) {
    if (!['live', 'offline'].includes(status)) {
      return res.status(400).json({ error: 'status must be "live" or "offline".' });
    }
    db.data.network.live.status = status;
  }
  if (youtubeLink !== undefined) db.data.network.live.youtubeLink = String(youtubeLink);
  if (m3u8Url !== undefined) db.data.network.live.m3u8Url = String(m3u8Url);
  if (offlineVideoUrl !== undefined) db.data.network.live.offlineVideoUrl = String(offlineVideoUrl);
  if (streamTitle !== undefined) db.data.network.live.streamTitle = String(streamTitle);
  await db.write();
  res.json(db.data.network.live);
});

/* ---------------- Admin: socials ---------------- */

networkRouter.put('/admin/network/socials', requireAuth, async (req, res) => {
  const allowed = ['youtube', 'kingschat', 'twitter'];
  for (const key of allowed) {
    if (req.body && req.body[key] !== undefined) {
      db.data.network.socials[key] = String(req.body[key]);
    }
  }
  await db.write();
  res.json(db.data.network.socials);
});

/* ---------------- Admin: programs CRUD ---------------- */

networkRouter.get('/admin/network/programs', requireAuth, (req, res) => {
  res.json(db.data.network.programs);
});

networkRouter.post('/admin/network/programs', requireAuth, async (req, res) => {
  const { title, description, tag, imageUrl, videoUrl } = req.body || {};
  if (!title) return res.status(400).json({ error: 'title is required.' });

  const nextId = db.data.network.programs.reduce((max, item) => Math.max(max, item.id), 0) + 1;
  const item = {
    id: nextId,
    title: String(title),
    description: description ? String(description) : '',
    tag: tag ? String(tag) : '',
    imageUrl: imageUrl ? String(imageUrl) : '',
    videoUrl: videoUrl ? String(videoUrl) : '',
  };
  db.data.network.programs.push(item);
  await db.write();
  res.status(201).json(item);
});

networkRouter.put('/admin/network/programs/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const item = db.data.network.programs.find((p) => p.id === id);
  if (!item) return res.status(404).json({ error: 'Program not found.' });

  const { title, description, tag, imageUrl, videoUrl } = req.body || {};
  if (title !== undefined) item.title = String(title);
  if (description !== undefined) item.description = String(description);
  if (tag !== undefined) item.tag = String(tag);
  if (imageUrl !== undefined) item.imageUrl = String(imageUrl);
  if (videoUrl !== undefined) item.videoUrl = String(videoUrl);
  await db.write();
  res.json(item);
});

networkRouter.delete('/admin/network/programs/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const before = db.data.network.programs.length;
  db.data.network.programs = db.data.network.programs.filter((p) => p.id !== id);
  if (db.data.network.programs.length === before) {
    return res.status(404).json({ error: 'Program not found.' });
  }
  await db.write();
  res.status(204).end();
});

/* ---------------- Admin: news/articles CRUD ---------------- */

networkRouter.get('/admin/network/news', requireAuth, (req, res) => {
  res.json(db.data.network.news);
});

networkRouter.post('/admin/network/news', requireAuth, async (req, res) => {
  const { title, body, category, imageUrl } = req.body || {};
  if (!title) return res.status(400).json({ error: 'title is required.' });
  if (!body) return res.status(400).json({ error: 'body is required.' });

  const nextId = db.data.network.news.reduce((max, item) => Math.max(max, item.id), 0) + 1;
  const item = {
    id: nextId,
    title: String(title),
    body: String(body),
    category: category ? String(category) : 'general',
    imageUrl: imageUrl ? String(imageUrl) : '',
    publishedAt: new Date().toISOString(),
  };
  db.data.network.news.unshift(item);
  await db.write();
  res.status(201).json(item);
});

networkRouter.put('/admin/network/news/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const item = db.data.network.news.find((n) => n.id === id);
  if (!item) return res.status(404).json({ error: 'Article not found.' });

  const { title, body, category, imageUrl } = req.body || {};
  if (title !== undefined) item.title = String(title);
  if (body !== undefined) item.body = String(body);
  if (category !== undefined) item.category = String(category);
  if (imageUrl !== undefined) item.imageUrl = String(imageUrl);
  await db.write();
  res.json(item);
});

networkRouter.delete('/admin/network/news/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const before = db.data.network.news.length;
  db.data.network.news = db.data.network.news.filter((n) => n.id !== id);
  if (db.data.network.news.length === before) {
    return res.status(404).json({ error: 'Article not found.' });
  }
  await db.write();
  res.status(204).end();
});
