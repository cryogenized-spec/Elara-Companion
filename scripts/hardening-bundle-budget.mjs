import fs from 'node:fs';
import path from 'node:path';

const distAssets = path.resolve('dist', 'assets');
const MAX_SINGLE_JS_BYTES = 2.5 * 1024 * 1024;
const MAX_TOTAL_JS_BYTES = 6 * 1024 * 1024;
const MAX_SINGLE_CSS_BYTES = 400 * 1024;

function walk(directory, files = []) {
  if (!fs.existsSync(directory)) return files;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

const files = walk(distAssets);
const js = files.filter((file) => file.endsWith('.js')).map((file) => ({ file, bytes: fs.statSync(file).size }));
const css = files.filter((file) => file.endsWith('.css')).map((file) => ({ file, bytes: fs.statSync(file).size }));

const totalJs = js.reduce((sum, item) => sum + item.bytes, 0);
const largestJs = [...js].sort((a, b) => b.bytes - a.bytes)[0];
const largestCss = [...css].sort((a, b) => b.bytes - a.bytes)[0];

console.log(`Bundle budget: total JS ${(totalJs / 1024 / 1024).toFixed(2)} MiB`);
if (largestJs) console.log(`Bundle budget: largest JS ${path.relative(process.cwd(), largestJs.file)} ${(largestJs.bytes / 1024 / 1024).toFixed(2)} MiB`);
if (largestCss) console.log(`Bundle budget: largest CSS ${path.relative(process.cwd(), largestCss.file)} ${(largestCss.bytes / 1024).toFixed(2)} KiB`);

const violations = [];
if (totalJs > MAX_TOTAL_JS_BYTES) violations.push(`total JS exceeds ${(MAX_TOTAL_JS_BYTES / 1024 / 1024).toFixed(1)} MiB`);
if (largestJs && largestJs.bytes > MAX_SINGLE_JS_BYTES) violations.push(`largest JS chunk exceeds ${(MAX_SINGLE_JS_BYTES / 1024 / 1024).toFixed(1)} MiB`);
if (largestCss && largestCss.bytes > MAX_SINGLE_CSS_BYTES) violations.push(`largest CSS chunk exceeds ${(MAX_SINGLE_CSS_BYTES / 1024).toFixed(0)} KiB`);

if (violations.length) {
  console.error('Bundle budget failed:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('Bundle budget passed.');
