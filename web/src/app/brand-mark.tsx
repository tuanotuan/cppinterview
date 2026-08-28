import Image from "next/image";

type BrandMarkSize = "sm" | "md" | "lg";

const brandMarkSizes: Record<
  BrandMarkSize,
  { className: string; pixels: number }
> = {
  sm: { className: "size-10 rounded-xl", pixels: 40 },
  md: { className: "size-11 rounded-2xl", pixels: 44 },
  lg: { className: "size-12 rounded-2xl", pixels: 48 },
};

export function BrandMark({
  className = "",
  size = "md",
}: {
  className?: string;
  size?: BrandMarkSize;
}) {
  const dimensions = brandMarkSizes[size];

  return (
    <Image
      src="/icon.svg"
      alt=""
      aria-hidden="true"
      width={dimensions.pixels}
      height={dimensions.pixels}
      unoptimized
      className={`${dimensions.className} shrink-0 ${className}`.trim()}
    />
  );
}
