import { statSync } from 'node:fs';
import { join } from 'node:path';

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Size of a file served from /public (e.g. "/media/attachments/x.pdf"), or null if it is missing. */
export function sizeOf(file: string): string | null {
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
