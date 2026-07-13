const { chromium } = require("C:/Users/25395/AppData/Local/npm-cache/_npx/2334a3ea0ef73d73/node_modules/playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("http://localhost:4321/", { waitUntil: "load" });
  await page.waitForTimeout(6000);

  const labels = await page.locator(".visible-node-label strong").allTextContents();
  const targets = page.locator("[data-orbit-node-hotspot][data-orbit-target-visible]");
  const targetCount = await targets.count();
  await targets.first().hover({ force: true });
  await page.waitForTimeout(350);
  const preview = {
    visible: await page.locator(".node-detail[data-card-visible]").count() === 1,
    title: await page.locator("[data-active-node-title]").innerText(),
    tags: await page.locator("[data-active-node-tags] li").count(),
    date: await page.locator("[data-active-node-date]").innerText(),
    readingTime: await page.locator("[data-active-node-reading]").innerText(),
  };
  await page.screenshot({ path: "tmp/orbit-home-qa-v5/desktop-hover.png" });

  await page.evaluate(() => window.scrollTo({ top: 980, behavior: "instant" }));
  await page.waitForTimeout(250);
  const headerScrolled = await page.locator(".site-header[data-scrolled]").count() === 1;
  const initialTheme = await page.locator("html").getAttribute("data-theme");
  await page.locator("[data-theme-toggle]").click();
  const changedTheme = await page.locator("html").getAttribute("data-theme");

  await page.locator("#subscribe-email").fill("reader@example.com");
  await page.locator("[data-subscribe-form] button").click();
  const subscribeStatus = await page.locator("[data-subscribe-status]").innerText();
  const layout = await page.evaluate(() => ({
    viewport: [innerWidth, innerHeight],
    scrollWidth: document.documentElement.scrollWidth,
    pageHeight: document.documentElement.scrollHeight,
    sections: ["#recent-posts", ".category-section", ".mission-section", ".subscribe-section"].map((selector) => Boolean(document.querySelector(selector))),
  }));

  const reduced = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await reduced.emulateMedia({ reducedMotion: "reduce" });
  await reduced.goto("http://localhost:4321/", { waitUntil: "load" });
  await reduced.waitForTimeout(800);
  const reducedSettled = await reduced.locator('html[data-orbit-intro="running"]').count() === 0;
  await reduced.close();

  console.log(JSON.stringify({ consoleErrors, pageErrors, labels, targetCount, preview, headerScrolled, initialTheme, changedTheme, subscribeStatus, layout, reducedSettled }, null, 2));
  await browser.close();
})();
