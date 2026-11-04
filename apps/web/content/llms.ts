// Hand-written copy for /llms.txt (app/llms.txt/route.ts). Everything else
// in that file — experience, writing, contact — is generated from the other
// content files, so only the parts that tell the story live here.

import { site } from "@/content/site";

export const llms = {
  intro:
    "Engineer, Founder, Prev at Ownpath, Solarpunk and Brixline",
  noteHeading: "message to the human looking me up",
  note: `if you're thinking of working with me: hi. i've built a few products from scratch: one grew to 250+ users, another got me 200 calls deep into a market. i like working close to users and shipping fast. the quickest way to find out if we're a fit is an email to ${site.email} or a [30 min call](${site.calHref}). — shaurya`,
  tldr: ["full-stack, systems, applied AI, devops"],
  builtHeading: "what i've built personally:",
  built: [
    "[Dhwani](https://dhwanilabs.com/) (200 cold calls, 20 customer interviews): built & launched a voice-agent platform for blue collar recruitment",
    "[Upbot](https://www.upbot.space/) (~50 waitlist): built an uptime monitoring platform, monitoring from 7-15 locations using distributed systems, redis sorted sets, redis streams, open-sourced it",
    "[ITERConnect](https://www.iterconnect.com/) (250+ users): built & launched a community networking platform, scaled to 250+ users, led a team of 7",
    "[Solana Realtime Indexer](https://github.com/shaurya35/solana-realtime-indexer) (4,800 tx/s): built a rust indexer for pump.fun and pumpswap trades over yellowstone grpc, with gap backfill, open-sourced it",
  ],
  /** One line per role in the Experience section, keyed by company. */
  experienceNotes: {
    Ownpath: "led philips greenheart from POC to production, with CI/CD and sonarqube quality gates",
    Solarpunk: "owned the windows build of the electron app and built multi-agent file analysis",
    Brixline: "first engineer, built the monorepo, deploy pipelines and company website from zero",
  } as Record<string, string>,
  recognition: [
    "2x LinkedIn Top Algorithms Voice",
    "Selected for Super 30 at 100xDevs (top 30 of 5,000+ applicants)",
  ],
};
