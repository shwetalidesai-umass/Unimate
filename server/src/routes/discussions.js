import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

async function ensureCourseId(db, code) {
  const c = String(code || '').trim().toUpperCase();
  if (!c) throw new Error('courseCode required');
  const found = await db.query('SELECT id FROM courses WHERE code = $1 LIMIT 1', [c]);
  if (found.rows[0]) return found.rows[0].id;
  try {
    const ins = await db.query('INSERT INTO courses (code) VALUES ($1) RETURNING id', [c]);
    return ins.rows[0].id;
  } catch (e) {
    if (e.code !== '23505') throw e;
    const again = await db.query('SELECT id FROM courses WHERE code = $1 LIMIT 1', [c]);
    return again.rows[0]?.id;
  }
}

router.get('/questions', async (req, res) => {
  try {
    const { course } = req.query;
    const params = [];
    let sql = `
      SELECT q.id,
             q.author_id,
             q.course_id,
             c.code AS course_code,
             q.body,
             q.vote_count AS votes,
             q.created_at
      FROM questions q
      JOIN courses c ON c.id = q.course_id
    `;
    if (course) {
      params.push(`%${String(course).trim()}%`);
      sql += ` WHERE c.code ILIKE $${params.length}`;
    }
    sql += ' ORDER BY q.created_at DESC';
    const { rows } = await pool.query(sql, params);
    res.json({ questions: rows });
  } catch (err) {
    console.error('[discussions/questions GET]', err);
    res.status(500).json({ message: err.message || 'Failed to fetch questions' });
  }
});

router.post('/questions', async (req, res) => {
  try {
    const viewerId = req.user.id;
    const { courseCode, body } = req.body || {};
    if (!courseCode || !body?.trim()) {
      return res.status(400).json({ message: 'courseCode and body are required' });
    }
    const courseId = await ensureCourseId(pool, courseCode);
    const { rows } = await pool.query(
      `INSERT INTO questions (author_id, course_id, body)
       VALUES ($1::uuid, $2::uuid, $3)
       RETURNING id, author_id, course_id, body, vote_count AS votes, created_at`,
      [viewerId, courseId, body.trim()],
    );
    const q = rows[0];
    q.course_code = courseCode.trim().toUpperCase();
    res.status(201).json({ question: q });
  } catch (err) {
    console.error('[discussions/questions POST]', err);
    res.status(500).json({ message: err.message || 'Failed to create question' });
  }
});

router.post('/questions/:questionId/answers', async (req, res) => {
  try {
    const viewerId = req.user.id;
    const { questionId } = req.params;
    const { body } = req.body || {};
    if (!body?.trim()) return res.status(400).json({ message: 'Answer body is required' });

    const { rows } = await pool.query(
      `INSERT INTO answers (question_id, author_id, body)
       VALUES ($1::uuid, $2::uuid, $3)
       RETURNING id, question_id, author_id, body, created_at`,
      [questionId, viewerId, body.trim()],
    );
    res.status(201).json({ answer: rows[0] });
  } catch (err) {
    console.error('[discussions/answers POST]', err);
    res.status(500).json({ message: err.message || 'Failed to create answer' });
  }
});

router.get('/questions/:questionId/answers', async (req, res) => {
  try {
    const { questionId } = req.params;
    const { rows } = await pool.query(
      `SELECT id, question_id, author_id, body, created_at
       FROM answers
       WHERE question_id = $1::uuid
       ORDER BY created_at ASC`,
      [questionId],
    );
    res.json({ answers: rows });
  } catch (err) {
    console.error('[discussions/answers GET]', err);
    res.status(500).json({ message: err.message || 'Failed to fetch answers' });
  }
});

router.post('/questions/:questionId/vote', async (req, res) => {
  try {
    const { questionId } = req.params;
    const { direction } = req.body || {};
    const delta = direction === 'down' ? -1 : 1;
    const { rows } = await pool.query(
      `UPDATE questions
       SET vote_count = vote_count + $2
       WHERE id = $1::uuid
       RETURNING id, vote_count AS votes`,
      [questionId, delta],
    );
    if (!rows.length) return res.status(404).json({ message: 'Question not found' });
    res.json({ question: rows[0] });
  } catch (err) {
    console.error('[discussions/vote]', err);
    res.status(500).json({ message: err.message || 'Failed to vote on question' });
  }
});

export default router;
