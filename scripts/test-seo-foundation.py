"""Check the organic link graph and preserve conversion/paid-page contracts."""

import json
import re
import subprocess
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "https://www.obsidianautoworksoc.com"
BASE = "d0ffcd66eb4b7bebe92ed7ba9489852639c0dee6"
CITIES = ["irvine", "lake-forest", "aliso-viejo", "newport-beach", "costa-mesa",
          "tustin", "mission-viejo", "laguna-hills"]
PILOTS = ["irvine", "newport-beach", "costa-mesa-windowtinting", "lake-forest-window-tinting"]
VEHICLES = {f"/{slug}-window-tinting" for slug in ["toyota-tacoma", "bmw-m4", "toyota-4runner", "bmw-x3"]}


def original(path):
    return subprocess.check_output(["git", "show", f"{BASE}:{path}"], cwd=ROOT, text=True)


class Page(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.links = []
        self.canonicals = []
        self.robots = []
        self.scripts = []
        self.actions = []
        self.image_alts = []
        self.h1s = 0
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "a" and a.get("href"):
            self.links.append(a["href"])
        if tag == "link" and a.get("rel") == "canonical":
            self.canonicals.append(a.get("href"))
        if tag == "meta" and a.get("name") == "robots":
            self.robots.append(a.get("content", ""))
        if tag == "script" and a.get("src"):
            self.scripts.append(a["src"])
        if a.get("data-lead-action"):
            self.actions.append(a["data-lead-action"])
        if tag == "h1":
            self.h1s += 1
        if tag == "img":
            self.image_alts.append(a.get("alt", ""))


def check():
    config = json.loads((ROOT / "vercel.json").read_text())
    rewrites = {r["source"]: r["destination"] for r in config["rewrites"]}
    urls = [node.text for node in ET.parse(ROOT / "sitemap.xml").iter()
            if node.tag.endswith("}loc")]
    paths = {urlsplit(url).path for url in urls}
    assert len(urls) == len(paths) == 53, "Expected 49 existing plus four new canonical URLs"
    incoming = {path: set() for path in paths}
    pages = {}
    for url in urls:
        path = urlsplit(url).path
        filename = rewrites.get(path, path).lstrip("/") or "index"
        source = (ROOT / filename).read_text()
        page = pages[path] = Page(source)
        assert page.canonicals == [url], (path, "canonical")
        assert page.h1s == 1, (path, "H1 count")
        assert not any("noindex" in value.lower() for value in page.robots), path
        assert "/lead-tracking.js" in page.scripts, (path, "tracking loader")
        if path not in VEHICLES:
            before = Page(original(filename))
            assert page.actions == before.actions, (path, "conversion actions changed")
            assert page.scripts == before.scripts, (path, "script URLs changed")
            contact = lambda p: [link for link in p.links if link.startswith(("tel:", "sms:"))]
            assert contact(page) == contact(before), (path, "contact destinations changed")
        for link in page.links:
            target = urlsplit(urljoin(url, link))
            if target.netloc == urlsplit(ORIGIN).netloc and target.path in paths and target.path != path:
                incoming[target.path].add(path)
    orphans = [path for path, sources in incoming.items() if not sources]
    assert not orphans, f"Sitemap pages without incoming anchors: {orphans}"
    reachable = {"/"}
    while True:
        discovered = {target for target, sources in incoming.items() if sources & reachable}
        if discovered <= reachable:
            break
        reachable.update(discovered)
    assert paths <= reachable, f"Unreachable from homepage: {paths - reachable}"
    for path in VEHICLES:
        assert path in pages["/services"].links, (path, "missing service discovery")
        assert path in pages["/window-tinting-gallery"].links, (path, "missing gallery discovery")
        headers = [h for rule in config["headers"] if re.fullmatch(rule["source"], path)
                   for h in rule["headers"]]
        assert any(h["key"].lower() == "content-type" and h["value"].startswith("text/html") for h in headers), path
        assert not any(h["key"].lower() == "x-robots-tag" and "noindex" in h["value"].lower() for h in headers), path
    # Existing rewrite/redirect behavior and paid-page headers must remain unchanged.
    old_config = json.loads(original("vercel.json"))
    assert config["rewrites"] == old_config["rewrites"]
    assert config["redirects"] == old_config["redirects"]
    assert config["headers"][1:] == old_config["headers"]
    for city in CITIES:
        path = f"/ceramic-coating-{city}"
        assert path in pages["/ceramic-coating"].links, path
        assert "/ceramic-coating" in pages[path].links, path
        assert not any(f"coating in {city.replace('-', ' ')}" in alt.lower() for alt in pages[path].image_alts)
    for path in ["/services", "/architectural-window-film"]:
        assert "/commercial-window-film" in pages[path].links, path
    for filename in PILOTS:
        source = (ROOT / filename).read_text()
        assert "Local proof points" not in source, filename
        assert "testimonial-card__quote" not in source, filename
        assert "appointment planning" in source, filename
    # Preserve paid destinations and pricing; shared tracking only filters Google payloads.
    changed = subprocess.check_output(["git", "diff", "--name-only", BASE], cwd=ROOT, text=True).splitlines()
    allowed = {"ceramic-coating", "ceramic-coating.css", "services", "architectural-window-film",
               "california-window-tint-law", "scripts/generate-ceramic-coating-city-pages.mjs",
               "window-tinting-gallery", "vercel.json", "sitemap.xml", "package.json"}
    allowed.update(PILOTS)
    allowed.update({"lead-tracking.js", "scripts/test-lead-tracking.mjs"})
    allowed.update(f"ceramic-coating-{city}" for city in CITIES)
    allowed.update(path.lstrip("/") for path in VEHICLES)
    allowed.update({"vehicle-pages.css", "vehicle-pages.js", "vehicle-analytics.js",
                    "scripts/vehicle-page-data.mjs", "scripts/generate-vehicle-pages.mjs",
                    "scripts/test-vehicle-pages.mjs", "scripts/test-vehicle-analytics.mjs",
                    "scripts/test-seo-foundation.py", "docs/vehicle-page-preview.md",
                    "docs/seo-release-2026-09-16.md"})
    assert set(changed) <= allowed, f"Unexpected tracked changes: {set(changed) - allowed}"
    print(f"PASS: {len(urls)} canonical pages reachable from home; no internal-link orphans; "
          "vehicle discovery and HTML headers; 8 coating return paths; commercial discovery; "
          "existing conversion actions, contacts, scripts, redirects and paid routes preserved.")


if __name__ == "__main__":
    check()
