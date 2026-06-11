-- UniMate core schema (PostgreSQL). Applied on first container start via docker-compose.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  display_name TEXT NOT NULL,
  school TEXT,
  class_year TEXT,
  major TEXT,
  availability TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (code)
);

CREATE TABLE professors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE professor_courses (
  professor_id UUID NOT NULL REFERENCES professors (id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  PRIMARY KEY (professor_id, course_id)
);

CREATE TABLE user_courses (
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_id)
);

CREATE TABLE collab_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  tag TEXT NOT NULL,
  max_members INT NOT NULL DEFAULT 4 CHECK (max_members >= 1),
  group_formed BOOLEAN NOT NULL DEFAULT false,
  formed_at TIMESTAMPTZ,
  chat_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE collab_post_members (
  post_id UUID NOT NULL REFERENCES collab_posts (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  votes INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions (id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses (id) ON DELETE CASCADE,
  professor_id UUID REFERENCES professors (id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (course_id IS NOT NULL AND professor_id IS NULL)
    OR (course_id IS NULL AND professor_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX reviews_one_course_per_user
  ON reviews (author_id, course_id)
  WHERE course_id IS NOT NULL;

CREATE UNIQUE INDEX reviews_one_professor_per_user
  ON reviews (author_id, professor_id)
  WHERE professor_id IS NOT NULL;

CREATE INDEX idx_collab_posts_course ON collab_posts (course_id);
CREATE INDEX idx_questions_course ON questions (course_id);
CREATE INDEX idx_answers_question ON answers (question_id);
