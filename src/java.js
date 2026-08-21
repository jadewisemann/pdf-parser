import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, readdir, rename, rm, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const CACHE_DIR = path.join(homedir(), '.pdf2md');
const JRE_DIR = path.join(CACHE_DIR, 'jre-21');
const JAVA_BIN = process.platform === 'win32' ? 'java.exe' : 'java';

function javaWorks() {
  const probe = spawnSync('java', ['-version'], { stdio: 'ignore' });
  return !probe.error && probe.status === 0;
}

function prependToPath(binDir) {
  process.env.PATH = `${binDir}${path.delimiter}${process.env.PATH ?? ''}`;
}

/** Walk a directory tree for bin/java (handles the archive's top-level dir
 *  and the macOS Contents/Home layout). */
async function findJavaBinDir(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'bin') {
        const java = path.join(full, JAVA_BIN);
        if (await stat(java).catch(() => null)) return full;
      }
      const nested = await findJavaBinDir(full);
      if (nested) return nested;
    }
  }
  return null;
}

function adoptiumUrl() {
  const os = { linux: 'linux', darwin: 'mac', win32: 'windows' }[process.platform];
  const arch = { x64: 'x64', arm64: 'aarch64' }[process.arch];
  if (!os || !arch) {
    throw new Error(
      `no bundled JRE available for ${process.platform}/${process.arch} — please install Java 11+ manually (https://adoptium.net)`,
    );
  }
  return `https://api.adoptium.net/v3/binary/latest/21/ga/${os}/${arch}/jre/hotspot/normal/eclipse`;
}

async function downloadJre(log) {
  const url = process.env.PDF2MD_JRE_URL ?? adoptiumUrl();
  log(`pdf2md: Java가 설치되어 있지 않아 JRE를 내려받습니다 (최초 1회, 약 50MB)...`);

  const stagingDir = path.join(CACHE_DIR, `jre-download-${process.pid}`);
  await rm(stagingDir, { recursive: true, force: true });
  await mkdir(stagingDir, { recursive: true });
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`JRE download failed: HTTP ${response.status} from ${url}`);
    const archivePath = path.join(stagingDir, 'jre-archive');
    await pipeline(Readable.fromWeb(response.body), createWriteStream(archivePath));

    // tar ships with Linux/macOS and Windows 10+, and reads both .tar.gz and .zip.
    const extractDir = path.join(stagingDir, 'extracted');
    await mkdir(extractDir);
    await new Promise((resolve, reject) => {
      const tar = spawn('tar', ['-xf', archivePath, '-C', extractDir], { stdio: 'inherit' });
      tar.on('error', reject);
      tar.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`tar exited with ${code}`))));
    });
    if (!(await findJavaBinDir(extractDir))) throw new Error('downloaded archive does not contain bin/java');

    await rm(JRE_DIR, { recursive: true, force: true });
    await rename(extractDir, JRE_DIR);
    log('pdf2md: JRE 준비 완료');
  } finally {
    await rm(stagingDir, { recursive: true, force: true });
  }
}

let ensured;

/**
 * Make sure a `java` command is available to child processes: use the
 * system Java if present, else a previously downloaded JRE in ~/.pdf2md,
 * else download one from Adoptium (override the URL with PDF2MD_JRE_URL).
 */
export function ensureJava({ log = (line) => console.error(line) } = {}) {
  ensured ??= (async () => {
    if (javaWorks()) return;
    let binDir = await findJavaBinDir(JRE_DIR);
    if (!binDir) {
      await downloadJre(log);
      binDir = await findJavaBinDir(JRE_DIR);
    }
    prependToPath(binDir);
    if (!javaWorks()) {
      throw new Error(`downloaded JRE at ${JRE_DIR} does not run — delete the directory to retry, or install Java 11+ manually`);
    }
  })().catch((error) => {
    ensured = undefined;
    throw error;
  });
  return ensured;
}
