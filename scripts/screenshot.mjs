import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const QA_DIR = path.join(__dirname, '..', 'docs', 'qa');

const paths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];
const executablePath = paths.find(p => fs.existsSync(p));

async function run() {
  if (!executablePath) throw new Error('No browser found');
  const browser = await puppeteer.launch({ executablePath, headless: 'new' });
  const page = await browser.newPage();
  
  // iPhone 13 Pro viewport
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3 });

  console.log('Navigating to app...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

  // 1. Wardrobe (Default)
  console.log('Taking Wardrobe screenshot...');
  await page.screenshot({ path: path.join(QA_DIR, 'wardrobe.png') });

  // 2. DropOffs
  console.log('Clicking DropOffs tab...');
  await page.click('[data-testid="tab-dropoffs"]');
  await new Promise(resolve => setTimeout(resolve, 500)); // wait for transition
  console.log('Taking DropOffs screenshot...');
  await page.screenshot({ path: path.join(QA_DIR, 'dropoffs.png') });

  // 3. Stats
  console.log('Clicking Stats tab...');
  await page.click('[data-testid="tab-stats"]');
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log('Taking Stats screenshot...');
  await page.screenshot({ path: path.join(QA_DIR, 'stats.png') });

  console.log('Screenshots saved to docs/qa/!');
  await browser.close();
}

run().catch(console.error);
