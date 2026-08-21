import { convert } from '@opendataloader/pdf';

/**
 * Convert a single PDF file to markdown using opendataloader-pdf
 * (Java engine bundled with the npm package; requires Java 11+).
 *
 * Throws on unreadable or unparsable input. An empty markdown result
 * usually means the document has no text layer (scanned/image-only) —
 * OCR is out of scope for this tool.
 */
export async function convertPdf(inputPath) {
  const markdown = await convert(inputPath, {
    format: 'markdown',
    toStdout: true,
    quiet: true,
  });
  return { markdown };
}
