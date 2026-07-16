import { Hero } from "@/components/sections/hero";
import { Experience } from "@/components/sections/experience";
import { Projects } from "@/components/sections/projects";
import { Blog } from "@/components/sections/blog";

export default function Home() {
  return (
    <>
      <Hero />
      <Experience />
      <Projects />
      <Blog />
    </>
  );
}
