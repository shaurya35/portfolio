CREATE TABLE login_attempts (
    ip TEXT PRIMARY KEY,
    attempts INTEGER NOT NULL,
    window_started_at TIMESTAMPTZ NOT NULL
);
