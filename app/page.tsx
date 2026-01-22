import { Suspense } from "react";
import { BookmarkApp } from "./components/bookmark-app";
import { BookmarkAppFallback } from "./components/bookmark-app-fallback";

export default function Home() {
  return (
    <main className="height-dvh w-screen pt-18 md:pt-48 bg-white pb-24">
      <Suspense fallback={<BookmarkAppFallback />}>
        <BookmarkApp />
      </Suspense>
      <div
        className="bottom-scroll-mask pointer-events-none"
        aria-hidden="true"
      />
    </main>
  );
}
