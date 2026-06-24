import Link from "next/link";

interface GridItem {
  id: string;
  title: string;
  image_urls: string[];
}

function LayersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L2 7l10 5 10-5-10-5z" opacity="0.6" />
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  );
}

function ImageEmptyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22.5 30H8.5C5.7 30 4.3 30 3.23 29.455A4 4 0 0 1 1.045 27.27C.5 26.2.5 24.8.5 22V10C.5 7.2.5 5.8 1.045 4.73A4 4 0 0 1 3.23 2.545C4.3 2 5.7 2 8.5 2H22.5C25.3 2 26.7 2 27.77 2.545A4 4 0 0 1 29.955 4.73C30.5 5.8 30.5 7.2 30.5 10V22C30.5 24.8 30.5 26.2 29.955 27.27A4 4 0 0 1 27.77 29.455C26.7 30 25.3 30 22.5 30Z" />
      <path d="M22.5 30C25.3 30 26.7 30 27.77 29.455A4 4 0 0 0 29.955 27.27C30.5 26.2 30.5 24.8 30.5 22V18M22.5 30H8.5C5.7 30 4.3 30 3.23 29.455A4 4 0 0 1 1.045 27.27C.5 26.2.5 24.8.5 22V18M22.5 18L16.5 12 4.109 25.552C4.038 25.628 4.003 25.666 3.804 25.8M22.5 18L30.5 10" />
      <circle cx="9.667" cy="9.167" r="3.333" />
    </svg>
  );
}

interface PostGridProps {
  posts: GridItem[];
  emptyTitle: string;
  emptyMessage: string;
}

export default function PostGrid({ posts, emptyTitle, emptyMessage }: PostGridProps) {
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <ImageEmptyIcon className="size-[31px] text-black" />
        <p className="mt-5 text-[17px] font-semibold text-[#1e1e1e]">{emptyTitle}</p>
        <p className="mt-1 text-center text-[13px] leading-[1.5] text-[#757575]">{emptyMessage}</p>
      </div>
    );
  }

  if (posts.length === 1) {
    return (
      <div className="w-[128px]">
        <Link href={`/post/${posts[0].id}`} className="relative block aspect-square">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={posts[0].image_urls[0]} alt={posts[0].title} loading="lazy" className="h-full w-full object-cover" />
          {posts[0].image_urls.length > 1 && (
            <div className="absolute right-2 top-2">
              <LayersIcon className="size-5 text-white drop-shadow-lg" />
            </div>
          )}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1">
      {posts.map((post) => (
        <Link key={post.id} href={`/post/${post.id}`} className="relative block aspect-square">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.image_urls[0]} alt={post.title} loading="lazy" className="h-full w-full object-cover" />
          {post.image_urls.length > 1 && (
            <div className="absolute right-2 top-2">
              <LayersIcon className="size-4 text-white drop-shadow-lg" />
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
