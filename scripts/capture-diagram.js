const path = require("path");
const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto("file://" + path.join(__dirname, "diagram.html"), { waitUntil: "networkidle0" });
  const el = await page.$(".canvas");
  await el.screenshot({ path: path.join(__dirname, "..", "docs", "evidencias", "00-arquitectura-diagrama.png") });
  await browser.close();
  console.log("OK 00-arquitectura-diagrama.png");
})();
