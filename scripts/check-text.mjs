// Fails if source, docs or copy contain em dashes or en dashes, or if markup
// uses inline style attributes (which the Content-Security-Policy blocks).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SKIP = new Set(['node_modules', 'dist', '.git', '.firebase', 'package-lock.json']);
const EXT = /\.(js|mjs|css|html|md|json|rules|svg|webmanifest|txt|yml|yaml)$/;
const problems = [];
const DASHES = new RegExp(`[${String.fromCharCode(0x2014)}${String.fromCharCode(0x2013)}]`);

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (EXT.test(name)) scan(path);
  }
}

function scan(path) {
  const text = readFileSync(path, 'utf8');
  text.split('\n').forEach((line, i) => {
    if (DASHES.test(line)) problems.push(`${path}:${i + 1} dash character`);
    if (/\.(js|html)$/.test(path) && /\sstyle=["']/.test(line)) problems.push(`${path}:${i + 1} inline style attribute`);
    if (/\.(js|html)$/.test(path) && /\son[a-z]+=["']/.test(line) && !path.includes('/tests/')) problems.push(`${path}:${i + 1} inline event handler`);
  });
}

walk(process.cwd());
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('check-text: ok');
