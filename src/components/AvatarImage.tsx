import Image from "next/image";

interface Props {
  src?: string | null;
  name?: string | null;
  alt?: string;
  fill?: boolean;
  sizes?: string;
  className?: string;
}

export default function AvatarImage({ src, name, alt, fill, sizes, className }: Props) {
  if (src) {
    return (
      <Image
        src={src}
        alt={alt ?? name ?? ""}
        fill={fill}
        sizes={sizes}
        className={className}
      />
    );
  }

  const letter = (name ?? "").trim()[0]?.toUpperCase();

  return (
    <div className="flex h-full w-full items-center justify-center bg-[#EDE6D9]">
      {letter ? (
        <span className="select-none text-[15px] font-semibold leading-none text-[#6B5F52]">
          {letter}
        </span>
      ) : (
        <svg className="size-[45%] text-[#A09080]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
        </svg>
      )}
    </div>
  );
}
