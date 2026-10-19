// Phone-number censoring for PDFs. pdf-censor.js runs it on every PDF the CMS saves, in the browser,
// before the save request leaves it (a save is committed to the public repository at once, so the
// file has to be clean before then). scripts/redact_phones.py applies the same rules to the built
// site as a backstop; keep the two in step.
//
// Real redaction, not a box drawn on top: MuPDF deletes the glyphs under each redaction from the
// page's content stream, drops the tel: links, scrubs the document info, and the file is rewritten
// from scratch with unused objects collected, so the number is gone from the bytes.
//
// What counts as the phone number:
//   1. any link whose address starts with tel:, on any page;
//   2. phone-shaped text in the top TOP_SHARE of page 1, where a LaTeX resume puts its contact
//      line (only there, so part numbers and DOIs further down are left alone);
//   3. every other appearance, anywhere in the document, of a number found by 1 or 2.
// Then the result is opened again and checked for all of it; censorPdf throws if anything is left.

export const TOP_SHARE = 0.35;

// +91 98765 43210, +91-98765-43210, (+91) 9876543210, 098765 43210, 9876543210, and other
// international numbers written with a leading +.
const PHONE = /(?:\(?\+\s?\d{1,3}\)?[\s.-]*)?(?:\(?0\)?[\s.-]*)?[6-9](?:[\s.-]*\d){9}(?!\d)|\+\d(?:[\s.()-]*\d){7,14}(?!\d)/g;

/** The last ten digits: how one number is recognised however it is spaced or prefixed. */
export function phoneKey(text) {
  const digits = text.replace(/\D/g, '');
  return digits.length >= 8 ? digits.slice(-10) : '';
}

/** [start, end) character spans of phone-shaped text in one line. */
export function phoneSpans(text) {
  const spans = [];
  for (const m of text.matchAll(PHONE)) {
    let start = m.index;
    let end = start + m[0].length;
    while (start < end && /[\s.(-]/.test(text[start])) start++;
    while (end > start && /[\s.)-]/.test(text[end - 1])) end--;
    if (phoneKey(text.slice(start, end))) spans.push([start, end]);
  }
  return spans;
}

/** [start, end) spans in `text` where the digits of `key` appear in order, separators allowed. */
export function keySpans(text, key) {
  const digits = [];
  for (let i = 0; i < text.length; i++) if (/\d/.test(text[i])) digits.push(i);
  const joined = digits.map((i) => text[i]).join('');
  const spans = [];
  for (let at = joined.indexOf(key); at !== -1; at = joined.indexOf(key, at + 1)) {
    const start = digits[at];
    const end = digits[at + key.length - 1] + 1;
    // Only when the digits run together with separators between them, not across words.
    if (/^[\d\s.()+-]*$/.test(text.slice(start, end))) spans.push([start, end]);
  }
  return spans;
}

/** Every text line of a page, with each character's quad. */
function pageLines(page) {
  const lines = [];
  let line = null;
  page.toStructuredText('preserve-whitespace').walk({
    beginLine() {
      line = { text: '', quads: [] };
    },
    onChar(c, _origin, _font, _size, quad) {
      if (!line) line = { text: '', quads: [] };
      line.text += c;
      for (let i = 0; i < c.length; i++) line.quads.push(quad);
    },
    endLine() {
      if (line) lines.push(line);
      line = null;
    },
  });
  return lines;
}

function spanRect(line, [start, end]) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const q of line.quads.slice(start, end)) {
    for (let i = 0; i < 8; i += 2) {
      x0 = Math.min(x0, q[i]); x1 = Math.max(x1, q[i]);
      y0 = Math.min(y0, q[i + 1]); y1 = Math.max(y1, q[i + 1]);
    }
  }
  return [x0 - 0.5, y0 - 0.5, x1 + 0.5, y1 + 0.5];
}

const INFO_KEYS = ['Title', 'Author', 'Subject', 'Keywords', 'Creator', 'Producer'];

/**
 * Everything that still reveals a number: tel: links, phone-shaped text at the top of page 1,
 * the given keys anywhere in the text, and info fields carrying any of them. Each finding has the
 * page and rectangle it was found at, when it has one.
 */
export function findPhones(mupdf, doc, knownKeys = []) {
  const keys = new Set(knownKeys);
  const findings = [];
  const pages = doc.countPages();

  for (let p = 0; p < pages; p++) {
    const page = doc.loadPage(p);
    for (const link of page.getLinks()) {
      const uri = link.getURI() ?? '';
      if (/^\s*tel:/i.test(uri)) {
        const key = phoneKey(uri);
        if (key) keys.add(key);
        findings.push({ kind: 'link', page: p, rect: link.getBounds(), key });
      }
    }
  }

  const first = pages > 0 ? doc.loadPage(0) : null;
  if (first) {
    const [, top, , bottom] = first.getBounds();
    const limit = top + (bottom - top) * TOP_SHARE;
    for (const line of pageLines(first)) {
      for (const span of phoneSpans(line.text)) {
        const rect = spanRect(line, span);
        if (rect[1] > limit) continue;
        keys.add(phoneKey(line.text.slice(...span)));
        findings.push({ kind: 'text', page: 0, rect, key: phoneKey(line.text.slice(...span)) });
      }
    }
  }

  for (let p = 0; p < pages; p++) {
    for (const line of pageLines(doc.loadPage(p))) {
      for (const key of keys) {
        for (const span of keySpans(line.text, key)) {
          const rect = spanRect(line, span);
          const seen = findings.some((f) => f.kind === 'text' && f.page === p && f.rect.every((v, i) => Math.abs(v - rect[i]) < 1));
          if (!seen) findings.push({ kind: 'text', page: p, rect, key });
        }
      }
    }
  }

  for (const name of INFO_KEYS) {
    const value = doc.getMetaData(`info:${name}`) ?? '';
    if (/tel:/i.test(value) || [...keys].some((k) => keySpans(value, k).length) || phoneSpans(value).length) {
      findings.push({ kind: 'info', field: name });
    }
  }
  const xmp = doc.getTrailer().get('Root').get('Metadata');
  if (xmp.isStream()) {
    const text = xmp.readStream().asString();
    if (/tel:/i.test(text) || [...keys].some((k) => keySpans(text, k).length)) findings.push({ kind: 'xmp' });
  }

  return { findings, keys: [...keys] };
}

/**
 * Censors a PDF. Returns { bytes, found, keys }, where `found` counts what was removed. Throws if
 * the file is not a PDF or if the censored copy still reveals anything.
 */
export function censorPdf(mupdf, input) {
  const doc = mupdf.Document.openDocument(input, 'application/pdf').asPDF();
  if (!doc) throw new Error('This file is not a PDF.');
  if (doc.needsPassword()) throw new Error('This PDF is password protected. Remove the password, then try again.');

  const { findings, keys } = findPhones(mupdf, doc);

  const byPage = new Map();
  for (const f of findings) {
    if (f.page === undefined) continue;
    if (!byPage.has(f.page)) byPage.set(f.page, []);
    byPage.get(f.page).push(f);
  }
  for (const [p, list] of byPage) {
    const page = doc.loadPage(p);
    for (const f of list) {
      const annot = page.createAnnotation('Redact');
      annot.setRect(f.rect);
      annot.update();
    }
    for (const link of page.getLinks()) {
      if (/^\s*tel:/i.test(link.getURI() ?? '')) page.deleteLink(link);
    }
    page.applyRedactions(
      true,
      mupdf.PDFPage.REDACT_IMAGE_NONE,
      mupdf.PDFPage.REDACT_LINE_ART_NONE,
      mupdf.PDFPage.REDACT_TEXT_REMOVE,
    );
  }

  for (const f of findings) {
    if (f.kind === 'info') doc.setMetaData(`info:${f.field}`, '');
  }
  // XMP metadata repeats the document info; nothing on the site needs it, so once a number has
  // been found it goes rather than being edited.
  if (findings.length > 0) doc.getTrailer().get('Root').delete('Metadata');

  const bytes = doc.saveToBuffer('garbage=4,compress,sanitize').asUint8Array().slice();

  const check = mupdf.Document.openDocument(bytes, 'application/pdf').asPDF();
  const left = findPhones(mupdf, check, keys).findings;
  if (left.length > 0) {
    throw new Error(`The censored copy still shows the number (${left.map((f) => f.kind).join(', ')}). Do not upload this file.`);
  }
  return { bytes, found: findings.length, keys };
}
