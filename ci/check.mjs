// Connects to the running desktop app over CDP, loads key pages, screenshots them, fails on a blank/crashed page.
import { chromium } from "playwright-core";
const os = process.argv[2];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let browser;
for (let i = 0; i < 60 && !browser; i++) {
  try { browser = await chromium.connectOverCDP("http://127.0.0.1:9222"); } catch { await wait(2000); }
}
if (!browser) throw new Error("app never opened a debug port");
let page;
for (let i = 0; i < 30 && !page; i++) {
  page = browser.contexts().flatMap((c) => c.pages()).find((p) => p.url().startsWith("http://127.0.0.1"));
  if (!page) await wait(1000);
}
if (!page) throw new Error("no app window found");
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
console.log("origin", page.url());
let fail = false;
for (const route of ["/", "/swap", "/launchpad", "/download"]) {
  await page.evaluate((r) => { location.hash = "#" + r; }, route);
  await wait(8000);
  const text = (await page.evaluate(() => document.body.innerText)).trim();
  const name = route === "/" ? "home" : route.slice(1);
  await page.screenshot({ path: `shots/${os}-${name}.png` });
  const ok = text.length > 200 && !/Something went wrong|Application error/i.test(text);
  console.log(`${ok ? "PASS" : "FAIL"} ${route} (${text.length} chars)`);
  if (!ok) fail = true;
}
if (errors.length) console.log("page errors:\n" + errors.slice(0, 10).join("\n"));
process.exit(fail ? 1 : 0);
