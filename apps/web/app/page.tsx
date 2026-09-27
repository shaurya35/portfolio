import type { Metadata } from "next";
import { Hero } from "@/components/sections/hero";
import { Experience } from "@/components/sections/experience";
import { Projects } from "@/components/sections/projects";
// import { Achievements } from "@/components/sections/achievements";
import { Writing } from "@/components/sections/writing";
import { Contact } from "@/components/sections/contact";
import { SITE_DESCRIPTION } from "@/content/site";
import { pageMetadata } from "@/lib/metadata";

// Sets its own openGraph/twitter/canonical for "/" explicitly rather than
// relying on the layout fallback, so og:url here always matches the actual
// page (see layout.tsx for why the fallback no longer sets one).
export const metadata: Metadata = pageMetadata({
  description: SITE_DESCRIPTION,
  path: "/",
});

export default function Home() {
  return (
    <>
      <Hero />
      <Experience />
      <Projects />
      {/* <Achievements /> */}
      <Writing />
      <Contact />
    </>
  );
}
