// server.js — UniMate API server
// Load server/.env in a side-effect module first (ESM evaluates imports before this file's body).
import './bootstrap-env.js';
import express       from 'express';
import cookieParser  from 'cookie-parser';
import cors          from 'cors';

import { googleOAuthEnvIssues } from './src/lib/googleOAuthEnv.js';
import authRoutes         from './src/routes/auth.js';
import dashboardRoutes    from './src/routes/dashboard.js';
import reviewsRoutes      from './src/routes/reviews.js';
import collabRoutes       from './src/routes/collab.js';
import discussionsRoutes  from './src/routes/discussions.js';
import searchRoutes       from './src/routes/search.js';

const app  = express();
const PORT = process.env.PORT || 4000;

// ── Middleware ────────────────────────────────────────────────
app.use(cors({
  origin:         process.env.CLIENT_URL || 'http://localhost:3000',
  credentials:    true,
  methods:        ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
}));
app.use(express.json());
app.use(cookieParser());

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/dashboard',    dashboardRoutes);
app.use('/api/reviews',      reviewsRoutes);
app.use('/api/collab',       collabRoutes);
app.use('/api/discussions', discussionsRoutes);
app.use('/api/search',     searchRoutes);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ── Global error handler ──────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`UniMate API listening on http://localhost:${PORT}`);
  const oauthIssues = googleOAuthEnvIssues();
  if (oauthIssues.length) {
    console.warn('[google-oauth] Fix server/.env then restart:');
    for (const line of oauthIssues) console.warn(`  - ${line}`);
  }
});

export default app;