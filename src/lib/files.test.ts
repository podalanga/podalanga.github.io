import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { countPdfPages, pageCountOf } from './files';

describe('countPdfPages', () => {
  it('reads the page count from the file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pages-'));
    const pdf = await PDFDocument.create();
    for (let i = 0; i < 3; i++) pdf.addPage();
    const path = join(dir, 'three.pdf');
    await writeFile(path, await pdf.save());
    expect(await countPdfPages(path)).toBe(3);
  });

  it('returns null for a missing or unreadable file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pages-'));
    const path = join(dir, 'broken.pdf');
    await writeFile(path, 'not a pdf');
    expect(await countPdfPages(path)).toBeNull();
    expect(await countPdfPages(join(dir, 'missing.pdf'))).toBeNull();
  });
});

describe('pageCountOf', () => {
  it('skips files that are not PDFs', async () => {
    expect(await pageCountOf('/media/attachments/signal-acquired.txt')).toBeNull();
  });
});
