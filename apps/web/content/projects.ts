import type { Project } from "@/types/project";

export const projects: Project[] = [
  {
    slug: "dhwani",
    title: "Dhwani",
    description:
      "Voice AI that phone-screens blue-collar candidates in Hindi, English, and Hinglish. 100+ outreach calls, 20-30 customer interviews.",
    tech: ["Python", "Next.js", "TypeScript"],
    liveHref: "https://dhwanilabs.com/",
    githubHref: null,
    image: "/projects/dhwani.jpg",
  },
  {
    slug: "upbot",
    title: "Upbot",
    description:
      "Uptime monitor running checks from 15+ regions on Cloudflare Workers, fed by a Redis Streams job queue.",
    tech: ["Next.js", "Redis", "Cloudflare Workers"],
    liveHref: "https://www.upbot.space/",
    githubHref: "https://github.com/shaurya35/upbot",
    image: "/projects/upbot.jpg",
  },
  {
    slug: "iterconnect",
    title: "ITERConnect",
    description:
      "Campus network for hackathon teams and alumni mentors. 250+ users, built with a 7-person team.",
    tech: ["Next.js", "Firebase", "Express.js"],
    liveHref: "https://www.iterconnect.com/",
    githubHref: "https://github.com/shaurya35/ITER-Social-Connect",
    image: "/projects/iterconnect.jpg",
  },
  {
    slug: "solana-realtime-indexer",
    title: "Solana Realtime Indexer",
    description:
      "Rust indexer for Pump.fun and PumpSwap trades over Yellowstone gRPC. Clean at 4,800 tx/s, with gap backfill.",
    tech: ["Rust", "Carbon", "Yellowstone gRPC"],
    liveHref: null,
    githubHref: "https://github.com/shaurya35/solana-realtime-indexer",
  },
  {
    slug: "philips-greenheart",
    title: "Philips GreenHeart",
    description:
      "Led Philips' preventive heart-health platform from POC to production at Ownpath. 86% test coverage, under 3% duplication.",
    tech: ["React", "TypeScript"],
    liveHref: "https://www.heartprint.in/greenheartprogram/",
    githubHref: null,
    image: "/projects/philips-greenheart.jpg",
  },
  {
    slug: "brixline",
    title: "Brixline",
    description:
      "Web platform for Brixline, a construction-as-a-service startup, built as founding engineer.",
    tech: ["Next.js", "TypeScript"],
    liveHref: "https://brixline-dev.vercel.app/",
    githubHref: "https://github.com/shaurya35/brixline",
    image: "/projects/brixline.jpg",
  },
  {
    slug: "gobrix",
    title: "Gobrix",
    description:
      "The first version of Brixline's platform, from when the company was called Gobrix.",
    tech: ["Next.js", "TypeScript"],
    liveHref: "https://brixline-client-main.vercel.app/",
    githubHref: "https://github.com/shaurya35/brixline",
    image: "/projects/gobrix.jpg",
  },
  {
    slug: "web-wallet",
    title: "Web Wallet",
    description:
      "In-browser HD wallet: generates a seed phrase and derives Solana and Ethereum accounts from it.",
    tech: ["Solana Web3.js", "Ethers.js"],
    liveHref: "https://webwallet.shauryacodes.me/",
    githubHref: "https://github.com/shaurya35/solana-web-wallet",
    image: "/projects/web-wallet.jpg",
  },
  {
    slug: "sol-staking-program",
    title: "SOL Staking Program",
    description:
      "Anchor program that stakes SOL in a per-user PDA and accrues points by time staked.",
    tech: ["Rust", "Anchor", "Solana"],
    liveHref: null,
    githubHref: "https://github.com/shaurya35/staking-smart-contract",
  },
  {
    slug: "exness",
    title: "Exness",
    description:
      "Exness-style trading platform clone: web app, API server, and a separate price-poller service.",
    tech: ["Next.js", "TypeScript", "Prisma"],
    liveHref: null,
    githubHref: "https://github.com/shaurya35/exness",
  },
  {
    slug: "stockwise",
    title: "Stockwise",
    description:
      "Inventory manager that forecasts demand to recommend the right stock levels.",
    tech: ["React", "Express.js"],
    liveHref: "https://stockwise-omega.vercel.app/",
    githubHref: "https://github.com/shaurya35/Stockwise-Inventory-Manager",
    image: "/projects/stockwise.jpg",
  },
  {
    slug: "token-liquidity-creator",
    title: "Token Liquidity Creator",
    description:
      "Solana launchpad to create and mint tokens, then seed constant-product liquidity pools.",
    tech: ["React", "Solana", "Web3.js"],
    liveHref: null,
    githubHref: "https://github.com/shaurya35/Token-Liquidity-Creator",
  },
  {
    slug: "dpin-uptime",
    title: "DPIN Uptime",
    description:
      "Decentralized uptime monitor: validator nodes run checks and report to a hub.",
    tech: ["Next.js", "TypeScript", "Node.js"],
    liveHref: null,
    githubHref: "https://github.com/shaurya35/dpin-uptime",
  },
  {
    slug: "rust-password-manager",
    title: "Rust Password Manager",
    description:
      "Password manager backend in Rust on Actix-web, packaged with Docker.",
    tech: ["Rust", "Actix-web", "Docker"],
    liveHref: null,
    githubHref: "https://github.com/shaurya35/Rust-PM-be",
  },
  {
    slug: "greenglide",
    title: "GreenGlide",
    description:
      "Web app for tracking, segregating, and managing urban waste, built with a college team.",
    tech: ["React", "Express.js"],
    liveHref: "https://greenglide-smartwaste-management-system.vercel.app/",
    githubHref:
      "https://github.com/shaurya35/GreenGlide-SmartWaste-Management-System",
    image: "/projects/greenglide.jpg",
  },
  {
    slug: "e-learning-platform",
    title: "E-Learning Platform",
    description:
      "E-learning platform with course management and ML-based course recommendations.",
    tech: ["Next.js", "Express.js", "Python"],
    liveHref: null,
    githubHref: "https://github.com/shaurya35/E-Learning-Platform",
  },
  {
    slug: "ethereum-wallet-adapter",
    title: "Ethereum Wallet Adapter",
    description:
      "Ethereum wallet connector using Wagmi and Viem to read from and write to ERC-20 contracts.",
    tech: ["TypeScript", "Wagmi", "Viem"],
    liveHref: null,
    githubHref: "https://github.com/shaurya35/Ethereum-wallet-adapter",
  },
  {
    slug: "interactive-calendar",
    title: "Interactive Calendar",
    description:
      "Event calendar to create, edit, and delete events, backed by PostgreSQL through Prisma.",
    tech: ["Next.js", "PostgreSQL", "Prisma"],
    liveHref: null,
    githubHref: "https://github.com/shaurya35/Interactive-Nextjs-Calendar",
    image: "/projects/interactive-calendar.jpg",
  },
  {
    slug: "xora",
    title: "Xora",
    description:
      "Responsive SaaS landing page built with Next.js and Tailwind.",
    tech: ["Next.js", "Tailwind"],
    liveHref: "https://xora-saas-three.vercel.app/",
    githubHref: "https://github.com/shaurya35/xora-saas",
    image: "/projects/xora.jpg",
  },
];
