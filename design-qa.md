# AloftVox Blog-first Design QA

## Scope

- Goal: strengthen the site’s blog positioning without changing article body content.
- Surfaces: homepage, blog index, article page, RSS endpoint, header, footer.
- Viewports: 1440x900, 390x844, and 320x720.
- Themes and states: dark, light, mobile menu open, mobile table of contents open, in-article reading, and reduced motion.

## Evidence

- Before desktop homepage: `tmp/blog-positioning-audit-2026-07-16/01-home-hero-desktop.png`
- After desktop homepage: `tmp/blog-first-qa-2026-07-17/01-home-desktop-dark.png`
- Before mobile homepage: `tmp/blog-positioning-audit-2026-07-16/06-home-mobile.png`
- After mobile homepage: `tmp/blog-first-qa-2026-07-17/07-home-mobile-dark.png`
- Before desktop article: `tmp/blog-positioning-audit-2026-07-16/03-article-top-desktop.png`
- After desktop article: `tmp/blog-first-qa-2026-07-17/03-article-desktop-dark.png`
- Before mobile article: `tmp/blog-positioning-audit-2026-07-16/08-article-top-mobile.png`
- After mobile article: `tmp/blog-first-qa-2026-07-17/09-article-mobile-top-dark.png`
- Mobile table of contents: `tmp/blog-first-qa-2026-07-17/10-article-mobile-toc-open-dark.png`
- Mobile reading progress: `tmp/blog-first-qa-2026-07-17/11-article-mobile-reading-dark.png`
- Narrow mobile homepage: `tmp/blog-first-qa-2026-07-17/12-home-narrow-dark.png`
- Automated results: `tmp/blog-first-qa-2026-07-17/metrics.json`

## Final Findings

- No remaining P0, P1, or P2 findings.
- Blog discovery: desktop hero height decreased from 820px / 91% of the viewport to 702px / 78%; mobile decreased from 788px / 93% to 692px / 82%. The latest-articles section now appears in the first viewport, and the first article begins within the 1440x900 and 390x844 captures.
- Positioning and naming: the main navigation now uses “文章”; the brand subtitle, homepage title, recent-post heading, and blog index consistently identify the site as a technical blog with project retrospectives and learning notes.
- Mobile star map: compact article and project labels remain visible without clipping or colliding with the main hero copy. The star map remains the primary brand asset while yielding vertical space to article discovery.
- Article header: estimated reading time is visible beside the category and date.
- Long-form reading: desktop prose is 720px wide with an effective line height of about 30px; the desktop table of contents highlights the current section.
- Mobile reading tools: the collapsible table of contents exposes all three headings, closes after navigation, and the fixed progress line updates during reading.
- Subscription: `/rss.xml` returns HTTP 200 with `application/xml`, contains the real article URL, is linked in the footer, and is exposed through RSS auto-discovery metadata.
- Touch and layout: all tested navigation, footer, article-return, menu, table-of-contents, and article-row controls meet the 44px target. No tested viewport has horizontal overflow.
- Visual system: the dark space hero remains consistent in both site themes; the light and dark reading surfaces preserve contrast, hierarchy, and the existing restrained editorial styling.
- Content integrity: article body copy and project content were not rewritten. Changes are limited to presentation, navigation language, generated reading metadata, and reading utilities.
- Runtime: production build succeeds; automated browser checks recorded zero console errors, page errors, failed requests, or broken local routes. Headless WebGL only reports a non-blocking unsupported-extension warning.

## Iterations

### Pass 1

- Added blog-first hierarchy, RSS, reading time, mobile table of contents, reading progress, current-section highlighting, and larger text-link targets.
- Initial browser capture showed the development server retaining stale global prose CSS.
- Fix: restarted Astro using its background server mode and re-ran all captures against the refreshed server.

### Pass 2

- Chinese heading hashes did not match the table-of-contents links because browser hashes were URL-encoded.
- Fix: decoded the hash before comparing it with heading IDs.

### Pass 3

- A right-side mobile article label initially clipped at the viewport edge; moving labels sideways created overlap near the portrait.
- Fix: returned mobile labels below their nodes and hid secondary metadata at mobile sizes, leaving concise “文章” and “项目” labels.

## Residual P3 Note

- At 320x720, the “最新文章” heading is visible in the first viewport while the first article row begins just below it. This preserves the star map’s legibility on very short screens without returning to the previous full-screen hero.

final result: passed
