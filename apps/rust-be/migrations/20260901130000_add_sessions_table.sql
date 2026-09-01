-- Replaces the global session_epoch model (one shared counter, so logging
-- out on one device logged out every device) with per-session invalidation.
-- Each login gets its own row; logout revokes only that row. The old
-- session_epoch table is left in place rather than dropped here — nothing
-- reads it anymore after this migration, but dropping it is a separate,
-- easily-revertible cleanup rather than bundled into this behavior change.
CREATE TABLE sessions (
    id         TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ
);
