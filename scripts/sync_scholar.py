#!/usr/bin/env python3
"""Refresh scholar.json from the public Google Scholar profile."""

import html as html_lib
import json
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "scholar.json"
SCHOLAR_URL = "https://scholar.google.com/citations?user=E513RsEAAAAJ&hl=en&cstart=0&pagesize=100"

JOURNALS = [
    ("spe polymer", "6.4", "Journal Impact Factor, stated on the Wiley journal page"),
    ("inorganic chemistry", "5.9", "Journal Impact Factor, stated on the Elsevier journal page"),
    ("nanomaterial", "4.8", "Impact Factor 2025, stated on the MDPI journal page"),
    ("heliyon", None, "No Journal Impact Factor in the June 2026 JCR. Web of Science had paused the journal."),
]
SOURCES = {
    "spe polymer": "S4210195725",
    "heliyon": "S2898612692",
    "inorganic chemistry": "S166634186",
    "nanomaterial": "S2764646681",
}


def decode(value: str) -> str:
    value = re.sub(r"<[^>]+>", "", value)
    return re.sub(r"\s+", " ", html_lib.unescape(value)).strip()


def metric(venue: str):
    text = venue.lower()
    for key, factor, note in JOURNALS:
        if key in text:
            return factor, note
    if "advances in textile" in text or "sustainability" in text:
        return None, "Book chapter. Impact factor is a journal number, not a chapter number."
    return None, "No journal impact factor matched for this venue."


def openalex_means():
    url = "https://api.openalex.org/sources?filter=openalex:" + "|".join(SOURCES.values()) + "&select=id,summary_stats"
    request = urllib.request.Request(url, headers={"User-Agent": "chaion-profile"})
    with urllib.request.urlopen(request, timeout=30) as response:
        body = json.load(response)
    means = {}
    for source in body.get("results", []):
        mean = (source.get("summary_stats") or {}).get("2yr_mean_citedness")
        if not isinstance(mean, (int, float)):
            continue
        source_id = source.get("id", "").rsplit("/", 1)[-1]
        for key, value in SOURCES.items():
            if value == source_id:
                means[key] = round(float(mean), 1)
    return means


def parse(html: str, means: dict):
    stats = [int(number) for number in re.findall(r'class="gsc_rsb_std">(\d+)', html)]
    titles = re.findall(r'<a href="([^"]+)" class="gsc_a_at">([\s\S]*?)</a>', html)
    grays = [decode(item) for item in re.findall(r'class="gs_gray">([\s\S]*?)</div>', html)]
    cites = []
    for raw in re.findall(r'class="gsc_a_ac gs_ibl"[^>]*>([\s\S]*?)</a>', html):
        value = decode(raw).replace(",", "")
        cites.append(int(value) if value else 0)
    years = [decode(item) for item in re.findall(r'class="gsc_a_h gsc_a_hc gs_ibl"[^>]*>([\s\S]*?)</span>', html)]
    if len(stats) < 6 or not titles or len(grays) < len(titles) * 2:
        raise RuntimeError("Scholar page did not include the publication table")
    papers = []
    for index, (href, title) in enumerate(titles):
        venue = grays[index * 2 + 1]
        factor, note = metric(venue)
        key = next((name for name in means if name in venue.lower()), None)
        href = decode(href)
        papers.append(
            {
                "title": decode(title),
                "authors": grays[index * 2],
                "venue": venue,
                "year": years[index] if index < len(years) else "",
                "citations": cites[index] if index < len(cites) else 0,
                "url": href if href.startswith("http") else "https://scholar.google.com" + href,
                "impactFactor": factor,
                "impactNote": note,
                "openAlexMean": means.get(key) if key else None,
            }
        )
    return {
        "citations": stats[0],
        "hIndex": stats[2],
        "i10Index": stats[4],
        "checkedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "https://scholar.google.com/citations?user=E513RsEAAAAJ",
        "papers": papers,
    }


def main():
    request = urllib.request.Request(
        SCHOLAR_URL,
        headers={"User-Agent": "Mozilla/5.0 (compatible; research-profile/1.0)", "Accept-Language": "en"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        html = response.read().decode("utf-8", "replace")
    data = parse(html, openalex_means())
    previous = OUT.read_text() if OUT.exists() else ""
    rendered = json.dumps(data, indent=2) + "\n"
    if json.loads(previous or "{}").get("papers") == data["papers"] and json.loads(previous or "{}").get("citations") == data["citations"]:
        print("unchanged")
        return
    OUT.write_text(rendered)
    print(f"wrote {data['citations']} citations, {len(data['papers'])} papers")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"sync skipped: {error}")
