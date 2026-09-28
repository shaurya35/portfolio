import type { NextConfig } from "next";
import { socials } from "./content/socials";
import { site } from "./content/site";

function socialHref(name: string) {
  return socials.find((social) => social.name === name)!.href;
}

const nextConfig: NextConfig = {
  // Nothing on this site is meant to be embedded, and /admin must not be:
  // framed invisibly on another page, its login form and delete buttons
  // could be clickjacked. frame-ancestors is the modern control;
  // X-Frame-Options covers browsers that predate it.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
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
