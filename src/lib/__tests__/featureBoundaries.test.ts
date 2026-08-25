import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve(process.cwd(), 'src');
const FEATURES_ROOT = path.join(ROOT, 'features');

function collectTypeScriptFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  const files: string[] = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectTypeScriptFiles(fullPath));
    else if (/\.(?:ts|tsx)$/.test(entry.name)) files.push(fullPath);
  }
  return files;
}

function featureNameFor(filePath: string): string | null {
  const relative = path.relative(FEATURES_ROOT, filePath);
  const [feature] = relative.split(path.sep);
  return feature || null;
}

function resolveRelativeImport(sourceFile: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) return null;
  const base = path.resolve(path.dirname(sourceFile), specifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) || null;
}

test('feature modules do not import sibling feature modules directly', () => {
  const violations: string[] = [];
  const files = collectTypeScriptFiles(FEATURES_ROOT);

  for (const file of files) {
    const ownerFeature = featureNameFor(file);
    if (!ownerFeature) continue;

    const source = fs.readFileSync(file, 'utf8');
    const importSpecifiers = [
      ...Array.from(source.matchAll(/\bimport\s+(?:type\s+)?[^'\"]*?from\s*['\"]([^'\"]+)['\"]/g), (match) => match[1]),
      ...Array.from(source.matchAll(/\bimport\s*\(\s*['\"]([^'\"]+)['\"]\s*\)/g), (match) => match[1]),
    ];

    for (const specifier of importSpecifiers) {
      const resolved = resolveRelativeImport(file, specifier);
      if (!resolved) continue;
      const relative = path.relative(FEATURES_ROOT, resolved);
      const targetFeature = relative.split(path.sep)[0];
      if (targetFeature && targetFeature !== ownerFeature && targetFeature !== '..') {
        violations.push(`${path.relative(ROOT, file)} -> ${path.relative(ROOT, resolved)}`);
      }
    }
  }

  assert.deepEqual(violations, [], `Feature-to-feature imports bypass module contracts:\n${violations.join('\n')}`);
});
