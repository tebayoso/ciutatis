from __future__ import annotations


def classify_document(text: str) -> tuple[str, float, str]:
    lowered = text.lower()
    signals = {
        "budget": ("budget", "appropriation", "$", "fiscal", "fund", "amount"),
        "procurement": ("procurement", "bid", "vendor", "contract", "rfp"),
        "ordinance": ("ordinance", "resolution", "council", "decree"),
        "public_health": ("health", "clinic", "epidemiology", "hospital"),
        "infrastructure": ("public works", "road", "transit", "bridge", "water"),
    }
    best_label = "general_government"
    best_score = 0
    for label, terms in signals.items():
        score = sum(1 for term in terms if term in lowered)
        if score > best_score:
            best_label = label
            best_score = score
    confidence = min(0.98, 0.45 + best_score * 0.16)
    rationale = f"Matched {best_score} gov-ops signals for {best_label}."
    return best_label, confidence, rationale
