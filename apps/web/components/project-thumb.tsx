import Image from "next/image";

export function ProjectThumb({
  title,
  image,
}: {
  title: string;
  image?: string;
}) {
  if (image) {
    return (
      <div className="relative mt-1 aspect-[2.5/1] w-24 shrink-0 overflow-hidden rounded-md border border-border transition-colors group-hover:border-accent/50 sm:w-28">
        <Image
          src={image}
          alt=""
          fill
          sizes="(min-width: 640px) 112px, 96px"
          className="object-cover object-top"
        />
      </div>
    );
  }

  return (
    <span
      aria-hidden
      className="flex mt-1 aspect-[2.5/1] w-24 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-sm font-semibold text-muted-foreground transition-colors group-hover:border-accent/50 sm:w-28"
    >
      {title.charAt(0)}
    </span>
  );
}
