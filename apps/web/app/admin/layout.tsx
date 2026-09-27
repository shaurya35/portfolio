import type { Metadata } from "next";

// Every app/admin/**/page.tsx is a client component ("use client"), so none
// of them can export their own metadata — this layout is the only place
// that can keep the admin login and dashboard out of search results.
export const metadata: Metadata = {
  title: "Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
