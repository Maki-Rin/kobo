CREATE TABLE IF NOT EXISTS editor_drafts (
  collection TEXT NOT NULL CHECK (collection IN ('articles', 'works', 'events')),
  entry_id TEXT NOT NULL,
  revision TEXT NOT NULL,
  base_sha TEXT,
  entry_json TEXT NOT NULL,
  images_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL REFERENCES users(id),
  PRIMARY KEY (collection, entry_id)
);

CREATE TABLE IF NOT EXISTS editor_uploads (
  sha TEXT PRIMARY KEY,
  size INTEGER NOT NULL,
  ready INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS editor_upload_parts (
  sha TEXT NOT NULL REFERENCES editor_uploads(sha) ON DELETE CASCADE,
  part INTEGER NOT NULL,
  data TEXT NOT NULL,
  PRIMARY KEY (sha, part)
);
