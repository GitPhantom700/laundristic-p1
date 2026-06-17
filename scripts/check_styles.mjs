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
  const browser = await puppeteer.launch({ executablePath, headless: 'new' });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173');
  
  // Open Catalog
  const newGarmentBtn = await page.$('.btn-primary');
  await newGarmentBtn.click();
  await new Promise(r => setTimeout(r, 1000));
  
  // Evaluate styles
  const styles = await page.evaluate(() => {
    const svg = document.querySelector('.catalog-close svg');
    const line = document.querySelector('.catalog-close svg line');
    
    if (!svg || !line) return 'Elements not found';
    
    const svgStyle = window.getComputedStyle(svg);
    const lineStyle = window.getComputedStyle(line);
    
    return {
      svg: {
        width: svgStyle.width,
        height: svgStyle.height,
        display: svgStyle.display,
        visibility: svgStyle.visibility,
        opacity: svgStyle.opacity,
        stroke: svgStyle.stroke,
        color: svgStyle.color,
      },
      line: {
        stroke: lineStyle.stroke,
        display: lineStyle.display,
        visibility: lineStyle.visibility,
      }
    };
  });
  
  console.log(JSON.stringify(styles, null, 2));
  await browser.close();
}
run().catch(console.error);
