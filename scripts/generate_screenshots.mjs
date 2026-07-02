import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const GALLERY_DIR = path.join(ROOT_DIR, 'gallery');

if (!fs.existsSync(GALLERY_DIR)) {
  fs.mkdirSync(GALLERY_DIR, { recursive: true });
}

const paths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
];
// Glob any chromium-*/chrome-linux/chrome under the Playwright browser dir
// (matches how scripts/record_demo.mjs locates a Linux Chromium build).
const pwRoot = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
try {
  for (const entry of fs.readdirSync(pwRoot)) {
    if (entry.startsWith('chromium-')) {
      paths.push(path.join(pwRoot, entry, 'chrome-linux', 'chrome'));
    }
  }
} catch {
  /* ignore */
}
const executablePath =
  process.env.CHROME_PATH || paths.find((p) => fs.existsSync(p));

if (!executablePath) {
  console.error('No browser found!');
  process.exit(1);
}

// Start dev server
console.log('Starting Vite dev server...');
const viteProcess = spawn('npx', ['vite', '--port', '5173'], {
  cwd: ROOT_DIR,
  shell: true,
});

viteProcess.stdout.on('data', (data) => {
  console.log(`Vite: ${data.toString().trim()}`);
});

viteProcess.stderr.on('data', (data) => {
  console.error(`Vite Error: ${data.toString().trim()}`);
});

// Wait for port 5173 to be open
async function waitPort(port, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.request(
          { port, host: 'localhost', method: 'GET' },
          (res) => {
            resolve();
          },
        );
        req.on('error', reject);
        req.end();
      });
      console.log(`Dev server is ready on port ${port}`);
      return;
    } catch (e) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error('Port not ready in time');
}

async function run() {
  await waitPort(5173);

  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
    ],
  });

  const page = await browser.newPage();

  // iphone 13/14 Pro style viewport for mobile views
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3 });

  // Load the app page first to initialize database schema
  console.log('Navigating to app to initialize DB...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

  // Seed data inside the browser using transactions instead of deleting the DB (which blocks)
  console.log('Seeding IndexedDB with populated mock data...');
  await page.evaluate(async () => {
    async function fetchAsStoredBlob(url) {
      const res = await fetch(url);
      const blob = await res.blob();
      const buffer = await blob.arrayBuffer();
      return { buffer, type: blob.type };
    }

    const DB_NAME = 'laundristic';
    const DB_VERSION = 1;

    // Open existing DB (already initialized by the app)
    const dbRequest = indexedDB.open(DB_NAME, DB_VERSION);
    const db = await new Promise((resolve, reject) => {
      dbRequest.onsuccess = () => resolve(dbRequest.result);
      dbRequest.onerror = () => reject(dbRequest.error);
    });

    // Clear existing stores using a transaction
    const tx = db.transaction(['garments', 'batches', 'settings'], 'readwrite');
    tx.objectStore('garments').clear();
    tx.objectStore('batches').clear();
    tx.objectStore('settings').clear();
    await new Promise((resolve) => (tx.oncomplete = resolve));

    // Fetch and prepare mock assets
    const teeBlob = await fetchAsStoredBlob('/mock/tee.png');
    const hoodieBlob = await fetchAsStoredBlob('/mock/hoodie.png');
    const shoesBlob = await fetchAsStoredBlob('/mock/shoes.png');
    const receiptBlob = await fetchAsStoredBlob('/mock/receipt.png');

    const now = Date.now();

    // Prepare garments — every item uses the catch-all ITM type/code, matching
    // the current no-category catalog flow (category selection was removed).
    const garments = [
      {
        id: 'g-1',
        code: 'ITM-01',
        type: 'ITM',
        photo: teeBlob,
        status: 'active',
        createdAt: now - 36000000,
      },
      {
        id: 'g-2',
        code: 'ITM-02',
        type: 'ITM',
        photo: hoodieBlob,
        status: 'active',
        createdAt: now - 30000000,
      },
      {
        id: 'g-3',
        code: 'ITM-03',
        type: 'ITM',
        photo: shoesBlob,
        status: 'active',
        createdAt: now - 24000000,
      },
      {
        id: 'g-4',
        code: 'ITM-04',
        type: 'ITM',
        photo: teeBlob,
        status: 'active',
        createdAt: now - 18000000,
      },
      {
        id: 'g-5',
        code: 'ITM-05',
        type: 'ITM',
        photo: hoodieBlob,
        status: 'active',
        createdAt: now - 12000000,
      },
      {
        id: 'g-6',
        code: 'ITM-06',
        type: 'ITM',
        photo: teeBlob,
        status: 'active',
        createdAt: now - 6000000,
      },
    ];

    // Prepare batches
    const batches = [
      {
        id: 'b-active-01',
        shopName: 'Green Cleaners',
        date: now - 43200000, // 12h ago
        amountINR: 280,
        receipt: receiptBlob,
        status: 'active',
        items: [
          { garmentId: 'g-1', state: 'out' },
          { garmentId: 'g-2', state: 'out' },
        ],
      },
      {
        id: 'b-awaiting-01',
        shopName: 'Royal Laundry',
        date: now - 172800000, // 2 days ago
        amountINR: 350,
        receipt: receiptBlob,
        status: 'awaiting',
        items: [{ garmentId: 'g-3', state: 'missing' }],
      },
      {
        id: 'b-closed-01',
        shopName: 'City Wash & Fold',
        date: now - 345600000, // 4 days ago
        amountINR: 420,
        receipt: receiptBlob,
        status: 'closed',
        items: [
          { garmentId: 'g-4', state: 'received' },
          { garmentId: 'g-5', state: 'received' },
        ],
      },
    ];

    // Put garments
    const writeTx1 = db.transaction('garments', 'readwrite');
    for (const g of garments) {
      writeTx1.objectStore('garments').put(g);
    }
    await new Promise((resolve) => (writeTx1.oncomplete = resolve));

    // Put batches
    const writeTx2 = db.transaction('batches', 'readwrite');
    for (const b of batches) {
      writeTx2.objectStore('batches').put(b);
    }
    await new Promise((resolve) => (writeTx2.oncomplete = resolve));

    // Put settings
    const writeTx3 = db.transaction('settings', 'readwrite');
    writeTx3.objectStore('settings').put('Green Cleaners', 'lastShop');
    writeTx3.objectStore('settings').put(1, 'onboarded'); // skip the welcome screen
    await new Promise((resolve) => (writeTx3.oncomplete = resolve));

    db.close();
  });

  // Reload the app to make sure it reads seeded DB
  console.log('Reloading app with seeded DB...');
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));

  // Temporary raw screenshots storage
  const rawScreenshots = {};

  // 1. Proof screen (awaiting batch receipt proof)
  console.log('Capturing Screen 1: Proof screen...');
  await page.click('[data-testid="tab-dropoffs"]');
  await new Promise((r) => setTimeout(r, 800));
  // Find "Proof" button for awaiting batch
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.btn-secondary'));
    const proofBtn = btns.find(
      (b) => b.textContent && b.textContent.includes('Proof'),
    );
    if (proofBtn) proofBtn.click();
  });
  await new Promise((r) => setTimeout(r, 1000));
  rawScreenshots['proof'] = await page.screenshot({ encoding: 'base64' });

  // Close proof screen
  await page.evaluate(() => {
    const closeBtn = document.querySelector('.proof-close-btn');
    if (closeBtn) closeBtn.click();
  });
  await new Promise((r) => setTimeout(r, 500));

  // 2. Receipt PDF
  console.log('Capturing Screen 2: Receipt PDF Viewer...');
  const pdfFramePage = await browser.newPage();
  await pdfFramePage.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
  });

  // Use HTML to render a beautiful iOS-style PDF Viewer containing the receipt PDF
  const dateString = new Date(Date.now() - 345600000).toLocaleDateString(
    'en-IN',
    {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    },
  );

  // Load standard assets as base64 inside the frame
  const receiptBase64 = fs.readFileSync(
    path.join(ROOT_DIR, 'public', 'mock', 'receipt.png'),
    'base64',
  );
  const teeBase64 = fs.readFileSync(
    path.join(ROOT_DIR, 'public', 'mock', 'tee.png'),
    'base64',
  );
  const hoodieBase64 = fs.readFileSync(
    path.join(ROOT_DIR, 'public', 'mock', 'hoodie.png'),
    'base64',
  );

  await pdfFramePage.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            margin: 0;
            padding: 0;
            background-color: #525659;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #333;
            display: flex;
            flex-direction: column;
            height: 100vh;
            overflow: hidden;
          }
          .pdf-nav {
            background-color: #1c1c1e;
            color: white;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            font-size: 0.95rem;
            font-weight: 500;
            border-bottom: 1px solid #2c2c2e;
            box-shadow: 0 1px 4px rgba(0,0,0,0.3);
          }
          .pdf-nav .done {
            color: #698f6e;
            font-weight: 600;
            cursor: pointer;
          }
          .pdf-nav .title {
            max-width: 60%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: 0.9rem;
            color: #e5e5ea;
          }
          .pdf-nav .share {
            font-size: 1.2rem;
            cursor: pointer;
          }
          .pdf-content-scroll {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            justify-content: center;
          }
          .pdf-sheet {
            background: white;
            width: 100%;
            max-width: 358px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            padding: 24px 20px;
            box-sizing: border-box;
            border-radius: 4px;
          }
          h1 {
            font-size: 1.5rem;
            font-weight: 700;
            margin: 0 0 16px 0;
            letter-spacing: -0.5px;
          }
          .shop-title {
            font-size: 1.1rem;
            font-weight: 600;
            margin: 0;
          }
          .date {
            font-size: 0.85rem;
            color: #666;
            margin: 4px 0 12px 0;
          }
          .total {
            font-size: 1rem;
            font-weight: 700;
            margin-bottom: 16px;
          }
          hr {
            border: 0;
            border-top: 1px solid #ddd;
            margin: 16px 0;
          }
          .section-title {
            font-size: 0.9rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #555;
            margin: 0 0 12px 0;
          }
          .receipt-img {
            width: 100%;
            max-height: 180px;
            object-fit: cover;
            border-radius: 6px;
            border: 1px solid #eee;
            margin-bottom: 8px;
          }
          .garment-row {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 10px;
          }
          .garment-img {
            width: 36px;
            height: 36px;
            border-radius: 6px;
            object-fit: cover;
            border: 1px solid #eee;
            background: #fafafa;
          }
          .garment-code {
            font-size: 0.9rem;
            font-weight: 600;
          }
          .garment-type {
            font-size: 0.75rem;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="pdf-nav">
          <span class="done">Done</span>
          <span class="title">laundristic-receipt-city-wash.pdf</span>
          <span class="share">📤</span>
        </div>
        <div class="pdf-content-scroll">
          <div class="pdf-sheet">
            <h1>Laundry Receipt</h1>
            <div class="shop-title">City Wash & Fold</div>
            <div class="date">${dateString}</div>
            <div class="total">Total: INR 420</div>
            <hr />
            <div class="section-title">Receipt Photo</div>
            <img class="receipt-img" src="data:image/png;base64,${receiptBase64}" />
            <hr />
            <div class="section-title">Garments (2)</div>
            <div class="garment-row">
              <img class="garment-img" src="data:image/png;base64,${teeBase64}" />
              <div>
                <div class="garment-code">ITM-04</div>
                <div class="garment-type">Item</div>
              </div>
            </div>
            <div class="garment-row">
              <img class="garment-img" src="data:image/png;base64,${hoodieBase64}" />
              <div>
                <div class="garment-code">ITM-05</div>
                <div class="garment-type">Item</div>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `);

  await new Promise((r) => setTimeout(r, 500));
  rawScreenshots['receipt'] = await pdfFramePage.screenshot({
    encoding: 'base64',
  });
  await pdfFramePage.close();

  // 3. Wardrobe (populated)
  console.log('Capturing Screen 3: Wardrobe (populated)...');
  await page.click('[data-testid="tab-wardrobe"]');
  await new Promise((r) => setTimeout(r, 800));
  rawScreenshots['wardrobe'] = await page.screenshot({ encoding: 'base64' });

  // 4. Drop-off sheet (select items screen)
  console.log('Capturing Screen 4: Drop-off sheet...');
  await page.click('[data-testid="tab-dropoffs"]');
  await new Promise((r) => setTimeout(r, 800));

  // Click "New Drop-off"
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.btn-primary'));
    const newBtn = btns.find(
      (b) => b.textContent && b.textContent.includes('New Drop-off'),
    );
    if (newBtn) newBtn.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  // Click first two items in grid to select them
  await page.evaluate(() => {
    const items = document.querySelectorAll('.selectable-item');
    if (items[0]) items[0].click();
    if (items[1]) items[1].click();
  });
  await new Promise((r) => setTimeout(r, 500));
  rawScreenshots['dropoff'] = await page.screenshot({ encoding: 'base64' });

  // Close dropoff sheet
  await page.evaluate(() => {
    const backBtn = document.querySelector('.nav-back-btn');
    if (backBtn) backBtn.click();
  });
  await new Promise((r) => setTimeout(r, 500));

  // 5. Check-in sheet
  console.log('Capturing Screen 5: Check-in sheet...');
  await page.click('[data-testid="tab-dropoffs"]');
  await new Promise((r) => setTimeout(r, 800));

  // Click "Check In" button for active batch
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.btn-secondary'));
    const checkinBtn = btns.find(
      (b) => b.textContent && b.textContent.includes('Check In'),
    );
    if (checkinBtn) checkinBtn.click();
  });
  await new Promise((r) => setTimeout(r, 1000));
  rawScreenshots['checkin'] = await page.screenshot({ encoding: 'base64' });

  // Close checkin sheet
  await page.evaluate(() => {
    const backBtn = document.querySelector('.nav-back-btn');
    if (backBtn) backBtn.click();
  });
  await new Promise((r) => setTimeout(r, 500));

  // 6. Stats screen
  console.log('Capturing Screen 6: Stats...');
  await page.click('[data-testid="tab-stats"]');
  await new Promise((r) => setTimeout(r, 1000));
  rawScreenshots['stats'] = await page.screenshot({ encoding: 'base64' });

  // 7. Settings screen (backup/restore — referenced by USER_GUIDE.md)
  console.log('Capturing Screen 7: Settings...');
  await page.click('[data-testid="tab-settings"]');
  await new Promise((r) => setTimeout(r, 800));
  rawScreenshots['settings'] = await page.screenshot({ encoding: 'base64' });

  // Framer page definition
  console.log('Framing all screenshots inside premium device mockup...');
  const framerPage = await browser.newPage();
  await framerPage.setViewport({
    width: 800,
    height: 1200,
    deviceScaleFactor: 2,
  });

  for (const name of [
    'proof',
    'receipt',
    'wardrobe',
    'dropoff',
    'checkin',
    'stats',
    'settings',
  ]) {
    console.log(`Framing ${name}...`);
    const screenshotBase64 = rawScreenshots[name];

    await framerPage.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              margin: 0;
              padding: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              width: 800px;
              height: 1200px;
              background-color: #EAF0EA; /* Pale sage */
              overflow: hidden;
            }
            .device-container {
              position: relative;
              width: 440px;
              height: 900px;
              background: #18181b;
              border-radius: 56px;
              box-shadow: 
                0 30px 60px -15px rgba(0, 0, 0, 0.25),
                0 0 0 12px #27272a,
                0 0 0 14px #09090b,
                0 25px 50px rgba(78, 110, 82, 0.15); /* Tinted shadow */
              padding: 12px;
              box-sizing: border-box;
            }
            .device-screen {
              position: relative;
              width: 100%;
              height: 100%;
              border-radius: 44px;
              overflow: hidden;
              background: white;
              box-shadow: inset 0 0 10px rgba(0,0,0,0.8);
            }
            .device-screen img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .device-island {
              position: absolute;
              top: 20px;
              left: 50%;
              transform: translateX(-50%);
              width: 110px;
              height: 28px;
              background: #09090b;
              border-radius: 14px;
              z-index: 100;
              box-shadow: inset 0 0 4px rgba(255,255,255,0.1);
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 0 18px;
              box-sizing: border-box;
            }
            .device-lens {
              width: 10px;
              height: 10px;
              background: #18181b;
              border-radius: 50%;
              box-shadow: inset 0 0 3px rgba(255,255,255,0.3);
            }
            .device-sensor {
              width: 6px;
              height: 6px;
              background: #09090b;
              border-radius: 50%;
            }
          </style>
        </head>
        <body>
          <div class="device-container">
            <div class="device-island">
              <div class="device-lens"></div>
              <div class="device-sensor"></div>
            </div>
            <div class="device-screen">
              <img src="data:image/png;base64,${screenshotBase64}" />
            </div>
          </div>
        </body>
      </html>
    `);

    await new Promise((r) => setTimeout(r, 600)); // Let the image render completely
    await framerPage.screenshot({
      path: path.join(GALLERY_DIR, `${name}.png`),
      type: 'png',
    });
  }

  await framerPage.close();
  await browser.close();
  viteProcess.kill('SIGINT');

  console.log('Screenshots successfully generated and saved to gallery/!');
}

run().catch((err) => {
  console.error(err);
  viteProcess.kill('SIGINT');
  process.exit(1);
});
