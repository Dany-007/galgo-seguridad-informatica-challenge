const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const OUT_DIR = path.join(__dirname, "..", "docs", "evidencias");
const text = fs.readFileSync(path.join(process.env.TEMP, "ev_rate_limit.txt"), "utf8");

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  const html = `<html><head><style>
    body { margin:0; background:#0d1117; font-family: Consolas, monospace; }
    .win { padding: 18px 22px; }
    .title { color:#8b949e; font-size:13px; margin-bottom:10px; border-bottom:1px solid #30363d; padding-bottom:8px; }
    pre { color:#c9d1d9; font-size:13px; white-space:pre-wrap; margin:0; line-height:1.6; }
    .ok { color:#f85149; } .block { color:#3fb950; font-weight:bold; }
  </style></head><body><div class="win">
    <div class="title">POST /auth/login con credenciales incorrectas x9 seguidas (prueba de rate limiting)</div>
    <pre>${text
      .split("\n")
      .map((l) => (l.includes("429") ? `<span class="block">${l}</span>` : `<span class="ok">${l}</span>`))
      .join("\n")}</pre>
  </div></body></html>`;
  await page.setViewport({ width: 900, height: 40 });
  await page.setContent(html);
  const height = await page.evaluate(() => document.body.scrollHeight);
  await page.setViewport({ width: 900, height: Math.max(height, 60) });
  await page.screenshot({ path: path.join(OUT_DIR, "13-rate-limiting-login.png") });
  await browser.close();
  console.log("OK 13-rate-limiting-login.png");
})();
