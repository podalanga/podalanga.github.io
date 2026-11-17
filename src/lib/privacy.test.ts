import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findPhoneNumbers, findPhonesInSite } from './privacy';

// Only the stock placeholder number, never a real one.
describe('findPhoneNumbers', () => {
  it('finds a number however it is written, and tel: links, masked', () => {
    for (const t of ['+91 98765 43210', '+91-98765-43210', '(+91) 9876543210', '098765 43210', '9876543210', 'tel:']) {
      expect(findPhoneNumbers(`Call ${t} now`)).toHaveLength(1);
    }
    expect(findPhoneNumbers('Call +91 98765 43210')[0]).not.toMatch(/\d/);
  });

  it("leaves the site's own figures alone", () => {
    for (const t of ['10.7589°N 78.8132°E', '22:31:11 IST', '2026-10-19', 'DOI 10.1126/scirobotics.adk6588', '0.0254 m', '1,234,567,890']) {
      expect(findPhoneNumbers(t)).toEqual([]);
    }
  });
});

describe('findPhonesInSite', () => {
  it('reads pages as a visitor sees them: drawings and scripts are not text', () => {
    const dir = mkdtempSync(join(tmpdir(), 'site-'));
    mkdirSync(join(dir, 'a'));
    writeFileSync(join(dir, 'clean.html'), '<svg><path d="M9.75 6.75 9.876543210 1z"/></svg><p>Hello</p>');
    writeFileSync(join(dir, 'a', 'leak.html'), '<p>Phone: <b>+91 98765 43210</b></p>');
    writeFileSync(join(dir, 'link.html'), '<a href="tel:+919876543210">Call</a>');
    expect(findPhonesInSite(dir).map((f) => f.split(':')[0].replace(dir, ''))).toEqual(['/a/leak.html', '/link.html']);
  });

  it('does not mistake a typeset matrix for a number, but still reads a number inside a formula', () => {
    const dir = mkdtempSync(join(tmpdir(), 'site-'));
    const katex = (tex: string, glyphs: string) =>
      `<span class="katex"><span class="katex-mathml"><math><semantics><mrow></mrow><annotation encoding="application/x-tex">${tex}</annotation></semantics></math></span>` +
      `<span class="katex-html" aria-hidden="true">${glyphs}</span></span>`;
    const digits = (d: string) => [...d].map((c) => `<span class="mord">${c}</span>`).join('');
    writeFileSync(join(dir, 'matrix.html'), `<p>${katex('\\begin{bmatrix}6&1\\\\2&3\\end{bmatrix}', digits('6123900012'))}</p>`);
    writeFileSync(join(dir, 'leak.html'), `<p>${katex('9876543210', digits('9876543210'))}</p>`);
    expect(findPhonesInSite(dir).map((f) => f.split(':')[0].replace(dir, ''))).toEqual(['/leak.html']);
  });
});
