import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const possiblePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

let executablePath = null;
for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    executablePath = p;
    break;
  }
}

if (!executablePath) {
  console.error('Could not find Chrome or Edge');
  process.exit(1);
}

const outDir = path.join(process.cwd(), 'docs', 'qa');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({
    executablePath,
    defaultViewport: {
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true,
    },
    headless: 'new',
  });

  const page = await browser.newPage();

  console.log('Navigating to app...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

  console.log('Capturing Wardrobe...');
  await page.screenshot({ path: path.join(outDir, '01_wardrobe.png') });

  console.log('Navigating to Drop-offs...');
  await page.click('button:nth-child(2)'); // Assumes bottom nav 2nd button is dropoffs
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(outDir, '02_dropoffs.png') });

  console.log('Navigating to Stats...');
  await page.click('button:nth-child(3)'); // Assumes bottom nav 3rd button is stats
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(outDir, '03_stats.png') });

  console.log('Navigating to Settings...');
  await page.click('button:nth-child(4)'); // Assumes bottom nav 4th button is settings
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(outDir, '04_settings.png') });

  await browser.close();
  console.log('QA screenshots saved to docs/qa/');
})();
