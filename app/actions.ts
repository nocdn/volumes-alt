"use server";

import metascraper from "metascraper";
import metascraperTitle from "metascraper-title";
import metascraperLogo from "metascraper-logo-favicon";

const scraper = metascraper([metascraperTitle(), metascraperLogo()]);

export async function getServerTime() {
  return {
    server_time: new Date().toISOString(),
  };
}

export async function getPageMetadata(url: string) {
  const response = await fetch(url);
  const html = await response.text();
  const metadata = await scraper({ html, url: url });
  return metadata as { title?: string; logo?: string };
}
