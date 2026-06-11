// src/routes/dashboard.js
// Powers every data widget on the DashboardPage:
//
//   GET  /api/dashboard/stats          → stat cards (open posts, discussions, reviews)
//   GET  /api/dashboard/collab-posts   → collaboration post cards
//   POST /api/dashboard/collab-posts   → create a new collaboration post
//   POST /api/dashboard/collab-posts/:id/join  → join a post
//   GET  /api/dashboard/questions      → recent discussions
//   GET  /api/dashboard/activity       → live activity feed
//   GET  /api/dashboard/me             → current user profile

import { Router } from 'express';
import pool        from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All dashboard routes require a valid JWT
router.use(requireAuth);

// ── GET /api/dashboard/me ─────────────────────────────────────
// Returns the signed-in user's profile plus their enrolled courses.
router.get('/me', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.full_name, u.avatar_url,
            u.school, u.class_year, u.major, u.availability,
            u.onboarding_done,
            COALESCE(
              JSON_AGG(
                JSON_BUILD_OBJECT('id', c.id, 'code', c.code, 'title', c.title)
              ) FILTER (WHERE c.id IS NOT NULL),
              '[]'
            ) AS courses
     FROM   users u
     LEFT JOIN user_courses uc ON uc.user_id = u.id
     LEFT JOIN courses      c  ON c.id = uc.course_id
     WHERE  u.id = $1
     GROUP BY u.id`,
    [req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

// ── GET /api/dashboard/stats ──────────────────────────────────
// Aggregated counts displayed on the three stat cards.
router.get('/stats', async (req, res) => {
  const [openPosts, discussions, reviews] = await Promise.all([
    pool.query(`SELECT COUNT(*) AS count FROM collab_posts WHERE is_open = TRUE`),
    pool.query(`SELECT COUNT(*) AS count FROM questions`),
    pool.query(`SELECT COUNT(*) AS count FROM reviews`),
  ]);

  // "today" deltas
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [postsToday, discussToday] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) AS count FROM collab_posts WHERE created_at >= $1`, [today]
    ),
    pool.query(
      `SELECT COUNT(*) AS count FROM questions WHERE created_at >= $1`, [today]
    ),
  ]);

  res.json({
    open_posts:          Number(openPosts.rows[0].count),
    open_posts_delta:    Number(postsToday.rows[0].count),
    active_discussions:  Number(discussions.rows[0].count),
    discussions_delta:   Number(discussToday.rows[0].count),
    reviews_posted:      Number(reviews.rows[0].count),
  });
});

// ── GET /api/dashboard/collab-posts ───────────────────────────
// Returns collaboration posts, optionally filtered by tag and/or search term.
// Query params:
//   tag    – 'Project' | 'Study' | 'Homework' | 'Exam'
//   search – full-text substring matched against course code and title
//   limit  – default 20
//   offset – default 0
router.get('/collab-posts', async (req, res) => {
  const { tag, search, limit = 20, offset = 0 } = req.query;

  const conditions = [`cp.is_open = TRUE`];
  const params     = [];

  if (tag && tag !== 'All') {
    params.push(tag);
    conditions.push(`cp.tag = $${params.length}`);
  }

  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    conditions.push(
      `(LOWER(c.code) LIKE $${params.length} OR LOWER(cp.title) LIKE $${params.length})`
    );
  }

  params.push(Number(limit), Number(offset));
  const limitIdx  = params.length - 1;
  const offsetIdx = params.length;

  const sql = `
    SELECT
      cp.id,
      cp.title,
      cp.tag,
      cp.max_members,
      cp.created_at,
      c.code  AS course,
      c.title AS course_title,
      COUNT(cm.user_id) AS member_count,
      -- is the requesting user already in this post?
      BOOL_OR(cm.user_id = $${params.indexOf(req.user.id) >= 0
        ? params.indexOf(req.user.id) + 1
        : (() => { params.splice(params.length - 2, 0, req.user.id); return params.length - 2; })()
      }) AS is_member
    FROM  collab_posts cp
    JOIN  courses       c  ON c.id  = cp.course_id
    LEFT JOIN collab_members cm ON cm.post_id = cp.id
    WHERE ${conditions.join(' AND ')}
    GROUP BY cp.id, c.id
    ORDER BY cp.created_at DESC
    LIMIT  $${limitIdx + 1}
    OFFSET $${offsetIdx + 1}
  `;

  // Simpler, robust query without the inline splice trick:
  const safeParams = [];
  const safeConds  = [`cp.is_open = TRUE`];

  if (tag && tag !== 'All') {
    safeParams.push(tag);
    safeConds.push(`cp.tag = $${safeParams.length}`);
  }
  if (search) {
    safeParams.push(`%${search.toLowerCase()}%`);
    safeConds.push(
      `(LOWER(c.code) LIKE $${safeParams.length} OR LOWER(cp.title) LIKE $${safeParams.length})`
    );
  }
  safeParams.push(req.user.id);
  const userIdIdx = safeParams.length;
  safeParams.push(Number(limit), Number(offset));

  const safeSql = `
    SELECT
      cp.id,
      cp.title,
      cp.tag,
      cp.max_members,
      cp.created_at,
      c.code     AS course,
      c.title    AS course_title,
      COUNT(cm.user_id)::INT                     AS member_count,
      BOOL_OR(cm.user_id = $${userIdIdx})        AS is_member
    FROM  collab_posts cp
    JOIN  courses          c  ON c.id  = cp.course_id
    LEFT JOIN collab_members cm ON cm.post_id = cp.id
    WHERE ${safeConds.join(' AND ')}
    GROUP BY cp.id, c.id
    ORDER BY cp.created_at DESC
    LIMIT  $${safeParams.length - 1}
    OFFSET $${safeParams.length}
  `;

  const { rows } = await pool.query(safeSql, safeParams);
  res.json(rows);
});

// ── POST /api/dashboard/collab-posts ─────────────────────────
// Create a new collab post.
// Body: { course_code, title, description?, tag, max_members }
router.post('/collab-posts', async (req, res) => {
  const { course_code, title, description, tag, max_members = 4 } = req.body;

  if (!course_code || !title || !tag) {
    return res.status(400).json({ error: 'course_code, title, and tag are required' });
  }
  const validTags = ['Project', 'Study', 'Homework', 'Exam'];
  if (!validTags.includes(tag)) {
    return res.status(400).json({ error: 'Invalid tag' });
  }

  // Resolve or create the course
  let { rows: courseRows } = await pool.query(
    `SELECT id FROM courses WHERE code = $1`, [course_code.trim().toUpperCase()]
  );
  let courseId = courseRows[0]?.id;
  if (!courseId) {
    const ins = await pool.query(
      `INSERT INTO courses (code) VALUES ($1) RETURNING id`,
      [course_code.trim().toUpperCase()]
    );
    courseId = ins.rows[0].id;
  }

  const { rows } = await pool.query(
    `INSERT INTO collab_posts (author_id, course_id, title, description, tag, max_members)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, title, tag, max_members, created_at`,
    [req.user.id, courseId, title.trim(), description?.trim() || null, tag, Number(max_members)]
  );

  // Author automatically joins their own post
  await pool.query(
    `INSERT INTO collab_members (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [rows[0].id, req.user.id]
  );

  // Push to activity feed
  await pool.query(
    `INSERT INTO activity_feed (type, text)
     VALUES ('post', $1)`,
    [`New post in ${course_code.toUpperCase()} — "${title.trim()}"`]
  );

  res.status(201).json(rows[0]);
});

// ── POST /api/dashboard/collab-posts/:id/join ─────────────────
router.post('/collab-posts/:id/join', async (req, res) => {
  const postId = req.params.id;

  // Lock the post row to prevent race conditions
  const { rows: postRows } = await pool.query(
    `SELECT id, max_members, is_open FROM collab_posts WHERE id = $1 FOR UPDATE`,
    [postId]
  );
  const post = postRows[0];
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (!post.is_open) return res.status(409).json({ error: 'Post is full or closed' });

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) AS cnt FROM collab_members WHERE post_id = $1`, [postId]
  );
  if (Number(countRows[0].cnt) >= post.max_members) {
    return res.status(409).json({ error: 'Post is full' });
  }

  try {
    await pool.query(
      `INSERT INTO collab_members (post_id, user_id) VALUES ($1, $2)`,
      [postId, req.user.id]
    );
  } catch (err) {
    if (err.code === '23505') {  // unique violation — already a member
      return res.status(409).json({ error: 'Already a member of this post' });
    }
    throw err;
  }

  // Activity feed entry
  await pool.query(
    `INSERT INTO activity_feed (type, text)
     VALUES ('join', 'A student joined a collaboration post')`,
  );

  res.json({ ok: true });
});

// ── GET /api/dashboard/questions ─────────────────────────────
// Returns recent discussion questions, sorted by vote count (hot) or date.
// Query params: sort = 'hot' | 'recent' (default 'recent'), limit, offset
router.get('/questions', async (req, res) => {
  const { sort = 'recent', limit = 10, offset = 0 } = req.query;
  const orderBy = sort === 'hot' ? 'q.vote_count DESC, q.created_at DESC' : 'q.created_at DESC';

  const { rows } = await pool.query(
    `SELECT
       q.id,
       q.body      AS question,
       q.vote_count AS votes,
       q.created_at,
       c.code      AS course,
       COUNT(a.id)::INT AS answer_count
     FROM  questions q
     JOIN  courses   c ON c.id = q.course_id
     LEFT JOIN answers a ON a.question_id = q.id
     GROUP BY q.id, c.code
     ORDER BY ${orderBy}
     LIMIT $1 OFFSET $2`,
    [Number(limit), Number(offset)]
  );
  res.json(rows);
});

// ── GET /api/dashboard/activity ───────────────────────────────
// Returns the most recent N activity feed entries.
router.get('/activity', async (req, res) => {
  const { limit = 10 } = req.query;
  const { rows } = await pool.query(
    `SELECT id, type, text, created_at
     FROM   activity_feed
     ORDER BY created_at DESC
     LIMIT  $1`,
    [Number(limit)]
  );
  res.json(rows);
});

export default router;
