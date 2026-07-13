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
  // MediaBlast Network's content lives here, namespaced, so this one backend
  // (and one admin login) can manage both sites without touching the fields
  // above that MediaBlast Specials' own frontend already depends on.
  network: {
    hero: {
      title: 'Reaching Every World',
      tagline: 'Experience the next generation of digital media. High-definition storytelling and immersive entertainment blasted directly to you.',
      ctaText: 'Watch Live Now',
      ctaLink: 'live.html',
    },
    live: {
      status: 'live', // 'live' | 'offline'
      youtubeLink: '',
      m3u8Url: 'https://vcpout-lw-wdc-01-sp.ceflixcdn.com/lxp/play1/playlist.m3u8',
      offlineVideoUrl: 'https://res.cloudinary.com/duw6xrnpn/video/upload/v1775429666/GLORIOUS_IN_ALL_YOUR_WAYS_j6hfbn.mp4',
      streamTitle: 'Mediablast Network Stream',
    },
    programs: [
      { id: 1, title: 'Global Day Of Prayer And Fasting', description: 'Join millions around the world in prayer and fasting.', tag: 'NOW', imageUrl: 'image/7_DAYS_GLOBAL_DAY_OF_PRAYER_AND_FASTING1.jpg', videoUrl: '' },
      { id: 2, title: 'Mediablast Specials', description: 'Rapid-fire global updates, delivered unfiltered and direct to your screen.', tag: 'Daily', imageUrl: 'https://images.unsplash.com/photo-1504711432869-5d592f239cff?auto=format&fit=crop&q=80&w=1200', videoUrl: 'https://www.youtube.com/embed/3umsy4MqUSM' },
    ],
    socials: {
      youtube: 'https://youtube.com/@mediablastnetwork',
      kingschat: 'https://kingschat.online/user/mediablastnetwork',
      twitter: 'https://x.com/mediablastnet',
    },
  },
};

const adapter = new JSONFile(dbFile);
export const db = new Low(adapter, defaultData);

export async function initDb() {
  await db.read();
  db.data ||= structuredClone(defaultData);

  // Backfill the `network` namespace for databases written before it existed
  // (a fresh clone gets it from defaultData above, but a live db.json on
  // Render predates this key and won't have it merged in automatically).
  db.data.network ||= structuredClone(defaultData.network);

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
