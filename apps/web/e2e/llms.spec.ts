import { expect, test, type Page } from "@playwright/test";

const PERSON_ID = "https://www.shauryacodes.me/#person";

/** Every JSON-LD object on the page, parsed. */
async function jsonLd(page: Page): Promise<Record<string, unknown>[]> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.map((block) => JSON.parse(block));
}

/** The lines of one `## heading` section of llms.txt. */
function section(body: string, heading: string): string {
  const start = body.indexOf(`## ${heading}\n`);
  expect(start, heading).toBeGreaterThanOrEqual(0);
  const rest = body.slice(start + heading.length + 4);
  const end = rest.indexOf("\n## ");
  return end === -1 ? rest : rest.slice(0, end);
}

test.describe("/llms.txt", () => {
  test("is plain text in the llms.txt shape, with published posts only", async ({ request }) => {
    const response = await request.get("/llms.txt");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toMatch(/^text\/plain/);

    const body = await response.text();
    expect(body.startsWith("# Shaurya Jha\n")).toBe(true);
    expect(body).toMatch(/^> .+/m);
    for (const heading of [
      "message to the human looking me up",
      "tldr;",
      "what i've built personally:",
      "Experience",
      "Recognition",
      "Writing",
      "Contact",
    ]) {
      expect(body, heading).toContain(`## ${heading}`);
    }

    expect(body).toContain("[A Rich Post](https://www.shauryacodes.me/writing/rich-post)");
    expect(body).toContain("https://x.com/example/status/1");
    expect(body).not.toContain("An Unfinished Draft");
    expect(body).toContain("shauryajha35@gmail.com");
    expect(body).not.toContain("<");
  });

  test("experience starts at Ownpath, with no dates or work type", async ({ request }) => {
    const experience = section(await (await request.get("/llms.txt")).text(), "Experience");
    expect(experience).toContain("[Ownpath](");
    expect(experience).not.toContain("Dhwani");
    expect(experience).not.toMatch(/\b20\d\d\b|Present|Remote|Hybrid|On-Site/);
  });

  test("/agents is a short link to /llms.txt", async ({ request }) => {
    const response = await request.get("/agents", { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers()["location"]).toBe("/llms.txt");
  });
});

test.describe("discovery", () => {
  // Next replaces `alternates` per segment rather than merging it, so a page
  // that builds its own metadata can silently drop either link.
  for (const path of ["/", "/projects", "/writing", "/writing/rich-post"]) {
    test(`${path} points agents at /llms.txt and keeps the RSS link`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('head link[rel="alternate"][type="text/plain"]')).toHaveAttribute(
        "href",
        /\/llms\.txt$/,
      );
      await expect(
        page.locator('head link[rel="alternate"][type="application/rss+xml"]'),
      ).toHaveAttribute("href", /\/writing\/feed\.xml$/);
      await expect(
        page.getByRole("contentinfo").getByRole("link", { name: "For AI" }),
      ).toHaveAttribute("href", "/llms.txt");
    });
  }
});

test.describe("structured data", () => {
  test("the homepage Person carries a stable @id and what it knows about", async ({ page }) => {
    await page.goto("/");
    const person = (await jsonLd(page)).find((node) => node["@type"] === "Person");
    expect(person).toBeDefined();
    expect(person?.["@id"]).toBe(PERSON_ID);
    expect(person?.["description"]).toBe(
      "Engineer, Founder, Prev at Ownpath, Solarpunk and Brixline",
    );
    expect(person?.["knowsAbout"]).toEqual(
      expect.arrayContaining(["TypeScript", "Rust", "Distributed Systems", "Applied AI"]),
    );
    expect(person?.["sameAs"]).toContain("https://github.com/shaurya35");
    expect(person).not.toHaveProperty("alumniOf");
  });

  test("a post's author is the same Person as the homepage's", async ({ page }) => {
    await page.goto("/writing/rich-post");
    const posting = (await jsonLd(page)).find((node) => node["@type"] === "BlogPosting");
    expect((posting?.["author"] as Record<string, unknown>)?.["@id"]).toBe(PERSON_ID);
  });
});
