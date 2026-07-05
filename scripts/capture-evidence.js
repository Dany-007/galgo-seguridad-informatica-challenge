// Script temporal para generar evidencia en PNG del laboratorio funcionando (dashboard, Swagger,
// y evidencias de terminal). No forma parte del runtime de la aplicacion.
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
require("dotenv").config();

const OUT_DIR = path.join(__dirname, "..", "docs", "evidencias");
fs.mkdirSync(OUT_DIR, { recursive: true });

const BASE_URL = "https://localhost:8443";

function readTextFile(p) {
  return fs.readFileSync(p, "utf8");
}

async function screenshotTerminalText(browser, title, text, outFile) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 40 });
  const html = `
    <html><head><style>
      body { margin:0; background:#0d1117; font-family: 'Cascadia Code', Consolas, monospace; }
      .win { padding: 18px 22px; }
      .title { color:#8b949e; font-size:13px; margin-bottom:10px; border-bottom:1px solid #30363d; padding-bottom:8px; }
      pre { color:#c9d1d9; font-size:13px; white-space:pre-wrap; margin:0; line-height:1.5; }
    </style></head>
    <body><div class="win"><div class="title">${title}</div><pre>${text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")}</pre></div></body></html>`;
  await page.setContent(html);
  const height = await page.evaluate(() => document.body.scrollHeight);
  await page.setViewport({ width: 1000, height: Math.max(height, 60) });
  await page.screenshot({ path: path.join(OUT_DIR, outFile) });
  await page.close();
  console.log("OK terminal ->", outFile);
}

async function main() {
  const browser = await puppeteer.launch({
    headless: "new",
    ignoreHTTPSErrors: true,
    args: ["--ignore-certificate-errors"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // 1. Pantalla de login
  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle0" });
  await page.screenshot({ path: path.join(OUT_DIR, "01-dashboard-login.png") });
  console.log("OK 01-dashboard-login.png");

  // 2. Login con credenciales incorrectas -> error visible
  await page.type("#username", "admin");
  await page.type("#password", "password-incorrecta");
  await page.click("#login-form button[type=submit]");
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(OUT_DIR, "02-login-error.png") });
  console.log("OK 02-login-error.png");

  // 3. Login correcto como admin
  await page.evaluate(() => {
    document.getElementById("password").value = "";
  });
  await page.type("#password", process.env.SEED_ADMIN_PASSWORD);
  await page.click("#login-form button[type=submit]");
  await page.waitForSelector("#usuarios-tbody tr", { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(OUT_DIR, "03-dashboard-listado-admin.png") });
  console.log("OK 03-dashboard-listado-admin.png");

  // 4. Abrir dialogo de revelacion
  await page.click(".reveal-btn");
  await new Promise((r) => setTimeout(r, 300));
  await page.type("#reveal-reason", "Validacion de calidad de datos solicitada por Auditoria Interna");
  await page.screenshot({ path: path.join(OUT_DIR, "04-dashboard-reveal-dialog.png") });
  console.log("OK 04-dashboard-reveal-dialog.png");

  // 5. Confirmar revelacion -> resultado
  await page.click("#reveal-form button[type=submit]");
  await new Promise((r) => setTimeout(r, 700));
  await page.screenshot({ path: path.join(OUT_DIR, "05-dashboard-reveal-resultado.png") });
  console.log("OK 05-dashboard-reveal-resultado.png");
  await page.click("#reveal-cancel");

  // 6. Logout y login como viewer -> sin boton "Revelar" (RBAC tambien en UI)
  await page.click("#logout-btn");
  await new Promise((r) => setTimeout(r, 300));
  await page.evaluate(() => {
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
  });
  await page.type("#username", "viewer");
  await page.type("#password", process.env.SEED_VIEWER_PASSWORD);
  await page.click("#login-form button[type=submit]");
  await page.waitForSelector("#usuarios-tbody tr", { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: path.join(OUT_DIR, "06-dashboard-listado-viewer-sin-reveal.png") });
  console.log("OK 06-dashboard-listado-viewer-sin-reveal.png");

  // 7. Swagger UI
  await page.goto(`${BASE_URL}/docs`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(OUT_DIR, "07-swagger-docs.png"), fullPage: true });
  console.log("OK 07-swagger-docs.png");

  // 8. Health check
  await page.goto(`${BASE_URL}/health`, { waitUntil: "networkidle0" });
  await page.screenshot({ path: path.join(OUT_DIR, "08-health-check.png") });
  console.log("OK 08-health-check.png");

  await browser.close();

  // --- Evidencias de terminal (comandos reales ejecutados sobre el laboratorio) ---
  await (async () => {
    const b2 = await puppeteer.launch({ headless: "new" });
    await screenshotTerminalText(
      b2,
      "docker compose ps",
      readTextFile(path.join(process.env.TEMP, "ev_ps.txt")),
      "09-docker-compose-ps.png"
    );
    await screenshotTerminalText(
      b2,
      "npm audit (0 vulnerabilidades tras actualizar dependencias)",
      readTextFile(path.join(process.env.TEMP, "ev_audit.txt")),
      "10-npm-audit-0-vulnerabilidades.png"
    );
    await screenshotTerminalText(
      b2,
      "SELECT * FROM audit_log ORDER BY id DESC LIMIT 8;  (trazabilidad de login/reveal)",
      readTextFile(path.join(process.env.TEMP, "ev_audit_log.txt")),
      "11-audit-log-postgres.png"
    );
    await screenshotTerminalText(
      b2,
      "SELECT id, user_name, credit_card_mask, cuenta_numero_mask, pg_typeof(credit_card_enc) FROM usuarios LIMIT 5;",
      readTextFile(path.join(process.env.TEMP, "ev_db_encrypted.txt")),
      "12-db-campos-cifrados-bytea.png"
    );
    await b2.close();
  })();

  console.log("Listo. Evidencias en", OUT_DIR);
}

main().catch((err) => {
  console.error("Error generando evidencia:", err);
  process.exit(1);
});
