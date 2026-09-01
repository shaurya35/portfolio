-- Cache the rendered HTML for native posts instead of re-running markdown
-- (syntect syntax highlighting included) on every GET /posts/:slug request.
-- Nullable + backfilled by the app on startup, since rendering requires the
-- Rust markdown pipeline, not plain SQL — a fresh row always gets it written
-- at create/update time; existing rows get it on the next boot.
ALTER TABLE posts ADD COLUMN html TEXT;
