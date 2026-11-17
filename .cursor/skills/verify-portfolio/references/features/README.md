# Portfolio verification map

This directory is the maintained source for verifying the public portfolio site. Read this index before driving the site, then use the matching feature file as the recipe.

## Baseline preconditions

- From the repo root, put `control-portfolio` on `PATH` with `export PATH="$PWD/.cursor/skills/verify-portfolio/bin:$PATH"`.
- Run `control-portfolio launch`. Add `--headed` only when you need a visible window.
- Set `PORTFOLIO_RUN_ID` before launch when `default` is already in use. Use letters, digits, and hyphens.
- Run `control-portfolio doctor` and require `status: ok`, the printed URL, and `home: Shaurya Jha, A Rich Post`.
- Proof files for the default run id go under `/tmp/portfolio-verify-evidence/default`. Another run id uses that id as the last directory name.
- Never drive an instance that this run did not launch.

## Driving conventions

- Start every recipe from the baseline state unless its preconditions say otherwise.
- Prefer ARIA roles and accessible names over CSS selectors or screen coordinates.
- Treat every command as literal. Keep quoted names and flags unchanged.
- A name matches a substring unless the command passes `--exact`.
- Header links `Home`, `Projects`, and `Writing` are `--nth 0`. The footer copies are `--nth 1`.
- Run browser actions through `control-portfolio browser`.
- Restore the light theme after a theme recipe. Do not remove proof files during cleanup.

## Proof and skip reporting

- Capture the visitor action and the resulting state.
- UI proof includes the command output, an ARIA snapshot, and a screenshot with the site identity visible.
- A missing row is proved with `count --expect 0`, not by skipping the assertion.
- Record the feature id and the entry point with every artifact.
- Report an unreachable path with the attempted command and the unmet precondition.
- Do not report a skipped entry point as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the visitor-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every visitor entry point.
3. `Driving it with control-portfolio` starts with `Preconditions:` and uses labeled bullets that pair each visitor action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

Keep implementation details out of the map. Name only visitor paths, stable handles, required state, commands, and observable proof.

## Features

- [Browse the site](./browse-site.md) covers the header nav, the writing list, a missing page, and the return home.
- [Filter projects](./filter-projects.md) covers tech filters, the cleared list, and show more.
- [Read writing](./read-writing.md) covers a published post, an external title, and a hidden draft.
- [Toggle the theme](./toggle-theme.md) covers the light and dark states of the theme button.
- [Expand experience](./expand-experience.md) covers opening the first role's details.
