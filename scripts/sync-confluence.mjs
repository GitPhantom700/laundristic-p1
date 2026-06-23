import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { marked } from 'marked';

// --- CONFIGURATION ---
const SPACE_KEY = process.env.CONFLUENCE_SPACE_KEY;
const DOMAIN = process.env.CONFLUENCE_DOMAIN; // e.g., your-domain.atlassian.net
const EMAIL = process.env.CONFLUENCE_EMAIL;
const TOKEN = process.env.CONFLUENCE_API_TOKEN;
const PARENT_ID = process.env.CONFLUENCE_PARENT_ID; // Optional
const DRY_RUN = process.argv.includes('--dry-run');

const GITHUB_RAW_BASE =
  'https://raw.githubusercontent.com/GitPhantom700/laundristic/main/';

// Explicit list of mirrored files. Scaffolding/internal files are omitted.
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
    'Error: Missing required environment variables. Please set CONFLUENCE_SPACE_KEY, CONFLUENCE_DOMAIN, CONFLUENCE_EMAIL, and CONFLUENCE_API_TOKEN in your .env file.',
  );
  process.exit(1);
}

const authHeader = `Basic ${Buffer.from(`${EMAIL}:${TOKEN}`).toString('base64')}`;
const baseUrl = `https://${DOMAIN}/wiki/rest/api/content`;

// Tech debt note: Using Confluence REST API v1 for initial setup, v2 is recommended for future.
// Note: This script performs a one-way sync and does not delete orphaned pages from Confluence.

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
    throw new Error(`Confluence API error: ${res.status} - ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function processMarkdown(filePath, markdown) {
  // 1. Page Title Strategy
  // Use first H1. Fall back to Title Case if missing. Force 'Overview' for README.
  let title = 'Untitled';
  if (filePath === 'README.md') {
    title = 'Overview';
  } else {
    const h1Match = markdown.match(/^#\s+(.+)$/m);
    if (h1Match) {
      title = h1Match[1].trim();
    } else {
      const baseName = path.basename(filePath, '.md');
      title = baseName
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());
    }
  }

  // 2. Rewrite Image Links to GitHub raw URLs
  const dirPath = path.dirname(filePath);
  let processedMd = markdown.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (match, alt, imagePath) => {
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return match;
      }
      let resolvedPath = path.posix.join(
        dirPath.replace(/\\/g, '/'),
        imagePath,
      );
      const absoluteUrl = `${GITHUB_RAW_BASE}${resolvedPath}`;
      return `![${alt}](${absoluteUrl})`;
    },
  );

  // 3. Transform GitHub Admonitions to Confluence Macros
  processedMd = processedMd.replace(
    /^> \[\!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\n((?:> .*\n?)*)/gm,
    (match, type, body) => {
      let acType = 'info';
      if (['WARNING', 'CAUTION', 'IMPORTANT'].includes(type))
        acType = 'warning';
      if (type === 'TIP') acType = 'tip';

      const innerMarkdown = body.replace(/^> ?/gm, '').trim();
      const innerHtml = marked.parse(innerMarkdown);

      // Confluence storage format macros
      return `<ac:structured-macro ac:name="${acType}"><ac:rich-text-body>${innerHtml}</ac:rich-text-body></ac:structured-macro>\n\n`;
    },
  );

  // 4. Convert remaining Markdown to HTML
  let htmlContent = marked.parse(processedMd);

  // 5. Post-process HTML to valid Confluence Storage Format (XML)
  // Convert <img> to <ac:image>
  htmlContent = htmlContent.replace(
    /<img[^>]+src="([^">]+)"[^>]*>/g,
    (match, src) => {
      return `<ac:image><ri:url ri:value="${src}" /></ac:image>`;
    },
  );

  // Convert <pre><code> to Confluence Code Macro
  htmlContent = htmlContent.replace(
    /<pre><code(?:\s+class="language-([^"]+)")?>([\s\S]*?)<\/code><\/pre>/g,
    (match, lang, code) => {
      const langParam = lang
        ? `<ac:parameter ac:name="language">${lang}</ac:parameter>`
        : '';
      // Unescape HTML entities inside code block for CDATA
      const unescapedCode = code
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&');
      return `<ac:structured-macro ac:name="code">${langParam}<ac:plain-text-body><![CDATA[${unescapedCode}]]></ac:plain-text-body></ac:structured-macro>`;
    },
  );

  // Ensure self-closing tags are XML-compliant
  htmlContent = htmlContent
    .replace(/<br>/g, '<br />')
    .replace(/<hr>/g, '<hr />');

  return { title, htmlContent };
}

async function syncFile(filePath) {
  console.log(`\nProcessing ${filePath}...`);
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return;
  }

  const markdown = fs.readFileSync(filePath, 'utf-8');
  const { title, htmlContent } = processMarkdown(filePath, markdown);

  console.log(`Resolved Title: "${title}"`);

  if (DRY_RUN) {
    console.log(
      `[DRY RUN] Would sync "${title}" to space ${SPACE_KEY}. HTML length: ${htmlContent.length} chars.`,
    );
    return;
  }

  // Search for existing page by title in the space
  const searchUrl = `${baseUrl}?spaceKey=${SPACE_KEY}&title=${encodeURIComponent(title)}&expand=version`;
  const searchResult = await fetchConfluence(searchUrl);

  const payload = {
    type: 'page',
    title: title,
    space: { key: SPACE_KEY },
    body: {
      storage: {
        value: htmlContent,
        representation: 'storage',
      },
    },
  };

  // Set parent if provided, else it creates at space root
  if (PARENT_ID) {
    payload.ancestors = [{ id: PARENT_ID }];
  }

  if (searchResult.results && searchResult.results.length > 0) {
    const page = searchResult.results[0];
    const currentVersion = page.version.number;
    console.log(
      `Page exists (ID: ${page.id}, Version: ${currentVersion}). Updating...`,
    );

    // Explicitly increment version from the current fetched version
    payload.version = { number: currentVersion + 1 };

    await fetchConfluence(`${baseUrl}/${page.id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    console.log(
      `Success: Updated page "${title}" to version ${currentVersion + 1}.`,
    );
  } else {
    console.log(`Page does not exist. Creating...`);
    await fetchConfluence(baseUrl, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    console.log(`Success: Created page "${title}".`);
  }
}

async function run() {
  console.log(
    `Starting Confluence Sync (Space: ${SPACE_KEY})${DRY_RUN ? ' [DRY RUN]' : ''}`,
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
