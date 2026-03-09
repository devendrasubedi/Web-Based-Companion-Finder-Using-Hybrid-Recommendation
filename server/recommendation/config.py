"""
All tunable parameters in one place.
Derived from exploratory data analysis of 129 Nepal trails.
"""

# ── CBF Signal Weights (must sum to 1.0) ─────────────────────
CBF_WEIGHTS = {
    "interest": 0.35,
    "difficulty": 0.25,
    "budget": 0.15,
    "availability": 0.10,
    "geo": 0.10,
    "popularity": 0.05,
}

# ── CBF: Interest → Tag Mapping ──────────────────────────────
INTEREST_TAGS = {
    "adventure": {
        "high-altitude", "remote", "camping", "hard-hike", "glacier",
        "high-pass", "base-camp", "alpine-trek", "wilderness",
        "extreme-challenge", "very-hard", "strenuous", "difficult",
        "trans-himalayan", "restricted", "desert-landscape",
        "challenging", "offbeat", "high_passes", "snow_trekking",
        "rock_climbing", "remote_trails",
    },
    "cultural": {
        "cultural-site", "cultural", "heritage", "pilgrimage",
        "priglimage",
        "village-hike", "village", "historical", "ancient-kingdom",
        "agro-tourism", "community", "cultural-walk",
        "traditional villages", "monasteries", "cultural_heritage",
        "village_exploration", "meditation",
    },
    "nature": {
        "photospot", "scenic", "panoramic", "forest-hike", "nature",
        "waterfall", "forest", "lake", "river", "birdwatching",
        "nature-walk", "nature-hike", "alpine-lake",
        "rhododendron-forest", "sunrise-spot", "sunrise",
        "sunset-spot", "viewpoint", "panorama",
        "mountain_views", "wildlife", "photography", "lake_trails",
        "forest_trails", "bird_watching", "sunrise_views", "botanical",
    },
    "comfort": {
        "family-friendly", "easy-access", "short-hike", "day-hike",
        "easy-hike", "teahouse", "recreational", "accessible",
        "short-duration", "park-walk", "group-friendly",
        "tea-house", "easy", "short-trek", "teahouse_trekking",
        "nature_walk", "hot_springs",
    },
    "spiritual": {
        "pilgrimage", "priglimage",
        "sanctuary", "quiet-spot", "hidden-gem",
        "off-the-beaten-path", "national-park",
        "meditation", "religious", "peace",
    },
}

# ── CBF: Difficulty ──────────────────────────────────────────
FITNESS_CEILING = {
    "beginner": 1,
    "intermediate": 2,
    "advanced": 3,
    "expert": 3,
}

DIFFICULTY_RANK = {
    "Easy": 1,
    "Moderate": 2,
    "Difficult": 3,
}

MAX_DIFFICULTY_SCORE = 15.0

# ── CBF: Age Penalty ─────────────────────────────────────────
AGE_PENALTY = {
    "under_40": 0.0,
    "40_to_55": 0.05,
    "over_55": 0.12,
}

# ── CBF: Budget Ceilings (NPR) ──────────────────────────────
BUDGET_CEILING = {
    "Low": 10000,
    "Medium": 40000,
    "High": 100000,
    "Very High": 999999,
}

BUDGET_DECAY_RATE = 2.0

# ── CBF: Availability Max Days ───────────────────────────────
AVAILABILITY_MAX_DAYS = {
    "Weekends": 3,
    "Weekdays": 3,
    "Flexible": 999,
    "Long Breaks": 999,
}

# ── CBF: Geo Affinity ────────────────────────────────────────
GEO_SCORES = {
    "district_match": 1.0,
    "province_match": 0.7,
    "neighbor_province": 0.4,
    "fallback": 0.2,
}

GEO_TRAVEL_AFFINITY = {
    "Bagmati": {"Gandaki", "Koshi"},
    "Gandaki": {"Bagmati", "Karnali"},
    "Koshi": {"Bagmati"},
    "Karnali": {"Gandaki"},
    "Lumbini": {"Gandaki", "Bagmati"},
    "Madhesh": {"Bagmati", "Koshi"},
    "Sudurpashchim": {"Karnali"},
}

# ── CBF: Popularity Bayesian Average ─────────────────────────
GLOBAL_MEAN_RATING = 4.31
MIN_VOTES_THRESHOLD = 5

# ── CF Settings ──────────────────────────────────────────────
CF_K_NEIGHBORS = 20
CF_MIN_COMMON_TRAILS = 2
CF_FRIEND_BOOST = 0.15
CF_FOF_BOOST = 0.07

CF_RATING_WEIGHTS = {
    5: 0.75,
    4: 0.50,
    3: 0.20,
    2: -0.25,
    1: -0.50,
}
CF_SAVED_WEIGHT = 0.50
CF_COMPLETED_WEIGHT = 1.00

# ── Hybrid Settings ──────────────────────────────────────────
HYBRID_FRIEND_BOOST = 0.05
CF_ONLY_DISCOUNT = 0.5

ALPHA_THRESHOLDS = [
    (0, 0.0),
    (4, 0.2),
    (14, 0.4),
    (29, 0.6),
    (999, 0.7),
]

MAX_RECOMMENDATIONS = 50

# ── Cache / Service Settings ─────────────────────────────────
TRAIL_CACHE_TTL_SECONDS = 600
CACHE_TTL_HOURS = 6
BULK_WRITE_BATCH_SIZE = 100
MAX_WORKERS = 4
CRON_INTERVAL_HOURS = 6