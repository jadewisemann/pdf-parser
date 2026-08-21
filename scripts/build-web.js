// Builds web/pdf2md.html: a single self-contained drop-zone page with the
// pdf-inspector WASM engine embedded as base64. Re-run after bumping
// @firecrawl/pdf-inspector-wasm.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
const wasmPackage = path.dirname(require.resolve('@firecrawl/pdf-inspector-wasm/package.json'));

const template = await readFile(path.join(root, 'web/index.template.html'), 'utf8');
const glue = await readFile(path.join(wasmPackage, 'pdf_inspector_wasm.js'));
const wasm = await readFile(path.join(wasmPackage, 'pdf_inspector_wasm_bg.wasm'));

const html = template
  .replace('__GLUE_B64__', glue.toString('base64'))
  .replace('__WASM_B64__', wasm.toString('base64'));

const outPath = path.join(root, 'web/pdf2md.html');
await writeFile(outPath, html);
console.log(`${outPath} (${(html.length / 1024 / 1024).toFixed(1)} MB)`);
