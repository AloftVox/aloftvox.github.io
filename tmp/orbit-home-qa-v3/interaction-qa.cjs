const { chromium } = require("C:/Users/25395/AppData/Local/npm-cache/_npx/2334a3ea0ef73d73/node_modules/playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("http://localhost:4321/", { waitUntil: "load" });
  await page.waitForTimeout(5600);
  await page.mouse.move(1180, 260);
  await page.waitForTimeout(500);

  const visibleNodes = page.locator("[data-orbit-node-hotspot][data-orbit-target-visible]");
  const visibleNodeCount = await visibleNodes.count();
  let cardVisible = false;
  let cardTitle = "";
  if (visibleNodeCount) {
    await visibleNodes.first().hover({ force: true });
    await page.waitForTimeout(350);
    cardVisible = await page.locator(".node-detail[data-card-visible]").count() === 1;
    cardTitle = cardVisible ? await page.locator("[data-active-node-title]").innerText() : "";
    await page.screenshot({ path: "tmp/orbit-home-qa-v3/desktop-node-hover.png" });
  }

  const metrics = await page.evaluate(() => {
    const canvas = document.querySelector("[data-orbit-v2-canvas]");
    const title = document.querySelector(".orbit-particle-title");
    const dock = document.querySelector(".social-dock");
    const replay = document.querySelector("[data-intro-replay]");
    return {
      viewport: [innerWidth, innerHeight],
      bodyScrollWidth: document.body.scrollWidth,
      htmlScrollWidth: document.documentElement.scrollWidth,
      canvasRect: canvas ? [canvas.getBoundingClientRect().width, canvas.getBoundingClientRect().height] : null,
      canvasDataLength: canvas instanceof HTMLCanvasElement ? canvas.toDataURL("image/png").length : 0,
      titleTransform: title ? getComputedStyle(title).transform : "",
      socialIcons: dock ? dock.querySelectorAll("a svg path").length : 0,
      replayRect: replay ? replay.getBoundingClientRect().toJSON() : null,
      dockRect: dock ? dock.getBoundingClientRect().toJSON() : null,
    };
  });

  await page.locator("[data-intro-replay]").click();
  await page.waitForTimeout(250);
  const replayRunning = await page.locator('html[data-orbit-intro="running"]').count() === 1;
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  const escaped = await page.locator('html[data-orbit-intro="running"]').count() === 0;

  console.log(JSON.stringify({
    consoleErrors,
    pageErrors,
    visibleNodeCount,
    cardVisible,
    cardTitle,
    replayRunning,
    escaped,
    metrics,
  }, null, 2));
  await browser.close();
})();
