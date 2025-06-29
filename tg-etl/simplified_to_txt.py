#!/usr/bin/env python3
"""
Extract text, provider, date, and link from all simplified JSONL files and write to a .txt file for LLM use.
Provider is extracted from the Telegram URL.
"""

import json
import re
from pathlib import Path

# Where to find the simplified JSONL files
processed_dir = Path("data/processed")
jsonl_files = list(processed_dir.glob("simplified_*.jsonl"))

output_file = Path("data/llm_corpus.txt")
output_file.parent.mkdir(parents=True, exist_ok=True)

def extract_provider(url):
    match = re.search(r"t\.me/([^/]+)/", url)
    if match:
        return match.group(1)
    match = re.search(r"t\.me/([^/]+)$", url)
    if match:
        return match.group(1)
    return ""

with open(output_file, 'w', encoding='utf-8') as out:
    for jsonl_file in jsonl_files:
        with open(jsonl_file, 'r', encoding='utf-8') as f:
            for line in f:
                try:
                    data = json.loads(line.strip())
                    text = data.get('text', '').replace('\n', ' ').strip()
                    date = data.get('date', '')
                    link = data.get('telegram_url', '')
                    provider = extract_provider(link)
                    if text and provider and date and link:
                        out.write(f"[{date}] {provider} {link}\n{text}\n\n")
                except Exception:
                    continue
print(f"✅ LLM corpus written to {output_file}") 