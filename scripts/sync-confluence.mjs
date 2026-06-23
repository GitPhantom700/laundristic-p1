/**
 * Confluence one-way docs mirror (P4.3).
 *
 * Source of truth = repo markdown. Target = "Laundristic" Confluence space.
 *
 * v2 (attachment-based) — diagrams and screenshots are uploaded as native
 * Confluence page attachments instead of being linked as external URLs. This
 * means:
 *   • Mermaid blocks (```mermaid …```) are rendered to PNG via mermaid.ink
 *     and attached.
 *   • Local image refs in markdown (e.g. ![alt](qa/01_wardrobe.png)) are
 *     read from disk and attached.
 *   • Page body references them as <ri:attachment ri:filename="…"/>.
 *
 * One-way: this script never reads from Confluence beyond find-by-title.
 * It does not delete orphaned pages or attachments.
 */

import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { marked } from 'marked';

// --- CONFIGURATION ---
const SPACE_KEY = process.env.CONFLUENCE_SPACE_KEY;
const DOMAIN = process.env.CONFLUENCE_DOMAIN;
const EMAIL = process.env.CONFLUENCE_EMAIL;
const TOKEN = process.env.CONFLUENCE_API_TOKEN;
const PARENT_ID = process.env.CONFLUENCE_PARENT_ID;
const DRY_RUN = process.argv.includes('--dry-run');

// Explicit allowlist. Scaffolding/internal files are omitted.
const FILES_TO_SYNC = [
  'README.md',
  'RELEASE_NOTES.md',
  'docs/SOLUTION_DESIGN.md',
  'docs/TECHNICAL_DESIGN.md',
  'docs/DEPLOYMENT.md',
  'docs/ARCHITECTURE.md',
  'docs/CONTRIBUTING.md',
  'docs/DATA_MODEL.md',
  'docs/ROADMAP.md',
  'docs/SPEC.md',
  'docs/USER_GUIDE.md',
  'docs/ADMIN_APP.md',
];

if (!SPACE_KEY || !DOMAIN || !EMAIL || !TOKEN) {
  console.error(
    'Error: Missing required env vars. Set CONFLUENCE_SPACE_KEY, CONFLUENCE_DOMAIN, CONFLUENCE_EMAIL, and CONFLUENCE_API_TOKEN in .env.',
  );
  process.exit(1);
}

const authHeader = `Basic ${Buffer.from(`${EMAIL}:${TOKEN}`).toString('base64')}`;
const baseUrl = `https://${DOMAIN}/wiki/rest/api/content`;

// --- HTTP HELPERS ---

async function fetchConfluence(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Confluence ${res.status} ${res.statusText} — ${text.slice(0, 400)}`,
    );
  }
  if (res.status === 204) return null;
  return res.json();
}

/**
 * Render a Mermaid diagram source to PNG bytes via the public mermaid.ink
 * service. Returns a Buffer. Throws if the service rejects the diagram.
 *
 * mermaid.ink is a free public service and 503s under burst load. Retry with
 * exponential backoff on 429/503 to ride out rate limits.
 */
async function renderMermaidToPng(source) {
  const encoded = Buffer.from(source, 'utf-8').toString('base64url');
  const url = `https://mermaid.ink/img/${encoded}?type=png&bgColor=white`;
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(url);
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if ((res.status === 429 || res.status === 503) && attempt < maxAttempts) {
      // 1.5s, 3s, 6s, 12s
      const wait = 1500 * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    const text = await res.text().catch(() => '');
    throw new Error(
      `mermaid.ink ${res.status} (${source.length} chars, attempt ${attempt}) — ${text.slice(0, 200)}`,
    );
  }
  // Unreachable but satisfies linting.
  throw new Error('mermaid.ink: exhausted retries');
}

/**
 * Upload a binary blob as a Confluence page attachment. Idempotent:
 *   • If no attachment with this filename exists, POST a new one.
 *   • If one already exists, PUT a new version to its existing ID.
 *
 * The plain POST endpoint rejects duplicate filenames with HTTP 400
 * ("Cannot add a new attachment"); the .../data PUT updates instead.
 *
 * Confluence multipart endpoints require the `X-Atlassian-Token` CSRF
 * nopcheck header. `minorEdit=true` keeps watchers from being spammed.
 */
async function uploadAttachment(pageId, filename, buffer, mimeType) {
  // 1. Probe for an existing attachment with this filename.
  const probeUrl = `${baseUrl}/${pageId}/child/attachment?filename=${encodeURIComponent(filename)}`;
  const probe = await fetchConfluence(probeUrl);
  const existing = probe.results && probe.results[0];

  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mimeType }), filename);
  form.append('minorEdit', 'true');

  const target = existing
    ? `${baseUrl}/${pageId}/child/attachment/${existing.id}/data`
    : `${baseUrl}/${pageId}/child/attachment`;

  const res = await fetch(target, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'X-Atlassian-Token': 'no-check',
      Accept: 'application/json',
    },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `attachment "${filename}" ${res.status} — ${text.slice(0, 200)}`,
    );
  }
  return res.json();
}

// --- MARKDOWN PROCESSING ---

const MIME_BY_EXT = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
};

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Walk the markdown, hoist diagrams + local images into an `attachments` list,
 * convert callouts + code, and return Confluence storage-format HTML with
 * `<ri:attachment>` placeholders that resolve at view time.
 */
function processMarkdown(filePath, markdown) {
  const attachments = [];

  // 1. Title — H1 of the file, with overrides for README.
  let title = 'Untitled';
  if (filePath === 'README.md') {
    title = 'Overview';
  } else {
    const h1 = markdown.match(/^#\s+(.+)$/m);
    if (h1) {
      title = h1[1].trim();
    } else {
      title = path
        .basename(filePath, '.md')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());
    }
  }

  const fileSlug = slugify(path.basename(filePath, '.md'));
  let diagramIdx = 0;

  // 2. Extract Mermaid fences → schedule render + replace with placeholder image.
  let processed = markdown.replace(
    /```mermaid\n([\s\S]*?)```/g,
    (_match, source) => {
      diagramIdx++;
      const filename = `${fileSlug}-diagram-${diagramIdx}.png`;
      attachments.push({
        filename,
        mimeType: 'image/png',
        kind: 'mermaid',
        source,
      });
      return `![diagram ${diagramIdx}](attachment:${filename})`;
    },
  );

  // 3. Resolve local image refs (relative to the markdown file) → schedule upload.
  const dirPath = path.dirname(filePath);
  processed = processed.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (match, alt, imagePath) => {
      if (imagePath.startsWith('attachment:')) return match; // ours
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return match; // remote http(s) image — keep as-is
      }
      const resolvedPath = path.posix.join(
        dirPath.replace(/\\/g, '/'),
        imagePath,
      );
      if (!fs.existsSync(resolvedPath)) {
        console.warn(`  ⚠ missing local image: ${resolvedPath}`);
        return `*(missing image: ${imagePath})*`;
      }
      const filename = path.basename(resolvedPath);
      const ext = path.extname(filename).slice(1).toLowerCase();
      const mimeType = MIME_BY_EXT[ext] || 'application/octet-stream';
      const buffer = fs.readFileSync(resolvedPath);
      attachments.push({
        filename,
        mimeType,
        kind: 'file',
        source: buffer,
      });
      return `![${alt}](attachment:${filename})`;
    },
  );

  // 4. GFM-style admonitions → Confluence info/warning/tip macros.
  processed = processed.replace(
    /^> \[\!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\n((?:> .*\n?)*)/gm,
    (_m, type, body) => {
      let acType = 'info';
      if (['WARNING', 'CAUTION', 'IMPORTANT'].includes(type))
        acType = 'warning';
      if (type === 'TIP') acType = 'tip';
      const innerMd = body.replace(/^> ?/gm, '').trim();
      const innerHtml = marked.parse(innerMd);
      return `<ac:structured-macro ac:name="${acType}"><ac:rich-text-body>${innerHtml}</ac:rich-text-body></ac:structured-macro>\n\n`;
    },
  );

  // 5. Markdown → HTML.
  let html = marked.parse(processed);

  // 6. Replace attachment: placeholders with Confluence attachment macros.
  html = html.replace(
    /<img[^>]+src="attachment:([^"]+)"[^>]*\/?>/g,
    (_m, filename) =>
      `<ac:image><ri:attachment ri:filename="${filename}" /></ac:image>`,
  );
  // Any remaining remote <img> (badges, etc.) stay as external URL references.
  html = html.replace(
    /<img[^>]+src="(https?:[^"]+)"[^>]*\/?>/g,
    (_m, src) => `<ac:image><ri:url ri:value="${src}" /></ac:image>`,
  );

  // 7. <pre><code> → Confluence code macro (with language if present).
  html = html.replace(
    /<pre><code(?:\s+class="language-([^"]+)")?>([\s\S]*?)<\/code><\/pre>/g,
    (_m, lang, code) => {
      const langParam = lang
        ? `<ac:parameter ac:name="language">${lang}</ac:parameter>`
        : '';
      const unescaped = code
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&');
      return `<ac:structured-macro ac:name="code">${langParam}<ac:plain-text-body><![CDATA[${unescaped}]]></ac:plain-text-body></ac:structured-macro>`;
    },
  );

  // 8. XML-compliant self-closing tags.
  html = html.replace(/<br>/g, '<br />').replace(/<hr>/g, '<hr />');

  return { title, htmlContent: html, attachments };
}

// --- SYNC ---

async function syncFile(filePath) {
  console.log(`\nProcessing ${filePath}…`);
  if (!fs.existsSync(filePath)) {
    console.warn(`  File not found: ${filePath}`);
    return;
  }

  const md = fs.readFileSync(filePath, 'utf-8');
  const { title, htmlContent, attachments } = processMarkdown(filePath, md);

  console.log(`  Title: "${title}"`);
  const diagramCount = attachments.filter((a) => a.kind === 'mermaid').length;
  const fileCount = attachments.filter((a) => a.kind === 'file').length;
  if (attachments.length) {
    console.log(
      `  Attachments: ${attachments.length} (${diagramCount} mermaid, ${fileCount} file)`,
    );
  }

  if (DRY_RUN) {
    console.log(
      `  [DRY RUN] Would sync. Body: ${htmlContent.length} chars, attachments: ${attachments.length}.`,
    );
    return;
  }

  // Render Mermaid diagrams up-front. Serialise to avoid hammering mermaid.ink
  // (it 503s on bursts) and to keep retries from fighting each other.
  const renderedAttachments = [];
  for (const a of attachments) {
    if (a.kind !== 'mermaid') {
      renderedAttachments.push(a);
      continue;
    }
    process.stdout.write(`  ▸ rendering ${a.filename} … `);
    try {
      const buffer = await renderMermaidToPng(a.source);
      console.log(`${buffer.length} bytes`);
      renderedAttachments.push({ ...a, source: buffer });
    } catch (err) {
      console.log(`FAILED (${err.message})`);
      renderedAttachments.push({ ...a, source: null });
    }
  }

  // Find existing page by title (within the space).
  const searchUrl = `${baseUrl}?spaceKey=${SPACE_KEY}&title=${encodeURIComponent(title)}&expand=version`;
  const searchResult = await fetchConfluence(searchUrl);

  const payload = {
    type: 'page',
    title,
    space: { key: SPACE_KEY },
    body: { storage: { value: htmlContent, representation: 'storage' } },
  };
  if (PARENT_ID) payload.ancestors = [{ id: PARENT_ID }];

  let pageId;
  if (searchResult.results && searchResult.results.length > 0) {
    const page = searchResult.results[0];
    pageId = page.id;
    payload.version = { number: page.version.number + 1 };
    await fetchConfluence(`${baseUrl}/${pageId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    console.log(
      `  ✓ Updated page ${pageId} → version ${page.version.number + 1}`,
    );
  } else {
    const created = await fetchConfluence(baseUrl, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    pageId = created.id;
    console.log(`  ✓ Created page ${pageId}`);
  }

  // Upload attachments after the page exists. Re-upload bumps the version.
  for (const a of renderedAttachments) {
    if (!a.source) {
      console.log(`  ✖ skip "${a.filename}" (no buffer)`);
      continue;
    }
    try {
      await uploadAttachment(pageId, a.filename, a.source, a.mimeType);
      console.log(`  ↥ uploaded "${a.filename}" (${a.source.length} bytes)`);
    } catch (err) {
      console.error(`  ✖ attachment "${a.filename}" failed: ${err.message}`);
    }
  }
}

async function run() {
  console.log(
    `Confluence sync — space ${SPACE_KEY}${DRY_RUN ? ' [DRY RUN]' : ''}`,
  );
  for (const file of FILES_TO_SYNC) {
    await syncFile(file);
  }
  console.log('\nSync completed.');
}

run().catch((err) => {
  console.error('\nSync failed:', err.message);
  process.exit(1);
});
