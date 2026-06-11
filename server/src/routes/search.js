import { Router }      from 'express';
import pool            from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { q = '', course } = req.query;
    const query = `%${String(q).trim()}%`;
    const courseFilter = course ? `%${String(course).trim()}%` : null;

    const [posts, questions, reviews] = await Promise.all([
      pool.query(
        `SELECT p.id, c.code AS course_code, p.title, p.tag, p.created_at
         FROM collab_posts p
         JOIN courses c ON c.id = p.course_id
         WHERE (p.title ILIKE $1 OR p.tag ILIKE $1)
           AND ($2::text IS NULL OR c.code ILIKE $2)
         ORDER BY p.created_at DESC
         LIMIT 20`,
        [query, courseFilter],
      ),
      pool.query(
        `SELECT qn.id, c.code AS course_code, qn.body, qn.votes, qn.created_at
         FROM questions qn
         JOIN courses c ON c.id = qn.course_id
         WHERE qn.body ILIKE $1
           AND ($2::text IS NULL OR c.code ILIKE $2)
         ORDER BY qn.created_at DESC
         LIMIT 20`,
        [query, courseFilter],
      ),
      pool.query(
        `SELECT r.id, r.rating, r.body, r.created_at,
                COALESCE(c.code, p.name) AS target_name
         FROM reviews r
         LEFT JOIN courses c ON c.id = r.course_id
         LEFT JOIN professors p ON p.id = r.professor_id
         WHERE r.body ILIKE $1
         ORDER BY r.created_at DESC
         LIMIT 20`,
        [query],
      ),
    ]);

    return res.status(200).json({
      success: true,
      results: {
        posts: posts.rows,
        questions: questions.rows,
        reviews: reviews.rows,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Search failed' });
  }
});

export default router;
