import { readFile } from 'node:fs/promises';
import { statSync } from 'node:fs';
import { join } from 'node:path';
import { PDFDocument } from 'pdf-lib';

/** True for a document hosted elsewhere (e.g. a Canva deck) rather than uploaded to /public. */
export function isExternal(file: string): boolean {
  return /^https?:\/\//i.test(file);
}

/** "CANVA" for canva.com, otherwise the site's bare host name, upper-cased. */
export function hostOf(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return (host.split('.').at(-2) ?? host).toUpperCase();
  } catch {
    return 'LINK';
  }
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Size of a file served from /public (e.g. "/media/attachments/x.pdf"), or null if it is missing. */
export function sizeOf(file: string): string | null {
  if (isExternal(file)) return null;
  try {
    // Resolved from the project root: the bundled build runs from a different folder than src/.
    return formatSize(statSync(join(process.cwd(), 'public', file)).size);
  } catch {
    return null;
  }
}

export function extOf(file: string): string {
  const match = file.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toUpperCase() : 'FILE';
}

/** Number of pages in the PDF at an absolute path, or null if it is missing or unreadable. */
export async function countPdfPages(path: string): Promise<number | null> {
  try {
    const pdf = await PDFDocument.load(await readFile(path), { ignoreEncryption: true, updateMetadata: false });
    return pdf.getPageCount();
  } catch {
    return null;
  }
}

/** Page count of a PDF served from /public, read from the file so it follows every upload. */
export async function pageCountOf(file: string): Promise<number | null> {
  if (isExternal(file) || extOf(file) !== 'PDF') return null;
  return countPdfPages(join(process.cwd(), 'public', file));
}
