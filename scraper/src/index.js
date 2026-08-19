const fs = require("fs");
const path = require("path");

const USER_AGENT = "FlyRankInternshipA9/1.0 (+https://github.com/HussainAli7858/crud-task-api)";
const TIMEOUT_MS = 8000;

async function fetchWithCache(url, cacheFilename) {
  const cachePath = path.join(__dirname, "..", "cache", cacheFilename);

  // If we already have this page cached, use it — no network call
  if (fs.existsSync(cachePath)) {
    const html = fs.readFileSync(cachePath, "utf-8");
    console.log(`CACHE HIT: ${cacheFilename} (${html.length} bytes)`);
    return html;
  }

  // Otherwise, fetch it for real — politely
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
  return html;
}

async function main() {
  const url = "https://books.toscrape.com/catalogue/page-1.html";
  await fetchWithCache(url, "catalogue-page-1.html");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});