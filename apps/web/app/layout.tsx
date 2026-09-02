import type { Metadata } from "next";
import { Hanken_Grotesk, Source_Serif_4 } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { InlineScript } from "@/components/inline-script";
import { Beacon } from "@/components/beacon";
import { ToastProvider } from "@/components/toast";
import { UnsavedChangesProvider } from "@/lib/use-unsaved-changes";
import { site } from "@/content/site";
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

const SITE_URL = "https://shauryacodes.me";
const SITE_TITLE = "Shaurya Jha";
const SITE_DESCRIPTION = "Software engineer. Building products, not just projects.";

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
    url: SITE_URL,
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

// Stored value is a *preference*: "light" | "dark" | "system", anything else
// (including nothing yet) is treated as "system". data-theme-pref carries
// that preference for the toggle's own icon visibility; data-theme is always
// resolved to light/dark and is what every color token in globals.css keys
// off, so a "system" preference still paints instantly with no flash.
const THEME_SCRIPT = `(function(){try{var p=localStorage.getItem("theme");if(p!=="light"&&p!=="dark"){p="system"}var t=p==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):p;document.documentElement.setAttribute("data-theme-pref",p);document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

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
      data-theme-pref="system"
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
        <Analytics />
        <SpeedInsights />
        <Beacon />
      </body>
    </html>
  );
}
