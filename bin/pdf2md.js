#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { convertPdf } from '../src/convert.js';

const USAGE = `Usage: pdf2md <input.pdf | directory>... [-o <output>]

Convert PDF files to Markdown.

Arguments:
  input            One or more PDF files or directories (searched recursively).

Options:
  -o, --output     Output file (single PDF input) or output directory.
                   Defaults to writing <input>.md next to each PDF.
  -q, --quiet      Suppress per-file progress output.
  -h, --help       Show this help.

Scanned/image-only PDFs have no text layer; they produce a warning and an
empty (or partial) markdown file. OCR is out of scope for this tool.`;

function fail(message) {
  console.error(`pdf2md: ${message}`);
  process.exit(2);
}

async function collectPdfs(inputs) {
  const files = [];
  for (const input of inputs) {
    const info = await stat(input).catch(() => null);
    if (!info) fail(`no such file or directory: ${input}`);
    if (info.isDirectory()) {
      const entries = await readdir(input, { recursive: true });
      const pdfs = entries
        .filter((entry) => entry.toLowerCase().endsWith('.pdf'))
        .map((entry) => path.join(input, entry))
        .sort();
      if (pdfs.length === 0) console.error(`pdf2md: warning: no PDF files found in ${input}`);
      files.push(...pdfs.map((file) => ({ file, base: input })));
    } else {
      files.push({ file: input, base: null });
    }
  }
  return files;
}

/** Where the markdown for `file` goes, mirroring directory structure under -o. */
function outputPathFor({ file, base }, output, singleFileMode) {
  const mdName = file.replace(/\.pdf$/i, '') + '.md';
  if (!output) return mdName;
  if (singleFileMode) return output;
  const relative = base ? path.relative(base, mdName) : path.basename(mdName);
  return path.join(output, relative);
}

async function main() {
  let args;
  try {
    args = parseArgs({
      allowPositionals: true,
      options: {
        output: { type: 'string', short: 'o' },
        quiet: { type: 'boolean', short: 'q', default: false },
        help: { type: 'boolean', short: 'h', default: false },
      },
    });
  } catch (error) {
    fail(error.message);
  }

  if (args.values.help) {
    console.log(USAGE);
    return;
  }
  if (args.positionals.length === 0) fail(`missing input\n\n${USAGE}`);

  const targets = await collectPdfs(args.positionals);
  const output = args.values.output;
  const singleFileMode =
    Boolean(output) &&
    targets.length === 1 &&
    targets[0].base === null &&
    !output.endsWith(path.sep);
  if (output && !singleFileMode && targets.length > 1 && /\.md$/i.test(output)) {
    fail(`-o points to a single .md file but there are ${targets.length} input PDFs`);
  }

  let failures = 0;
  for (const target of targets) {
    const destination = outputPathFor(target, output, singleFileMode);
    try {
      const result = await convertPdf(target.file);
      if (result.markdown.trim() === '') {
        console.error(
          `pdf2md: warning: ${target.file} produced no text — likely a scanned/image-only PDF (OCR is not supported)`,
        );
      }
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, result.markdown, 'utf8');
      if (!args.values.quiet) {
        console.log(`${target.file} -> ${destination} (${result.markdown.length.toLocaleString()} chars)`);
      }
    } catch (error) {
      failures += 1;
      console.error(`pdf2md: error: ${target.file}: ${error.message}`);
    }
  }

  if (failures > 0) {
    console.error(`pdf2md: ${failures} of ${targets.length} file(s) failed`);
    process.exit(1);
  }
}

await main();
