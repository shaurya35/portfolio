# Portfolio

This is my personal portfolio site, built with Next.js and Tailwind CSS.

## Stack

- Next.js 16 (App Router, Turbopack)
- React 19
- Tailwind CSS v4
- TypeScript

## Getting started

Install dependencies from the repo root, then run the dev server from this folder:

```bash
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to see it.

## Structure

- `app/` - pages and layout
- `components/` - UI components, split into `sections/` for homepage sections
- `content/` - hardcoded content (site info, socials, experience, blog posts)
- `types/` - types for the content, shaped to match the future Rust API
- `lib/` - small helper functions

Content is hardcoded for now. Later it will be served from a Rust backend, so the types and shapes are already written to match that.

## Scripts

```bash
bun dev      # start dev server
bun build    # production build
bun start    # run the production build
bun lint     # run eslint
```
