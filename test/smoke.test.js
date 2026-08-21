import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { convertPdf, isImageOnly, summarizeOcrReasons } from '../src/convert.js';
import { buildSamplePdf } from './fixture.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const workDir = await mkdtemp(path.join(tmpdir(), 'pdf2md-test-'));
const samplePath = path.join(workDir, 'sample.pdf');
await writeFile(samplePath, buildSamplePdf());

// Library: text PDF converts to markdown containing the source text.
const result = await convertPdf(samplePath);
assert.equal(isImageOnly(result.pdfType), false, `unexpected type: ${result.pdfType}`);
assert.equal(result.pageCount, 1);
assert.match(result.markdown, /Sample Heading/);
assert.match(result.markdown, /body text for the smoke test/);

// OCR reason summary aggregates per-page codes into per-reason page counts.
const summary = summarizeOcrReasons([
  { page: 2, reasons: ['suspected_garbled_text'] },
  { page: 3, reasons: ['suspected_garbled_text', 'vector_text'] },
  { page: 9, reasons: ['some_future_code'] },
]);
assert.deepEqual(summary, [
  'a font without a Unicode mapping (only text in that font may be garbled): 2 page(s)',
  'text drawn as vector outlines (that text cannot be extracted): 1 page(s)',
  'some_future_code: 1 page(s)',
]);

// CLI: single file with explicit output path.
const outPath = path.join(workDir, 'out.md');
execFileSync(process.execPath, [path.join(root, 'bin/pdf2md.js'), '-q', samplePath, '-o', outPath]);
assert.match(await readFile(outPath, 'utf8'), /Sample Heading/);

// CLI: directory input mirrors structure into the output directory.
const outDir = path.join(workDir, 'out');
execFileSync(process.execPath, [path.join(root, 'bin/pdf2md.js'), '-q', workDir, '-o', outDir]);
assert.match(await readFile(path.join(outDir, 'sample.md'), 'utf8'), /Sample Heading/);

// CLI: missing input exits non-zero.
assert.throws(() =>
  execFileSync(process.execPath, [path.join(root, 'bin/pdf2md.js'), path.join(workDir, 'nope.pdf')], {
    stdio: 'pipe',
  }),
);

console.log('smoke tests passed');
