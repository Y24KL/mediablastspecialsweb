import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbFile = path.join(__dirname, 'data', 'db.json');

const defaultData = {
  admin: null, // { email, passwordHash }
  hero: {
    tagline: 'Broadcast-grade production, live streaming, and standout media specials — engineered to put your brand center stage.',
    ctaText: 'Get a Quote',
    ctaLink: '#contact',
  },
  live: {
    videoId: 'jfKfPfyJRdk',
    status: 'offline', // 'live' | 'offline'
    nextStreamAt: null,
    channelUrl: process.env.DEFAULT_CHANNEL_URL || 'https://www.youtube.com/@mediablastspecials',
  },
  gallery: [
    { id: 1, title: 'Studio Broadcast Set', imageUrl: '' },
    { id: 2, title: 'Live Event Coverage', imageUrl: '' },
    { id: 3, title: 'Brand Promo Special', imageUrl: '' },
    { id: 4, title: 'Multi-Cam Production', imageUrl: '' },
    { id: 5, title: 'Post-Production Suite', imageUrl: '' },
    { id: 6, title: 'Season Highlight Reel', imageUrl: '' },
  ],
  socials: {
    youtube: 'https://www.youtube.com/@mediablastspecials',
    instagram: '',
    facebook: '',
    twitter: '',
  },
};

const adapter = new JSONFile(dbFile);
export const db = new Low(adapter, defaultData);

export async function initDb() {
  await db.read();
  db.data ||= structuredClone(defaultData);

  // Seed / sync the admin account from env on every boot so credential
  // rotation via env vars (e.g. on Render) takes effect without manual steps.
  const envEmail = process.env.ADMIN_EMAIL;
  const envPassword = process.env.ADMIN_PASSWORD;
  if (envEmail && envPassword) {
    const current = db.data.admin;
    const matches = current
      && current.email === envEmail
      && await bcrypt.compare(envPassword, current.passwordHash);
    if (!matches) {
      const passwordHash = await bcrypt.hash(envPassword, 10);
      db.data.admin = { email: envEmail, passwordHash };
      await db.write();
    }
  }

  await db.write();
  return db;
}
