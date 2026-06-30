/**
 * Asset A — real demo recorder.
 *
 * Builds the app (vite build) and serves the production bundle from a tiny
 * in-process static server, seeds IndexedDB with realistic mock data, then
 * drives the actual UI through the core loop while recording the screen via the
 * Chrome DevTools Protocol screencast. Captured frames are encoded to
 * docs/media/demo.mp4 (H.264) and docs/media/demo.gif (palette optimised) with
 * ffmpeg.
 *
 * Why the production build (not `vite dev`): dev runs under React.StrictMode,
 * which double-invokes effects and cancels the camera start() before play(),
 * leaving the catalog viewfinder black. The built app is also what users run.
 *
 * This records the REAL UI in motion — not an AI mock-up. The catalog beat uses
 * Chromium's fake camera fed a real garment image, so "snap a photo → saved"
 * shows an actual capture.
 *
 * Usage:  node scripts/record_demo.mjs
 * Env:    CHROME_PATH, FFMPEG_PATH, DEMO_PORT can override the defaults.
 */
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { execFileSync } from 'child_process';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const MEDIA_DIR = path.join(ROOT_DIR, 'docs', 'media');
const PORT = Number(process.env.DEMO_PORT || 5174);

// ---- locate chrome -------------------------------------------------------
function findChrome() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  const candidates = [
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];
  // Glob any chromium-*/chrome-linux/chrome under the Playwright browser dir.
  const pwRoot = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try {
    for (const entry of fs.readdirSync(pwRoot)) {
      if (entry.startsWith('chromium-')) {
        candidates.push(path.join(pwRoot, entry, 'chrome-linux', 'chrome'));
      }
    }
  } catch {
    /* ignore */
  }
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error('No Chrome/Chromium binary found.');
  return found;
}

// ---- locate ffmpeg (imageio static build has libx264 + gif) --------------
function findFfmpeg() {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }
  try {
    const out = execFileSync(
      'python3',
      [
        '-c',
        'import imageio_ffmpeg,sys; sys.stdout.write(imageio_ffmpeg.get_ffmpeg_exe())',
      ],
      { encoding: 'utf8' },
    ).trim();
    if (out && fs.existsSync(out)) return out;
  } catch {
    /* fall through */
  }
  return 'ffmpeg'; // hope it's on PATH
}

const CHROME = findChrome();
const FFMPEG = findFfmpeg();
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'laundristic-demo-'));
const FRAMES_DIR = path.join(TMP, 'frames');
fs.mkdirSync(FRAMES_DIR, { recursive: true });
fs.mkdirSync(MEDIA_DIR, { recursive: true });

// Fake-camera garment clip (generated alongside; regenerated if missing).
const FAKE_CAM = path.join(TMP, 'fake-camera.y4m');
function ensureFakeCamera() {
  const src = path.join(ROOT_DIR, 'public', 'mock', 'tee.png');
  execFileSync(
    FFMPEG,
    [
      '-y',
      '-loop',
      '1',
      '-i',
      src,
      '-t',
      '3',
      '-r',
      '12',
      '-vf',
      'scale=720:960:force_original_aspect_ratio=decrease,pad=720:960:(ow-iw)/2:(oh-ih)/2:color=0xF7F5F2,format=yuv420p',
      '-pix_fmt',
      'yuv420p',
      FAKE_CAM,
    ],
    { stdio: 'ignore' },
  );
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- tiny static server for the built bundle (no external process) -------
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};
function serveDist(dist, port) {
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent((req.url || '/').split('?')[0]);
    if (rel === '/') rel = '/index.html';
    let fp = path.join(dist, rel);
    if (
      !fp.startsWith(dist) ||
      !fs.existsSync(fp) ||
      fs.statSync(fp).isDirectory()
    ) {
      fp = path.join(dist, 'index.html'); // SPA fallback
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream',
    });
    fs.createReadStream(fp).pipe(res);
  });
  return new Promise((resolve) =>
    server.listen(port, '127.0.0.1', () => resolve(server)),
  );
}

// ---- seed data (mirrors generate_screenshots.mjs, + onboarded flag) ------
async function seed(page) {
  await page.evaluate(async () => {
    async function asStored(url) {
      const res = await fetch(url);
      const blob = await res.blob();
      return { buffer: await blob.arrayBuffer(), type: blob.type };
    }
    const db = await new Promise((resolve, reject) => {
      const r = indexedDB.open('laundristic', 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const clear = db.transaction(
      ['garments', 'batches', 'settings'],
      'readwrite',
    );
    clear.objectStore('garments').clear();
    clear.objectStore('batches').clear();
    clear.objectStore('settings').clear();
    await new Promise((res) => (clear.oncomplete = res));

    const tee = await asStored('/mock/tee.png');
    const hoodie = await asStored('/mock/hoodie.png');
    const shoes = await asStored('/mock/shoes.png');
    const receipt = await asStored('/mock/receipt.png');
    const now = Date.now();

    const garments = [
      {
        id: 'g-1',
        code: 'TEE-01',
        type: 'TEE',
        photo: tee,
        status: 'active',
        createdAt: now - 36e6,
      },
      {
        id: 'g-2',
        code: 'HOO-01',
        type: 'HOO',
        photo: hoodie,
        status: 'active',
        createdAt: now - 30e6,
      },
      {
        id: 'g-3',
        code: 'SHO-01',
        type: 'SHO',
        photo: shoes,
        status: 'active',
        createdAt: now - 24e6,
      },
      {
        id: 'g-4',
        code: 'TEE-02',
        type: 'TEE',
        photo: tee,
        status: 'active',
        createdAt: now - 18e6,
      },
      {
        id: 'g-5',
        code: 'HOO-02',
        type: 'HOO',
        photo: hoodie,
        status: 'active',
        createdAt: now - 12e6,
      },
      {
        id: 'g-6',
        code: 'SHO-02',
        type: 'SHO',
        photo: shoes,
        status: 'active',
        createdAt: now - 6e6,
      },
    ];
    const batches = [
      {
        id: 'b-active-01',
        shopName: 'Green Cleaners',
        date: now - 432e5,
        amountINR: 280,
        receipt,
        status: 'active',
        items: [
          { garmentId: 'g-1', state: 'out' },
          { garmentId: 'g-2', state: 'out' },
        ],
      },
      {
        id: 'b-awaiting-01',
        shopName: 'Royal Laundry',
        date: now - 1728e5,
        amountINR: 350,
        receipt,
        status: 'awaiting',
        items: [{ garmentId: 'g-3', state: 'missing' }],
      },
      {
        id: 'b-closed-01',
        shopName: 'City Wash & Fold',
        date: now - 3456e5,
        amountINR: 420,
        receipt,
        status: 'closed',
        items: [
          { garmentId: 'g-4', state: 'received' },
          { garmentId: 'g-5', state: 'received' },
        ],
      },
    ];

    const wg = db.transaction('garments', 'readwrite');
    garments.forEach((g) => wg.objectStore('garments').put(g));
    await new Promise((res) => (wg.oncomplete = res));
    const wb = db.transaction('batches', 'readwrite');
    batches.forEach((b) => wb.objectStore('batches').put(b));
    await new Promise((res) => (wb.oncomplete = res));
    const ws = db.transaction('settings', 'readwrite');
    ws.objectStore('settings').put('Green Cleaners', 'lastShop');
    ws.objectStore('settings').put(1, 'onboarded'); // skip the welcome screen
    await new Promise((res) => (ws.oncomplete = res));
    db.close();
  });
}

// ---- interaction helpers (never throw — log + continue) ------------------
async function clickByText(page, selector, text) {
  return page.evaluate(
    (sel, txt) => {
      const els = Array.from(document.querySelectorAll(sel));
      const el = els.find((e) => e.textContent && e.textContent.includes(txt));
      if (el) {
        el.click();
        return true;
      }
      return false;
    },
    selector,
    text,
  );
}
async function clickSel(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) {
      el.click();
      return true;
    }
    return false;
  }, selector);
}
async function waitText(page, text, timeout = 6000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const ok = await page.evaluate(
      (t) => document.body && document.body.innerText.includes(t),
      text,
    );
    if (ok) return true;
    await sleep(150);
  }
  return false;
}

async function run() {
  console.log('chrome :', CHROME);
  console.log('ffmpeg :', FFMPEG);
  ensureFakeCamera();

  // Build the production bundle, then serve it from an in-process static server
  // (no orphaned child process holding the port between runs).
  console.log('Building app (vite build)…');
  execFileSync('npx', ['vite', 'build'], { cwd: ROOT_DIR, stdio: 'inherit' });
  console.log(`Serving dist/ on :${PORT}…`);
  const server = await serveDist(path.join(ROOT_DIR, 'dist'), PORT);
  await sleep(400);

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--hide-scrollbars',
      '--force-color-profile=srgb',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-video-capture=${FAKE_CAM}`,
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  const url = `http://localhost:${PORT}`;

  console.log('Init DB…');
  await page.goto(url, { waitUntil: 'networkidle0' });
  console.log('Seeding…');
  await seed(page);
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(1200);

  // ---- start screencast --------------------------------------------------
  const client = await page.target().createCDPSession();
  const frames = [];
  client.on('Page.screencastFrame', async (frame) => {
    frames.push({ data: frame.data, t: frame.metadata.timestamp });
    try {
      await client.send('Page.screencastFrameAck', {
        sessionId: frame.sessionId,
      });
    } catch {
      /* ignore */
    }
  });
  await client.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 90,
    everyNthFrame: 1,
    maxWidth: 780,
    maxHeight: 1688,
  });

  // ---- demo beats --------------------------------------------------------
  console.log('1. Wardrobe');
  await clickSel(page, '[data-testid="tab-wardrobe"]');
  await sleep(2200);

  console.log('2. Catalog — snap a garment');
  let catalogued = false;
  if (await clickByText(page, 'button', 'Catalog more items')) {
    // Wait until the fake-camera viewfinder actually has decoded frames, so the
    // capture can't fire against an empty <video> (which produced a black beat).
    const camReady = await page.evaluate(async () => {
      const start = Date.now();
      while (Date.now() - start < 8000) {
        const v = document.querySelector('.catalog-video');
        if (v && v.videoWidth > 0 && !v.paused) return true;
        await new Promise((r) => setTimeout(r, 100));
      }
      return false;
    });
    await sleep(1300); // linger on the live viewfinder (garment in frame)
    if (camReady) {
      await clickSel(page, '.shutter-btn');
      const confirmed = await waitText(page, 'ITM-01', 4000);
      await sleep(1800); // linger on the auto-generated ID pill
      if (confirmed) {
        // Click the exact "Save" (not "Save & Next") so we return to the
        // Wardrobe and the new ITM-01 tile is shown — the "it's saved" payoff.
        await page.evaluate(() => {
          const b = Array.from(document.querySelectorAll('button')).find(
            (el) => (el.textContent || '').trim() === 'Save',
          );
          if (b) b.click();
        });
        catalogued = true;
        await sleep(2000); // back on Wardrobe — new ITM-01 tile appears
      }
    }
    if (!catalogued) {
      // bail out of the camera cleanly so the rest of the demo proceeds
      await clickSel(page, '.catalog-close');
      await sleep(600);
    }
  }
  if (catalogued) console.log('   captured ✓');
  else console.warn('   catalog beat skipped (camera unavailable)');

  console.log('3. Drop-off — pick items');
  await clickSel(page, '[data-testid="tab-dropoffs"]');
  await sleep(1200);
  if (await clickByText(page, '.btn-primary', 'New Drop-off')) {
    await sleep(1100);
    await page.evaluate(() => {
      const items = document.querySelectorAll('.selectable-item');
      if (items[0]) items[0].click();
      if (items[2]) items[2].click();
    });
    await sleep(1600);
    await clickSel(page, '.nav-back-btn');
    await sleep(700);
  }

  console.log('4. Check-in');
  await clickSel(page, '[data-testid="tab-dropoffs"]');
  await sleep(900);
  if (await clickByText(page, '.btn-secondary', 'Check In')) {
    await sleep(1500);
    // tick the first returned item if a per-item control exists
    await page.evaluate(() => {
      const item = document.querySelector('.checkin-item, .selectable-item');
      if (item) item.click();
    });
    await sleep(1300);
    await clickSel(page, '.nav-back-btn');
    await sleep(700);
  }

  console.log('5. Proof screen (money shot)');
  await clickSel(page, '[data-testid="tab-dropoffs"]');
  await sleep(900);
  if (await clickByText(page, '.btn-secondary', 'Proof')) {
    await sleep(2600); // linger
    await clickSel(page, '.proof-close-btn');
    await sleep(600);
  }

  console.log('6. Stats');
  await clickSel(page, '[data-testid="tab-stats"]');
  await sleep(2400);
  // nudge a final compositor frame so the closing beat is captured
  await page.evaluate(() => window.scrollBy(0, 1));
  await sleep(120);
  await page.evaluate(() => window.scrollBy(0, -1));
  await sleep(400);

  await client.send('Page.stopScreencast');
  await sleep(300);
  await browser.close();
  server.close();

  // ---- write frames + concat list ---------------------------------------
  if (frames.length === 0) throw new Error('No frames captured.');
  console.log(`Captured ${frames.length} frames. Encoding…`);
  const listLines = [];
  const MIN_T = frames[0].t;
  for (let i = 0; i < frames.length; i++) {
    const name = `f${String(i).padStart(5, '0')}.jpg`;
    fs.writeFileSync(
      path.join(FRAMES_DIR, name),
      Buffer.from(frames[i].data, 'base64'),
    );
    let dur;
    if (i < frames.length - 1) dur = frames[i + 1].t - frames[i].t;
    else dur = 1.8; // hold the final frame
    dur = Math.min(Math.max(dur, 0.02), 4); // clamp pathological gaps
    listLines.push(`file '${name}'`);
    listLines.push(`duration ${dur.toFixed(3)}`);
  }
  // concat-demuxer quirk: repeat last file so its duration is honoured
  listLines.push(`file 'f${String(frames.length - 1).padStart(5, '0')}.jpg'`);
  const concatPath = path.join(FRAMES_DIR, 'concat.txt');
  fs.writeFileSync(concatPath, listLines.join('\n'));
  const totalDur = frames[frames.length - 1].t - MIN_T;
  console.log(`Timeline ≈ ${totalDur.toFixed(1)}s`);

  const mp4 = path.join(MEDIA_DIR, 'demo.mp4');
  const gif = path.join(MEDIA_DIR, 'demo.gif');
  const palette = path.join(FRAMES_DIR, 'palette.png');

  // MP4 — H.264, 540px wide
  execFileSync(
    FFMPEG,
    [
      '-y',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      concatPath,
      '-vf',
      'fps=24,scale=540:-2:flags=lanczos,format=yuv420p',
      '-c:v',
      'libx264',
      '-crf',
      '24',
      '-preset',
      'medium',
      '-movflags',
      '+faststart',
      mp4,
    ],
    { stdio: 'inherit' },
  );

  // GIF — two-pass palette, 300px wide
  const GIF_FPS = 14;
  const GIF_W = 300;
  execFileSync(
    FFMPEG,
    [
      '-y',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      concatPath,
      '-vf',
      `fps=${GIF_FPS},scale=${GIF_W}:-2:flags=lanczos,palettegen=stats_mode=diff`,
      palette,
    ],
    { stdio: 'inherit' },
  );
  execFileSync(
    FFMPEG,
    [
      '-y',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      concatPath,
      '-i',
      palette,
      '-lavfi',
      `fps=${GIF_FPS},scale=${GIF_W}:-2:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle`,
      gif,
    ],
    { stdio: 'inherit' },
  );

  const mb = (p) => (fs.statSync(p).size / 1024 / 1024).toFixed(2);
  console.log(`\n✓ demo.mp4  ${mb(mp4)} MB`);
  console.log(`✓ demo.gif  ${mb(gif)} MB  (target ≤ 8 MB)`);
  console.log(`  frames dir: ${FRAMES_DIR}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
