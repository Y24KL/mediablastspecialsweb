import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
const dbFile = path.join(dataDir, 'db.json');

// The data directory is gitignored (and git doesn't track empty dirs), so
// it won't exist on a fresh clone/deploy until created here.
fs.mkdirSync(dataDir, { recursive: true });

const defaultData = {
  admin: null, // { email, passwordHash }
  hero: {
    tagline: 'A television special bringing you engaging episodes and live broadcasts — streamed for viewers everywhere.',
    ctaText: 'Watch Live',
    ctaLink: 'watch-live.html',
  },
  live: {
    videoId: 'jfKfPfyJRdk',
    status: 'offline', // 'live' | 'offline'
    nextStreamAt: null,
    channelUrl: process.env.DEFAULT_CHANNEL_URL || 'https://www.youtube.com/@mediablastspecials',
  },
  gallery: [
    { id: 1, title: 'Season Premiere', imageUrl: '', videoId: 'jfKfPfyJRdk', driveFileId: '' },
    { id: 2, title: 'Live Episode Coverage', imageUrl: '', videoId: 'jfKfPfyJRdk', driveFileId: '' },
    { id: 3, title: 'Special Guest Episode', imageUrl: '', videoId: 'jfKfPfyJRdk', driveFileId: '' },
    { id: 4, title: 'Behind the Scenes', imageUrl: '', videoId: 'jfKfPfyJRdk', driveFileId: '' },
    { id: 5, title: 'Studio Broadcast', imageUrl: '', videoId: 'jfKfPfyJRdk', driveFileId: '' },
    { id: 6, title: 'Season Highlight Reel', imageUrl: '', videoId: 'jfKfPfyJRdk', driveFileId: '' },
  ],
  socials: {
    youtube: 'https://www.youtube.com/@mediablastspecials',
    instagram: '',
    kingschat: 'https://kingschat.online/user/mediablastnetwork',
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
