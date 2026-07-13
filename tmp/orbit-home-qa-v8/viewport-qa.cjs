const { chromium } = require("C:/Users/25395/AppData/Local/npm-cache/_npx/2334a3ea0ef73d73/node_modules/playwright");

const viewports = [
  [1366, 768],
  [1440, 900],
  [1920, 1080],
  [2048, 1124],
  [2560, 1440],
];

const intersects = (a, b, padding = 4) =>
  a.left < b.right + padding && a.right > b.left - padding &&
  a.top < b.bottom + padding && a.bottom > b.top - padding;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const [width, height] of viewports) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    const consoleErrors = [];
    const pageErrors = [];
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto("http://localhost:4321/", { waitUntil: "load" });
    await page.waitForTimeout(6000);

    const metrics = await page.evaluate(() => {
      const rect = (selector) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const value = element.getBoundingClientRect();
        return { left: value.left, top: value.top, right: value.right, bottom: value.bottom, width: value.width, height: value.height };
      };
      const labels = Array.from(document.querySelectorAll(".visible-node-label")).map((element) => {
        const value = element.getBoundingClientRect();
        return { name: element.querySelector("strong")?.textContent ?? "", left: value.left, top: value.top, right: value.right, bottom: value.bottom, width: value.width, height: value.height };
      });
      const targets = Array.from(document.querySelectorAll("[data-orbit-node-hotspot][data-orbit-target-visible]")).map((element) => {
        const value = element.getBoundingClientRect();
        return { name: element.getAttribute("aria-label") ?? "", x: value.left + value.width / 2, y: value.top + value.height / 2 };
      });
      return {
        viewport: [innerWidth, innerHeight],
        scrollWidth: document.documentElement.scrollWidth,
        hero: rect(".orbit-hero"),
        stage: rect(".orbit-stage"),
        recent: rect("#recent-posts"),
        title: rect(".orbit-particle-title"),
        avatar: rect("[data-avatar-target]"),
        labels,
        targets,
      };
    });

    const overlaps = [];
    for (let first = 0; first < metrics.labels.length; first += 1) {
      for (let second = first + 1; second < metrics.labels.length; second += 1) {
        if (intersects(metrics.labels[first], metrics.labels[second])) {
          overlaps.push(`${metrics.labels[first].name} / ${metrics.labels[second].name}`);
        }
      }
    }
    const outOfBounds = metrics.labels
      .filter((label) => label.left < 8 || label.right > width - 8 || label.top < 64 || label.bottom > metrics.hero.bottom - 16)
      .map((label) => label.name);

    await page.screenshot({ path: `tmp/orbit-home-qa-v8/final-${width}x${height}.png` });
    results.push({
      viewport: metrics.viewport,
      heroHeight: Math.round(metrics.hero.height),
      stageWidth: Math.round(metrics.stage.width),
      bodyVisible: Math.max(0, Math.round(height - metrics.recent.top)),
      scrollWidth: metrics.scrollWidth,
      targetCount: metrics.targets.length,
      overlaps,
      outOfBounds,
      consoleErrors,
      pageErrors,
    });
    await page.close();
  }

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})();
