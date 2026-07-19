import { Hero } from "@/components/sections/hero";
import { Experience } from "@/components/sections/experience";
import { Achievements } from "@/components/sections/achievements";
import { Projects } from "@/components/sections/projects";
import { Blog } from "@/components/sections/blog";
import { Contact } from "@/components/sections/contact";

export default function Home() {
  return (
    <>
      <Hero />
      <Experience />
      <Achievements />
      <Projects />
      <Blog />
      <Contact />
    </>
  );
}
