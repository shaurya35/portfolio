import { expect, test } from "@playwright/test";
import { horizontalOverflow, MOCK_URL } from "./helpers";

test.describe("public site", () => {
  for (const path of ["/", "/projects", "/writing", "/writing/rich-post"]) {
    test(`${path} renders`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("h1").first()).toBeVisible();
    });
  }

  test("drafts and unknown posts are real 404s with their own tab title", async ({ page }) => {
    for (const slug of ["unfinished-draft", "does-not-exist"]) {
      const response = await page.goto(`/writing/${slug}`);
      expect(response?.status()).toBe(404);
      await expect(page).toHaveTitle("Page not found · Shaurya Jha");
    }
  });

  test("leaving a 404 restores the normal title", async ({ page }) => {
    await page.goto("/does-not-exist");
    await page.getByRole("link", { name: "Back home" }).click();
    await expect(page).toHaveURL("/");
    await expect(page).toHaveTitle("Shaurya Jha");
  });

  test("the writing list shows published posts only, external ones as outbound links", async ({
    page,
  }) => {
    await page.goto("/writing");
    await expect(page.getByRole("heading", { name: /A Rich Post/ })).toBeVisible();
    await expect(page.getByText("An Unfinished Draft")).toHaveCount(0);
    const external = page.locator('a[href="https://x.com/example/status/1"]');
    await expect(external).toHaveAttribute("target", "_blank");
  });

  for (const width of [320, 375]) {
    test(`nothing scrolls sideways at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      for (const path of ["/", "/projects", "/writing", "/writing/rich-post"]) {
        await page.goto(path);
        expect(await horizontalOverflow(page), path).toBeLessThanOrEqual(0);
      }
    });
  }

  test("responses carry anti-framing and nosniff headers", async ({ request }) => {
    for (const path of ["/", "/admin"]) {
      const headers = (await request.get(path)).headers();
      expect(headers["x-frame-options"], path).toBe("DENY");
      expect(headers["content-security-policy"], path).toContain("frame-ancestors 'none'");
      expect(headers["x-content-type-options"], path).toBe("nosniff");
    }
  });

  test("a post's share image exists for published posts only", async ({ request }) => {
    const published = await request.get("/writing/rich-post/opengraph-image");
    expect(published.status()).toBe(200);
    expect(published.headers()["content-type"]).toContain("image/png");
    expect((await request.get("/writing/unfinished-draft/opengraph-image")).status()).toBe(404);
  });

  test("the feed and sitemap list published posts only", async ({ request }) => {
    const feed = await (await request.get("/writing/feed.xml")).text();
    expect(feed).toContain("<title>An External Thread</title>");
    expect(feed).not.toContain("An Unfinished Draft");
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/writing/rich-post");
    expect(sitemap).not.toContain("unfinished-draft");
  });

  test("no analytics are sent from a non-production origin", async ({ page, request }) => {
    for (const path of ["/", "/writing", "/writing/rich-post"]) {
      await page.goto(path);
    }
    await page.waitForTimeout(500);
    const events = await (await request.get(`${MOCK_URL}/__events`)).json();
    expect(events).toEqual([]);
  });
});
