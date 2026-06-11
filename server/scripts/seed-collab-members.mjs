/**
 * Dev-only: insert synthetic users and add them as collab_members on posts
 * that are not full (skips rows where user is the author or already a member).
 *
 * Usage (from server/):
 *   node scripts/seed-collab-members.mjs
 *
 * Requires DATABASE_URL or DB_* in server/.env (load via bootstrap-env).
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = (await import('../src/db/pool.js')).default;

const SEED_USERS = [
  { email: 'seed.collab.member1@unimate.local', full_name: 'Jordan Kim' },
  { email: 'seed.collab.member2@unimate.local', full_name: 'Sam Rivera' },
  { email: 'seed.collab.member3@unimate.local', full_name: 'Riley Chen' },
];

async function main() {
  for (const u of SEED_USERS) {
    await pool.query(
      `INSERT INTO users (email, full_name, onboarding_done)
       VALUES ($1, $2, true)
       ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name`,
      [u.email, u.full_name],
    );
  }

  const { rows: seedIds } = await pool.query(
    `SELECT id, email FROM users WHERE email = ANY($1::text[]) ORDER BY email`,
    [SEED_USERS.map((s) => s.email)],
  );

  const { rows: posts } = await pool.query(`
    SELECT p.id, p.author_id, p.max_members,
           COUNT(cm.user_id)::int AS member_count
    FROM collab_posts p
    LEFT JOIN collab_members cm ON cm.post_id = p.id
    GROUP BY p.id
    HAVING COUNT(cm.user_id) < p.max_members
  `);

  let added = 0;
  for (const post of posts) {
    for (const u of seedIds) {
      if (u.id === post.author_id) continue;
      const { rows: mc } = await pool.query(
        `SELECT COUNT(*)::int AS c FROM collab_members WHERE post_id = $1`,
        [post.id],
      );
      if (mc[0].c >= post.max_members) break;
      const ins = await pool.query(
        `INSERT INTO collab_members (post_id, user_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [post.id, u.id],
      );
      added += ins.rowCount ?? 0;
    }
  }

  await pool.query(`
    UPDATE collab_posts cp
    SET group_formed = TRUE,
        formed_at = COALESCE(cp.formed_at, NOW())
    WHERE COALESCE(cp.group_formed, false) = false
      AND (SELECT COUNT(*)::int FROM collab_members cm WHERE cm.post_id = cp.id) >= cp.max_members
  `);

  const { rows: summary } = await pool.query(`
    SELECT p.id, c.code AS course_code, p.title,
           COUNT(cm.user_id)::int AS member_count,
           p.max_members
    FROM collab_posts p
    JOIN courses c ON c.id = p.course_id
    LEFT JOIN collab_members cm ON cm.post_id = p.id
    GROUP BY p.id, c.code, p.title, p.max_members
    ORDER BY p.created_at DESC
    LIMIT 20
  `);

  console.log(`Seed collab members: upserted ${SEED_USERS.length} users, inserted ${added} membership row(s).`);
  console.log('Recent posts (member counts):');
  for (const r of summary) {
    console.log(`  ${r.course_code} — ${r.title}: ${r.member_count}/${r.max_members}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
