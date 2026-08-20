# Polite Scraper

## Target classification

- **Site:** Books to Scrape (https://books.toscrape.com)
- **Why:** This is an explicit sandbox site built by the maintainers of Scrapy specifically so people can
  practice web scraping without harming a real business or violating anyone's actual terms of service.
- **Scope:** Only the first 3 catalogue pages (60 books total) — not the entire site.
- **Data collected:** Book title, price, availability, star rating, description, and product URL — all
  publicly displayed information, no user data, no login-gated content.
- **robots.txt result:** No robots.txt file exists at https://books.toscrape.com/robots.txt (returns 404
  Not Found). A missing file is not explicit permission — but combined with the site's own stated purpose
  as a public scraping sandbox, proceeding with a small, polite, rate-limited sample is reasonable here.
- **Why this is appropriate:** The site exists for this exact purpose, the data is public and already
  rendered in the HTML (no bypassing of any access control), and I'm only taking a small, fixed sample
  rather than scraping the entire site repeatedly.

I will not reuse this code on another site without checking its rules and terms first.

## How to run it

\`\`\`bash
cd scraper
npm install
node src/index.js
\`\`\`

Produces `output/books.json` (60 validated records), `output/errors.json` (any invalid or failed
records with reasons), and `output/run-report.json` (a summary of the run).

## Record schema

| Field | Type | Notes |
|---|---|---|
| title | string | |
| product_url | string (URL) | canonical identity — deduped on this |
| price_text | string | original text, e.g. "£51.77" |
| price_gbp | number | normalized from price_text |
| availability_text | string | |
| rating_text | string \| null | e.g. "Three" |
| description | string \| null | null when the page has none — never invented |
| source_page | string (URL) | which catalogue page this book was discovered on |
| fetched_at | string (ISO timestamp) | when this record was fetched |

## Politeness rules followed

- Identifies itself with a clear User-Agent naming this project and linking to the repo.
- Every request has an 8-second timeout — never waits forever.
- Waits at least 500ms between real requests to the site (cached pages need no delay).
- Checks the status code before doing anything else — only 200 is treated as success.
- Retries once on timeouts and 5xx/429 errors; never retries 404 or 403 (asking again won't help, or the
  site has already said no).
- Caches every page locally after the first fetch, so repeated development runs never re-hit the site.

## Sample run report

\`\`\`json
{
  "started_at": "2026-08-20T04:21:59.037Z",
  "duration_ms": 2125,
  "catalogue_pages_visited": 3,
  "urls_discovered": 61,
  "valid_records": 60,
  "invalid_records": 0,
  "failed_pages": 1
}
\`\`\`

## One honest limitation

The retry logic is intentionally simple — a single retry with a fixed 1-second delay on timeouts and
5xx/429 errors, not proper exponential backoff. On a flakier site than this practice sandbox, one retry
might not be enough, and a fixed delay doesn't respect a server's actual Retry-After header if it sends
one. I also hit a real encoding bug partway through building this: my first version used
response.text() to read each page, which silently mis-decoded the site's UTF-8 content — prices showed
as "Â£51.77" instead of "£51.77", and accented text in one book's French description came through as
garbled symbols. The fix was forcing explicit UTF-8 decoding via response.arrayBuffer() and
TextDecoder("utf-8") instead of trusting the default. It's a good reminder that "the request succeeded"
and "the data is actually correct" are two different checks — a 200 status code says nothing about
whether the bytes were decoded properly, which is exactly the kind of thing this assignment's "trust
nothing you scraped" rule is about.

## Why this needed no browser

The book data (title, price, description, etc.) is already present in the raw HTML the server sends —
there's no JavaScript rendering required to see it. A tool like Playwright would add real cost (a full
browser engine, much slower execution) for zero benefit here, since nothing is hidden behind
client-side rendering.

## Ethics note

This project only scrapes books.toscrape.com, a site explicitly built and maintained for people to
practice scraping on. I would not reuse this code against a real business's site without first checking
its robots.txt, terms of service, and whether an official API exists — scraping should always be a
last resort, not a first instinct, and should never bypass logins, paywalls, or explicit blocks.