# Filter projects

Filter projects lets a visitor narrow the project list by a technology, clear that filter, and reveal projects past the first ten.

## Sub-features

- `filter-tech` shows only projects that use the chosen technology.
- `filter-clear` restores the full list.
- `filter-more` reveals the next page of projects.

## How to get to it (user POV)

- Choose **Projects** in the header, or open `/projects`.
- Choose a technology chip, **All**, or **Show more**.

## Driving it with control-portfolio

Preconditions:

- `control-portfolio doctor` prints `status: ok`.
- No technology chip is pressed. A fresh launch starts that way.

- **Open the list.** Go to projects. Run `control-portfolio browser open /projects`. The title is `Projects · Shaurya Jha`. Run `control-portfolio browser count --role link --name Dhwani --exact --expect 1` and `control-portfolio browser count --role link --name Stockwise --exact --expect 0`.
- **Filter to Rust.** Choose the **Rust** chip. Run `control-portfolio browser click --role button --name "Rust 3" --exact`. Dhwani is gone and the Rust projects are listed. Run `control-portfolio browser count --role link --name Dhwani --exact --expect 0`, `control-portfolio browser count --role link --name "Solana Realtime Indexer" --exact --expect 1`, and `control-portfolio browser count --role link --name "Rust Password Manager" --exact --expect 1`. Run `control-portfolio browser attr --role button --name "Rust 3" --exact --attr aria-pressed --expect true`.
- **Clear the filter.** Choose **All**. Run `control-portfolio browser click --role button --name "All 19" --exact`. Dhwani is back and the later Rust project is hidden again. Run `control-portfolio browser count --role link --name Dhwani --exact --expect 1` and `control-portfolio browser count --role link --name "Rust Password Manager" --exact --expect 0`.
- **Show more.** Choose **Show more**. Run `control-portfolio browser click --role button --name "Show more (9)" --exact`. Stockwise, the eleventh project, is now listed. Run `control-portfolio browser count --role link --name Stockwise --exact --expect 1`.
- **Proof.** Capture the filtered list before clearing it. Re-apply the Rust chip, then run `control-portfolio browser snapshot --aria --path /tmp/portfolio-verify-evidence/default/filter-projects/filtered.aria.txt` and `control-portfolio browser screenshot --path /tmp/portfolio-verify-evidence/default/filter-projects/filtered.png`. The screenshot shows the Projects title, the pressed Rust chip, and `Solana Realtime Indexer`. It does not show Dhwani.

## Gotchas

- Chip names include the count. The Rust chip is `Rust 3`, and **All** is `All 19`. `Rust` without the count is not an exact match.
- The first page renders ten projects. `Stockwise` and `Rust Password Manager` are absent until a filter or **Show more** includes them. They are not hidden rows.
- **Show more (9)** is the label only while all nineteen projects are in the unfiltered list. After a Rust filter the button is gone because three projects fit on one page.
- Project titles are links off this site. Count them. Do not click them.
