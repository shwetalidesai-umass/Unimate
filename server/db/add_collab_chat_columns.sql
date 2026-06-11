-- Optional: extend 001_initial_schema collab_posts for group chat UX (CollaboratePage).
ALTER TABLE collab_posts ADD COLUMN IF NOT EXISTS group_formed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE collab_posts ADD COLUMN IF NOT EXISTS formed_at TIMESTAMPTZ;
ALTER TABLE collab_posts ADD COLUMN IF NOT EXISTS chat_link TEXT;
