// The CMS's in-browser PDF censor (public/admin/censor-core.js), run here against the same MuPDF
// build the admin page loads. The fixture is a resume laid out like a LaTeX one, carrying only the
// stock placeholder number +91 98765 43210 (made by scripts/test_redact_phones.py).
import { readFileSync } from 'node:fs';
import * as mupdf from 'mupdf';
import { describe, expect, it } from 'vitest';
import { censorPdf, keySpans, phoneSpans } from '../../public/admin/censor-core.js';

const KEY = '9876543210';
const fixture = () => new Uint8Array(readFileSync('scripts/fixtures/fake-resume.pdf'));

function read(bytes: Uint8Array) {
  const doc = mupdf.Document.openDocument(bytes, 'application/pdf');
  const pages = Array.from({ length: doc.countPages() }, (_, i) => doc.loadPage(i));
  return {
    text: pages.map((p) => p.toStructuredText('preserve-whitespace').asText()).join('\n'),
    links: pages.flatMap((p) => p.getLinks().map((l) => l.getURI())),
    subject: doc.getMetaData('info:Subject') ?? '',
  };
}

describe('censorPdf', () => {
  it('removes the number everywhere it appears and keeps everything else', () => {
    const before = read(fixture());
    expect(before.text.replace(/\D/g, '')).toContain(KEY);

    const out = censorPdf(mupdf, fixture());
    expect(out.found).toBeGreaterThanOrEqual(4); // tel: link, top line, page 2 repeat, document info
    const after = read(out.bytes);
    expect(after.text.replace(/\D/g, '')).not.toContain(KEY);
    expect(after.links).toEqual(['mailto:jane@example.com']);
    expect(after.subject.replace(/\D/g, '')).not.toContain(KEY);
    for (const kept of ['Jane Example', 'jane@example.com', 'Chennai, India', 'Part no. 6123456789', 'scirobotics.9876543']) {
      expect(after.text).toContain(kept);
    }
    const raw = Buffer.from(out.bytes).toString('latin1');
    expect(raw).not.toContain('tel:');
    expect(raw).not.toContain(KEY);
  });

  it('finds nothing in a file it has already censored', () => {
    expect(censorPdf(mupdf, censorPdf(mupdf, fixture()).bytes).found).toBe(0);
  });

  it('leaves the published reports alone', () => {
    for (const name of ['zbot-report', 'watch-report', 'cswa-certificate']) {
      expect(censorPdf(mupdf, new Uint8Array(readFileSync(`public/media/attachments/${name}.pdf`))).found).toBe(0);
    }
  }, 60_000);

  it('refuses a file that is not a PDF', () => {
    expect(() => censorPdf(mupdf, new TextEncoder().encode('%PDF-1.4 garbage'))).toThrow();
  });
});

describe('phone patterns', () => {
  it('match a number however it is written', () => {
    for (const t of ['+91 98765 43210', '+91-98765-43210', '(+91) 9876543210', '098765 43210', '9876543210']) {
      expect(phoneSpans(`Phone: ${t} | mail`)).toHaveLength(1);
    }
    expect(keySpans('call 98765-43210 now', KEY)).toEqual([[5, 16]]);
  });

  it('leave coordinates, clocks and dates alone', () => {
    for (const t of ['10.7589°N 78.8132°E', '22:31:11 IST', '2026-10-19', '12345']) expect(phoneSpans(t)).toEqual([]);
  });
});
