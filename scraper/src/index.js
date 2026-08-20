const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const { z } = require("zod");

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

  let lastError;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.status === 404 || response.status === 403) {
        // Don't retry — asking again won't help
        throw new Error(`Fetch failed permanently: status ${response.status}`);
      }

      if (response.status >= 500 || response.status === 429) {
        
        if (attempt === 1) {
          console.log(`WARN: ${cacheFilename} returned ${response.status}, retrying once...`);
          await sleep(1000);
          continue;
        }
        throw new Error(`Fetch failed after retry: status ${response.status}`);
      }

      if (response.status !== 200) {
        throw new Error(`Unexpected status ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      const html = new TextDecoder("utf-8").decode(buffer);

      fs.mkdirSync(path.dirname(cachePath), { recursive: true });
      fs.writeFileSync(cachePath, html, "utf-8");

      console.log(`FETCH: ${cacheFilename} (${html.length} bytes)`);
      await sleep(DELAY_MS);

      return html;
    } catch (err) {
      clearTimeout(timeout);
      lastError = err;
      if (attempt === 1 && (err.name === "AbortError")) {
        console.log(`WARN: ${cacheFilename} timed out, retrying once...`);
        await sleep(1000);
        continue;
      }
      break;
    }
  }

  throw lastError;
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

function normalizeRecord(raw) {
  const priceMatch = raw.price_text.match(/[\d.]+/);
  const price_gbp = priceMatch ? parseFloat(priceMatch[0]) : NaN;

  return {
    ...raw,
    price_gbp,
  };
}

const BookSchema = z.object({
  title: z.string().min(1),
  product_url: z.string().url(),
  price_text: z.string().min(1),
  price_gbp: z.number().positive(),
  availability_text: z.string().min(1),
  rating_text: z.string().nullable(),
  description: z.string().nullable(),
  source_page: z.string().url(),
  fetched_at: z.string(),
});

async function main() {
  const startTime = Date.now();
  let cacheHits = 0;
  let pagesFetched = 0;
  let failedPages = 0;

  const { bookUrls, pagesVisited, sourcePage } = await discoverCataloguePages();
  console.log(`catalogue_pages=${pagesVisited}`);
  console.log(`discovered=${bookUrls.length}`);
  console.log(`unique_urls=${bookUrls.length}`);

  // TEMPORARILY: line below is to test failure handling with a fake URL
  // bookUrls.push("https://books.toscrape.com/catalogue/this-book-does-not-exist_9999/index.html");

  const validRecords = [];
  const invalidRecords = [];
  const failedUrls = [];
  const seenUrls = new Set();

  for (const url of bookUrls) {
    let raw;
    try {
      raw = await extractBookRecord(url, sourcePage);
    } catch (err) {
      console.log(`SKIPPED (failed page): ${url} — ${err.message}`);
      failedPages++;
      failedUrls.push({ url, reason: err.message });
      continue;
    }

    const normalized = normalizeRecord(raw);

    if (seenUrls.has(normalized.product_url)) {
      continue;
    }

    const result = BookSchema.safeParse(normalized);
    if (result.success) {
      validRecords.push(result.data);
      seenUrls.add(normalized.product_url);
    } else {
      invalidRecords.push({ record: normalized, reason: result.error.message });
    }
  }

  console.log(`detail_pages_attempted=${bookUrls.length}`);
  console.log(`valid_records=${validRecords.length}`);
  console.log(`invalid_records=${invalidRecords.length}`);
  console.log(`failed_pages=${failedPages}`);

  const outputDir = path.join(__dirname, "..", "output");
  fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(
    path.join(outputDir, "books.json"),
    JSON.stringify(validRecords, null, 2)
  );

  fs.writeFileSync(
    path.join(outputDir, "errors.json"),
    JSON.stringify({ invalid_records: invalidRecords, failed_pages: failedUrls }, null, 2)
  );

  const durationMs = Date.now() - startTime;

  const report = {
    started_at: new Date(startTime).toISOString(),
    duration_ms: durationMs,
    catalogue_pages_visited: pagesVisited,
    urls_discovered: bookUrls.length,
    valid_records: validRecords.length,
    invalid_records: invalidRecords.length,
    failed_pages: failedPages,
  };

  fs.writeFileSync(
    path.join(outputDir, "run-report.json"),
    JSON.stringify(report, null, 2)
  );

  console.log("Wrote output/books.json, output/errors.json, output/run-report.json");
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});