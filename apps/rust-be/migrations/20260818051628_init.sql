-- Add migration script here
CREATE TABLE events (
    id           BIGSERIAL PRIMARY KEY,
    kind         TEXT        NOT NULL,
    path         TEXT        NOT NULL,
    target       TEXT,
    referrer     TEXT,
    country      TEXT,
    device       TEXT,
    visitor_hash TEXT        NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX events_created_at_idx ON events (created_at DESC);