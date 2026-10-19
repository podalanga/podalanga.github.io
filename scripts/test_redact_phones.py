"""Tests for redact_phones.py. Every number here is the stock placeholder +91 98765 43210, never a
real one. Run: python -m unittest discover -s scripts -p 'test_*.py'"""

import re
import sys
import tempfile
import unittest
from pathlib import Path

import pymupdf

sys.path.insert(0, str(Path(__file__).parent))
import redact_phones as rp  # noqa: E402

FAKE = "+91 98765 43210"
KEY = "9876543210"
PART = "Part no. 6123456789"  # phone-shaped, but on page 2 and not the found number: must stay


def resume(tmp: Path, *, number_in_info=False, repeat_on_page_2=True) -> Path:
    """A resume laid out like the user's LaTeX one: name, then a contact line with a tel: link."""
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((200, 60), "Jane Example", fontsize=20)
    page.insert_text((150, 85), f"Chennai, India   {FAKE}   jane@example.com", fontsize=10)
    phone_box = page.search_for(FAKE)[0]
    page.insert_link({"kind": pymupdf.LINK_URI, "from": phone_box, "uri": "tel:" + FAKE.replace(" ", "")})
    page.insert_link({"kind": pymupdf.LINK_URI, "from": page.search_for("jane@example.com")[0], "uri": "mailto:jane@example.com"})
    page.insert_text((72, 400), "Experience: control systems, DOI 10.1126/scirobotics.9876543", fontsize=10)
    second = doc.new_page()
    second.insert_text((72, 100), PART, fontsize=10)
    if repeat_on_page_2:
        second.insert_text((72, 140), f"Call me on 98765-43210 any time.", fontsize=10)
    if number_in_info:
        doc.set_metadata({"title": "Resume", "subject": f"Contact {FAKE}"})
    path = tmp / "resume.pdf"
    doc.save(path)
    return path


def digits(path: Path) -> str:
    return re.sub(r"\D", "", "".join(p.get_text() for p in pymupdf.open(path)))


class CensorTest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())

    def test_removes_every_trace_and_nothing_else(self):
        path = resume(self.tmp, number_in_info=True)
        self.assertGreaterEqual(rp.censor(path), 4)  # link, top text, page 2 repeat, info
        doc = pymupdf.open(path)
        self.assertNotIn(KEY, digits(path))
        self.assertFalse([l for p in doc for l in p.get_links() if "tel:" in (l.get("uri") or "")])
        self.assertNotIn(KEY, re.sub(r"\D", "", str(doc.metadata)))
        raw = path.read_bytes() + doc.tobytes(expand=255)
        self.assertNotIn(b"tel:", raw)
        self.assertNotIn(KEY.encode(), raw)
        text = "".join(p.get_text() for p in doc)
        for kept in ("Jane Example", "jane@example.com", "Chennai, India", PART, "scirobotics.9876543"):
            self.assertIn(kept, text)
        self.assertEqual([l["uri"] for p in doc for l in p.get_links()], ["mailto:jane@example.com"])

    def test_a_second_run_finds_nothing(self):
        path = resume(self.tmp)
        rp.censor(path)
        before = path.read_bytes()
        self.assertEqual(rp.censor(path), 0)
        self.assertEqual(path.read_bytes(), before)

    def test_number_without_a_link_is_still_found_at_the_top(self):
        doc = pymupdf.open()
        doc.new_page().insert_text((150, 85), f"Mobile: {FAKE}", fontsize=10)
        path = self.tmp / "nolink.pdf"
        doc.save(path)
        self.assertEqual(rp.censor(path), 1)
        self.assertNotIn(KEY, digits(path))

    def test_numbers_lower_down_are_left_alone(self):
        doc = pymupdf.open()
        doc.new_page().insert_text((72, 600), "Sample 9123456789 measured at 22:31:11, 10.7589 N", fontsize=10)
        path = self.tmp / "report.pdf"
        doc.save(path)
        before = path.read_bytes()
        self.assertEqual(rp.censor(path), 0)
        self.assertEqual(path.read_bytes(), before)

    def test_check_mode_reports_without_changing(self):
        path = resume(self.tmp)
        before = path.read_bytes()
        self.assertEqual(rp.main(["--check", str(self.tmp)]), 1)
        self.assertEqual(path.read_bytes(), before)
        self.assertEqual(rp.main([str(self.tmp)]), 0)
        self.assertEqual(rp.main(["--check", str(self.tmp)]), 0)

    def test_published_attachments_are_clean(self):
        root = Path(__file__).parent.parent / "public" / "media" / "attachments"
        self.assertEqual(rp.main(["--check", str(root)]), 0)


class PatternTest(unittest.TestCase):
    def test_phone_shapes(self):
        for text in (FAKE, "+91-98765-43210", "(+91) 9876543210", "098765 43210", "9876543210", "+44 20 7946 0958"):
            self.assertTrue(rp.phone_spans(f"Phone: {text} | mail"), text)

    def test_not_phones(self):
        for text in ("10.7589°N 78.8132°E", "22:31:11 IST", "2026-10-19", "ISBN 978-0-14-118776-1"[:12], "12345"):
            self.assertFalse(rp.phone_spans(text), text)


if __name__ == "__main__":
    unittest.main()
