import { readFile } from 'node:fs/promises';
import { processPdfAsync, PdfType } from '@firecrawl/pdf-inspector';

/**
 * Convert a single PDF file to markdown.
 *
 * Returns the markdown string plus metadata the caller can use for
 * warnings (scanned pages, encoding issues). Throws on unreadable or
 * unparsable input.
 */
export async function convertPdf(inputPath) {
  const buffer = await readFile(inputPath);
  const result = await processPdfAsync(buffer);

  return {
    markdown: result.markdown ?? '',
    pdfType: result.pdfType,
    pageCount: result.pageCount,
    title: result.title,
    pagesNeedingOcr: result.pagesNeedingOcr,
    ocrReasonsByPage: result.ocrReasonsByPage,
    hasEncodingIssues: result.hasEncodingIssues,
  };
}

/** True when the document has no usable text layer at all. */
export function isImageOnly(pdfType) {
  return pdfType === PdfType.Scanned || pdfType === PdfType.ImageBased;
}

const OCR_REASON_LABELS = {
  suspected_garbled_text: 'a font without a Unicode mapping (only text in that font may be garbled)',
  vector_text: 'text drawn as vector outlines (that text cannot be extracted)',
  scanned: 'an image-backed page with no usable text',
  no_text: 'no extractable text',
};

/**
 * Summarize per-page OCR reason codes into "<label>: N page(s)" parts.
 * For a TextBased document these flags mean specific elements on a page
 * may be lost or garbled — not that the page itself is a scan.
 */
export function summarizeOcrReasons(ocrReasonsByPage) {
  const counts = new Map();
  for (const { reasons } of ocrReasonsByPage) {
    for (const reason of reasons) counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  return [...counts].map(
    ([reason, pages]) => `${OCR_REASON_LABELS[reason] ?? reason}: ${pages} page(s)`,
  );
}
