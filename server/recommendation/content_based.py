"""
Content-Based Filtering for TRAIL recommendations.

How it works:
  1. Convert each user profile into a text document
     - interests expanded via INTEREST_TO_TAGS mapping
     - add province, experience level, budget level
  2. Convert each trail into a text document
     - tags, provinces, difficulty, type
  3. Fit TF-IDF on ALL documents (users + trails) in same vector space
  4. Cosine similarity between user vector and trail vector
  5. Add rule-based signals: location, difficulty, budget, duration

Scores:
  TF-IDF cosine:    35%  (ML — handles vocabulary mismatch)
  Location match:   25%  (rule — geographic preference)
  Difficulty fit:   20%  (rule — safety/feasibility)
  Budget fit:       10%  (rule — affordability)
  Duration fit:     10%  (rule — practical constraint)
"""

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# ── Vocabulary Expansion ──
# User says "adventure", trail says "high-altitude challenging"
# This mapping bridges that gap BEFORE TF-IDF sees the text

INTEREST_TO_TAGS = {
    "adventure": ["high-altitude", "challenging", "remote", "camping", "offbeat",
                  "glacier", "high_passes", "snow_trekking", "rock_climbing"],
    "cultural":  ["heritage", "pilgrimage", "cultural", "traditional_villages",
                  "monasteries", "cultural_heritage", "village_exploration"],
    "nature":    ["scenic", "wildlife", "photography", "lakes", "waterfalls",
                  "forests", "mountain_views", "forest_trails", "bird_watching",
                  "sunrise_views", "botanical"],
    "comfort":   ["tea-house", "easy", "family-friendly", "short-trek",
                  "teahouse_trekking", "nature_walk", "hot_springs"],
    "spiritual": ["pilgrimage", "meditation", "religious", "peace",
                  "cultural_heritage"]
}

DIFFICULTY_MAP = {"Easy": 1, "Moderate": 2, "Difficult": 3}
EXP_MAP = {"Beginner": 1, "Intermediate": 2, "Advanced": 3, "Expert": 4}


def _user_to_text(user):
    """Convert user profile → text document for TF-IDF"""
    words = []
    for interest in user.get("interests", []):
        words.append(interest)
        words.extend(INTEREST_TO_TAGS.get(interest, []))
    words.append(user.get("province", ""))
    words.append(user.get("experienceLevel", ""))
    words.append(user.get("budgetLevel", ""))
    words.append(user.get("availability", ""))
    words.extend(user.get("languagesKnown", []))
    return " ".join(w.lower().replace("-", "_") for w in words if w)


def _trail_to_text(trail):
    """Convert trail features → text document for TF-IDF"""
    words = list(trail.get("tags", []))
    words.extend(trail.get("location", {}).get("provinces", []))
    words.append(trail.get("difficulty", ""))
    words.append(trail.get("type", ""))
    return " ".join(w.lower().replace("-", "_") for w in words if w)


class ContentScorer:
    """
    Builds TF-IDF vectors for ALL users and trails,
    then scores any (user, trail) pair.
    """

    def __init__(self, profiles, trails):
        self.profiles = profiles
        self.trails = trails
        self._build_tfidf()

    def _build_tfidf(self):
        """Build TF-IDF matrix — users and trails in SAME vector space"""
        user_docs = [_user_to_text(u) for u in self.profiles]
        trail_docs = [_trail_to_text(t) for t in self.trails]

        self.vectorizer = TfidfVectorizer(
            token_pattern=r'[a-z_]+',
            max_features=500,
            sublinear_tf=True
        )

        all_docs = user_docs + trail_docs
        tfidf_matrix = self.vectorizer.fit_transform(all_docs)

        n_users = len(self.profiles)
        self.user_vectors = tfidf_matrix[:n_users]
        self.trail_vectors = tfidf_matrix[n_users:]

        self.user_idx = {p["userId"]: i for i, p in enumerate(self.profiles)}
        self.trail_idx = {t["_id"]: i for i, t in enumerate(self.trails)}

    def tfidf_score(self, user_id, trail_id):
        """Cosine similarity between user and trail TF-IDF vectors"""
        if user_id not in self.user_idx or trail_id not in self.trail_idx:
            return 0.0
        u_vec = self.user_vectors[self.user_idx[user_id]]
        t_vec = self.trail_vectors[self.trail_idx[trail_id]]
        return float(max(cosine_similarity(u_vec, t_vec)[0][0], 0.0))

    def rule_scores(self, user, trail):
        """Domain-specific signals that TF-IDF can't capture"""
        scores = {}

        # Location (0–1)
        t_provs = trail.get("location", {}).get("provinces", [])
        scores["location"] = 1.0 if user.get("province") in t_provs else 0.1

        # Difficulty fit (0–1)
        t_diff = DIFFICULTY_MAP.get(trail.get("difficulty", "Easy"), 1)
        u_exp = EXP_MAP.get(user.get("experienceLevel", "Beginner"), 1)
        diff_gap = abs(t_diff - (u_exp * 0.75))
        if diff_gap <= 0.5: scores["difficulty"] = 1.0
        elif diff_gap <= 1.0: scores["difficulty"] = 0.6
        elif diff_gap <= 1.5: scores["difficulty"] = 0.25
        else: scores["difficulty"] = 0.1

        # Budget (0–1)
        t_cost = trail.get("cost", {}).get("min_npr") or 0
        u_budget = user.get("budget", {}).get("max") or 50000
        if t_cost <= u_budget: scores["budget"] = 1.0
        elif t_cost <= u_budget * 1.5: scores["budget"] = 0.4
        else: scores["budget"] = 0.1

        # Duration (0–1)
        t_days = trail.get("duration", {}).get("min_days") or 3
        u_exp_val = EXP_MAP.get(user.get("experienceLevel", "Beginner"), 1)
        if u_exp_val <= 1 and t_days <= 5: scores["duration"] = 1.0
        elif u_exp_val == 2 and 3 <= t_days <= 14: scores["duration"] = 1.0
        elif u_exp_val >= 3 and t_days >= 5: scores["duration"] = 1.0
        elif t_days <= 7: scores["duration"] = 0.4
        else: scores["duration"] = 0.1

        return scores

    def score(self, user, trail):
        """
        Final content score for one (user, trail) pair.
        Returns (total_score, tfidf_score, rule_scores_dict)
        """
        tfidf = self.tfidf_score(user["userId"], trail["_id"])
        rules = self.rule_scores(user, trail)

        total = (
            tfidf * 0.35 +
            rules["location"] * 0.25 +
            rules["difficulty"] * 0.20 +
            rules["budget"] * 0.10 +
            rules["duration"] * 0.10
        )

        return min(total, 1.0), tfidf, rules

    def score_all_trails(self, user):
        """Score ALL trails for one user → { trail_id: score }"""
        return {t["_id"]: self.score(user, t)[0] for t in self.trails}