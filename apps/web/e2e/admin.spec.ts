import { expect, test, type Page } from "@playwright/test";
import { backendWrites, pasteIntoEditor } from "./helpers";
import { RICH_MARKDOWN } from "./seed";

function row(page: Page, title: string) {
  return page.locator("li", { hasText: title });
}

async function openEditor(page: Page, id: number, contains?: string) {
  await page.goto(`/admin/posts/${id}`);
  await expect(page.locator(".ProseMirror")).toBeVisible();
  // The editor mounts before the post's content is in it; typing earlier
  // lands in a document that's about to be replaced.
  if (contains) await expect(page.locator(".ProseMirror")).toContainText(contains);
}

test.describe("admin", () => {
  test("the posts list shows 30-day views and clicks", async ({ page }) => {
    await page.goto("/admin/posts");
    await expect(row(page, "A Rich Post")).toContainText("41 views");
    await expect(row(page, "An External Thread")).toContainText("9 clicks");
    // Drafts have no public traffic to show.
    await expect(row(page, "An Unfinished Draft")).not.toContainText(/views?|clicks?/);
  });

  // The form only re-serializes the markdown when the body changes, so the
  // edit has to be in the body: that's when a construct the editor can't
  // hold (tables, task lists, footnotes, block images) used to be lost.
  test("editing the body keeps every other construct intact", async ({ page, request }) => {
    await openEditor(page, 1, "The footnote text.");
    // Clicked and typed like an author would: tiptap's focus("end") command
    // applies on the next frame, so keys sent right after it were dropped.
    await page.locator(".ProseMirror p").last().click();
    await page.keyboard.press("End");
    await page.keyboard.type(" Edited.");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/admin/posts");

    const save = (await backendWrites(request))
      .filter((write) => write.method === "PATCH" && write.path === "/admin/posts/1")
      .at(-1);
    expect((save?.body as { markdown: string }).markdown).toBe(`${RICH_MARKDOWN} Edited.`);
  });

  test("pasted Markdown is saved as Markdown, not escaped text", async ({ page, request }) => {
    await page.goto("/admin/posts/new");
    await page.fill("#title", "Pasted Markdown Post");
    await page.fill("#description", "d");
    await page.fill("#category", "c");
    await pasteIntoEditor(page, "## Step 1\n\n- first item\n- second item\n\n| A | B |\n| --- | --- |\n| 1 | 2 |");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/admin/posts");

    const create = (await backendWrites(request)).find(
      (write) =>
        write.method === "POST" &&
        (write.body as { slug?: string })?.slug === "pasted-markdown-post",
    );
    // trimEnd: a table can't end the document, so the editor keeps an empty
    // paragraph after it, which serializes as a trailing newline.
    expect((create?.body as { markdown: string }).markdown.trimEnd()).toBe(
      "## Step 1\n\n- first item\n- second item\n\n| A | B |\n| --- | --- |\n| 1 | 2 |",
    );
  });

  test("publishing makes a post public; unpublishing takes it down", async ({ page }) => {
    await page.goto("/admin/posts/new");
    await page.fill("#title", "What I've Learned Publishing");
    await expect(page.locator("#slug")).toHaveValue("what-ive-learned-publishing");
    await page.fill("#description", "A published post.");
    await page.fill("#category", "Notes");
    await page.locator(".ProseMirror").click();
    await page.keyboard.type("Hello from the end-to-end suite.");
    await page.getByRole("button", { name: "Published" }).click();
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/admin/posts");

    const postUrl = "/writing/what-ive-learned-publishing";
    await expect
      .poll(async () => (await page.request.get(postUrl)).status(), { timeout: 15_000 })
      .toBe(200);
    await page.goto("/writing");
    await expect(page.getByRole("heading", { name: "What I've Learned Publishing" })).toBeVisible();

    await page.goto("/admin/posts");
    await row(page, "What I've Learned Publishing").getByRole("link").click();
    await expect(page.locator(".ProseMirror")).toBeVisible();
    await page.getByRole("button", { name: "Draft" }).click();
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/admin/posts");
    await expect
      .poll(async () => (await page.request.get(postUrl)).status(), { timeout: 15_000 })
      .toBe(404);
  });

  test("clicking a link while editing doesn't open it", async ({ page }) => {
    await openEditor(page, 1);
    let popups = 0;
    page.on("popup", () => popups++);
    await page.locator(".ProseMirror a").first().click();
    await page.waitForTimeout(500);
    expect(popups).toBe(0);
    await expect(page).toHaveURL("/admin/posts/1");
  });

  test("saving a written post as a link post asks first", async ({ page, request }) => {
    await openEditor(page, 3);
    await page.getByRole("button", { name: "X", exact: true }).click();
    await page.fill("#url", "https://x.com/example/status/2");

    let message = "";
    page.once("dialog", (dialog) => {
      message = dialog.message();
      void dialog.dismiss();
    });
    await page.click('button[type="submit"]');
    await expect.poll(() => message).toContain("permanently deletes its written content");
    await expect(page).toHaveURL("/admin/posts/3");

    const writes = await backendWrites(request);
    expect(writes.some((write) => write.path === "/admin/posts/3")).toBe(false);
  });
});
