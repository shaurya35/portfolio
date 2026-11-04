import { getPosts } from "@/lib/api";
import { experience } from "@/content/experience";
import { llms } from "@/content/llms";
import { site, SITE_URL } from "@/content/site";
import { socials } from "@/content/socials";
import type { Writing } from "@/types/writing";

// /llms.txt: a plain markdown summary for AI tools, per the llms.txt
// convention (H1 name, blockquote summary, H2 sections of links). Served the
// way app/writing/feed.xml is: posts come from the tagged getPosts() fetch, so
// the admin's updateTag("posts") keeps this fresh with no cache of its own.

function link(label: string, href: string): string {
  return `[${label.replace(/[[\]]/g, "\\$&")}](${href})`;
}

function socialHref(name: string): string | undefined {
  return socials.find((social) => social.name === name)?.href;
}

function experienceLines(): string[] {
  return experience
    .filter((role) => role.company !== "Dhwani")
    .map((role) => {
      const note = llms.experienceNotes[role.company];
      return `- ${role.role}, ${link(role.company, role.companyHref)}${note ? `: ${note}` : ""}`;
    });
}

function writingLines(posts: Writing[]): string[] {
  const lines = posts.flatMap((post) => {
    const href =
      post.source === "native" ? `${SITE_URL}/writing/${post.slug}` : post.href;
    if (!href) return [];
    return [`- ${link(post.title, href)}: ${post.description}`];
  });
  return [...lines, `- ${link("All writing", `${SITE_URL}/writing`)}`];
}

function contactLines(): string[] {
  const profiles = ["GitHub", "LinkedIn", "X", "Medium"].flatMap((name) => {
    const href = socialHref(name);
    return href ? [`- ${name}: ${href}`] : [];
  });
  return [
    `- Email: ${site.email}`,
    `- Book a 30-minute call: ${site.calHref}`,
    `- Portfolio: ${SITE_URL}`,
    ...profiles,
  ];
}

function buildLlmsTxt(posts: Writing[]): string {
  const sections: [string, string[]][] = [
    [llms.noteHeading, [llms.note]],
    ["tldr;", llms.tldr.map((item) => `- ${item}`)],
    [llms.builtHeading, llms.built.map((item) => `- ${item}`)],
    ["Experience", experienceLines()],
    ["Recognition", llms.recognition.map((item) => `- ${item}`)],
    ["Writing", writingLines(posts)],
    ["Contact", contactLines()],
  ];

  return [
    `# ${site.name}`,
    "",
    `> ${llms.intro}`,
    "",
    ...sections.flatMap(([title, lines]) => [`## ${title}`, "", ...lines, ""]),
  ].join("\n");
}

export async function GET() {
  // Like app/sitemap.ts: a backend outage drops the post list, not the file.
  let posts: Writing[] = [];
  try {
    posts = await getPosts();
  } catch {
    posts = [];
  }

  return new Response(buildLlmsTxt(posts), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
