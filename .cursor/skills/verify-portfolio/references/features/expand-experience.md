# Expand experience

Expand experience lets a visitor open the details of a role on the home page. The first role is Ownpath.

## Sub-features

- `experience-open` expands the first role.
- `experience-label` renames that control from **Expand details** to **Collapse details**.

## How to get to it (user POV)

- Open `/` and find the Experience section.
- Hover a role and choose **Expand details**.

## Driving it with control-portfolio

Preconditions:

- `control-portfolio doctor` prints `status: ok`.
- No role is expanded. A fresh launch starts that way.

- **Open home.** Go to the root. Run `control-portfolio browser open /`. The Ownpath link is present. Run `control-portfolio browser count --role link --name Ownpath --exact --expect 1`.
- **Details start closed.** Count the collapsed controls. Run `control-portfolio browser count --role button --name "Expand details" --exact --expect 3` and `control-portfolio browser count --role button --name "Collapse details" --exact --expect 0`.
- **Hover the role.** Hover **Ownpath** so the control is shown. Run `control-portfolio browser hover --role link --name Ownpath --exact`.
- **Expand.** Choose the first **Expand details** button. Run `control-portfolio browser click --role button --name "Expand details" --exact --nth 0`. The control is now **Collapse details** and reports expanded. Run `control-portfolio browser count --role button --name "Collapse details" --exact --expect 1` and `control-portfolio browser attr --role button --name "Collapse details" --exact --nth 0 --attr aria-expanded --expect true`.
- **Proof.** Capture the expanded role. Run `control-portfolio browser snapshot --aria --path /tmp/portfolio-verify-evidence/default/expand-experience/ownpath.aria.txt` and `control-portfolio browser screenshot --path /tmp/portfolio-verify-evidence/default/expand-experience/ownpath.png`. The snapshot includes `Collapse details` and `What I've done`.

## Gotchas

- Three roles expose **Expand details**. `--nth 0` is Ownpath, the first role. Omitting `--nth` fails.
- On a pointer device the control is invisible until the row is hovered. Hover **Ownpath** before the click.
- Collapsed details stay in the page markup. Do not prove the panel by searching the whole page for its sentence. Prove the button name and `aria-expanded`.
