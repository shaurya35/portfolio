---
name: verify-portfolio
description: "Drive the portfolio website the way a visitor does. Use to launch the Next.js site, check that this run owns it, click through public pages, and save proof. Reach for it when a change touches the public site and you need a scripted check."
---

# Verify the portfolio site

The public site is the primary surface. Admin, the Rust API, and `/llms.txt` are separate. This skill does not drive admin. The feature map is [`references/features/README.md`](references/features/README.md). Read the index, then follow one feature file. When the site changes, run `/maintain-verification-skill`.

Run the commands from the repo root. Put the helper on `PATH` first.

```sh
export PATH="$PWD/.cursor/skills/verify-portfolio/bin:$PATH"
```

The helper is `.cursor/skills/verify-portfolio/bin/control-portfolio`. It needs `bun` and the dependencies from `bun install`.

## Launch

```sh
control-portfolio launch
```

Add `--headed` when a display is available and you need to watch the window. The default browser is headless, uses a fresh profile, and reports light mode.

Launch starts three processes for this run id.

- `apps/web/e2e/mock-backend.ts` on `PORTFOLIO_MOCK_PORT`, or a free port.
- `node apps/web/node_modules/next/dist/bin/next dev -H 127.0.0.1 -p <port>` with `RUST_API_URL` and `NEXT_PUBLIC_RUST_API_URL` pointed at that mock, and `NEXT_DIST_DIR=.next-verify-<run id>`. Next may rewrite `apps/web/tsconfig.json` for that dist directory. Launch restores the file from the copy it took before start.
- A browser host that keeps one page open.

The default run id is `default`. Set `PORTFOLIO_RUN_ID` to a short token of letters, digits, and hyphens before launch when another run is already using `default`. Each id gets its own ports, mock memory, dist directory, browser, and evidence directory.

Ready means `control-portfolio doctor` prints `status: ok` and `home: Shaurya Jha, A Rich Post`. A listening port is not enough. The home page has to render the seeded post.

The mock replaces `apps/rust-be` because this checkout has no `DATABASE_URL` and no admin password hash. Projects, experience, and the rest of the page copy still come from `apps/web/content`. Writing titles in a fresh launch are the mock seed, `A Rich Post` and `An External Thread`. The draft `An Unfinished Draft` stays off the public pages. Do not call `/__requests` or `/__events`. Those routes exist for the Playwright suite, not for visitors.

`control-portfolio launch` again is a no-op when doctor would already pass and the headed flag matches. Otherwise it stops the marked processes and starts them again.

## Doctor

```sh
control-portfolio doctor
```

Doctor is read-only. It exits `0` only when all of these are true.

- The state file for this run id exists.
- The mock, site, and browser pids are alive and carry the marker `portfolio-verify:<run id>`.
- Those pids own the recorded ports.
- `GET <mock>/health` reports ok.
- `GET <site>/` returns 200 and includes `Shaurya Jha` and `A Rich Post`.
- The browser host answers a ping.

Exit `3` means do not drive this instance. Run `control-portfolio launch` again.

## Drive

Prefer `references/features/` over ad hoc clicks. Roles are `link`, `button`, `heading`, `textbox`, `searchbox`, `status`, `alert`, and `navigation`.

A name matches a substring of the accessible name unless you pass `--exact`. If more than one element matches, the command fails and lists them. Pass `--nth 0` for the first match. Header links are `--nth 0`. The same labels in the footer are `--nth 1`.

```sh
control-portfolio browser open /projects
control-portfolio browser click --role button --name "Rust 3" --exact
control-portfolio browser count --role link --name Dhwani --exact --expect 0
control-portfolio browser read url
control-portfolio browser read title --expect "Projects · Shaurya Jha"
control-portfolio browser read theme --expect light
control-portfolio browser attr --role button --name "Rust 3" --exact --attr aria-pressed --expect true
control-portfolio browser screenshot --path /tmp/portfolio-verify-evidence/default/filter-projects/filtered.png
control-portfolio browser snapshot --aria --path /tmp/portfolio-verify-evidence/default/filter-projects/filtered.aria.txt
```

`open` stays on this origin. `click`, `hover`, `fill`, and `press` are the visitor actions. `count`, `attr`, `text`, and `read` report what the page shows. `--expect` exits `1` when the observed value differs. Add `--format json` for one JSON object on stdout.

The proof paths above assume run id `default`. For another id, use `/tmp/portfolio-verify-evidence/<run id>/`.

## Evidence

Write proof under the evidence directory doctor prints. For run id `default` that directory is `/tmp/portfolio-verify-evidence/default`.

A UI proof includes the command output, an ARIA snapshot, and a viewport screenshot that shows the site name or the page title. Record the feature id in the directory name. After a click, record the URL or title as well as the control you used. For a filter or a draft, also record a count of the row that should be absent. Do not prove a public page by calling a mock-only route.

```sh
control-portfolio evidence
```

## Cleanup

```sh
control-portfolio cleanup
```

Cleanup sends `SIGTERM`, then `SIGKILL`, to the mock, site, and browser process groups whose environ still contains this run's marker. It deletes the run directory and `apps/web/.next-verify-<run id>`. It does not delete the evidence directory. Run `control-portfolio evidence` afterward and expect the proof files to still be listed.

Running cleanup twice prints `status: already clean`.

## Helpers

The executable is `.cursor/skills/verify-portfolio/bin/control-portfolio`. It runs `.cursor/skills/verify-portfolio/scripts/control-portfolio.ts` with `bun`.

```sh
control-portfolio launch [--headed]
control-portfolio doctor
control-portfolio cleanup
control-portfolio evidence
control-portfolio browser open <path>
control-portfolio browser click --role <role> --name <name> [--exact] [--nth N]
control-portfolio browser hover --role <role> --name <name> [--exact] [--nth N]
control-portfolio browser fill --role textbox --name <name> --value <text>
control-portfolio browser press --key <key>
control-portfolio browser text [--role <role> --name <name>] [--contains <text>]
control-portfolio browser count --role <role> --name <name> [--exact] [--expect N]
control-portfolio browser attr --role <role> --name <name> --attr <name> [--expect <value>]
control-portfolio browser read theme|url|title [--expect <value>]
control-portfolio browser screenshot [--full-page] --path <file>
control-portfolio browser snapshot --aria --path <file>
```

Exit `0` is success, `1` is a failed action, `2` is bad usage, and `3` is an unhealthy instance.
