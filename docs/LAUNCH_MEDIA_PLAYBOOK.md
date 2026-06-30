# Laundristic — Launch Media Playbook

Everything needed to produce the public-launch media + README, grounded in the
5 studied repos (Immich, Actual Budget, Excalidraw, ExpenseOwl, Ghostfolio) and
Laundristic's real brand.

> **Status (live):** Assets **A, B1, B2, C, D1** are produced; the README hero,
> screenshot gallery, and demo are wired in; the SEO/meta pass (§7) is done in-repo
> (OG/Twitter tags + `og-cover.png`, with a placeholder deploy URL to swap).
> **D2 (NotebookLM deep dive)** is in progress. Remaining: swap the deploy URL,
> the manual GitHub-UI items (§7), and the pre-public scrub (§8). See `PROGRESS.md`.

## Brand constants (paste into every AI prompt)

> Palette: warm off-white paper `#FAFAF9`, dark sage green `#4E6E52` (primary),
> soft sage `#698F6E` / `#A3BFA6`, pale sage `#EAF0EA`, dark-stone text `#292524`.
> Type: **Fraunces** (serif display) + **Hanken Grotesk** (sans body).
> Mood: calm, minimal, editorial, tactile, "quiet software", soft shadows,
> rounded corners, **light-mode only**. Subject world: laundry, folded garments,
> paper receipts. No people, no text in AI images (add type yourself).

---

## 1. Asset register

| #   | Asset              | Tool                                            | Output spec                             | Repo path                                                     | README slot                         | Status                                                          |
| --- | ------------------ | ----------------------------------------------- | --------------------------------------- | ------------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------- |
| A   | Demo GIF + MP4     | Real screen capture (`scripts/record_demo.mjs`) | GIF ≤8 MB, ~300px wide loop · MP4 H.264 | `docs/media/demo.gif` + `docs/media/demo.mp4`                 | Hero, right under tagline           | ✅ done                                                         |
| B1  | Hero banner        | Imagen 4 (Gemini)                               | 1280×400 PNG → WebP                     | `docs/media/hero-with-text.webp`                              | Top, above title                    | ✅ done                                                         |
| B2  | Social/OG card     | Imagen 4 + Figma/Canva text                     | 1280×640 PNG → WebP                     | `docs/media/social-og-with-text.webp` + `public/og-cover.png` | meta tags + GitHub social preview   | ✅ image + meta tags; preview upload is a manual GitHub-UI step |
| C   | Screenshot gallery | Real capture + device frames                    | 6 framed PNGs, ~480px each              | `gallery/*.png`                                               | "Screenshots" section (`<details>`) | ✅ done                                                         |
| D1  | Veo promo clip     | Veo 3 (Flow)                                    | 1080p MP4, ~8s                          | not in repo — LinkedIn                                        | optional embed                      | ✅ done                                                         |
| D2  | Deep-dive          | NotebookLM                                      | shared link (audio + video)             | not in repo                                                   | "📻 Deep dive" link                 | ⏳ in progress                                                  |

**Conventions:** put README media in `docs/media/`. Keep the repo light — host the
**MP4** by drag-dropping it into the GitHub README editor (stored on
`user-images.githubusercontent.com`, not committed) when a heavier capture is
needed; the committed `demo.gif`/`demo.mp4` here are already small (~1 MB / ~0.4 MB).
`og:image` must be an **absolute deployed URL** (e.g. `https://<amplify-url>/og-cover.png`).

---

## 2. Asset A — Real demo (GIF + MP4) ← highest impact ✅

**Why real, not Veo:** Veo can't render the actual UI; an AI "demo" would show a
fake app. We capture the real thing.

**How it's produced now:** `scripts/record_demo.mjs` (Puppeteer + CDP screencast).
It builds the app and serves the **production bundle** from an in-process static
server (not `vite dev` — dev's `React.StrictMode` double-invokes the camera
effect and blacks out the viewfinder), seeds IndexedDB with realistic mock data
(garments, an active/awaiting/closed batch, one missing item), then drives the
live UI while recording, and encodes frames to MP4 + GIF with ffmpeg.

```bash
npm run media:demo   # → docs/media/demo.mp4 + docs/media/demo.gif
```

**Captured beats (one continuous take):**

1. Populated **Wardrobe** grid.
2. **Catalog** → live viewfinder (fake camera fed a real garment via
   `--use-file-for-fake-video-capture`) → shutter → auto **ITM-NN** ID pill →
   Save → new tile appears. _(No category step — every item is the catch-all `ITM`.)_
3. **Drop-offs** → _New Drop-off_ → select items.
4. **Check-in** → per-item tick (count-first reconcile).
5. **Proof screen** — linger (the money shot: photo + receipt + shop + date).
6. End on populated **Stats** (₹ spend, 6-month chart).

**Capture routes:**

- **Scripted (used here):** Puppeteer at viewport 390×844 @ DPR 2, Chrome flags
  `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream
--use-file-for-fake-video-capture=<garment.y4m>`, seeded IndexedDB, recorded via
  CDP `Page.startScreencast` → frames → ffmpeg (concat demuxer with per-frame
  durations from the screencast timestamps → constant-fps MP4; two-pass
  palettegen/paletteuse GIF).
- **Real device (alt):** iPhone screen recording → trim → crop to app → compress.

**Alt text:** `Laundristic demo: cataloguing a garment, logging a drop-off, reconciling a return, and sharing a receipt PDF.`

---

## 3. Asset B — Hero banner + Social/OG card (Imagen 4)

Generate the **background** in the Gemini app (Imagen 4), then add the wordmark
("Laundristic", Fraunces) + tagline (Hanken Grotesk) in Figma/Canva — AI text is unreliable.

**B1 · Hero banner (1280×400) — Imagen prompt:**

> Minimalist editorial hero banner, wide 1280×400, warm off-white paper background (#FAFAF9). A neat top-down flat-lay of softly folded muted-sage and cream garments with a small paper laundry receipt, generous empty negative space on the right third reserved for a title. Calm natural soft light, gentle soft shadows, premium matte fabric texture, muted dark-sage palette (#4E6E52). Understated Kinfolk-magazine aesthetic, light-mode. No text, no logos, no people. Photorealistic, high detail.

**B2 · Social/OG card (1280×640) — Imagen prompt:**

> Clean 1280×640 social card background, warm off-white (#FAFAF9) with a subtle dark-sage (#4E6E52) rounded panel in the lower-left. A small top-down still life of one folded sage shirt and a paper receipt in the lower-right third with a soft shadow. Large empty upper-left area reserved for a headline. Calm, premium, editorial, light-mode. No text, no logo, no watermark.

**Then overlay (Figma/Canva):** Title "Laundristic" (Fraunces 700, #292524) + tagline
"Laundry, accounted for. · local-first offline PWA" (Hanken Grotesk, #4E6E52).
Export B2 as `public/og-cover.png` and also upload at **GitHub → Settings → General → Social preview**.

**Optional app-icon refresh — Imagen prompt:**

> Minimal friendly app icon: a single laundry/clothing tag with a subtle checkmark, flat geometric vector, dark sage (#4E6E52) on pale sage (#EAF0EA), soft rounded square, centered, no text.

---

## 4. Asset C — Framed screenshot gallery ✅

Use **populated** screens (mock data, no real info) — not the current empty states.
Captured via `scripts/generate_screenshots.mjs` (same seeding/driving approach as
Asset A), then framed in a device mock on a `#EAF0EA` pale-sage backdrop.

- **Screens (lead with the killer feature):**
  Proof screen · Receipt PDF · Wardrobe (populated) · Drop-off sheet · Check-in · Stats.
- **Layout:** markdown table wrapped in `<details><summary>📱 Screenshots</summary>`
  (ExpenseOwl pattern). ~480px each.
- **Optimize:** `pngquant --quality=65-85 gallery/*.png` (or `oxipng -o4`).
- **Alt text per shot**, e.g. `Proof screen showing garment photo, receipt, shop name and date`.

---

## 5. Asset D — Veo promo + NotebookLM (optional extras)

**D1 · Veo 3 (Flow)** — stylized brand clip for LinkedIn (not a UI demo). Pro plan
has monthly Veo credits; ~8s:

> 8-second cinematic, calm product mood film. Soft natural morning light, warm off-white and muted-sage palette. Slow push-in over a tidy flat-lay of folded garments and a paper receipt on a linen surface; a hand gently sets down a phone showing a clean minimal app. Shallow depth of field, premium, serene, soft ambient sound, no text overlays. Editorial lifestyle tone.

Export 1080p MP4 for LinkedIn; optionally convert a 3s snippet to a muted GIF for the README.
**Caveat:** the Veo clip's on-screen app copy is an AI _approximation_, not the
shipped wording — treat it as a brand/mood reel and pair it with the real
screen-recording demo (Asset A) for "what the app actually does."

**D2 · NotebookLM** — upload `docs/SOLUTION_DESIGN.md`, `docs/TECHNICAL_DESIGN.md`,
`docs/ARCHITECTURE.md` → generate **Audio Overview** + **Video Overview** → share public
link → README badge "📻 Listen to a deep dive" + a LinkedIn "behind the build" post.

---

## 6. README assembly map

```
<p align="center"><img src="docs/media/hero-with-text.webp" alt="Laundristic"></p>   ← B1
# Laundristic
> Never lose a garment again. — local-first PWA for laundry drop-offs.
<p align="center"><img src="docs/media/demo.gif" width="300" alt="…"></p>             ← A
## Features             (emoji list)
## Screenshots          <details> framed gallery </details>                          ← C
## Documentation        (Design / Reference groups → /docs)
## Tech Stack
## Getting Started      (npm ci / dev / test)
## License — MIT
```

---

## 7. SEO / meta / GitHub settings

Repo-side items (✅ done in-repo):

- ✅ **index.html meta:** `og:type`, `og:title`, `og:description`, `og:url`,
  `og:image`, `twitter:card=summary_large_image`, `twitter:title/description/image`.
  **`og:url`/`og:image` use a placeholder domain (`laundristic.example.com`) —
  swap it for the live deployed URL before launch** (single TODO in `index.html`).
- ✅ `public/og-cover.png` (1280×640, PNG — scrapers render it more reliably than WebP).
- ✅ `theme-color` is the brand sage `#4E6E52`; `<meta description>` + `<title>` are rich.
- ✅ **Community health:** `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1) +
  `SECURITY.md` added; CONTRIBUTING already linked from the README.
- ✅ Cleaned the stale "Tally" comment in `src/styles/tokens.css:1`.

Manual GitHub-UI items (owner action — can't be done from the repo):

- **About sidebar:** description + Website = live URL + **topics**:
  `pwa, react, typescript, vite, indexeddb, local-first, offline-first, expense-tracker, laundry, pdf, mobile-first, progressive-web-app`.
- Upload `public/og-cover.png` at **Settings → General → Social preview**.
- Pin the repo on your profile; publish a tagged Release with notes.

---

## 8. Production sequence

1. ✅ Generate B1/B2 (Imagen) + D1 (Veo) in Gemini/Flow; ⏳ D2 (NotebookLM).
2. ✅ `scripts/record_demo.mjs` + `scripts/generate_screenshots.mjs` produce A (demo) + C (gallery) from the real app.
3. ✅ Frame C, compress A & C, add type to B.
4. ⏳ README + meta/SEO + topics on the working branch (`claude/tender-ritchie-gt4zpi`).
5. ⏳ Review → run `scrub-remote.sh` (history scrub) → flip repo public.
   _(README/meta done before the scrub = the first public commit is launch-ready.)_

**Pre-public gate (do BEFORE flipping visibility):**

- Enable GitHub email privacy (Settings → Emails) so no further commit re-adds a personal email.
- Run the final history scrub (`scrub-remote.sh`): rewrite all commit/tagger emails to the
  noreply address, genericize any real domain/space-key/name, strip large old PNG blobs
  (`git filter-repo --strip-blobs-bigger-than 1M`), verify zero PII across all refs,
  force-push `main` + tags, delete the `claude/*` agent branches — then go public.
