const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, display_name, school, class_year, major, availability, created_at
       FROM users
       WHERE id = $1`,
      [req.user.sub],
    );
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }
    return res.status(200).json({ success: true, profile: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
});

router.patch('/me', requireAuth, async (req, res) => {
  try {
    const {
      displayName, school, classYear, major, availability,
    } = req.body || {};

    const result = await pool.query(
      `UPDATE users
       SET display_name = COALESCE($2, display_name),
           school = COALESCE($3, school),
           class_year = COALESCE($4, class_year),
           major = COALESCE($5, major),
           availability = COALESCE($6, availability)
       WHERE id = $1
       RETURNING id, email, display_name, school, class_year, major, availability, created_at`,
      [req.user.sub, displayName, school, classYear, major, availability],
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }
    return res.status(200).json({ success: true, profile: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

module.exports = router;
