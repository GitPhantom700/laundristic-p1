import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const paths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
];
const executablePath = paths.find((p) => fs.existsSync(p));

(async () => {
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
    ],
  });
  const page = await browser.newPage();

  // Forward browser console logs to Node console
  page.on('console', (msg) => console.log('BROWSER:', msg.text()));

  // Mobile viewport
  await page.setViewport({ width: 390, height: 844 });

  // a. Load http://localhost:5173
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

  // b. Click "Catalog item" button on the empty Wardrobe page
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.btn-primary'));
    const catalogBtn = btns.find(
      (b) => b.textContent && b.textContent.includes('Catalog item'),
    );
    if (catalogBtn) {
      catalogBtn.click();
    } else {
      console.error('BROWSER: Catalog item button not found!');
    }
  });

  // c. Wait 1 second, then click the .shutter-btn button to capture a fake frame
  await new Promise((r) => setTimeout(r, 1000));
  await page.click('.shutter-btn');

  // d. Wait 1 second, then click a category button (.category-btn)
  await new Promise((r) => setTimeout(r, 1000));
  await page.click('.category-btn');

  // e. Wait 1 second, then click the "Save" button to persist the item
  await new Promise((r) => setTimeout(r, 1000));
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.btn-primary'));
    const saveBtn = btns.find(
      (b) => b.textContent && b.textContent.trim() === 'Save',
    );
    if (saveBtn) {
      saveBtn.click();
    } else {
      console.error('BROWSER: Save button not found!');
    }
  });

  // f. Wait 1 second, then navigate to the Drop-offs tab by clicking the bottom nav tab button [data-testid="tab-dropoffs"]
  await new Promise((r) => setTimeout(r, 1000));
  await page.click('[data-testid="tab-dropoffs"]');

  // g. Wait 1 second, then click the "New Drop-off" button
  await new Promise((r) => setTimeout(r, 1000));
  await page.evaluate(() => {
    console.log('BROWSER: Clicking New Drop-off');
    const btns = Array.from(document.querySelectorAll('.btn-primary'));
    const newBtn = btns.find((b) => b.textContent.includes('New Drop-off'));
    if (newBtn) {
      newBtn.click();
    } else {
      console.error('BROWSER: New Drop-off button not found!');
    }
  });

  // h. Wait 1 second, then click on the garment card (.selectable-item) to select it
  await new Promise((r) => setTimeout(r, 1000));
  await page.evaluate(() => {
    console.log('BROWSER: Selecting mock garment...');
    const item = document.querySelector('.selectable-item');
    if (item) {
      item.click();
      console.log('BROWSER: Clicked selectable item');
    } else {
      console.error('BROWSER: No selectable items found!');
      console.log('BROWSER: Document HTML:', document.body.innerHTML);
    }
  });

  // i. Wait 1 second, then click "Next" button
  await new Promise((r) => setTimeout(r, 1000));
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.btn-primary'));
    const nextBtn = btns.find((b) => b.textContent.includes('Next'));
    if (nextBtn) nextBtn.click();
  });

  // j. Wait 1 second, then fill in the Shop Name and Amount fields using Puppeteer's native type API
  await new Promise((r) => setTimeout(r, 1000));
  await page.type('input[placeholder="e.g. Wash & Fold"]', 'Cleaners');
  await page.type('input[placeholder="0"]', '150');

  // k. Wait 1 second, then click the "Next" button on the Details sheet
  await new Promise((r) => setTimeout(r, 1000));
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.btn-primary'));
    const nextBtn = btns.find((b) => b.textContent.includes('Next'));
    if (nextBtn) {
      console.log('BROWSER: Clicking Next on Details sheet');
      nextBtn.click();
    } else {
      console.error('BROWSER: Next button on Details sheet not found!');
    }
  });

  // l. Wait 2 seconds, then take a screenshot receipt_camera_test.png and close the browser
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({ path: 'receipt_camera_test.png' });

  await browser.close();
  console.log('Saved receipt_camera_test.png');
})();
