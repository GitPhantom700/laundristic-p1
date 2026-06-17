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
  const browser = await puppeteer.launch({ 
    executablePath, 
    headless: 'new',
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream'
    ]
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3 });
  
  await page.goto('http://localhost:5173');
  
  // Wait for the app to load
  await new Promise(r => setTimeout(r, 1000));
  
  // Click "New Garment" button
  const newGarmentBtn = await page.$('.btn-primary');
  await newGarmentBtn.click();
  
  // Wait for the camera stream to initialize
  await new Promise(r => setTimeout(r, 2000));
  
  await page.screenshot({ path: 'camera_stream_screenshot.png' });
  
  await browser.close();
}
run().catch(console.error);
