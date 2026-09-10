"""Focused checks for source preservation and metadata-only publication."""
import copy
import json
from pathlib import Path
import tempfile
import unittest
from import_memory_catalog import load_memory_catalog


class MemoryImportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        (self.root / "data").mkdir()
        self.entry = {"title": "Recovery fixture title", "subtitle": "",
                      "types": ["catalytic_sunday", "40_day_campaign"], "status": "concept",
                      "sources": [{"title": "Fixture source", "url": "https://example.com/source", "locator": "item 1"},
                                  {"title": "Fixture source", "url": "https://example.com/source", "locator": "item 2"}]}

    def tearDown(self):
        self.temp.cleanup()

    def load(self, entries):
        (self.root / "data/memory-catalog.json").write_text(json.dumps({"schemaVersion": 1, "entries": entries}))
        sections = [{"id": i} for i in range(79)]
        result = load_memory_catalog(self.root, sections)
        return *result, sections

    def test_variants_blank_subtitles_and_source_occurrences(self):
        variant = copy.deepcopy(self.entry)
        variant["subtitle"] = "An exact alternate subtitle"
        records, stats, sections = self.load([self.entry, variant])
        self.assertEqual(records[0]["Subtitle"], "")
        self.assertNotEqual(records[0]["Master ID"], records[1]["Master ID"])
        self.assertEqual(records[0]["_memory"]["sources"], self.entry["sources"])
        self.assertEqual(stats, {"memoryTitles": 2, "memorySourceOccurrences": 4})
        self.assertEqual([s["id"] for s in sections], list(range(80)))
        self.assertEqual(records[1]["_section"], 79)

    def test_rejects_raw_transcripts_and_unsafe_links(self):
        for mutate in [lambda e: e.update(excerpt="Private transcript"),
                       lambda e: e["sources"][0].update(excerpt="Private transcript"),
                       lambda e: e["sources"][0].update(url="javascript:alert(1)")]:
            entry = copy.deepcopy(self.entry)
            mutate(entry)
            with self.assertRaises(ValueError):
                self.load([entry])

    def test_duplicate_ids_and_missing_sources_fail(self):
        with self.assertRaises(ValueError):
            self.load([self.entry, self.entry])
        entry = copy.deepcopy(self.entry)
        entry["sources"] = []
        with self.assertRaises(ValueError):
            self.load([entry])

    def test_public_import_keeps_private_references_out(self):
        entry = copy.deepcopy(self.entry)
        entry.pop("sources")
        entry["sourceCount"] = 2
        records, stats, sections = self.load([entry])
        self.assertEqual(records[0]["_memory"]["sources"], [])
        self.assertEqual(records[0]["Source occurrences"], "2")
        self.assertEqual(stats["memorySourceOccurrences"], 2)
        self.assertNotIn("example.com", json.dumps(records))


if __name__ == "__main__":
    unittest.main()
