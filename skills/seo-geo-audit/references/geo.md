# GEO: AI crawlers, policy decisions, and folklore control

What is actually verified about being visible in AI answer engines
(ChatGPT, Claude, Perplexity, Google AI Overviews), versus what the GEO
industry repeats without evidence. Every claim here traces to vendor
documentation or a published study. The AI-crawler landscape moves fast —
when a decision hinges on one row below, re-verify against the vendor's
current crawler docs before acting.

## The one verified lever

**AI crawlers do not execute JavaScript.** Analysis of 500M+ GPTBot
fetches on Vercel's network — independently replicated by a
1.3-billion-request study of 32 AI crawlers — confirmed GPTBot,
ClaudeBot, PerplexityBot, Meta's and ByteDance's crawlers fetch JS files
but never run them. Content that only exists after client-side rendering
is invisible to them. Exceptions: Gemini (crawls via Googlebot's full
JS-rendering infrastructure) and Applebot (browser-based crawler) do
render JS.

Consequences, in priority order:

1. Ship main content server-rendered (SSG/SSR/prerender).
2. Keep URLs clean, redirects tight, and the sitemap accurate — AI
   crawlers lack Google's mature discovery infrastructure, and a new site
   has few inbound links to be discovered through.
3. Content in the initial response counts even when it isn't HTML — LLMs
   ingest JSON payloads and RSC data in the response body.

## The user-agent decision table

Each vendor splits **training**, **search indexing**, and **live user
fetch** into separate user agents. Blocking one does not block the
others — this is the mechanism that lets a site opt out of training
without disappearing from AI answers.

| User agent | Vendor | Purpose | Blocking it means |
|---|---|---|---|
| `GPTBot` | OpenAI | Training corpus | Content excluded from future OpenAI training |
| `OAI-SearchBot` | OpenAI | ChatGPT search index | Site not cited in ChatGPT search answers |
| `ChatGPT-User` | OpenAI | Live fetch on user request | ChatGPT can't open the site for a user |
| `ClaudeBot` | Anthropic | Training corpus | Content excluded from future Anthropic training |
| `Claude-SearchBot` | Anthropic | Search index | Reduced visibility in Claude's search-grounded answers (vendor-confirmed) |
| `Claude-User` | Anthropic | Live fetch on user request | Claude can't open the site for a user |
| `PerplexityBot` | Perplexity | Answer index (not training, per vendor) | Content-level citations removed; domain/headline may still appear |
| `Perplexity-User` | Perplexity | Live fetch on user request | **robots.txt is ignored by design** (user-initiated); blocking requires WAF/UA rules |
| `Google-Extended` | Google | Gemini training + grounding opt-out (robots token only — never appears in logs; Gemini fetches as Googlebot) | No effect on Google Search rankings |
| `Applebot-Extended` | Apple | Apple AI training opt-out (robots token only; fetching is done by Applebot) | Applebot (search) unaffected |
| `CCBot` | Common Crawl | Open corpus used by many trainers | Removed from Common Crawl derivatives |
| `meta-externalagent` | Meta | Training/data collection | Excluded from Meta training |
| `Meta-ExternalFetcher` | Meta | Live fetch on user request | Meta AI can't open the site for a user |
| `Bytespider` | ByteDance | Training | Historically poor robots.txt compliance reported — verify with server logs |

Recommended default for a site that wants AI visibility: **allow
everything, decide deliberately about the training-only tokens** (GPTBot,
ClaudeBot, Google-Extended, Applebot-Extended, CCBot, meta-externalagent,
Bytespider). The vendor-confirmed pattern for "AI visibility without
training exposure": allow the search/answer and user-fetch agents,
disallow the training tokens. The audit script reports current policy per
bot; treat "blocked" as a question for the user, not a defect.

Robots.txt mechanics for these bots: Anthropic honors robots.txt
(including Crawl-delay) and explicitly advises against IP-blocking — a
bot that can't read robots.txt can't see the opt-out. OpenAI and
Perplexity publish IP ranges for verifying that traffic claiming these
UAs is genuine.

Trust caveat: robots.txt is honor-system. Cloudflare documented
Perplexity fetching content through stealth, undeclared crawlers that
evade no-crawl directives — so treat vendor compliance claims as
policies, not guarantees. If blocking truly matters (paywalled or
licensed content), enforce at the WAF/bot-management layer, not just
robots.txt.

## Folklore control

Claims to *not* act on, with the receipts:

| Claim | Status | Evidence |
|---|---|---|
| "llms.txt is required / consumed by AI engines" | **Unverified — no confirmed consumer** | Google Search says AI files aren't needed for AI features; John Mueller: value "purely speculative", no AI system consumes it, likens it to the meta keywords tag. Google removed its own llms.txt. One reported counterpoint: Chrome Lighthouse's experimental "Agentic Browsing" category checks for it — aimed at browser agents, not Search. Verdict: harmless, cheap, zero verified ranking/citation effect. Offer, don't push |
| "Schema markup increases AI citations" | **Refuted as causation** | An Ahrefs difference-in-differences study (1,885 treated pages vs ~4,000 controls) found no citation lift on AI Overviews, AI Mode, or ChatGPT after adding schema (the only significant result was slightly negative). The famous correlation (cited pages have 3× more schema) reflects overall site quality. Schema is still worth adding — for rich results and entity recognition |
| "GEO tactics boost visibility ~40%" | **Misapplied** | The figure comes from the original GEO paper (Aggarwal et al.) and measured *content edits* (quotes, stats, citations) in a sandboxed engine — not technical setup. Don't cite it to justify technical work |
| "robots.txt Disallow removes pages from Google" | **Refuted** | Blocked pages can still be indexed from links; use noindex, and don't robots-block the page you're noindexing |
| "Submit to search engines or you won't be indexed" | **Refuted** | Discovery is automatic via links; sitemaps/GSC accelerate, not gate |
| "Meta keywords help" | **Refuted** | Unused by Google entirely; Bing has treated stuffed keywords as a spam signal. Leave the tag out |
| "Duplicate content gets penalized" | **Refuted** | No penalty; cost is wasted crawl + split signals; Google canonicalizes automatically |
| "IndexNow gets you into Google faster" | **Refuted** | Google does not use IndexNow (Bing/Yandex/Seznam/Naver do) |
| "AI crawlers waste 34% of fetches on 404s (vs ~8% for Googlebot)" | **Refuted** | Widely circulated from a Vercel article, but the statistic failed adversarial fact-checking (0/3 verifiers could confirm it). Keep sitemaps/redirects clean for the verified reason — new sites have few discovery paths — not this number |

## What actually drives AI citations (for scope handoff)

Beyond the technical floor (crawlable, server-rendered, allowed), AI
citation share is driven by content and authority factors — quotable
self-contained passages, freshness, brand mentions — which are **out of
scope for this skill**. Say so rather than overpromising technical fixes.
