ALTER TABLE credentials ADD COLUMN label TEXT;

CREATE TABLE article_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id TEXT NOT NULL,
  title TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('draft', 'publish', 'update', 'unpublish', 'revert')),
  user_id TEXT,
  commit_id TEXT NOT NULL,
  at TEXT NOT NULL
);

CREATE INDEX article_events_article ON article_events(article_id, at);
CREATE INDEX article_events_user ON article_events(user_id, at);
