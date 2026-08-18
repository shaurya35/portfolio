# rust-be — build spec

You are completing the Rust backend for `shauryacodes.me`. Build it end to end.
The site currently links its writing out to Medium; when you are done, posts live
in this backend and render on the site itself.

## Non-negotiables

- **No comments in the code.** Not doc comments, not inline. Names and types carry the meaning.
- `cargo fmt --check` and `cargo clippy -- -D warnings` must both pass. No `#[allow(...)]` to
  silence a warning you could fix.
- No `unwrap()` or `expect()` inside a handler. They are permitted in `main` at boot, and nowhere else.
- No dead code. Do not add an enum variant, struct field, column, or endpoint that nothing
  constructs or reads.
- Errors return the same JSON envelope as successes. A client must never get JSON on success and
  plain text on failure.
- Raw IPs are never stored. Ever.
- Do not change anything under `apps/web/` except the files named in "Frontend work" below.
- One logical change per commit. Conventional-commit subjects, matching the repo's existing style
  (`feat(rust-be):`, `fix(web):`, `content(web):`).

## What already exists — verified, do not rebuild

```
apps/rust-be/
├── Cargo.toml            axum 0.8, sqlx 0.9 (runtime-tokio, tls-native-tls, postgres,
│                         macros, migrate, chrono), serde, tokio(full), tracing,
│                         tracing-subscriber, thiserror 2, dotenvy, chrono
├── package.json          name/private/scripts → cargo run | build --release | clippy
├── .env                  DATABASE_URL, Neon, gitignored
├── .env.example          committed
├── migrations/
│   └── 20260818051628_init.sql    events table + created_at index
└── src/
    ├── main.rs           config → pool → migrate → router → serve, binds 0.0.0.0:8080
    ├── config.rs         Config { database_url }, ConfigError, from_env() validated at boot
    ├── db.rs             connect(&str) -> PgPool, max_connections 5, acquire_timeout 10s
    ├── error.rs          AppError { BadRequest, Database }, IntoResponse, From<JsonRejection>
    ├── state.rs          AppState { pool }, derives Clone
    ├── models/           EMPTY
    ├── routes/           EMPTY
    └── extractors/       EMPTY
```

Working today: `GET /health` does a real `SELECT 1` and returns
`{"status":"ok","version":"0.1.0"}`, 500 if the database is unreachable.

`turbo.json` already lists `target/**` in the `build` task outputs.

Existing `events` columns: `id BIGSERIAL PK, kind TEXT NOT NULL, path TEXT NOT NULL,
target TEXT, referrer TEXT, country TEXT, device TEXT, visitor_hash TEXT NOT NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT now()`.

## Target structure

```
apps/rust-be/
├── Cargo.toml
├── package.json
├── .env.example
├── .sqlx/                          committed offline query metadata
├── migrations/
│   ├── 20260818051628_init.sql     exists
│   ├── ..._posts.sql               posts table
│   └── ..._seed_posts.sql          the one Medium post from content/writing.ts
└── src/
    ├── main.rs                     bootstrap only, no business logic
    ├── config.rs                   + admin_password_hash, cookie_key, revalidate_url,
    │                               revalidate_secret, allowed_origin
    ├── db.rs
    ├── error.rs                    grows: NotFound, Unauthorized, Conflict
    ├── state.rs                    + config, + daily salt store
    ├── markdown.rs                 pulldown-cmark → HTML
    ├── auth.rs                     argon2 verify, cookie signing
    ├── revalidate.rs               fire-and-forget POST to the Next revalidate hook
    ├── models/
    │   ├── mod.rs
    │   ├── event.rs                EventKind enum, NewEvent
    │   ├── post.rs                 Post, PostBody, PostStatus, NewPost, UpdatePost
    │   └── stats.rs                aggregate row shapes
    ├── routes/
    │   ├── mod.rs                  assembles the Router
    │   ├── health.rs
    │   ├── events.rs               POST /e
    │   ├── posts.rs                public reads
    │   ├── admin.rs                login + post CRUD
    │   └── stats.rs                GET /admin/stats
    └── extractors/
        ├── mod.rs
        ├── admin.rs                cookie guard, FromRequestParts
        └── visitor.rs              IP + UA + daily salt → visitor_hash
```

## Data model

### posts

```sql
CREATE TABLE posts (
    id           BIGSERIAL PRIMARY KEY,
    slug         TEXT        NOT NULL UNIQUE,
    title        TEXT        NOT NULL,
    description  TEXT        NOT NULL,
    category     TEXT        NOT NULL,
    source       TEXT        NOT NULL,   -- 'x' | 'medium' | 'native'
    url          TEXT,                   -- set iff source <> 'native'
    markdown     TEXT,                   -- set iff source  = 'native'
    status       TEXT        NOT NULL,   -- 'draft' | 'published'
    published_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Enforce the discriminated union in the database, not only in Rust:

```sql
CONSTRAINT post_body_shape CHECK (
    (source = 'native' AND markdown IS NOT NULL AND url IS NULL)
 OR (source <> 'native' AND url      IS NOT NULL AND markdown IS NULL)
)
```

Also: `CHECK (status <> 'published' OR published_at IS NOT NULL)`.

Index `(status, published_at DESC)` — every public read filters and orders by exactly that.

In Rust this is a serde-tagged enum, and it is the centrepiece of the model:

```rust
#[serde(tag = "source", rename_all = "snake_case")]
enum PostBody {
    X      { url: String },
    Medium { url: String },
    Native { markdown: String },
}
```

The row is flat, the API shape is tagged. Convert at the database boundary, in `models/post.rs`,
not in a handler.

### Seed migration

Insert the single existing post from `apps/web/content/writing.ts` verbatim:
slug `how-to-learn-with-ai-without-letting-it-do-the-thinking`, source `medium`,
category `Learning`, date `2026-07-17`, status `published`. The site must look identical
the moment it switches over.

## Endpoints

Public, no auth:

| Method | Path            | Returns |
|---|---|---|
| GET  | `/health`       | status, version; 500 if the database is unreachable |
| GET  | `/posts`        | published posts, newest first; native posts include no body |
| GET  | `/posts/:slug`  | one published post; native → `markdown` rendered to HTML; 404 otherwise |
| POST | `/e`            | analytics beacon; 204; no body echoed |

Admin, cookie-guarded:

| Method | Path | Notes |
|---|---|---|
| POST   | `/admin/login`       | argon2 verify against the env hash → signed HttpOnly cookie |
| POST   | `/admin/logout`      | clears the cookie |
| GET    | `/admin/posts`       | includes drafts |
| POST   | `/admin/posts`       | create |
| PATCH  | `/admin/posts/:id`   | update; publish/unpublish is a status change, not a separate route |
| DELETE | `/admin/posts/:id`   | delete |
| GET    | `/admin/stats`       | aggregates |

### POST /e

Body carries `kind`, `path`, `target` and nothing else. `deny_unknown_fields`.
`kind` is a Rust enum (`pageview`, `click`) so serde rejects anything else at parse time and it
becomes a 400 with no hand-written validation.

`visitor_hash`, `referrer`, `country` and `device` are derived server-side from headers by the
`visitor` extractor. The client must not be able to set them — anyone can curl this endpoint.

Hashing: `blake3` or `sha2` over `ip + user_agent + daily_salt`. The salt is random at boot and
rotates every 24h, held in `AppState`. That yields unique-visitor counts with no PII stored and no
cookie, therefore no cookie banner. Never persist the raw IP, not even transiently.

Drop known bot user-agents before inserting.

Return 204. `sendBeacon` cannot read a response, so a body here is bytes nobody will ever see.

### GET /admin/stats

`GROUP BY` aggregates over `events`: pageviews and unique visitors per day, top paths, top click
targets, top referrers, countries. Accept a `?days=` window, default 30, clamp it.

## Auth

One user. No users table, no OAuth, no roles, no reset flow — that would be theatre.

- argon2 hash of the password lives in an env var; `POST /admin/login` verifies against it.
- On success, set a signed HttpOnly cookie: `SameSite=Lax`, `Secure`, `Domain=.shauryacodes.me`,
  reasonable expiry. Same-site means no CORS-with-credentials to get wrong.
- `extractors/admin.rs` implements `FromRequestParts` and rejects with `AppError::Unauthorized`.
  Every admin handler takes it as an argument; there must be no unguarded admin route.
- Constant-time comparison. Do not log the password, the hash, or the cookie value.

## Markdown

`pulldown-cmark`, rendered on read in `GET /posts/:slug`. No sanitisation and no caching —
the only person who can write a post is the owner, and at this traffic a cache is complexity
buying nothing. Store the markdown losslessly; the rendered HTML is derived and never persisted.

## The load-bearing constraint

**A visitor must never wait on this backend.**

`/` and `/writing` are statically generated and CDN-served. Next fetches from Rust at build /
revalidate time, never in a visitor's request path. When a post is published or edited, Rust
POSTs to a Next revalidate webhook (shared secret in env, fire-and-forget, a failure is logged
and never fails the admin request).

If Rust is down the site serves slightly stale content instead of dying. Never add a live view
counter to a public page — it reintroduces the synchronous fetch this whole design exists to avoid.

## Frontend work

In `apps/web`:

1. `types/writing.ts` — add `"native"` to `WritingSource`; make `href` optional; add optional
   `html` and `status`. Native posts have no `href`; external posts have no `html`.
2. `lib/api.ts` — new. `getPosts()` and `getPost(slug)` against the Rust API, with
   `use cache` + `cacheLife`.
3. `app/writing/page.tsx` — read from `getPosts()` instead of `content/writing.ts`.
4. `components/sections/writing.tsx` — same source, `.slice(0, 3)`. **The homepage and `/writing`
   must read from one call. They cannot drift.**
5. `components/writing-list.tsx` — native posts link internally to `/writing/[slug]`; x and
   medium posts keep linking out, with the external-link affordance.
6. `app/writing/[slug]/page.tsx` — new. Next 16: `params` is async, type it with
   `PageProps<'/writing/[slug]'>`. `generateStaticParams` from `getPosts()`.
   `notFound()` when the slug is unknown.
7. `app/api/revalidate/route.ts` — new. Verifies the shared secret, calls `revalidatePath`.
8. `app/admin/` — login form and a post list/editor. Markdown textarea, no editor dependency.
   Client-side, cookie auth, draft/publish toggle.
9. Beacon — `navigator.sendBeacon` to `POST /e` after paint. Never blocks render, and its failure
   must be invisible to the visitor.
10. Delete `content/writing.ts` **only after** the API path is proven working end to end.

## Build order

Each step ends compiling, clippy-clean, and committed.

1. `models/`, `routes/`, `extractors/` module skeletons; move `/health` into `routes/health.rs`;
   `routes/mod.rs` assembles the Router.
2. `POST /e` — model, insert, 204, JSON 400s on bad bodies.
3. `extractors/visitor.rs` — daily salt, hashing, headers, bot filter. Beacon wired into
   `apps/web`. **Ship this before anything below — analytics data cannot be backfilled.**
4. `posts` migration + seed. `models/post.rs` with the tagged enum and the row conversion.
5. `GET /posts`, `GET /posts/:slug`, markdown rendering. `AppError::NotFound` appears here.
6. Auth: config, argon2, cookie, `extractors/admin.rs`. `AppError::Unauthorized` appears here.
7. Admin post CRUD + revalidate hook.
8. `GET /admin/stats`.
9. Frontend swap: `lib/api.ts`, `[slug]` route, admin UI, then delete `content/writing.ts`.
10. `cargo sqlx prepare`, commit `.sqlx/`, CI running fmt + clippy + build, Fly deploy config,
    CORS restricted to the site origin.

## Traps, from prior work on this repo

- `cargo sqlx prepare` and a committed `.sqlx/` are required before CI can build — compile-time SQL
  checking otherwise needs a live database, which CI does not have.
- Neon's free tier suspends after inactivity. The first connection can take seconds. Do not mistake
  a cold start for a broken pool.
- Neon's connection string carries `channel_binding=require`, which sqlx logs as an unrecognised
  parameter and ignores. Harmless; `sslmode=require` is what enforces TLS.
- `TIMESTAMPTZ`, never `TIMESTAMP`. This site already shipped one timezone bug where `formatDate`
  rendered a different day for US visitors. Do not import it into the database.
- Ad-blockers will block a path that looks like tracking on an `api.*` host. The numbers will
  undercount. Do not present them as exact.
- Do not wrap `PgPool` in an `Arc`. It is already internally shared; cloning it copies a pointer.

## Out of scope

`/projects`, `/work`, `/resume`, image upload, ⌘K, the SSE agent, and a users table.
Do not build them and do not leave stubs for them.
