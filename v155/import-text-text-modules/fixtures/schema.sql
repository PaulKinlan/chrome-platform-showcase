CREATE TABLE IF NOT EXISTS reading (
  id       INTEGER PRIMARY KEY,
  taken_at TEXT    NOT NULL,
  sensor   TEXT    NOT NULL,
  celsius  REAL    NOT NULL
);

CREATE INDEX IF NOT EXISTS reading_by_sensor ON reading (sensor, taken_at);
