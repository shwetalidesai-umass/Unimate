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

async function getPostWithMemberCount(db, postId, viewerId) {
  const { rows } = await db.query(
    `SELECT p.id,
            p.author_id,
            p.course_id,
            c.code       AS course_code,
            p.title,
            p.tag::text AS tag,
            p.max_members,
            COALESCE(p.group_formed, false) AS group_formed,
            p.formed_at,
            p.chat_link,
            p.created_at,
            COUNT(m.user_id)::int AS member_count,
            (p.author_id = $2::uuid) AS is_author,
            COALESCE(bool_or(m.user_id = $2::uuid), false) AS is_member
     FROM collab_posts p
     JOIN courses c ON c.id = p.course_id
     LEFT JOIN collab_members m ON m.post_id = p.id
     WHERE p.id = $1::uuid
     GROUP BY p.id, c.code`,
    [postId, viewerId],
  );
  return rows[0] || null;
}

async function maybeMarkGroupFormed(db, postId) {
  const { rows } = await db.query(
    `SELECT COUNT(cm.user_id)::int AS cnt,
            cp.max_members,
            COALESCE(cp.group_formed, FALSE) AS gf
     FROM collab_posts cp
     LEFT JOIN collab_members cm ON cm.post_id = cp.id
     WHERE cp.id = $1::uuid
     GROUP BY cp.id, cp.max_members, cp.group_formed`,
    [postId],
  );
  const r = rows[0];
  if (!r || r.gf) return;
  if (Number(r.cnt) >= Number(r.max_members)) {
    await db.query(
      `UPDATE collab_posts
       SET group_formed = TRUE,
           formed_at = COALESCE(formed_at, NOW())
       WHERE id = $1::uuid`,
      [postId],
    );
  }
}

router.get('/posts', async (req, res) => {
  try {
    const { course: courseFilter, tag: tagFilter } = req.query;
    const viewerId = req.user.id;

    const params = [viewerId];
    const cond = ['TRUE'];
    if (courseFilter) {
      params.push(`%${String(courseFilter).trim()}%`);
      cond.push(`c.code ILIKE $${params.length}`);
    }
    if (tagFilter) {
      params.push(String(tagFilter));
      cond.push(`p.tag::text = $${params.length}`);
    }

    const { rows } = await pool.query(
      `SELECT p.id,
              p.course_id,
              c.code AS course_code,
              p.title,
              p.tag::text AS tag,
              p.max_members,
              COALESCE(p.group_formed, false) AS group_formed,
              p.formed_at,
              p.chat_link,
              COUNT(m.user_id)::int AS member_count,
              (p.author_id = $1::uuid) AS is_author,
              COALESCE(bool_or(m.user_id = $1::uuid), false) AS is_member
       FROM collab_posts p
       JOIN courses c ON c.id = p.course_id
       LEFT JOIN collab_members m ON m.post_id = p.id
       WHERE ${cond.join(' AND ')}
       GROUP BY p.id, c.code
       ORDER BY p.created_at DESC`,
      params,
    );
    res.json({ posts: rows });
  } catch (err) {
    console.error('[collab/posts GET]', err);
    res.status(500).json({ message: err.message || 'Failed to fetch collab posts' });
  }
});

/** Members + post meta for opening the shared external chat (Google Chat, etc.). */
router.get('/posts/:postId/group-chat', async (req, res) => {
  try {
    const { postId } = req.params;
    const viewerId = req.user.id;

    const post = await getPostWithMemberCount(pool, postId, viewerId);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (!post.is_author && !post.is_member) {
      return res.status(403).json({ message: 'Join this collaboration post to open the group chat.' });
    }

    const { rows: members } = await pool.query(
      `SELECT u.id AS user_id, u.full_name, u.email::text AS email
       FROM collab_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.post_id = $1::uuid
       ORDER BY u.full_name ASC NULLS LAST, u.email ASC`,
      [postId],
    );

    res.json({
      post: {
        id: post.id,
        title: post.title,
        course_code: post.course_code,
        tag: post.tag,
        group_formed: post.group_formed,
        chat_link: post.chat_link,
        max_members: post.max_members,
        member_count: post.member_count,
        is_author: post.is_author,
      },
      members,
    });
  } catch (err) {
    console.error('[collab/group-chat GET]', err);
    res.status(500).json({ message: err.message || 'Failed to load group chat' });
  }
});

router.post('/posts', async (req, res) => {
  try {
    const viewerId = req.user.id;
    const { courseCode, title, tag, maxMembers = 4 } = req.body || {};
    if (!courseCode || !title || !tag) {
      return res.status(400).json({ message: 'Missing courseCode, title, or tag' });
    }

    const validTags = ['Project', 'Study', 'Homework', 'Exam'];
    if (!validTags.includes(tag)) {
      return res.status(400).json({ message: 'Invalid tag' });
    }

    const courseId = await ensureCourseId(pool, courseCode);
    const mm = Math.min(20, Math.max(1, Number(maxMembers)));

    const { rows } = await pool.query(
      `INSERT INTO collab_posts (author_id, course_id, title, tag, max_members)
       VALUES ($1::uuid, $2::uuid, $3, $4::post_tag_enum, $5)
       RETURNING id`,
      [viewerId, courseId, String(title).trim(), tag, mm],
    );
    const postId = rows[0].id;

    await pool.query(
      `INSERT INTO collab_members (post_id, user_id)
       VALUES ($1::uuid, $2::uuid)
       ON CONFLICT DO NOTHING`,
      [postId, viewerId],
    );

    let post = await getPostWithMemberCount(pool, postId, viewerId);
    await maybeMarkGroupFormed(pool, postId);
    post = await getPostWithMemberCount(pool, postId, viewerId);

    res.status(201).json({ post });
  } catch (err) {
    console.error('[collab/posts POST]', err);
    res.status(500).json({ message: err.message || 'Failed to create collab post' });
  }
});

router.post('/posts/:postId/join', async (req, res) => {
  try {
    const { postId } = req.params;
    const viewerId = req.user.id;

    let post = await getPostWithMemberCount(pool, postId, viewerId);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.is_author) {
      return res.status(409).json({ message: 'Author is already a member of this post' });
    }
    if (post.is_member) return res.json({ post });
    if (Number(post.member_count) >= Number(post.max_members)) {
      return res.status(409).json({ message: 'Post is full' });
    }

    await pool.query(
      `INSERT INTO collab_members (post_id, user_id)
       VALUES ($1::uuid, $2::uuid)
       ON CONFLICT DO NOTHING`,
      [postId, viewerId],
    );
    await maybeMarkGroupFormed(pool, postId);
    const finalPost = await getPostWithMemberCount(pool, postId, viewerId);
    res.json({ post: finalPost });
  } catch (err) {
    console.error('[collab/join]', err);
    res.status(500).json({ message: err.message || 'Failed to join post' });
  }
});

router.post('/posts/:postId/leave', async (req, res) => {
  try {
    const { postId } = req.params;
    const viewerId = req.user.id;

    const { rows } = await pool.query(
      `SELECT author_id FROM collab_posts WHERE id = $1::uuid`,
      [postId],
    );
    if (!rows.length) return res.status(404).json({ message: 'Post not found' });
    if (rows[0].author_id === viewerId) {
      return res.status(400).json({ message: 'Author cannot leave the member list.' });
    }

    await pool.query(
      `DELETE FROM collab_members WHERE post_id = $1::uuid AND user_id = $2::uuid`,
      [postId, viewerId],
    );

    const post = await getPostWithMemberCount(pool, postId, viewerId);
    res.json({ post });
  } catch (err) {
    console.error('[collab/leave]', err);
    res.status(500).json({ message: err.message || 'Failed to leave post' });
  }
});

router.patch('/posts/:postId/chat-link', async (req, res) => {
  try {
    const { postId } = req.params;
    const viewerId = req.user.id;
    const { chatLink } = req.body || {};
    if (!chatLink?.trim()) return res.status(400).json({ message: 'chatLink is required' });

    const post = await getPostWithMemberCount(pool, postId, viewerId);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.author_id !== viewerId) {
      return res.status(403).json({ message: 'Only post author can set chat link' });
    }
    if (!post.group_formed) {
      return res.status(409).json({ message: 'Group is not formed yet' });
    }

    await pool.query(
      `UPDATE collab_posts SET chat_link = $2 WHERE id = $1::uuid`,
      [postId, chatLink.trim()],
    );
    const updated = await getPostWithMemberCount(pool, postId, viewerId);
    res.json({ post: updated });
  } catch (err) {
    console.error('[collab/chat-link PATCH]', err);
    res.status(500).json({ message: err.message || 'Failed to set chat link' });
  }
});

router.get('/posts/:postId/chat-link', async (req, res) => {
  try {
    const { postId } = req.params;
    const viewerId = req.user.id;

    const { rows } = await pool.query(
      `SELECT chat_link,
              COALESCE(group_formed, false) AS group_formed,
              author_id
       FROM collab_posts
       WHERE id = $1::uuid
         AND (
           author_id = $2::uuid
           OR EXISTS (
             SELECT 1 FROM collab_members m
             WHERE m.post_id = collab_posts.id AND m.user_id = $2::uuid
           )
         )`,
      [postId, viewerId],
    );
    const row = rows[0];
    if (!row) return res.status(403).json({ message: 'Only group members can access chat link' });
    if (!row.group_formed || !row.chat_link) {
      return res.status(404).json({ message: 'Chat link not available yet' });
    }
    res.json({ chatLink: row.chat_link });
  } catch (err) {
    console.error('[collab/chat-link GET]', err);
    res.status(500).json({ message: err.message || 'Failed to fetch chat link' });
  }
});

export default router;
