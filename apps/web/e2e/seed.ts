export type MockPost = {
  id: number;
  slug: string;
  title: string;
  description: string;
  category: string;
  source: "native" | "x" | "medium";
  url?: string;
  markdown?: string;
  html?: string;
  status: "draft" | "published";
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Every construct the editor has broken on a round trip at some point:
 * tables, task lists, images on their own paragraph, footnotes, nested
 * lists, code blocks and links. Saving it without touching the body must
 * send it back byte for byte. */
export const RICH_MARKDOWN = `Intro with a footnote.[^1] And a [link](https://example.com/docs).

| Metric | Before | After |
| --- | --- | --- |
| p99 **ms** | 1843 | 212 |

- [ ] todo item
- [x] done item

1. first
   - nested bullet
2. second

![diagram](https://example.com/diagram.png)

Paragraph after the image.

\`\`\`rust
fn main() {}
\`\`\`

[^1]: The footnote text.`;

export const SEED_POSTS: MockPost[] = [
  {
    id: 1,
    slug: "rich-post",
    title: "A Rich Post",
    description: "Every construct the editor has to keep.",
    category: "Engineering",
    source: "native",
    markdown: RICH_MARKDOWN,
    html: `<p>Intro with a footnote. And a <a href="https://example.com/docs">link</a>.</p>
<table><thead><tr><th>Metric</th><th>Before</th><th>After</th></tr></thead><tbody><tr><td>p99 ms</td><td>1843</td><td>212</td></tr></tbody></table>
<pre class="sy-code"><code>let a_very_long_line_of_code_that_should_scroll_inside_its_own_block = compute(argument_one, argument_two);</code></pre>
<p>Inline <code>some_really_long_identifier_name_that_keeps_going_and_going_forever()</code> code.</p>`,
    status: "published",
    published_at: "2026-09-01T00:00:00Z",
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  },
  {
    id: 2,
    slug: "external-thread",
    title: "An External Thread",
    description: "Lives on X.",
    category: "Thread",
    source: "x",
    url: "https://x.com/example/status/1",
    status: "published",
    published_at: "2026-08-20T00:00:00Z",
    created_at: "2026-08-20T00:00:00Z",
    updated_at: "2026-08-20T00:00:00Z",
  },
  {
    id: 3,
    slug: "unfinished-draft",
    title: "An Unfinished Draft",
    description: "Not public.",
    category: "Notes",
    source: "native",
    markdown: "Draft body.",
    html: "<p>Draft body.</p>",
    status: "draft",
    published_at: null,
    created_at: "2026-09-10T00:00:00Z",
    updated_at: "2026-09-10T00:00:00Z",
  },
];

export const SEED_TRAFFIC: Record<string, { views: number; clicks: number }> = {
  "rich-post": { views: 41, clicks: 0 },
  "external-thread": { views: 0, clicks: 9 },
};
