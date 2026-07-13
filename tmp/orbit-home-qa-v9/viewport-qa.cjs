const { chromium } = require("C:/Users/25395/AppData/Local/npm-cache/_npx/2334a3ea0ef73d73/node_modules/playwright");

const viewports = [[1366, 768], [1440, 900], [1920, 1080], [2048, 1124], [2560, 1440]];
const intersects = (a, b, padding = 3) => a && b && a.left < b.right + padding && a.right > b.left - padding && a.top < b.bottom + padding && a.bottom > b.top - padding;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  for (const [width, height] of viewports) {
    const page = await browser.newPage({ viewport: { width, height } });
    const consoleErrors = [];
    const pageErrors = [];
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto("http://localhost:4321/", { waitUntil: "load" });
    await page.waitForTimeout(6000);
    const metrics = await page.evaluate(() => {
      const toRect = (element) => {
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
      };
      const labels = Array.from(document.querySelectorAll(".visible-node-label")).map((element) => ({ name: element.querySelector("strong")?.textContent ?? "", ...toRect(element) }));
      return {
        scrollWidth: document.documentElement.scrollWidth,
        hero: toRect(document.querySelector(".orbit-hero")),
        stage: toRect(document.querySelector(".orbit-stage")),
        recent: toRect(document.querySelector("#recent-posts")),
        title: toRect(document.querySelector(".orbit-particle-title")),
        manifesto: toRect(document.querySelector(".hero-manifesto")),
        card: toRect(document.querySelector("[data-active-node-card]")),
        cardVisible: Boolean(document.querySelector("[data-active-node-card][data-card-visible]")),
        cardTitle: document.querySelector("[data-active-node-title]")?.textContent ?? "",
        targetCount: document.querySelectorAll("[data-orbit-node-hotspot][data-orbit-target-visible]").length,
        labels,
      };
    });
    const labelOverlaps = [];
    for (let a = 0; a < metrics.labels.length; a += 1) {
      for (let b = a + 1; b < metrics.labels.length; b += 1) {
        if (intersects(metrics.labels[a], metrics.labels[b])) labelOverlaps.push(`${metrics.labels[a].name} / ${metrics.labels[b].name}`);
      }
    }
    const outOfBounds = metrics.labels.filter((label) => label.left < 8 || label.right > width - 8 || label.top < 62 || label.bottom > metrics.hero.bottom - 12).map((label) => label.name);
    await page.screenshot({ path: `tmp/orbit-home-qa-v9/final-${width}x${height}.png` });
    results.push({
      viewport: [width, height],
      heroHeight: Math.round(metrics.hero.height),
      stageWidth: Math.round(metrics.stage.width),
      bodyVisible: Math.max(0, Math.round(height - metrics.recent.top)),
      scrollWidth: metrics.scrollWidth,
      targetCount: metrics.targetCount,
      initialCard: metrics.cardVisible && metrics.cardTitle.includes("Astro"),
      cardOverTitle: intersects(metrics.card, metrics.title),
      cardOverManifesto: intersects(metrics.card, metrics.manifesto),
      labelOverlaps,
      outOfBounds,
      consoleErrors,
      pageErrors,
    });
    await page.close();
  }

  const interaction = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await interaction.goto("http://localhost:4321/", { waitUntil: "load" });
  await interaction.waitForTimeout(6000);
  const frontend = interaction.locator('[data-orbit-node-hotspot="category-frontend"]');
  await frontend.hover({ force: true });
  await interaction.waitForTimeout(250);
  const hoverTitle = await interaction.locator("[data-active-node-title]").innerText();
  await interaction.locator(".orbit-copy").hover({ force: true });
  await interaction.waitForTimeout(250);
  const restoredTitle = await interaction.locator("[data-active-node-title]").innerText();
  console.log(JSON.stringify({ viewports: results, interaction: { hoverTitle, restoredTitle } }, null, 2));
  await interaction.close();
  await browser.close();
})();
