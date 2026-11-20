// Build: src/yt-transcript.js → dist/ (minified code, bookmarklet URL, install page)
// Usage: npm run build
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { minify } from 'terser';

const root = new URL('..', import.meta.url);
const read = p => readFile(new URL(p, root), 'utf8');
const write = (p, s) => writeFile(new URL(p, root), s, 'utf8');

const pkg = JSON.parse(await read('package.json'));
const src = await read('src/yt-transcript.js');

const { code } = await minify(src, { compress: true, mangle: true, toplevel: true });
if (!code) throw new Error('terser returned no code');

// Bookmarklet URL: fully percent-encoded so it survives copy/paste and HTML attributes
const bookmarklet = 'javascript:' + encodeURIComponent(code);

// Sanity checks: round trip and parse
if (decodeURIComponent(bookmarklet.slice('javascript:'.length)) !== code) throw new Error('Round-trip check failed');
new Function(code); // throws on syntax error

const escAttr = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const repoUrl = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url || '#';
const values = {
  BOOKMARKLET_HREF: escAttr(bookmarklet),
  VERSION: pkg.version,
  REPO_URL: escAttr(repoUrl.replace(/^git\+/, '').replace(/\.git$/, '')),
};
const tpl = await read('site/index.template.html');
const html = tpl.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => {
  if (!(k in values)) throw new Error(`Unknown placeholder ${m}`);
  return values[k]; // function replacement: no "$&" surprises from the bookmarklet code
});

await mkdir(new URL('dist/', root), { recursive: true });
await write('dist/yt-transcript.min.js', code);
await write('dist/bookmarklet.txt', bookmarklet);
await write('dist/index.html', html);

console.log(`v${pkg.version}: ${code.length} B minified, ${bookmarklet.length} B bookmarklet, ${html.length} B index.html`);
