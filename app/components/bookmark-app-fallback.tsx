export function BookmarkAppFallback() {
  return (
    <div className="flex flex-col items-center">
      {/* SearchInput skeleton - matches real structure */}
      <div className="rounded-4xl [corner-shape:squircle] bg-[#FEFFFF] border-shadow w-[85%] md:max-w-[50%] px-5 py-5 flex flex-col gap-4">
        {/* Top row */}
        <div className="flex items-start gap-2 min-h-6.5">
          <div className="size-[17px] mt-1 shrink-0 rounded bg-gray-200 animate-pulse" />
          <div className="flex-1 h-6 rounded bg-gray-100 animate-pulse" />
        </div>
        {/* Bottom row */}
        <div className="flex items-center justify-between min-h-7">
          <div />
          <div className="rounded-full size-7 shrink-0 bg-[#F2F3F3]" />
        </div>
      </div>

      {/* Spacer - matches h-8 in real component */}
      <div className="h-8" />
    </div>
  );
}
