CREATE TABLE posts (
    id           BIGSERIAL PRIMARY KEY,
    slug         TEXT        NOT NULL UNIQUE,
    title        TEXT        NOT NULL,
    description  TEXT        NOT NULL,
    category     TEXT        NOT NULL,
    source       TEXT        NOT NULL,
    url          TEXT,
    markdown     TEXT,
    status       TEXT        NOT NULL,
    published_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT post_body_shape CHECK (
        (source = 'native' AND markdown IS NOT NULL AND url IS NULL)
     OR (source <> 'native' AND url IS NOT NULL AND markdown IS NULL)
    ),
    CONSTRAINT post_published_at_required CHECK (
        status <> 'published' OR published_at IS NOT NULL
    )
);

CREATE INDEX posts_status_published_at_idx ON posts (status, published_at DESC);
