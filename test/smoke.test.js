import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { convertPdf } from '../src/convert.js';
import { startServer } from '../src/server.js';
import { buildSamplePdf } from './fixture.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const workDir = await mkdtemp(path.join(tmpdir(), 'pdf2md-test-'));
const samplePath = path.join(workDir, 'sample.pdf');
await writeFile(samplePath, buildSamplePdf());

// Library: text PDF converts to markdown containing the source text.
const result = await convertPdf(samplePath);
assert.match(result.markdown, /Sample Heading/);
assert.match(result.markdown, /body text for the smoke test/);

// CLI: single file with explicit output path.
const outPath = path.join(workDir, 'out.md');
execFileSync(process.execPath, [path.join(root, 'bin/pdf2md.js'), '-q', samplePath, '-o', outPath]);
assert.match(await readFile(outPath, 'utf8'), /Sample Heading/);

// CLI: directory input mirrors structure into the output directory.
const outDir = path.join(workDir, 'out');
execFileSync(process.execPath, [path.join(root, 'bin/pdf2md.js'), '-q', workDir, '-o', outDir]);
assert.match(await readFile(path.join(outDir, 'sample.md'), 'utf8'), /Sample Heading/);

// Server: GET / serves the page, POST /convert returns markdown.
const { server, url } = await startServer(0);
const pageResponse = await fetch(url);
assert.equal(pageResponse.status, 200);
assert.match(await pageResponse.text(), /dropzone/);
const convertResponse = await fetch(`${url}/convert`, { method: 'POST', body: buildSamplePdf() });
assert.equal(convertResponse.status, 200);
assert.match(await convertResponse.text(), /Sample Heading/);
server.close();

// CLI: missing input exits non-zero.
assert.throws(() =>
  execFileSync(process.execPath, [path.join(root, 'bin/pdf2md.js'), path.join(workDir, 'nope.pdf')], {
    stdio: 'pipe',
  }),
);

console.log('smoke tests passed');
