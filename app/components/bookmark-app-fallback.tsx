import React from "react";

export function BookmarkAppFallback() {
  return (
    <div className="flex flex-col items-center">
      <div className="rounded-3xl supports-[corner-shape:squircle]:rounded-4xl supports-[corner-shape:squircle]:[corner-shape:squircle] bg-[#FEFFFF] border border-[#ECEDED] w-[85%] md:max-w-[50%] h-[72px] animate-pulse" />
    </div>
  );
}
