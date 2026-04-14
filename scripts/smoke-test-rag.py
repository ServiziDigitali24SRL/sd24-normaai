#!/usr/bin/env python3
"""
NormaAI RAG smoke test — one question per vertical.
Checks that the production API returns a non-empty answer with at least one [Fonte N] citation.
Exit 0 if all pass, exit 1 if any fail.
"""

import sys
import re
import os
import httpx

API_URL = "https://normaai.it/api/chat"
TIMEOUT = 60  # seconds per request (streaming can be slow)
SMOKE_KEY = os.environ.get("SMOKE_KEY", "")

# One question per vertical — simple, unambiguous, should always hit the corpus.
QUESTIONS = [
    {
        "vertical": "lavoro",
        "question": "Qual è l'orientamento della Cassazione sul licenziamento per giustificato motivo oggettivo?",
    },
    {
        "vertical": "commercialista",
        "question": "Qual è l'orientamento della Cassazione sulla prescrizione dei crediti tributari dell'Erario?",
    },
    {
        "vertical": "avvocato",
        "question": "Qual è il termine di prescrizione per il risarcimento danni da illecito extracontrattuale?",
    },
    {
        "vertical": "ingegnere",
        "question": "Qual è la responsabilità del direttore dei lavori per vizi dell'opera secondo la Cassazione?",
    },
    {
        "vertical": "finanziario",
        "question": "Quali obblighi di trasparenza prevede la direttiva MiFID II per gli intermediari?",
    },
]

CITATION_RE = re.compile(r"\[Fonte\s+\d+\]")


def collect_sse(response: httpx.Response) -> tuple[str, bool]:
    """Parse SSE stream. Returns (full_text, has_rag)."""
    import json as _json
    full_text = ""
    has_rag = False
    for line in response.iter_lines():
        if not line.startswith("data: "):
            continue
        payload = line[len("data: "):]
        try:
            event = _json.loads(payload)
        except Exception:
            continue
        if event.get("type") == "text":
            full_text += event.get("text", "")
        if event.get("type") == "sources":
            has_rag = bool(event.get("hasRag", False))
        if event.get("type") == "error":
            raise RuntimeError(f"API error: {event.get('message', 'unknown')}")
    return full_text, has_rag


def run_test(idx: int, test_case: dict) -> bool:
    """Run a single test case. Returns True on pass, False on fail."""
    vertical = test_case["vertical"]
    question = test_case["question"]
    label = f"[{idx+1}/5 {vertical}]"

    print(f"{label} Asking: {question[:70]}...")

    try:
        headers = {"Content-Type": "application/json"}
        if SMOKE_KEY:
            headers["x-smoke-key"] = SMOKE_KEY
        with httpx.stream(
            "POST",
            API_URL,
            json={"question": question, "vertical": vertical},
            headers=headers,
            timeout=TIMEOUT,
        ) as resp:
            if resp.status_code != 200:
                print(f"{label} FAIL — HTTP {resp.status_code}")
                return False
            answer, has_rag = collect_sse(resp)
    except Exception as e:
        print(f"{label} FAIL — request error: {e}")
        return False

    # Check: non-empty answer
    stripped = answer.strip()
    if not stripped or len(stripped) < 50:
        print(f"{label} FAIL — answer too short ({len(stripped)} chars)")
        return False

    # Primary check: hasRag=true (corpus was retrieved and injected)
    if not has_rag:
        print(f"{label} FAIL — hasRag=false (RAG pipeline not working)")
        print(f"         First 200 chars: {stripped[:200]}")
        return False

    citation_count = len(CITATION_RE.findall(answer))
    print(f"{label} PASS — {len(stripped)} chars, hasRag=true, {citation_count} [Fonte N] citation(s)")
    return True


def main():
    print(f"NormaAI RAG Smoke Test — {API_URL}")
    print("=" * 60)

    results = []
    for i, tc in enumerate(QUESTIONS):
        passed = run_test(i, tc)
        results.append((tc["vertical"], passed))

    print("=" * 60)
    passed_count = sum(1 for _, p in results if p)
    failed_count = len(results) - passed_count
    print(f"Results: {passed_count} passed, {failed_count} failed")

    for vertical, passed in results:
        status = "PASS" if passed else "FAIL"
        print(f"  {status}  {vertical}")

    if failed_count > 0:
        print("\nSome tests failed.")
        sys.exit(1)
    else:
        print("\nAll tests passed.")
        sys.exit(0)


if __name__ == "__main__":
    main()
