-- The admin session epoch used to live only in an in-memory u64 (reset to 0
-- on every process boot). Since Fluid scales this container to zero on
-- idle, and every deploy also restarts it, logout's invalidation only ever
-- lasted until the next cold start — after which the epoch reset back to 0
-- and any previously "logged out" cookie (almost always carrying value 0,
-- since most logins happen right after a restart) became valid again.
--
-- Single-row table (boolean PK trick) so it's durable across restarts while
-- keeping the exact same "one global epoch" model — just persisted.
CREATE TABLE session_epoch (
    singleton BOOLEAN PRIMARY KEY DEFAULT true CHECK (singleton),
    epoch     BIGINT  NOT NULL DEFAULT 0
);

INSERT INTO session_epoch (singleton, epoch) VALUES (true, 0);
