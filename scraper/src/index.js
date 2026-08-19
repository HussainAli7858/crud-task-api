const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const USER_AGENT = "FlyRankInternshipA9/1.0 (+https://github.com/HussainAli7858/crud-task-api)";
const TIMEOUT_MS = 8000;
const DELAY_MS = 500;
const MAX_CATALOGUE_PAGES = 3;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithCache(url, cacheFilename) {
  const cachePath = path.join(__dirname, "..", "cache", cacheFilename);

  if (fs.existsSync(cachePath)) {
    const html = fs.readFileSync(cachePath, "utf-8");
    console.log(`CACHE HIT: ${cacheFilename} (${html.length} bytes)`);
    return html;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (response.status !== 200) {
    throw new Error(`Failed to fetch ${url}: status ${response.status}`);
  }

  const html = await response.text();

  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, html, "utf-8");

  console.log(`FETCH: ${cacheFilename} (${html.length} bytes)`);

  // Only real network fetches need a politeness delay — cache hits don't
  await sleep(DELAY_MS);

  return html;
}

async function discoverCataloguePages() {
  const bookUrls = new Set(); // Set automatically prevents duplicates
  let currentUrl = "https://books.toscrape.com/catalogue/page-1.html";
  let pageNum = 1;

  while (currentUrl && pageNum <= MAX_CATALOGUE_PAGES) {
    const html = await fetchWithCache(currentUrl, `catalogue-page-${pageNum}.html`);
    const $ = cheerio.load(html);

    // Collect every book link on this page, as absolute URLs
    $("h3 a").each((_, el) => {
      const href = $(el).attr("href");
      const absoluteUrl = new URL(href, currentUrl).toString();
      bookUrls.add(absoluteUrl);
    });

    // Follow the site's own "next" link, if there is one
    const nextHref = $("li.next a").attr("href");
    if (nextHref && pageNum < MAX_CATALOGUE_PAGES) {
      currentUrl = new URL(nextHref, currentUrl).toString();
      pageNum++;
    } else {
      currentUrl = null;
    }
  }

  return { bookUrls: Array.from(bookUrls), pagesVisited: pageNum };
}

async function main() {
  const { bookUrls, pagesVisited } = await discoverCataloguePages();
  console.log(`catalogue_pages=${pagesVisited}`);
  console.log(`discovered=${bookUrls.length}`);
  console.log(`unique_urls=${bookUrls.length}`); // already deduped via Set
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});