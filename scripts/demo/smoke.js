// Smoke test: load every route in a phone viewport, screenshot it, collect console errors.
const { chromium } = require('playwright');
const path = require('path');

const BASE = process.env.BASE_URL || 'http://localhost:8081';
const OUT = path.join(__dirname, 'shots');
const ROUTES = ['/', '/wallets', '/savings', '/stats', '/transaction', '/transactions', '/wallet/edit', '/goal/edit', '/budget/edit', '/settings'];
const scheme = process.argv[2] || 'light';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(`[console] ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  for (const r of ROUTES) {
    await page.goto(BASE + r, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const name = (r === '/' ? 'home' : r.slice(1).replace(/\//g, '_')) + `_${scheme}.png`;
    await page.screenshot({ path: path.join(OUT, name) });
  }
  console.log(errors.length ? errors.join('\n') : 'NO_ERRORS');
  await browser.close();
})();
