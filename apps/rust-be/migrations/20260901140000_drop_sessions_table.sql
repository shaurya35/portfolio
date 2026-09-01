-- Reverting the per-session-logout experiment from earlier today. On this
-- cross-region DB connection, the DB write it added to every login and the
-- DB read it added to every admin request were real, user-visible latency
-- and a new failure path on login. Back to the shared session_epoch model
-- (see persist_session_epoch migration) — unlike that one, this table never
-- shipped long enough to be worth leaving around inert, so it's dropped
-- outright rather than orphaned.
DROP TABLE sessions;
