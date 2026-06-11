-- =============================================================
-- UniMate — Initial Schema Migration
-- 001_initial_schema.sql
-- =============================================================
-- Run with:
--   psql -U <user> -d <db> -f migrations/001_initial_schema.sql
-- =============================================================

-- ── Extensions ────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";     -- case-insensitive email

-- ── Enum types ────────────────────────────────────────────────
CREATE TYPE school_enum AS ENUM (
  'umass',
  'amherst',
  'smith',
  'mount_holyoke',
  'hampshire'
);

CREATE TYPE post_tag_enum AS ENUM (
  'Project',
  'Study',
  'Homework',
  'Exam'
);

CREATE TYPE activity_type_enum AS ENUM (
  'post',
  'answer',
  'review',
  'full',
  'join'
);

-- ── users ─────────────────────────────────────────────────────
-- Created the first time a Five College Google account signs in.
-- Onboarding (step 1 & 2) populates the nullable columns.
CREATE TABLE IF NOT EXISTS users (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email           CITEXT       NOT NULL UNIQUE,
  full_name       TEXT         NOT NULL,
  avatar_url      TEXT,

  -- onboarding step 1
  school          school_enum,
  class_year      SMALLINT     CHECK (class_year BETWEEN 2020 AND 2040),
  major           TEXT,

  -- onboarding step 2
  availability    TEXT,            -- free-form: "Weekdays, Evenings"

  -- flags
  onboarding_done BOOLEAN      NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,

  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── refresh_tokens ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT        NOT NULL UNIQUE,   -- SHA-256 hex of the raw token
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

-- ── courses ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT        NOT NULL,          -- e.g. "COMPSCI 520"
  title       TEXT,                          -- e.g. "Software Engineering"
  school      school_enum,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (code, school)
);

-- ── user_courses ──────────────────────────────────────────────
-- Many-to-many: which courses is a user enrolled in this semester?
CREATE TABLE IF NOT EXISTS user_courses (
  user_id    UUID        NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  course_id  UUID        NOT NULL REFERENCES courses(id)  ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, course_id)
);
CREATE INDEX IF NOT EXISTS idx_user_courses_course ON user_courses(course_id);

-- ── collab_posts ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS collab_posts (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id   UUID          NOT NULL REFERENCES courses(id),
  title       TEXT          NOT NULL,
  description TEXT,
  tag         post_tag_enum NOT NULL DEFAULT 'Study',
  max_members SMALLINT      NOT NULL DEFAULT 4 CHECK (max_members BETWEEN 1 AND 20),
  is_open     BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_collab_posts_course   ON collab_posts(course_id);
CREATE INDEX IF NOT EXISTS idx_collab_posts_author   ON collab_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_collab_posts_open     ON collab_posts(is_open) WHERE is_open = TRUE;

-- ── collab_members ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS collab_members (
  post_id    UUID        NOT NULL REFERENCES collab_posts(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id)        ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_collab_members_user ON collab_members(user_id);

-- ── questions ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS questions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id   UUID        NOT NULL REFERENCES courses(id),
  body        TEXT        NOT NULL,
  vote_count  INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_questions_course ON questions(course_id);

-- ── answers ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS answers (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id  UUID        NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  author_id    UUID        NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  body         TEXT        NOT NULL,
  vote_count   INT         NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_answers_question ON answers(question_id);

-- ── professors ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS professors (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name   TEXT        NOT NULL,
  school      school_enum,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── professor_courses ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS professor_courses (
  professor_id UUID NOT NULL REFERENCES professors(id) ON DELETE CASCADE,
  course_id    UUID NOT NULL REFERENCES courses(id)    ON DELETE CASCADE,
  PRIMARY KEY (professor_id, course_id)
);

-- ── reviews ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id   UUID        NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
  course_id     UUID        REFERENCES courses(id),
  professor_id  UUID        REFERENCES professors(id),
  rating        SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- prevent duplicate reviews per user per course/professor
  UNIQUE (reviewer_id, course_id),
  UNIQUE (reviewer_id, professor_id),
  CHECK (
    (course_id IS NOT NULL AND professor_id IS NULL) OR
    (professor_id IS NOT NULL AND course_id IS NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_reviews_course     ON reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_reviews_professor  ON reviews(professor_id);

-- ── activity_feed ─────────────────────────────────────────────
-- Denormalised feed of recent events for the dashboard "Live Activity" widget.
CREATE TABLE IF NOT EXISTS activity_feed (
  id          UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  type        activity_type_enum NOT NULL,
  text        TEXT               NOT NULL,
  created_at  TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_feed_time ON activity_feed(created_at DESC);

-- ── updated_at triggers ───────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_collab_posts_updated_at
  BEFORE UPDATE ON collab_posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_answers_updated_at
  BEFORE UPDATE ON answers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── auto-close full collab_posts ─────────────────────────────
-- When a new member joins, mark the post as closed if it hits max_members.
CREATE OR REPLACE FUNCTION check_collab_post_full()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_count    INT;
  v_max      INT;
BEGIN
  SELECT COUNT(*), cp.max_members
  INTO   v_count, v_max
  FROM   collab_members cm
  JOIN   collab_posts   cp ON cp.id = cm.post_id
  WHERE  cm.post_id = NEW.post_id
  GROUP BY cp.max_members;

  IF v_count >= v_max THEN
    UPDATE collab_posts SET is_open = FALSE WHERE id = NEW.post_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_check_collab_full
  AFTER INSERT ON collab_members
  FOR EACH ROW EXECUTE FUNCTION check_collab_post_full();

-- ── Seed data (dev only — remove before production) ───────────
-- Sample courses so the dashboard has real data immediately.
INSERT INTO courses (code, title, school) VALUES
('COMPSCI 119', 'Introduction to Programming', 'umass'),
('COMPSCI 220', 'Programming Methodology', 'umass'),
('COMPSCI 230', 'Computer Systems Principles', 'umass'),
('COMPSCI 240', 'Reasoning Under Uncertainty', 'umass'),
('COMPSCI 250', 'Introduction to Computation', 'umass'),
('COMPSCI 311', 'Introduction to Algorithms', 'umass'),
('COMPSCI 320', 'Introduction to Software Engineering', 'umass'),
('COMPSCI 325', 'Introduction to Human Computer Interaction', 'umass'),
('COMPSCI 326', 'Web Programming', 'umass'),
('COMPSCI 377', 'Operating Systems', 'umass'),
('COMPSCI 383', 'Artificial Intelligence', 'umass'),
('COMPSCI 389', 'Introduction to Machine Learning', 'umass'),
('COMPSCI 420', 'Software Entrepreneurship', 'umass'),
('COMPSCI 426', 'Scalable Web Systems', 'umass'),
('COMPSCI 429', 'Software Engineering Project Management', 'umass'),
('COMPSCI 445', 'Information Systems', 'umass'),
('COMPSCI 446', 'Search Engines', 'umass'),
('COMPSCI 453', 'Computer Networks', 'umass'),
('COMPSCI 466', 'Applied Cryptography', 'umass'),
('COMPSCI 485', 'Applications of Natural Language Processing', 'umass'),
('COMPSCI 501', 'Formal Language Theory', 'umass'),
('COMPSCI 508', 'Ethical Considerations in Computing', 'umass'),
('COMPSCI 514', 'Algorithms for Data Science', 'umass'),
('COMPSCI 515', 'Computational Social Choice', 'umass'),
('COMPSCI 520', 'Theory and Practice of Software Engineering', 'umass'),
('COMPSCI 524', 'Health Informatics and Data Science', 'umass'),
('COMPSCI 528', 'Mobile and Ubiquitous Computing', 'umass'),
('COMPSCI 532', 'Systems for Data Science', 'umass'),
('COMPSCI 535', 'Computer Architecture', 'umass'),
('COMPSCI 546', 'Applied Information Retrieval', 'umass'),
('COMPSCI 550', 'Introduction to Simulation', 'umass'),
('COMPSCI 560', 'Introduction to Computer and Network Security', 'umass'),
('COMPSCI 571', 'Data Visualization and Exploration', 'umass'),
('COMPSCI 575', 'Combinatorics and Graph Theory', 'umass'),
('COMPSCI 576', 'Game Programming', 'umass'),
('COMPSCI 578', 'Distributed Computing and Systems', 'umass'),
('COMPSCI 589', 'Machine Learning', 'umass'),
('COMPSCI 602', 'Research Methods in Empirical Computer Science', 'umass'),
('COMPSCI 603', 'Robotics', 'umass'),
('COMPSCI 611', 'Advanced Algorithms', 'umass'),
('COMPSCI 621', 'Advanced Software Engineering', 'umass'),
('COMPSCI 630', 'Systems', 'umass'),
('COMPSCI 645', 'Database Design and Implementation', 'umass'),
('COMPSCI 646', 'Information Retrieval', 'umass'),
('COMPSCI 651', 'Optimization in Computer Science', 'umass'),
('COMPSCI 660', 'Advanced Information Assurance', 'umass'),
('COMPSCI 666', 'Theory and Practice of Cryptography', 'umass'),
('COMPSCI 670', 'Computer Vision', 'umass'),
('COMPSCI 677', 'Distributed and Operating Systems', 'umass'),
('COMPSCI 682', 'Neural Networks: A Modern Introduction', 'umass'),
('COMPSCI 685', 'Advanced Natural Language Processing', 'umass'),
('COMPSCI 687', 'Reinforcement Learning', 'umass'),
('COMPSCI 689', 'Machine Learning', 'umass'),
('CICS 108', 'Foundations of Data Science', 'umass'),
('CICS 110', 'Foundations of Programming', 'umass'),
('CICS 160', 'Object-Oriented Programming', 'umass'),
('CICS 210', 'Data Structures', 'umass'),
('CICS 305', 'Social Issues in Computing', 'umass'),
('INFO 101', 'Introduction to Informatics', 'umass'),
('INFO 150', 'A Mathematical Foundation for Informatics', 'umass'),
('INFO 203', 'A Networked World', 'umass'),
('INFO 248', 'Introduction to Data Science', 'umass'),
('INFO 348', 'Data Analytics with Python', 'umass')
ON CONFLICT (code, school) DO NOTHING;

INSERT INTO professors (full_name, school) VALUES
('W. Richards Adrion', 'umass'),
('James Allan', 'umass'),
('Ivon Arroyo', 'umass'),
('Eugene Bagdasarian', 'umass'),
('David Barrington', 'umass'),
('Andrew Barto', 'umass'),
('Emery Berger', 'umass'),
('Hedyeh Beyhaghi', 'umass'),
('George Bissias', 'umass'),
('Nikko Bovornkeeratiroj', 'umass'),
('Yuriy Brun', 'umass'),
('Bruno Castro da Silva', 'umass'),
('Emmanuel Cecchet', 'umass'),
('Lori Clarke', 'umass'),
('Heather Conboy', 'umass'),
('W. Bruce Croft', 'umass'),
('Wenhan Dai', 'umass'),
('Pubali Datta', 'umass'),
('Jaime Davila', 'umass'),
('Yanlei Diao', 'umass'),
('Justin Domke', 'umass'),
('Madeline Endres', 'umass'),
('Katrin Erk', 'umass'),
('Ina Fiterau Brostean', 'umass'),
('Patrick Flaherty', 'umass'),
('Chuang Gan', 'umass'),
('Deepak Ganesan', 'umass'),
('Lixin Gao', 'umass'),
('Phillipa Gill', 'umass'),
('Mordecai Golin', 'umass'),
('Weibo Gong', 'umass'),
('Przemek Grabowicz', 'umass'),
('Anna Green', 'umass'),
('Roderic Grupen', 'umass'),
('Hui Guan', 'umass'),
('Jeremy Gummeson', 'umass'),
('Laura Haas', 'umass'),
('Peter Haas', 'umass'),
('Mohammad Hajiesmaili', 'umass'),
('Allen Hanson', 'umass'),
('Amir Houmansadr', 'umass'),
('Yicong Huang', 'umass'),
('Meghan Huber', 'umass'),
('Neil Immerman', 'umass'),
('David Irwin', 'umass'),
('Mohit Iyyer', 'umass'),
('David Jensen', 'umass'),
('Evangelos Kalogerakis', 'umass'),
('Ravi Karkar', 'umass'),
('Parviz Kermani', 'umass'),
('Donghyun Kim', 'umass'),
('Stefan Krastanov', 'umass'),
('Akshay Krishnamurthy', 'umass'),
('Andrew Lan', 'umass'),
('Hung Le', 'umass'),
('Erik Learned-Miller', 'umass'),
('Ivan Lee', 'umass'),
('Wendy Lehnert', 'umass'),
('Victor Lesser', 'umass'),
('Brian Levine', 'umass'),
('Marc Liberatore', 'umass'),
('Shiqing Ma', 'umass'),
('Jamie Macbeth', 'umass'),
('Sridhar Mahadevan', 'umass'),
('Narges Mahyar', 'umass'),
('Subhransu Maji', 'umass'),
('Neha Makhija', 'umass'),
('Benjamin Marlin', 'umass'),
('Keith Marzullo', 'umass'),
('Arya Mazumdar', 'umass'),
('Andrew McCallum', 'umass'),
('Andrew McGregor', 'umass'),
('Alexandra Meliou', 'umass'),
('Gerome Miklau', 'umass'),
('Marius Minea', 'umass'),
('Robert Moll', 'umass'),
('J. Eliot Moss', 'umass'),
('Cameron Musco', 'umass'),
('VP Nguyen', 'umass'),
('Scott Niekum', 'umass'),
('Brendan O''Connor', 'umass'),
('Adam O''Neill', 'umass'),
('Leon Osterweil', 'umass'),
('Heather Pon-Barry', 'umass'),
('Mingda Qiao', 'umass'),
('Razieh Rahimi', 'umass'),
('Tauhidur Rahman', 'umass'),
('Matthew Rattigan', 'umass'),
('Timothy Richards', 'umass'),
('Edwina Rissland', 'umass'),
('Arnold Rosenberg', 'umass'),
('Filip Rozpedek', 'umass'),
('Marco Serafini', 'umass'),
('Dan Sheldon', 'umass'),
('Prashant Shenoy', 'umass'),
('Hava Siegelmann', 'umass'),
('Ramesh Sitaraman', 'umass'),
('Lee Spector', 'umass'),
('Ileana Streinu', 'umass'),
('Neeraj Suri', 'umass'),
('Jay Taneja', 'umass'),
('Philip Thomas', 'umass'),
('Neena Thota', 'umass'),
('Don Towsley', 'umass'),
('Arun Venkataramani', 'umass'),
('Gayane Vardoyan', 'umass'),
('Chip Weems', 'umass'),
('Jack Wileden', 'umass'),
('Beverly Woolf', 'umass'),
('Jie Xiong', 'umass'),
('Holly Yanco', 'umass'),
('Hong Yu', 'umass'),
('Hamed Zamani', 'umass'),
('Juan Zhai', 'umass'),
('Hao Zhang', 'umass'),
('Yair Zick', 'umass'),
('Shlomo Zilberstein', 'umass'),
('Michael Zink', 'umass'),
('Ethan Zuckerman', 'umass')
ON CONFLICT DO NOTHING;