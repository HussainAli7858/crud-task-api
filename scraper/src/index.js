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
  await sleep(DELAY_MS);

  return html;
}

async function discoverCataloguePages() {
  const bookUrls = new Set();
  let currentUrl = "https://books.toscrape.com/catalogue/page-1.html";
  let pageNum = 1;

  while (currentUrl && pageNum <= MAX_CATALOGUE_PAGES) {
    const html = await fetchWithCache(currentUrl, `catalogue-page-${pageNum}.html`);
    const $ = cheerio.load(html);

    $("h3 a").each((_, el) => {
      const href = $(el).attr("href");
      const absoluteUrl = new URL(href, currentUrl).toString();
      bookUrls.add(absoluteUrl);
    });

    const nextHref = $("li.next a").attr("href");
    if (nextHref && pageNum < MAX_CATALOGUE_PAGES) {
      currentUrl = new URL(nextHref, currentUrl).toString();
      pageNum++;
    } else {
      currentUrl = null;
    }
  }

  return { bookUrls: Array.from(bookUrls), pagesVisited: pageNum, sourcePage: "https://books.toscrape.com/catalogue/page-1.html" };
}

function urlToCacheFilename(url) {
  const segments = url.split("/").filter(Boolean);
  const slug = segments[segments.length - 2]; 
  return `book-${slug}.html`;
}

async function extractBookRecord(bookUrl, sourcePage) {
  const cacheFilename = urlToCacheFilename(bookUrl);
  const html = await fetchWithCache(bookUrl, cacheFilename);
  const $ = cheerio.load(html);

  const productArea = $(".product_main");

  const title = productArea.find("h1").text().trim();
  const priceText = productArea.find(".price_color").first().text().trim();
  const availabilityText = productArea.find(".availability").text().trim().replace(/\s+/g, " ");

  const ratingClass = productArea.find("p.star-rating").attr("class") || "";
  const ratingWord = ratingClass.replace("star-rating", "").trim();

  const descriptionEl = $("#product_description").next("p");
  const description = descriptionEl.length ? descriptionEl.text().trim() : null;

  return {
    title,
    product_url: bookUrl,
    price_text: priceText,
    availability_text: availabilityText,
    rating_text: ratingWord || null,
    description,
    source_page: sourcePage,
    fetched_at: new Date().toISOString(),
  };
}

async function main() {
  const { bookUrls, pagesVisited, sourcePage } = await discoverCataloguePages();
  console.log(`catalogue_pages=${pagesVisited}`);
  console.log(`discovered=${bookUrls.length}`);
  console.log(`unique_urls=${bookUrls.length}`);

  const records = [];
  for (const url of bookUrls) {
    const record = await extractBookRecord(url, sourcePage);
    records.push(record);
  }

  console.log(`detail_pages=${records.length}`);
  console.log("Sample record:");
  console.log(JSON.stringify(records[0], null, 2));
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});