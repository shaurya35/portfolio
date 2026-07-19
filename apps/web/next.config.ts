import type { NextConfig } from "next";
import { socials } from "./content/socials";
import { site } from "./content/site";

function socialHref(name: string) {
  return socials.find((social) => social.name === name)!.href;
}

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/github",
        destination: socialHref("GitHub"),
        permanent: false,
      },
      {
        source: "/linkedin",
        destination: socialHref("LinkedIn"),
        permanent: false,
      },
      { source: "/twitter", destination: socialHref("X"), permanent: false },
      { source: "/x", destination: socialHref("X"), permanent: false },
      {
        source: "/medium",
        destination: socialHref("Medium"),
        permanent: false,
      },
      { source: "/mail", destination: socialHref("Email"), permanent: false },
      { source: "/cal", destination: site.calHref, permanent: false },
    ];
  },
};

export default nextConfig;
