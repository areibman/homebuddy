import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '/Users/hyperbox/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const base = process.env.HOMEBUDDY_URL || 'http://localhost:3000';
const output = '/Users/hyperbox/homebuddy/.firecrawl/city-integration';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-webgl'],
});
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(90000);
  page.on('pageerror', error => errors.push(error.message));
  const cityReady = async () => {
    await page.locator('.city-explorer').waitFor({ state: 'visible' });
    await page.locator('.home-pin').first().waitFor({ state: 'visible' });
    await page.locator('.map-loading').waitFor({ state: 'hidden' });
    assert.equal(await page.locator('.home-pin').count(), 20);
    await page.waitForFunction(() => document.querySelector('.home-pin')?.style.left);
  };
  const pixels = async () => page.locator('.city-canvas canvas').evaluate(canvas => {
    const gl = canvas.getContext('webgl2');
    const values = new Set();
    const pixel = new Uint8Array(4);
    for (let x = 1; x < 8; x++) for (let y = 1; y < 8; y++) {
      gl.readPixels(canvas.width * x / 8, canvas.height * y / 8, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      values.add([...pixel].join(','));
    }
    return { width: canvas.width, height: canvas.height, colors: values.size };
  });
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await cityReady();
  assert.match(await page.title(), /Homebuddy/);
  const desktop = await pixels();
  assert(desktop.colors > 3, 'Desktop city canvas has varied, nonblank pixels');
  await page.screenshot({ path: output + '/desktop.png', animations: 'disabled' });
  await page.locator('.home-pin[data-id="13"]').hover();
  await page.getByRole('button', { name: 'Explore this home', exact: true }).waitFor();
  assert.match(await page.locator('.preview-details h2').innerText(), /Spera/);
  await page.waitForFunction(() => document.querySelector('.preview-image img')?.naturalWidth > 0);
  await page.screenshot({ path: output + '/hover.png', animations: 'disabled' });
  await page.getByRole('button', { name: 'Explore this home', exact: true }).click();
  await page.getByRole('link', { name: 'Decorate this home' }).click();
  await page.waitForURL(base + '/decorate?home=13&plan=0');
  await page.locator('.room-canvas canvas').waitFor();
  assert.equal(await page.locator('.library-link').getAttribute('href'), '/catalog');
  console.log('PASS: city selection opens the existing Spera apartment editor');
  await page.locator('.library-link').click();
  await page.waitForURL(base + '/catalog');
  await page.locator('.object-grid').waitFor();
  assert((await page.locator('.object-card').count()) >= 10);
  await page.locator('header .brand').click();
  await page.waitForURL(base + '/');
  await cityReady();
  console.log('PASS: editor -> furniture catalog -> city navigation');
  await page.locator('.home-pin[data-id="01"]').click();
  await page.locator('.viewer').waitFor();
  assert.equal(await page.locator('#viewer-title').innerText(), '119 Ellert St');
  await page.waitForFunction(() => document.querySelector('.plan-scroll img')?.naturalWidth > 0);
  await page.getByRole('button', { name: 'Zoom floor plan in', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.plan-tools>span')?.textContent === '125%');
  await page.getByRole('link', { name: 'Decorate this home' }).click();
  await page.waitForURL(base + '/decorate?home=01&plan=0');
  await page.getByRole('heading', { name: 'Decorate your floor plan' }).waitFor();
  assert.equal(await page.locator('.plan-editor-nav strong').innerText(), '119 Ellert St');
  await page.locator('.plan-inventory button').first().click();
  assert.equal(await page.locator('.plan-piece').count(), 1);
  await page.getByRole('button', { name: 'Rotate 45°' }).click();
  assert.match(await page.locator('.plan-piece').getAttribute('style'), /rotate\(45deg\)/);
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  assert.equal(await page.locator('.plan-piece').count(), 0);
  await page.getByRole('link', { name: 'Choose a home' }).click();
  await cityReady();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  const mobile = await pixels();
  assert(mobile.colors > 3, 'Mobile city canvas has varied, nonblank pixels');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: output + '/mobile.png', animations: 'disabled' });
  const before = await page.locator('.city-canvas canvas').evaluate(canvas => canvas.toDataURL());
  await page.getByRole('button', { name: 'Zoom map in', exact: true }).click();
  await page.waitForFunction(before => document.querySelector('.city-canvas canvas').toDataURL() !== before, before);
  console.log('PASS: original floor plan, plan zoom, mobile rendering, and interactive map zoom');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ desktop, mobile, errors }));
} finally {
  await browser.close();
}
