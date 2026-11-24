"""Offline, review-first image research agent. Run from backend with Python.
Only fetch explicitly approved public university pages; never mutate live JSON.
"""
import json
import sys
from pathlib import Path
from urllib.parse import urljoin, urlsplit
from html.parser import HTMLParser
import httpx

class Metadata(HTMLParser):
    def __init__(self):
        super().__init__()
        self.images = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "meta" and a.get("property") == "og:image" and a.get("content"):
            self.images.append(a["content"])

def research(url, allowed_domains):
    if urlsplit(url).scheme != "https" or urlsplit(url).hostname not in allowed_domains:
        raise ValueError("Unapproved source")
    response = httpx.get(url, timeout=15, follow_redirects=False)
    response.raise_for_status()
    page = Metadata()
    page.feed(response.text)
    return [{"image_url": urljoin(url, image), "source_url": url, "status": "needs_visual_review"} for image in page.images if urlsplit(urljoin(url, image)).scheme == "https"]

if __name__ == "__main__":
    manifest = json.loads(Path(sys.argv[1]).read_text())
    drafts = []
    for record in manifest["records"]:
        try:
            drafts.append({**record, "candidates": research(record["url"], manifest["allowed_domains"])})
        except Exception as exc:
            drafts.append({**record, "error": str(exc)})
    Path(sys.argv[2]).write_text(json.dumps(drafts, indent=2))
