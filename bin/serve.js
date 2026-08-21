#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { startServer } from '../src/server.js';

const port = Number(process.argv[2] ?? 8787);
const { url } = await startServer(port);
console.log(`pdf2md: ${url} 를 브라우저로 여세요 (종료: Ctrl+C)`);

// Best-effort: open the default browser for the user.
const opener =
  process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
spawn(opener, [url], { stdio: 'ignore', shell: process.platform === 'win32', detached: true })
  .on('error', () => {})
  .unref();
