// reviews.js — UniMate Reviews API
// Handles: Course Reviews & Professor Reviews
// Routes mounted at /api/reviews

import { Router } from 'express';
import pool        from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All review routes require a logged-in user
router.use(requireAuth);

// =============================================================
// COURSES
// =============================================================

/**
 * GET /api/reviews/courses
 * Returns a list of all courses (for the search/select dropdown).
 */
router.get('/courses', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, code, title, school
       FROM   courses
       ORDER BY code ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error('[reviews] GET /courses error:', err);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

/**
 * GET /api/reviews/courses/:courseId
 * Returns course details + all reviews + average rating.
 */
router.get('/courses/:courseId', async (req, res) => {
  const { courseId } = req.params;
  try {
    const { rows: courseRows } = await pool.query(
      `SELECT id, code, title, school FROM courses WHERE id = $1`,
      [courseId]
    );
    if (!courseRows[0]) return res.status(404).json({ error: 'Course not found' });

    const { rows: reviewRows } = await pool.query(
      `SELECT r.id, r.rating, r.body, r.created_at,
              u.full_name AS reviewer_name, u.avatar_url AS reviewer_avatar
       FROM   reviews r
       JOIN   users   u ON u.id = r.reviewer_id
       WHERE  r.course_id = $1
       ORDER BY r.created_at DESC`,
      [courseId]
    );

    const { rows: aggRows } = await pool.query(
      `SELECT ROUND(AVG(rating)::NUMERIC, 1) AS avg_rating,
              COUNT(*)::INT                  AS review_count
       FROM   reviews WHERE course_id = $1`,
      [courseId]
    );

    res.json({
      ...courseRows[0],
      avg_rating:   aggRows[0].avg_rating ? Number(aggRows[0].avg_rating) : null,
      review_count: aggRows[0].review_count,
      reviews:      reviewRows,
    });
  } catch (err) {
    console.error('[reviews] GET /courses/:courseId error:', err);
    res.status(500).json({ error: 'Failed to fetch course reviews' });
  }
});

/**
 * POST /api/reviews/courses/:courseId
 * Submit a course review. Body: { rating: 1-5, body: string }
 */
router.post('/courses/:courseId', async (req, res) => {
  const { courseId }     = req.params;
  const { rating, body } = req.body;
  const reviewerId       = req.user.id;

  const ratingNum = Number(rating);
  if (!rating || !Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ error: 'rating must be an integer between 1 and 5' });
  }

  try {
    const { rows: courseRows } = await pool.query(
      `SELECT id FROM courses WHERE id = $1`, [courseId]
    );
    if (!courseRows[0]) return res.status(404).json({ error: 'Course not found' });

    const { rows } = await pool.query(
      `INSERT INTO reviews (reviewer_id, course_id, rating, body)
       VALUES ($1, $2, $3, $4)
       RETURNING id, rating, body, created_at`,
      [reviewerId, courseId, ratingNum, body?.trim() || null]
    );

    await pool.query(
      `INSERT INTO activity_feed (type, text) VALUES ('review', $1)`,
      [`A student reviewed a course`]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'You have already reviewed this course' });
    }
    console.error('[reviews] POST /courses/:courseId error:', err);
    res.status(500).json({ error: 'Failed to submit course review' });
  }
});

// =============================================================
// PROFESSORS
// =============================================================

/**
 * GET /api/reviews/professors
 * Returns a list of all professors (for the search/select dropdown).
 */
router.get('/professors', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, full_name, school
       FROM   professors
       ORDER BY full_name ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error('[reviews] GET /professors error:', err);
    res.status(500).json({ error: 'Failed to fetch professors' });
  }
});

/**
 * GET /api/reviews/professors/:professorId
 * Returns professor details + all reviews + average rating.
 */
router.get('/professors/:professorId', async (req, res) => {
  const { professorId } = req.params;
  try {
    const { rows: profRows } = await pool.query(
      `SELECT id, full_name, school FROM professors WHERE id = $1`,
      [professorId]
    );
    if (!profRows[0]) return res.status(404).json({ error: 'Professor not found' });

    const { rows: reviewRows } = await pool.query(
      `SELECT r.id, r.rating, r.body, r.created_at,
              u.full_name AS reviewer_name, u.avatar_url AS reviewer_avatar
       FROM   reviews r
       JOIN   users   u ON u.id = r.reviewer_id
       WHERE  r.professor_id = $1
       ORDER BY r.created_at DESC`,
      [professorId]
    );

    const { rows: aggRows } = await pool.query(
      `SELECT ROUND(AVG(rating)::NUMERIC, 1) AS avg_rating,
              COUNT(*)::INT                  AS review_count
       FROM   reviews WHERE professor_id = $1`,
      [professorId]
    );

    res.json({
      ...profRows[0],
      avg_rating:   aggRows[0].avg_rating ? Number(aggRows[0].avg_rating) : null,
      review_count: aggRows[0].review_count,
      reviews:      reviewRows,
    });
  } catch (err) {
    console.error('[reviews] GET /professors/:professorId error:', err);
    res.status(500).json({ error: 'Failed to fetch professor reviews' });
  }
});

/**
 * POST /api/reviews/professors/:professorId
 * Submit a professor review. Body: { rating: 1-5, body: string }
 */
router.post('/professors/:professorId', async (req, res) => {
  const { professorId }  = req.params;
  const { rating, body } = req.body;
  const reviewerId       = req.user.id;

  const ratingNum = Number(rating);
  if (!rating || !Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ error: 'rating must be an integer between 1 and 5' });
  }

  try {
    const { rows: profRows } = await pool.query(
      `SELECT id FROM professors WHERE id = $1`, [professorId]
    );
    if (!profRows[0]) return res.status(404).json({ error: 'Professor not found' });

    const { rows } = await pool.query(
      `INSERT INTO reviews (reviewer_id, professor_id, rating, body)
       VALUES ($1, $2, $3, $4)
       RETURNING id, rating, body, created_at`,
      [reviewerId, professorId, ratingNum, body?.trim() || null]
    );

    await pool.query(
      `INSERT INTO activity_feed (type, text) VALUES ('review', $1)`,
      [`A student reviewed a professor`]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'You have already reviewed this professor' });
    }
    console.error('[reviews] POST /professors/:professorId error:', err);
    res.status(500).json({ error: 'Failed to submit professor review' });
  }
});

export default router;