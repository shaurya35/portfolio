import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { InlineScript } from "@/components/inline-script";
import "./globals.css";

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Shaurya Jha",
    template: "%s · Shaurya Jha",
  },
  description: "Software engineer.",
};

const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("theme")||"light";document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

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
      className={`${hankenGrotesk.variable} h-full antialiased`}
    >
      <head>
        <InlineScript html={THEME_SCRIPT} />
      </head>
      <body className="min-h-full flex flex-col">
        <Nav />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
