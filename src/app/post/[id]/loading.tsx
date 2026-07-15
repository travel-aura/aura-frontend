export default function PostDetailLoading() {
  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-[#F7F3EC]">

      {/* Header skeleton */}
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left: back chevron + avatar + name */}
        <div className="flex items-center gap-2">
          <div className="size-6 animate-pulse rounded-full bg-[#D4C4A8]" />
          <div className="size-8 animate-pulse rounded-full bg-[#D4C4A8]" />
          <div className="h-4 w-24 animate-pulse rounded-full bg-[#D4C4A8]" />
        </div>
        {/* Right: bookmark + share */}
        <div className="flex items-center gap-3.5">
          <div className="size-5 animate-pulse rounded-full bg-[#D4C4A8]" />
          <div className="size-5 animate-pulse rounded-full bg-[#D4C4A8]" />
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-hidden">

        {/* Carousel skeleton — 62% width, 3:4 aspect, left-padded */}
        <div className="pl-4">
          <div className="aspect-[3/4] w-[62%] animate-pulse rounded-2xl bg-[#D4C4A8]" />

          {/* Dot indicators row */}
          <div className="mt-3 flex justify-center gap-1.5">
            <div className="h-1.5 w-6 animate-pulse rounded-full bg-[#D4C4A8]" />
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#EDE6D9]" />
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#EDE6D9]" />
          </div>
        </div>

        {/* Content area */}
        <div className="px-4 pt-4 pb-2 space-y-3">

          {/* Title bar */}
          <div className="h-6 w-4/5 animate-pulse rounded-full bg-[#D4C4A8]" />

          {/* Description lines */}
          <div className="space-y-2">
            <div className="h-4 w-full animate-pulse rounded-full bg-[#EDE6D9]" />
            <div className="h-4 w-3/4 animate-pulse rounded-full bg-[#EDE6D9]" />
          </div>

          {/* Tags row */}
          <div className="flex gap-2 pt-1">
            <div className="h-7 w-10 animate-pulse rounded-full bg-[#EDE6D9]" />
            <div className="h-7 w-20 animate-pulse rounded-full bg-[#EDE6D9]" />
            <div className="h-7 w-16 animate-pulse rounded-full bg-[#EDE6D9]" />
          </div>

          {/* Info card skeleton */}
          <div className="mt-1 rounded-2xl bg-[#EDE6D9] px-4 py-4">
            {/* Location name bar */}
            <div className="mb-3 h-5 w-1/2 animate-pulse rounded-full bg-[#D4C4A8]" />

            {/* Sub-cards row */}
            <div className="flex gap-2">
              <div className="flex flex-1 animate-pulse rounded-xl bg-white py-8" />
              <div className="flex flex-1 animate-pulse rounded-xl bg-white py-8" />
              <div className="flex flex-1 animate-pulse rounded-xl bg-[#D4C4A8] py-8" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
