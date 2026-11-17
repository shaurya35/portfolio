# Read writing

Read writing lets a visitor open a published post, see an external title without leaving the list, and confirm a draft is not public.

## Sub-features

- `read-list` shows published titles and omits drafts.
- `read-post` opens a native post and returns to the list.
- `read-external` exposes the external URL without navigating there.

## How to get to it (user POV)

- Choose **Writing** in the header, choose **Show all writing** on the home page, or open `/writing`.
- Choose a post title. A native post opens on this site. An external title is marked to open elsewhere.
- On a post, choose **Back to Writing**.

## Driving it with control-portfolio

Preconditions:

- `control-portfolio doctor` prints `status: ok` and `home: Shaurya Jha, A Rich Post`.
- The seeded draft `An Unfinished Draft` is not public.

- **Open the list.** Go to writing. Run `control-portfolio browser open /writing`. The title is `Writing · Shaurya Jha`. Run `control-portfolio browser count --role heading --name "A Rich Post" --exact --expect 1` and `control-portfolio browser count --role heading --name "An Unfinished Draft" --exact --expect 0`.
- **External title.** Read the outbound address. Run `control-portfolio browser attr --role link --name "An External Thread" --attr href --expect "https://x.com/example/status/1"`. Do not click the link.
- **Open the post.** Choose **A Rich Post**. Run `control-portfolio browser click --role link --name "A Rich Post"`. The title is `A Rich Post · Shaurya Jha`. Run `control-portfolio browser read title --expect "A Rich Post · Shaurya Jha"` and `control-portfolio browser count --role heading --name "A Rich Post" --exact --expect 1`.
- **Return to the list.** Choose **Back to Writing**. Run `control-portfolio browser click --role link --name "Back to Writing" --exact`. The title is `Writing · Shaurya Jha` again.
- **Proof.** Capture the open post before returning. Re-open it, then run `control-portfolio browser snapshot --aria --path /tmp/portfolio-verify-evidence/default/read-writing/post.aria.txt` and `control-portfolio browser screenshot --path /tmp/portfolio-verify-evidence/default/read-writing/post.png`. Both artifacts show `A Rich Post` and the site title.

## Gotchas

- The list link's accessible name includes the description and **Read more**. Match `A Rich Post` without `--exact`.
- A draft has no public URL. `open /writing/unfinished-draft` is the 404 page, which is a different feature. On the list, prove the draft with `count --expect 0`.
- There is one seeded native post, so the post page has no **More writing** block. Do not require that heading.
- Clicking **An External Thread** leaves the site. Read `href` instead.
