CREATE TABLE rate_limits (
  key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (key, window_start)
);
CREATE INDEX rate_limits_expiry ON rate_limits(expires_at);
CREATE INDEX challenges_expiry ON challenges(expires_at);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE INDEX invites_expiry ON invites(expires_at);
