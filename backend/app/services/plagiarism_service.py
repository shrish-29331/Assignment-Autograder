"""
Pairwise plagiarism detection using Porter stemming + TF-IDF + cosine
similarity — the same core technique as the original `plagiarism.py`, but
refactored into a reusable, side-effect-free function that returns every
pairwise similarity score instead of just a 0/1 flag per file, so the UI can
show a real similarity heatmap.
"""
from __future__ import annotations

import nltk
from nltk.corpus import stopwords
from nltk.stem.porter import PorterStemmer
from nltk.tokenize import word_tokenize
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

_NLTK_READY = False


def _ensure_nltk_data() -> None:
    global _NLTK_READY
    if _NLTK_READY:
        return
    for pkg in ("stopwords", "punkt", "punkt_tab"):
        try:
            nltk.data.find(f"tokenizers/{pkg}" if "punkt" in pkg else f"corpora/{pkg}")
        except LookupError:
            try:
                nltk.download(pkg, quiet=True)
            except Exception:
                pass
    _NLTK_READY = True


def _preprocess(text: str) -> str:
    _ensure_nltk_data()
    try:
        stop_words = set(stopwords.words("english"))
        stemmer = PorterStemmer()
        tokens = word_tokenize(text.lower())
        tokens = [stemmer.stem(t) for t in tokens if t.isalpha() and t not in stop_words]
        return " ".join(tokens)
    except LookupError:
        # NLTK corpora unavailable (e.g. no network at build time) -> fall back
        # to a naive tokenizer so plagiarism checking degrades gracefully
        # instead of crashing the whole request.
        return " ".join(w.lower() for w in text.split() if w.isalpha())


def pairwise_similarity(submissions: list[dict]) -> list[dict]:
    """
    submissions: [{"submission_id": ..., "student": ..., "code": ...}, ...]
    returns: [{"submission_id_a", "student_a", "submission_id_b", "student_b", "similarity"}, ...]
    """
    if len(submissions) < 2:
        return []

    texts = [_preprocess(s["code"]) for s in submissions]
    # Guard against all-empty documents, which crash TfidfVectorizer
    if all(t.strip() == "" for t in texts):
        return []

    vectorizer = TfidfVectorizer()
    tfidf = vectorizer.fit_transform(texts)
    sim_matrix = cosine_similarity(tfidf)

    pairs = []
    n = len(submissions)
    for i in range(n):
        for j in range(i + 1, n):
            pairs.append(
                {
                    "submission_id_a": submissions[i]["submission_id"],
                    "student_a": submissions[i]["student"],
                    "submission_id_b": submissions[j]["submission_id"],
                    "student_b": submissions[j]["student"],
                    "similarity": round(float(sim_matrix[i][j]), 4),
                }
            )
    return sorted(pairs, key=lambda p: p["similarity"], reverse=True)
