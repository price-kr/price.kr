CREATE TABLE events (
  id INTEGER PRIMARY KEY,
  type TEXT NOT NULL,
  keyword TEXT,
  value TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_events_type_created ON events(type, created_at);
CREATE INDEX idx_events_keyword ON events(keyword);
