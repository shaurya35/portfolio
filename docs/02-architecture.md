# Architecture

## Overview

```
Browser ──HTTP──► axum (Rust backend)
                   ├── GET /            → portfolio (static HTML/CSS)
                   ├── GET /blog        → list posts (rendered from content/*.md)
                   ├── GET /blog/:slug  → one post (markdown → HTML)
                   └── GET /chat/stream → SSE: agent tokens streamed live
                                           └─► LLM API / Hermes proxy (relays chunks)
```

**Split:** Rust = fast web + streaming layer. Agent brain = LLM API behind it. Rust serves/streams, never thinks.

## Components

| Part | Does | Rust piece |
|------|------|-----------|
| Static server | Serves `index.html`, CSS | `tower-http::ServeDir` |
| Blog engine | Reads `content/*.md`, renders HTML | `pulldown-cmark` + FS |
| Front-matter | Parses `--- title/date ---` header | string parse + `serde` |
| Chat broker | Forwards msg → LLM, returns reply | `reqwest` (async HTTP) |
| **Live stream** | Streams tokens to browser (SSE) | `axum::sse` + `tokio` streams |
| Context inject | Feeds my projects/resume as context | plain string assembly |

## Layout

```
portfolio/
├── Cargo.toml
├── src/
│   ├── main.rs        # axum router, server bootstrap
│   ├── blog.rs        # read + render markdown, front-matter
│   └── chat.rs        # LLM broker + SSE streaming handler
├── content/           # blog posts as *.md
├── static/            # index.html, style.css
└── docs/
```

## Data flow — chat
1. Browser opens SSE to `/chat/stream?q=...`
2. Rust builds prompt: `[my context] + [visitor question]`
3. Rust calls LLM API (`reqwest`, streaming response)
4. Rust relays each token chunk out as an SSE event
5. Browser appends tokens live → answer types out

## Crates
`axum`, `tokio`, `tower-http`, `pulldown-cmark`, `serde` + `serde_json`, `reqwest`

## Build order
- **Day 1:** M1 static serve → M2 blog render → M3 front-matter. *(Rust web backbone — 70% of the learning)*
- **Day 2:** M4 chat broker → M5 SSE streaming *(the hard/interesting async bit)* → M6 inject my data.
- **Stretch:** swap LLM API → `hermes proxy` (localhost). Agent becomes my real Hermes; only the base URL changes.

## The two hard parts (where Rust is learned)
1. **SSE streaming (M5):** turn an incoming token stream into an `axum` SSE response — `tokio` async + `Stream` + lifetimes. The real level-up.
2. **Shared state:** LLM client/config shared across handlers via `axum` `State` + `Arc` — first real ownership-across-concurrency lesson.
