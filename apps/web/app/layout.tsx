import type { Metadata } from "next";
import { Hanken_Grotesk, Source_Serif_4 } from "next/font/google";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { InlineScript } from "@/components/inline-script";
import { Beacon } from "@/components/beacon";
import { VercelInsights } from "@/components/vercel-insights";
import { ToastProvider } from "@/components/toast";
import { UnsavedChangesProvider } from "@/lib/use-unsaved-changes";
import { site, SITE_URL, SITE_DESCRIPTION } from "@/content/site";
import { socials } from "@/content/socials";
import "./globals.css";

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken-grotesk",
  subsets: ["latin"],
});

const sourceSerif4 = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

const SITE_TITLE = site.name;

// Fallback metadata for segments that don't set their own (404, admin).
// Deliberately has no openGraph.url / twitter fields tied to a specific
// path — pageMetadata() in lib/metadata.ts is what every real page uses,
// so this fallback never gets mistaken for the page it's rendered on.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s · Shaurya Jha",
  },
  description: SITE_DESCRIPTION,
  alternates: {
    types: {
      "application/rss+xml": [
        {
          url: "/writing/feed.xml",
          title: "Shaurya Jha Writing",
        },
      ],
    },
  },
  openGraph: {
    type: "website",
    siteName: SITE_TITLE,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    creator: "@_shaurya35",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

// No stored choice yet -> follow the OS preference. Once the toggle is
// clicked, the explicit "light"/"dark" choice takes over from then on.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");if(!t){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: site.name,
  jobTitle: site.role,
  url: SITE_URL,
  email: `mailto:${site.email}`,
  sameAs: socials.filter((social) => social.name !== "Email").map((social) => social.href),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${hankenGrotesk.variable} ${sourceSerif4.variable} h-full antialiased`}
    >
      <head>
        <InlineScript html={THEME_SCRIPT} />
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-foreground focus:px-3 focus:py-2 focus:text-sm focus:text-background"
        >
          Skip to content
        </a>
        <ToastProvider>
          <UnsavedChangesProvider>
            <Nav />
            <main id="content" className="mx-auto w-full max-w-2xl flex-1 px-4">
              {children}
            </main>
          </UnsavedChangesProvider>
        </ToastProvider>
        <Footer />
        <VercelInsights />
        <Beacon />
      </body>
    </html>
  );
}
