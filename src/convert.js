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
    hasEncodingIssues: result.hasEncodingIssues,
  };
}

/** True when the document has no usable text layer at all. */
export function isImageOnly(pdfType) {
  return pdfType === PdfType.Scanned || pdfType === PdfType.ImageBased;
}
