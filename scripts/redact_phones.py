"""Censors phone numbers out of PDFs: the backstop behind the CMS's own censoring.

The CMS removes phone numbers from a PDF in the browser before it saves it (public/admin/
pdf-censor.js and censor-core.js). This applies the same rules again to whatever is about to be
published, so a PDF that reached the repository some other way (a plain git push, an older upload)
is still never served with a number in it:

  1. any link whose address starts with tel:, on any page;
  2. phone-shaped text in the top TOP_SHARE of page 1, where a LaTeX resume puts its contact line;
  3. every other appearance, anywhere in the document, of a number found by 1 or 2.

Real redaction: the glyphs are deleted from the page, the tel: links removed, document info
scrubbed, and the file rewritten with unused objects collected. Every censored file is opened again
and checked; any trace left is an error, which fails the deploy.

    python scripts/redact_phones.py dist                 # censor every PDF under dist/
    python scripts/redact_phones.py --check public src   # report only, change nothing

Exit status: 0 when every PDF is clean (or was cleaned), 1 when one is not, 2 on bad use.
Never prints a number it finds, only where it was.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

import pymupdf

TOP_SHARE = 0.35

# Same pattern as censor-core.js: Indian mobiles in any spacing, with or without +91 or a leading
# 0, and other international numbers written with a leading +.
PHONE = re.compile(
    r"(?:\(?\+\s?\d{1,3}\)?[\s.-]*)?(?:\(?0\)?[\s.-]*)?[6-9](?:[\s.-]*\d){9}(?!\d)"
    r"|\+\d(?:[\s.()-]*\d){7,14}(?!\d)"
)
INFO_KEYS = ("title", "author", "subject", "keywords", "creator", "producer")


def phone_key(text: str) -> str:
    digits = re.sub(r"\D", "", text)
    return digits[-10:] if len(digits) >= 8 else ""


def phone_spans(text: str) -> list[tuple[int, int]]:
    spans = []
    for m in PHONE.finditer(text):
        start, end = m.start(), m.end()
        while start < end and text[start] in " \t.(-":
            start += 1
        while end > start and text[end - 1] in " \t.)-":
            end -= 1
        if phone_key(text[start:end]):
            spans.append((start, end))
    return spans


def key_spans(text: str, key: str) -> list[tuple[int, int]]:
    positions = [i for i, c in enumerate(text) if c.isdigit()]
    joined = "".join(text[i] for i in positions)
    spans = []
    at = joined.find(key)
    while at != -1:
        start, end = positions[at], positions[at + len(key) - 1] + 1
        if re.fullmatch(r"[\d\s.()+-]*", text[start:end]):
            spans.append((start, end))
        at = joined.find(key, at + 1)
    return spans


def page_lines(page: pymupdf.Page) -> list[tuple[str, list[pymupdf.Rect]]]:
    """Every text line of a page, with each character's box."""
    lines = []
    for block in page.get_text("rawdict", flags=pymupdf.TEXT_PRESERVE_WHITESPACE)["blocks"]:
        for line in block.get("lines", []):
            text, boxes = "", []
            for span in line["spans"]:
                for ch in span["chars"]:
                    text += ch["c"]
                    boxes.append(pymupdf.Rect(ch["bbox"]))
            lines.append((text, boxes))
    return lines


def span_rect(boxes: list[pymupdf.Rect], span: tuple[int, int]) -> pymupdf.Rect:
    rect = pymupdf.Rect(boxes[span[0]])
    for box in boxes[span[0] : span[1]]:
        rect |= box
    return rect + (-0.5, -0.5, 0.5, 0.5)


def find_phones(doc: pymupdf.Document, known: set[str] | None = None):
    """Everything in `doc` that reveals a number: (findings, keys). Each finding is a dict."""
    keys = set(known or ())
    findings = []
    for p, page in enumerate(doc):
        for link in page.get_links():
            uri = link.get("uri") or ""
            if re.match(r"\s*tel:", uri, re.I):
                if phone_key(uri):
                    keys.add(phone_key(uri))
                findings.append({"kind": "link", "page": p, "rect": link["from"], "link": link})

    if len(doc) > 0:
        first = doc[0]
        limit = first.rect.y0 + first.rect.height * TOP_SHARE
        for text, boxes in page_lines(first):
            for span in phone_spans(text):
                rect = span_rect(boxes, span)
                if rect.y0 > limit:
                    continue
                keys.add(phone_key(text[span[0] : span[1]]))
                findings.append({"kind": "text", "page": 0, "rect": rect})

    for p, page in enumerate(doc):
        for text, boxes in page_lines(page):
            for key in keys:
                for span in key_spans(text, key):
                    rect = span_rect(boxes, span)
                    if not any(f["kind"] == "text" and f["page"] == p and abs(f["rect"] - rect) < 2 for f in findings):
                        findings.append({"kind": "text", "page": p, "rect": rect})

    meta = doc.metadata or {}
    for name in INFO_KEYS:
        value = meta.get(name) or ""
        if re.search(r"tel:", value, re.I) or phone_spans(value) or any(key_spans(value, k) for k in keys):
            findings.append({"kind": "info", "field": name})
    xmp = doc.get_xml_metadata() or ""
    if re.search(r"tel:", xmp, re.I) or any(key_spans(xmp, k) for k in keys):
        findings.append({"kind": "xmp"})
    return findings, keys


def censor(path: Path) -> int:
    """Censors one PDF in place. Returns how many places were removed; raises if any are left."""
    doc = pymupdf.open(path)
    if doc.needs_pass:
        raise RuntimeError("password protected, so it cannot be checked")
    findings, keys = find_phones(doc)
    if not findings:
        return 0

    for p, page in enumerate(doc):
        here = [f for f in findings if f.get("page") == p]
        if not here:
            continue
        for f in here:
            page.add_redact_annot(f["rect"], fill=(0, 0, 0))
        for link in page.get_links():
            if re.match(r"\s*tel:", link.get("uri") or "", re.I):
                page.delete_link(link)
        page.apply_redactions(
            images=pymupdf.PDF_REDACT_IMAGE_NONE,
            graphics=pymupdf.PDF_REDACT_LINE_ART_NONE,
            text=pymupdf.PDF_REDACT_TEXT_REMOVE,
        )
    meta = dict(doc.metadata or {})
    for f in findings:
        if f["kind"] == "info":
            meta[f["field"]] = ""
    doc.set_metadata(meta)
    doc.del_xml_metadata()

    data = doc.tobytes(garbage=4, deflate=True, clean=True)
    left, _ = find_phones(pymupdf.open(stream=data, filetype="pdf"), keys)
    if left:
        raise RuntimeError(f"the censored copy still shows the number ({', '.join(f['kind'] for f in left)})")
    path.write_bytes(data)
    return len(findings)


def main(argv: list[str]) -> int:
    check = "--check" in argv
    roots = [Path(a) for a in argv if a != "--check"]
    if not roots:
        print(__doc__, file=sys.stderr)
        return 2
    pdfs = sorted({p for root in roots for p in ([root] if root.is_file() else root.rglob("*")) if p.suffix.lower() == ".pdf"})
    bad = 0
    for path in pdfs:
        try:
            if check:
                findings, _ = find_phones(pymupdf.open(path))
                if findings:
                    bad += 1
                    print(f"::error file={path}::phone number found ({', '.join(sorted({f['kind'] for f in findings}))})")
            else:
                removed = censor(path)
                if removed:
                    print(f"censored {path}: removed {removed} place{'' if removed == 1 else 's'}")
        except Exception as err:  # a PDF that can't be checked can't be published
            bad += 1
            print(f"::error file={path}::{err}")
    print(f"{len(pdfs)} PDF{'' if len(pdfs) == 1 else 's'} checked, {bad} with a problem.")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
