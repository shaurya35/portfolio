import Link from "next/link";
import { DocumentTitle } from "@/components/document-title";

export default function NotFound() {
  return (
    <section className="flex flex-col items-start py-24">
      {/* Without this a 404's tab and history entry read just "Shaurya Jha",
          the same as the home page. */}
      <DocumentTitle title="Page not found · Shaurya Jha" />
      <h1 className="text-2xl font-bold">404</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        This page doesn&apos;t exist.
      </p>

      <Link
        href="/"
        className="mt-6 inline-block rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Back home
      </Link>
    </section>
  );
}
