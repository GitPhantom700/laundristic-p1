import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const paths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];
const executablePath = paths.find((p) => fs.existsSync(p));

async function run() {
  if (!executablePath) throw new Error('No browser found');
  const browser = await puppeteer.launch({ executablePath, headless: 'new' });
  const page = await browser.newPage();

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3 });

  console.log('Navigating to app...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

  // Click "New Garment" button
  console.log('Clicking New Garment...');
  const newGarmentBtn = await page.$('.btn-primary');
  await newGarmentBtn.click();

  await new Promise((r) => setTimeout(r, 1000));

  console.log('Taking Catalog screenshot...');
  await page.screenshot({ path: 'catalog_screenshot.png' });

  await browser.close();
}
run().catch(console.error);
