# Ideation & Concept

## What
A personal portfolio + blog, **built in Rust**, with a live **agent chat** visitors can talk to — it answers *as my portfolio*, from my real projects/resume/blog.

## Why
- **Real use:** it's my actual job-hunt portfolio (targeting remote Rust/Web3 roles).
- **Cool factor:** a Rust-powered site with a live-streaming agent that answers as me — recruiters haven't seen that.
- **Learn Rust for real:** `axum` + async + SSE streaming is transferable systems muscle, not CRUD.
- **Scoped:** 1–2 day core, blog ships Day 1, agent Day 2.

## The core idea
Rust is the **fast web + streaming layer**. The agent *brain* is an LLM API (later: my own Hermes instance via `hermes proxy`) behind it. Rust serves and streams; the agent thinks. This split is what keeps it a weekend project, not a month.

## What the agent does
- Visitor asks anything ("has he done Rust?", "fit for a Solana indexer role?").
- Answers from my real data (projects, blogs, resume).
- **Streams live** — visitor watches the answer type out token-by-token.

## Success = 
1. A real Rust-powered blog renders from markdown files.
2. A visitor can chat with an agent that answers *as me*, streaming live.
3. Stretch: the agent IS my real Hermes instance (one-line swap via OpenAI-compatible proxy).

## Non-goals (keep scope tight)
- Not writing an agent loop in Rust (LLM API / Hermes handles thinking).
- Not a fancy frontend framework — plain HTML/CSS, Rust does the interesting work.
- Not a CMS — blog posts are just markdown files on disk.
