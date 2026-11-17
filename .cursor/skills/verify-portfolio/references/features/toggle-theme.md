# Toggle the theme

Toggle the theme lets a visitor switch the site between light and dark. The choice sticks for this browser profile.

## Sub-features

- `theme-dark` switches a light page to dark.
- `theme-light` switches it back.

## How to get to it (user POV)

- Open any public page.
- Choose the **Toggle color theme** button in the header.

## Driving it with control-portfolio

Preconditions:

- `control-portfolio doctor` prints `status: ok`.
- The browser is the fresh profile from `launch`, which starts in light mode.

- **Confirm light.** Open home. Run `control-portfolio browser open /`. Run `control-portfolio browser read theme --expect light`.
- **Switch to dark.** Choose **Toggle color theme**. Run `control-portfolio browser click --role button --name "Toggle color theme" --exact`. The document theme is dark. Run `control-portfolio browser read theme --expect dark`.
- **Switch to light.** Choose the same button again. Run `control-portfolio browser click --role button --name "Toggle color theme" --exact`. The document theme is light. Run `control-portfolio browser read theme --expect light`.
- **Proof.** Capture the dark page before switching back. Run the dark click again, then `control-portfolio browser snapshot --aria --path /tmp/portfolio-verify-evidence/default/toggle-theme/dark.aria.txt` and `control-portfolio browser screenshot --path /tmp/portfolio-verify-evidence/default/toggle-theme/dark.png`. Then run the light click so later recipes start from light. The screenshot still shows `Shaurya Jha`.

## Gotchas

- The button's accessible name does not change when the theme changes. Read `theme`, not the button label.
- A profile that already stored a theme will not start on light. `launch` uses a fresh profile. Do not reuse a run whose browser was left on dark unless the recipe sets the theme it needs.
- The theme button is not one of the duplicated nav links. Do not pass `--nth` for it.
