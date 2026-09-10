"""Import catalog metadata only; conversation transcripts never enter the website."""
import hashlib
import json
from urllib.parse import urlsplit

TYPE_LABELS = {
    "catalytic_sunday": "Catalytic Sunday sermon concept",
    "40_day_campaign": "40-day campaign concept",
}
ENTRY_FIELDS = {"id", "title", "subtitle", "types", "status", "sources", "sourceCount"}
SOURCE_FIELDS = {"title", "url", "locator"}


def load_memory_catalog(root, sections):
    path = root / "data/memory-catalog.json"
    if not path.exists():
        return [], {"memoryTitles": 0, "memorySourceOccurrences": 0}
    catalog = json.loads(path.read_text())
    if set(catalog) - {"schemaVersion", "generatedAt", "entries"}:
        raise ValueError("memory-catalog.json permits catalog metadata only")
    if catalog.get("schemaVersion") != 1 or not isinstance(catalog.get("entries"), list):
        raise ValueError("Expected memory catalog schemaVersion 1 and entries array")
    columns = ["Master ID", "Campaign Title", "Subtitle", "Category", "Format / Product Type",
               "Source Item Type", "Source Document", "Source Sheet / Section",
               "Original Link / Reference", "Build Decision", "Notes", "Import status",
               "Source occurrences"]
    section = {"id": len(sections), "name": "Recovered campaign and Catalytic Sunday titles",
               "columns": columns, "rows": [], "rowOffset": 1}
    records, seen, occurrences = [], set(), 0
    for entry in catalog["entries"]:
        if not isinstance(entry, dict) or set(entry) - ENTRY_FIELDS:
            raise ValueError("Memory entries may contain only title/subtitle, types, status, and sources")
        title, subtitle = entry.get("title"), entry.get("subtitle", "")
        if not isinstance(title, str) or not title.strip() or not isinstance(subtitle, str):
            raise ValueError("Each memory entry needs a title and a string subtitle; missing subtitles use an empty string")
        types = entry.get("types", [])
        if not isinstance(types, list) or not types or any(t not in TYPE_LABELS for t in types):
            raise ValueError("Memory types must be catalytic_sunday and/or 40_day_campaign")
        types = list(dict.fromkeys(types))
        status = entry.get("status", "concept")
        if not isinstance(status, str):
            raise ValueError("Memory status must be a string")
        ident = entry.get("id") or "MEM-" + hashlib.sha256((title + "\0" + subtitle).encode()).hexdigest()[:16]
        if not isinstance(ident, str) or not ident.startswith("MEM-") or ident in seen:
            raise ValueError("Each memory title needs a unique MEM- identifier; group identical pairs with all source occurrences")
        sources = entry.get("sources", [])
        source_count = entry.get("sourceCount", len(sources))
        if not isinstance(sources, list) or type(source_count) is not int or source_count < max(1, len(sources)):
            raise ValueError("Every memory entry needs source references or a positive aggregate sourceCount")
        for source in sources:
            if not isinstance(source, dict) or set(source) - SOURCE_FIELDS:
                raise ValueError("Sources permit title, URL, and locator only; never add transcript excerpts")
            if not isinstance(source.get("title"), str) or not source["title"].strip():
                raise ValueError("Each source needs a chat title or public document label")
            if any(not isinstance(v, str) for v in source.values()):
                raise ValueError("Source metadata must be text")
            if source.get("url"):
                parsed = urlsplit(source["url"])
                if parsed.scheme not in ("http", "https") or not parsed.netloc or parsed.username or parsed.password:
                    raise ValueError("Source links must be ordinary HTTP(S) URLs")
        seen.add(ident)
        labels = [TYPE_LABELS[t] for t in types]
        refs = [" · ".join(source.get(k, "") for k in ("title", "url", "locator") if source.get(k)) for source in sources]
        record = {
            "Master ID": ident, "Campaign Title": title, "Subtitle": subtitle,
            "Category": " / ".join(labels), "Format / Product Type": " / ".join(labels),
            "Source Item Type": "Recovered title / concept", "Source Document": "; ".join(dict.fromkeys(s["title"] for s in sources)) or "Recovered title catalog",
            "Source Sheet / Section": section["name"], "Original Link / Reference": "\n".join(refs),
            "Build Decision": "Source title only; manuscript and edition status unverified",
            "Notes": "Exact source title and available subtitle. Source occurrences and wording variants are retained.",
            "Import status": status, "Source occurrences": str(source_count),
            "_section": section["id"], "_row": len(section["rows"]),
            "_memory": {"types": types, "status": status, "sources": sources, "sourceCount": source_count},
        }
        section["rows"].append([record[c] for c in columns])
        records.append(record)
        occurrences += source_count
    sections.append(section)
    return records, {"memoryTitles": len(records), "memorySourceOccurrences": occurrences}
