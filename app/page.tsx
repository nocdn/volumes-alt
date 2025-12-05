"use client";

import { BookmarkApp } from "./components/bookmark-app";

export default function Home() {
  return (
    <main className="height-dvh w-screen pt-48 bg-white">
      <BookmarkApp />
      <div
        className="bottom-scroll-mask pointer-events-none"
        aria-hidden="true"
      />
    </main>
  );
}
