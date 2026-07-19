# Portfolio

This is my personal portfolio. It's a monorepo with a Next.js site and a Rust backend I'm building to learn Rust properly.

Live at [shauryacodes.me](https://shauryacodes.me).

## What's inside

- `apps/web`: the portfolio site. Next.js, React, Tailwind CSS, TypeScript.
- `apps/rust-be`: a Rust and Axum backend. It will serve the site's content and analytics once it's done. See `docs/04-rust-learning-spine.md` for why it's built the way it is.
- `packages/eslint-config`, `packages/typescript-config`: shared config used by the apps.

## Getting started

Install dependencies from the repo root:

```sh
bun install
```

Then run everything:

```sh
bun dev
```

Or just the web app:

```sh
bun dev --filter=web
```

Open [http://localhost:3000](http://localhost:3000).

## Other commands

```sh
bun build         # build all apps
bun lint          # lint all apps
bun check-types   # type-check all apps
```

## Docs

The `docs/` folder has notes on the project's architecture, milestones, and the plan for the Rust backend.
