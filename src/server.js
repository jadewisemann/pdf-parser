import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { convertPdf } from './convert.js';

const PAGE_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '../web/index.html');
const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_UPLOAD_BYTES) throw new Error('file too large (max 200MB)');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Local conversion server: serves the drop-zone page at / and converts
 * uploaded PDF bytes at POST /convert, returning markdown as text.
 */
export function makeServer() {
  return createServer(async (request, response) => {
    try {
      if (request.method === 'GET' && request.url === '/') {
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        response.end(await readFile(PAGE_PATH));
        return;
      }
      if (request.method === 'POST' && request.url === '/convert') {
        const body = await readBody(request);
        const workDir = await mkdtemp(path.join(tmpdir(), 'pdf2md-'));
        const pdfPath = path.join(workDir, 'upload.pdf');
        try {
          await writeFile(pdfPath, body);
          const { markdown } = await convertPdf(pdfPath);
          response.writeHead(200, { 'content-type': 'text/markdown; charset=utf-8' });
          response.end(markdown);
        } finally {
          await rm(workDir, { recursive: true, force: true });
        }
        return;
      }
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('not found');
    } catch (error) {
      response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      response.end(String(error.message ?? error));
    }
  });
}

/** Start the server on 127.0.0.1 and resolve with its base URL. */
export function startServer(port = 0) {
  const server = makeServer();
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      resolve({ server, url: `http://127.0.0.1:${server.address().port}` });
    });
  });
}
