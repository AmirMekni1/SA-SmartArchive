#!/usr/bin/env python3
import json
import os
import re
import sys
from difflib import SequenceMatcher
from urllib import request


def unique(values):
    seen = set()
    out = []
    for v in values:
        s = str(v).strip()
        if not s:
            continue
        if s in seen:
            continue
        seen.add(s)
        out.append(s)
    return out


def fallback_rank(query, candidates, top_k):
    q = (query or '').strip().lower()
    clean_q = re.sub(r"\s+", "", q)

    if not q:
        return unique(candidates)[:top_k]

    scored = []
    for item in unique(candidates):
        low = item.lower()
        clean_low = re.sub(r"\s+", "", low)

        score = 0.0
        if low.startswith(q):
            score += 100
        if q in low:
            score += 50
        if clean_q and clean_q in clean_low:
            score += 20

        ratio = SequenceMatcher(None, q, low).ratio()
        score += ratio * 25
        score -= abs(len(low) - len(q)) * 0.2

        scored.append((score, item))

    scored.sort(key=lambda t: t[0], reverse=True)
    return [item for _, item in scored[:top_k]]


def ask_ollama(field, query, candidates, top_k):
    model = os.getenv('OLLAMA_MODEL', 'deepseek-v3.1:671b-cloud')
    base_url = os.getenv('OLLAMA_URL', 'http://127.0.0.1:11434')

    prompt = (
        "You are ranking autocomplete suggestions.\n"
        "Rules:\n"
        "1) Return ONLY a valid JSON array of strings.\n"
        "2) Use ONLY values from the provided candidates.\n"
        "3) Rank by best match to user query for field type.\n"
        f"4) Return at most {top_k} values.\n"
        f"Field: {field}\n"
        f"User query: {query}\n"
        f"Candidates: {json.dumps(candidates, ensure_ascii=False)}\n"
        "Output example: [\"value1\", \"value2\"]"
    )

    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0,
            "num_predict": 256,
        },
    }

    req = request.Request(
        f"{base_url.rstrip('/')}/api/generate",
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST',
    )

    with request.urlopen(req, timeout=3.5) as resp:
        body = resp.read().decode('utf-8', errors='ignore')

    raw = json.loads(body)
    text = str(raw.get('response', '')).strip()

    try:
        ranked = json.loads(text)
        if isinstance(ranked, list):
            ranked = [str(v).strip() for v in ranked if str(v).strip()]
        else:
            ranked = []
    except Exception:
        match = re.search(r"\[[\s\S]*\]", text)
        ranked = []
        if match:
            try:
                maybe = json.loads(match.group(0))
                if isinstance(maybe, list):
                    ranked = [str(v).strip() for v in maybe if str(v).strip()]
            except Exception:
                ranked = []

    allowed = set(unique(candidates))
    cleaned = [item for item in ranked if item in allowed]
    return unique(cleaned)[:top_k]


def main():
    raw = sys.stdin.read() or '{}'
    data = json.loads(raw)

    field = str(data.get('field', 'name'))
    query = str(data.get('query', ''))
    candidates = unique(data.get('candidates', []))
    top_k = int(data.get('top_k', 20))

    if not candidates:
        sys.stdout.write(json.dumps({"suggestions": []}, ensure_ascii=False))
        return

    ranked = []
    try:
        ranked = ask_ollama(field, query, candidates, top_k)
    except Exception:
        ranked = []

    if not ranked:
        ranked = fallback_rank(query, candidates, top_k)

    sys.stdout.write(json.dumps({"suggestions": ranked[:top_k]}, ensure_ascii=False))


if __name__ == '__main__':
    main()
