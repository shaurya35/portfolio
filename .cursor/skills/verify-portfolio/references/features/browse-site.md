# Browse the site

Browse the site lets a visitor move between Home, Projects, and Writing, open a missing URL, and return home from that page.

## Sub-features

- `browse-home` shows the visitor's name and marks Home as the current page.
- `browse-projects` opens the projects page from the header.
- `browse-writing` opens the writing page from the header and hides drafts.
- `browse-missing` shows a 404 and returns home.

## How to get to it (user POV)

- Open `/`.
- Choose **Home**, **Projects**, or **Writing** in the header. The same three links are repeated in the footer.
- Open a path that does not exist, such as `/does-not-exist`, and choose **Back home**.

## Driving it with control-portfolio

Preconditions:

- `control-portfolio doctor` prints `status: ok`.
- The browser profile is the fresh one `launch` created.

- **Open home.** Go to the root. Run `control-portfolio browser open /`. The command prints a title of `Shaurya Jha`. Run `control-portfolio browser read title --expect "Shaurya Jha"`.
- **Header marks Home.** Read the current page on the header link. Run `control-portfolio browser attr --role link --name Home --exact --nth 0 --attr aria-current --expect page`.
- **Open projects.** Choose the header **Projects** link. Run `control-portfolio browser click --role link --name Projects --exact --nth 0`. The URL path is `/projects`. Run `control-portfolio browser read title --expect "Projects · Shaurya Jha"`.
- **Open writing.** Choose the header **Writing** link. Run `control-portfolio browser click --role link --name Writing --exact --nth 0`. The title is `Writing · Shaurya Jha`. Run `control-portfolio browser count --role heading --name "A Rich Post" --exact --expect 1` and `control-portfolio browser count --role heading --name "An Unfinished Draft" --exact --expect 0`.
- **Missing page.** Open an unknown path. Run `control-portfolio browser open /does-not-exist`. A heading named `404` is visible. Run `control-portfolio browser read title --expect "Page not found · Shaurya Jha"`.
- **Return home.** Choose **Back home**. Run `control-portfolio browser click --role link --name "Back home" --exact`. The title is `Shaurya Jha` again. Run `control-portfolio browser read title --expect "Shaurya Jha"`.
- **Proof.** Capture the home state after the return. Run `control-portfolio browser snapshot --aria --path /tmp/portfolio-verify-evidence/default/browse-site/home.aria.txt` and `control-portfolio browser screenshot --path /tmp/portfolio-verify-evidence/default/browse-site/home.png`. Both artifacts show `Shaurya Jha`.

## Gotchas

- **Home**, **Projects**, and **Writing** each match two links. `--nth 0` is the header. `--nth 1` is the footer. Omitting `--nth` fails the command.
- The 404 title is applied in the browser after the heading paints. `read title --expect` waits for it. A single unread title can still be `Shaurya Jha` for a moment.
- Social and project links leave this origin in a new tab. Do not follow them as proof of this site.
- The writing titles come from the mock seed. A doctor failure that lacks `A Rich Post` means the home page never became usable.
