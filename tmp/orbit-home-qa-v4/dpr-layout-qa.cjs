const { chromium } = require("C:/Users/25395/AppData/Local/npm-cache/_npx/2334a3ea0ef73d73/node_modules/playwright");

async function inspect(browser, viewport, deviceScaleFactor, screenshot) {
  const page = await browser.newPage({ viewport, deviceScaleFactor });
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("http://localhost:4321/", { waitUntil: "load" });
  await page.waitForTimeout(5600);
  await page.screenshot({ path: screenshot });
  const metrics = await page.evaluate(() => {
    const title = document.querySelector(".orbit-particle-title");
    const canvas = document.querySelector("[data-orbit-title-particles]");
    const role = document.querySelector("[data-orbit-role-text]");
    const caret = document.querySelector(".type-caret");
    let alphaBounds = null;
    if (canvas instanceof HTMLCanvasElement) {
      const context = canvas.getContext("2d");
      const pixels = context?.getImageData(0, 0, canvas.width, canvas.height);
      if (pixels) {
        let minX = canvas.width;
        let maxX = -1;
        for (let y = 0; y < canvas.height; y += 1) {
          for (let x = 0; x < canvas.width; x += 1) {
            if (pixels.data[(y * canvas.width + x) * 4 + 3] < 8) continue;
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
          }
        }
        alphaBounds = maxX >= 0 ? [minX / canvas.width, maxX / canvas.width] : null;
      }
    }
    const roleRect = role?.getBoundingClientRect();
    const caretRect = caret?.getBoundingClientRect();
    return {
      viewport: [innerWidth, innerHeight],
      devicePixelRatio,
      scrollWidth: document.documentElement.scrollWidth,
      titleLabel: title?.getAttribute("aria-label"),
      titleRect: title?.getBoundingClientRect().toJSON(),
      canvasBacking: canvas instanceof HTMLCanvasElement ? [canvas.width, canvas.height] : null,
      alphaBounds,
      roleCaretTopDelta: roleRect && caretRect ? Math.abs(roleRect.top - caretRect.top) : null,
      roleText: role?.textContent,
    };
  });
  await page.close();
  return { consoleErrors, pageErrors, metrics };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const desktop = await inspect(browser, { width: 1440, height: 900 }, 2, "tmp/orbit-home-qa-v4/dpr2-desktop.png");
  const mobile = await inspect(browser, { width: 390, height: 844 }, 2, "tmp/orbit-home-qa-v4/dpr2-mobile.png");
  console.log(JSON.stringify({ desktop, mobile }, null, 2));
  await browser.close();
})();
