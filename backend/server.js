import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDb } from './db.js';
import { authRouter } from './routes/auth.js';
import { contentRouter } from './routes/content.js';
import { networkRouter } from './routes/network.js';

const requiredEnv = ['JWT_SECRET', 'ADMIN_EMAIL', 'ADMIN_PASSWORD'];
const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  console.error('Copy .env.example to .env and fill in real values before starting the server.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 4000;

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : true,
}));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api', contentRouter);
app.use('/api', networkRouter);

app.use((req, res) => res.status(404).json({ error: 'Not found.' }));

await initDb();

app.listen(PORT, () => {
  console.log(`MediaBlast Specials API listening on port ${PORT}`);
});
