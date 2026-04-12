#!/usr/bin/env python3
"""
NormaAI RAG smoke test — one question per vertical.
Checks that the production API returns a non-empty answer with at least one [Fonte N] citation.
Exit 0 if all pass, exit 1 if any fail.
"""

import sys
import re
import httpx

API_URL = "https://normaai.it/api/chat"
TIMEOUT = 60  # seconds per request (streaming can be slow)

# One question per vertical — simple, unambiguous, should always hit the corpus.
QUESTIONS = [
    {
        "vertical": "lavoro",
        "question": "Quali sono i termini di preavviso per il licenziamento secondo il CCNL?",
    },
    {
        "vertical": "commercialista",
        "question": "Quali sono le aliquote IVA vigenti in Italia?",
    },
    {
        "vertical": "avvocato",
        "question": "Qual è il termine di prescrizione per il risarcimento danni da illecito extracontrattuale?",
    },
    {
        "vertical": "ingegnere",
        "question": "Cosa prevede il DPR 380/2001 riguardo al permesso di costruire?",
    },
    {
        "vertical": "finanziario",
        "question": "Quali obblighi di trasparenza prevede la direttiva MiFID II per gli intermediari?",
    },
]

CITATION_RE = re.compile(r"\[Fonte\s+\d+\]")


def collect_sse_text(response: httpx.Response) -> str:
    """Parse SSE stream and concatenate all text chunks."""
    full_text = ""
    for line in response.iter_lines():
        if not line.startswith("data: "):
            continue
        payload = line[len("data: "):]
        try:
            import json
            event = json.loads(payload)
        except Exception:
            continue
        if event.get("type") == "text":
            full_text += event.get("text", "")
        if event.get("type") == "error":
            raise RuntimeError(f"API error: {event.get('message', 'unknown')}")
    return full_text


def run_test(idx: int, test_case: dict) -> bool:
    """Run a single test case. Returns True on pass, False on fail."""
    vertical = test_case["vertical"]
    question = test_case["question"]
    label = f"[{idx+1}/5 {vertical}]"

    print(f"{label} Asking: {question[:70]}...")

    try:
        with httpx.stream(
            "POST",
            API_URL,
            json={"question": question, "vertical": vertical},
            headers={"Content-Type": "application/json"},
            timeout=TIMEOUT,
        ) as resp:
            if resp.status_code != 200:
                print(f"{label} FAIL — HTTP {resp.status_code}")
                return False
            answer = collect_sse_text(resp)
    except Exception as e:
        print(f"{label} FAIL — request error: {e}")
        return False

    # Check: non-empty
    stripped = answer.strip()
    if not stripped or len(stripped) < 50:
        print(f"{label} FAIL — answer too short ({len(stripped)} chars)")
        return False

    # Check: at least one [Fonte N] citation
    if not CITATION_RE.search(answer):
        print(f"{label} FAIL — no [Fonte N] citation found")
        print(f"         First 200 chars: {stripped[:200]}")
        return False

    citation_count = len(CITATION_RE.findall(answer))
    print(f"{label} PASS — {len(stripped)} chars, {citation_count} citation(s)")
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
