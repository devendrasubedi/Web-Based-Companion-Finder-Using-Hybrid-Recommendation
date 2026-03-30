"""
CONFIG — All tunable parameters in one place.

HOW TO USE:
  - Change a number here → redeploy → system uses new value.
  - No code changes needed anywhere else.

SECTIONS:
  1. Trail Recommendation (CBF weights, CF settings, hybrid)
  2. User-to-User Recommendation (CBF weights, CF settings, hybrid)
  3. Service Settings (cache, polling, workers)

FIXES IN THIS FILE:
  #1 — DISTRICT_NEIGHBORS: 77 Nepal districts with neighbor mapping
  #3 — ACTIVE_USER_DAYS: only bulk-recompute recent users
  #4 — TEMPORAL_DECAY_LAMBDA: old interactions lose weight over time
  #6 — INCREMENTAL_POLL_SECONDS: how often to check for changes
"""

# ══════════════════════════════════════════════════════════════
#  SECTION 1: TRAIL RECOMMENDATION
# ══════════════════════════════════════════════════════════════

# ── Trail CBF: 6 signal weights (MUST sum to 1.0) ───────────
# These control how much each profile signal matters for trail matching.
# interest=0.35 means "what you like" is the biggest factor.
CBF_WEIGHTS = {
    "interest": 0.35,       # user interests vs trail tags
    "difficulty": 0.25,     # user fitness vs trail difficulty
    "budget": 0.15,         # user budget vs trail cost
    "availability": 0.10,   # user free time vs trail duration
    "geo": 0.10,            # user location vs trail location
    "popularity": 0.05,     # trail rating/reviews (small tiebreaker)
}

# ── Trail CBF: Interest category → trail tag mapping ────────
# When user says "adventure", these are the trail tags that match.
# Jaccard overlap: how many of these tags does the trail have?
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
        "pilgrimage",
        "sanctuary", "quiet-spot", "hidden-gem",
        "off-the-beaten-path", "national-park",
        "meditation", "religious", "peace",
    },
}

# ── Trail CBF: Difficulty settings ───────────────────────────
# FITNESS_CEILING: max trail difficulty rank a user can handle.
#   beginner can only do Easy(1), intermediate up to Moderate(2), etc.
# DIFFICULTY_RANK: trail difficulty label → numeric rank.
# If trail rank > user ceiling → score = 0 (HARD FILTER, safety).
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

# Raw difficultyScore from trail metadata is divided by this to normalize 0-1.
MAX_DIFFICULTY_SCORE = 15.0

# ── Trail CBF: Age penalty on difficulty ─────────────────────
# Older users get a small penalty on difficulty score (not a separate signal).
# Under 40: no penalty. 40-55: -0.05. Over 55: -0.12.
AGE_PENALTY = {
    "under_40": 0.0,
    "40_to_55": 0.05,
    "over_55": 0.12,
}

# ── Trail CBF: Budget settings ───────────────────────────────
# BUDGET_CEILING: max cost (NPR) per budget level.
# If trail cost > ceiling → exponential decay (soft, not hard filter).
# BUDGET_DECAY_RATE: how fast score drops. 2.0 = moderate decay.
BUDGET_CEILING = {
    "Low": 10000,
    "Medium": 40000,
    "High": 100000,
    "Very High": 999999,
}

BUDGET_DECAY_RATE = 2.0

# ── Trail CBF: Availability settings ─────────────────────────
# Max days a user can trek based on their availability type.
# If trail min_days > user max_days → score = 0 (HARD FILTER).
AVAILABILITY_MAX_DAYS = {
    "Weekends": 3,
    "Weekdays": 3,
    "Flexible": 999,
    "Long Breaks": 999,
}

# ── Trail CBF: Geo affinity scores ───────────────────────────
# Tiered matching — closer = higher score. Never returns 0.
GEO_SCORES = {
    "district_match": 1.0,       # exact same district
    "neighbor_district": 0.55,   # FIX #1: adjacent district
    "province_match": 0.7,       # same province but different district
    "neighbor_province": 0.4,    # adjacent province
    "fallback": 0.2,             # far away but still shows up
}

# Province-level travel affinity (which provinces are commonly traveled between).
GEO_TRAVEL_AFFINITY = {
    "Bagmati": {"Gandaki", "Koshi"},
    "Gandaki": {"Bagmati", "Karnali"},
    "Koshi": {"Bagmati"},
    "Karnali": {"Gandaki"},
    "Lumbini": {"Gandaki", "Bagmati"},
    "Madhesh": {"Bagmati", "Koshi"},
    "Sudurpashchim": {"Karnali"},
}

# ── FIX #1: Nepal's 77 districts → neighbor mapping ─────────
# Each district mapped to its physically adjacent districts.
# Used for district-level geo matching (11x more granular than province).
DISTRICT_NEIGHBORS = {
    # Bagmati Province
    "Kathmandu": {"Lalitpur", "Bhaktapur", "Kavrepalanchok", "Nuwakot", "Dhading"},
    "Lalitpur": {"Kathmandu", "Bhaktapur", "Kavrepalanchok", "Makwanpur"},
    "Bhaktapur": {"Kathmandu", "Lalitpur", "Kavrepalanchok"},
    "Kavrepalanchok": {"Kathmandu", "Lalitpur", "Bhaktapur", "Sindhupalchok", "Ramechhap", "Sindhuli"},
    "Nuwakot": {"Kathmandu", "Dhading", "Rasuwa", "Sindhupalchok"},
    "Dhading": {"Kathmandu", "Nuwakot", "Makwanpur", "Gorkha", "Chitwan"},
    "Rasuwa": {"Nuwakot", "Sindhupalchok"},
    "Sindhupalchok": {"Kavrepalanchok", "Nuwakot", "Rasuwa", "Dolakha", "Ramechhap"},
    "Dolakha": {"Sindhupalchok", "Ramechhap", "Solukhumbu"},
    "Ramechhap": {"Kavrepalanchok", "Sindhupalchok", "Dolakha", "Sindhuli", "Okhaldhunga"},
    "Sindhuli": {"Kavrepalanchok", "Ramechhap", "Makwanpur", "Udayapur", "Sarlahi"},
    "Makwanpur": {"Lalitpur", "Dhading", "Sindhuli", "Chitwan", "Bara", "Rautahat"},
    "Chitwan": {"Dhading", "Makwanpur", "Gorkha", "Tanahu", "Nawalparasi East"},
    # Gandaki Province
    "Gorkha": {"Dhading", "Chitwan", "Tanahu", "Lamjung", "Manang"},
    "Tanahu": {"Chitwan", "Gorkha", "Lamjung", "Kaski", "Syangja", "Nawalparasi East"},
    "Lamjung": {"Gorkha", "Tanahu", "Kaski", "Manang"},
    "Kaski": {"Tanahu", "Lamjung", "Syangja", "Parbat", "Myagdi", "Manang"},
    "Syangja": {"Tanahu", "Kaski", "Parbat", "Palpa", "Gulmi"},
    "Parbat": {"Kaski", "Syangja", "Myagdi", "Baglung"},
    "Myagdi": {"Kaski", "Parbat", "Baglung", "Mustang"},
    "Baglung": {"Parbat", "Myagdi", "Gulmi", "Rukum East"},
    "Mustang": {"Myagdi", "Manang", "Dolpa"},
    "Manang": {"Gorkha", "Lamjung", "Kaski", "Mustang"},
    "Nawalparasi East": {"Chitwan", "Tanahu", "Palpa"},
    # Koshi Province
    "Solukhumbu": {"Dolakha", "Okhaldhunga", "Khotang", "Sankhuwasabha"},
    "Okhaldhunga": {"Ramechhap", "Solukhumbu", "Khotang", "Udayapur"},
    "Khotang": {"Solukhumbu", "Okhaldhunga", "Udayapur", "Bhojpur", "Sankhuwasabha"},
    "Udayapur": {"Sindhuli", "Okhaldhunga", "Khotang", "Bhojpur", "Sunsari", "Saptari"},
    "Bhojpur": {"Khotang", "Udayapur", "Sankhuwasabha", "Dhankuta", "Terhathum"},
    "Sankhuwasabha": {"Solukhumbu", "Khotang", "Bhojpur", "Terhathum", "Taplejung"},
    "Dhankuta": {"Bhojpur", "Terhathum", "Sunsari", "Morang"},
    "Terhathum": {"Bhojpur", "Sankhuwasabha", "Dhankuta", "Taplejung", "Panchthar"},
    "Taplejung": {"Sankhuwasabha", "Terhathum", "Panchthar"},
    "Panchthar": {"Terhathum", "Taplejung", "Ilam"},
    "Ilam": {"Panchthar", "Jhapa", "Morang"},
    "Jhapa": {"Ilam", "Morang"},
    "Morang": {"Dhankuta", "Sunsari", "Jhapa", "Ilam"},
    "Sunsari": {"Udayapur", "Dhankuta", "Morang", "Saptari"},
    # Madhesh Province
    "Saptari": {"Udayapur", "Sunsari", "Siraha"},
    "Siraha": {"Saptari", "Dhanusha"},
    "Dhanusha": {"Siraha", "Mahottari", "Sindhuli"},
    "Mahottari": {"Dhanusha", "Sarlahi"},
    "Sarlahi": {"Sindhuli", "Mahottari", "Rautahat"},
    "Rautahat": {"Makwanpur", "Sarlahi", "Bara"},
    "Bara": {"Makwanpur", "Rautahat", "Parsa"},
    "Parsa": {"Bara", "Chitwan"},
    # Lumbini Province
    "Nawalparasi West": {"Palpa", "Rupandehi", "Kapilvastu"},
    "Palpa": {"Syangja", "Nawalparasi East", "Nawalparasi West", "Gulmi", "Rupandehi"},
    "Gulmi": {"Syangja", "Baglung", "Palpa", "Arghakhanchi"},
    "Rupandehi": {"Nawalparasi West", "Palpa", "Kapilvastu"},
    "Kapilvastu": {"Rupandehi", "Nawalparasi West", "Dang", "Arghakhanchi"},
    "Arghakhanchi": {"Gulmi", "Palpa", "Kapilvastu", "Dang", "Pyuthan"},
    "Pyuthan": {"Arghakhanchi", "Gulmi", "Baglung", "Rukum East", "Dang", "Rolpa"},
    "Rolpa": {"Pyuthan", "Rukum East", "Rukum West", "Dang"},
    "Rukum East": {"Baglung", "Pyuthan", "Rolpa"},
    "Dang": {"Kapilvastu", "Arghakhanchi", "Pyuthan", "Rolpa", "Salyan", "Banke"},
    "Banke": {"Dang", "Bardiya", "Salyan"},
    "Bardiya": {"Banke", "Surkhet"},
    # Karnali Province
    "Salyan": {"Dang", "Banke", "Surkhet", "Rukum West", "Rolpa"},
    "Surkhet": {"Bardiya", "Salyan", "Dailekh", "Jajarkot"},
    "Dailekh": {"Surkhet", "Jajarkot", "Kalikot", "Achham"},
    "Jajarkot": {"Surkhet", "Dailekh", "Rukum West", "Dolpa", "Kalikot"},
    "Rukum West": {"Rolpa", "Salyan", "Jajarkot"},
    "Kalikot": {"Dailekh", "Jajarkot", "Jumla", "Dolpa"},
    "Jumla": {"Kalikot", "Dolpa", "Mugu"},
    "Dolpa": {"Mustang", "Jajarkot", "Kalikot", "Jumla", "Mugu"},
    "Mugu": {"Jumla", "Dolpa", "Humla"},
    "Humla": {"Mugu", "Bajura"},
    # Sudurpashchim Province
    "Bajura": {"Humla", "Bajhang", "Achham"},
    "Bajhang": {"Bajura", "Darchula", "Baitadi", "Doti"},
    "Darchula": {"Bajhang", "Baitadi"},
    "Baitadi": {"Darchula", "Bajhang", "Doti", "Dadeldhura"},
    "Doti": {"Bajhang", "Baitadi", "Dadeldhura", "Achham", "Kailali"},
    "Dadeldhura": {"Baitadi", "Doti", "Kanchanpur"},
    "Achham": {"Dailekh", "Bajura", "Doti", "Kailali"},
    "Kailali": {"Doti", "Achham", "Kanchanpur", "Bardiya"},
    "Kanchanpur": {"Dadeldhura", "Kailali"},
}

# ── Trail CBF: Popularity (Bayesian average) ─────────────────
# GLOBAL_MEAN_RATING: average rating across all trails (from data analysis).
# MIN_VOTES_THRESHOLD: minimum reviews before trusting a trail's rating.
# Bayesian formula pulls low-review trails toward the global mean.
GLOBAL_MEAN_RATING = 4.31
MIN_VOTES_THRESHOLD = 5

# ── Trail CF Settings ────────────────────────────────────────
CF_K_NEIGHBORS = 20          # how many similar users to consider
CF_MIN_COMMON_TRAILS = 2     # must share at least 2 trails to count
CF_FRIEND_BOOST = 0.15       # friends get +0.15 similarity bonus
CF_FOF_BOOST = 0.07          # friends-of-friends get +0.07

# How each interaction type contributes to CF score (additive).
# saved + completed + rated 5 = 0.50 + 1.00 + 0.75 = 2.25 (max).
CF_RATING_WEIGHTS = {
    5: 0.75,
    4: 0.50,
    3: 0.20,
    2: -0.25,
    1: -0.50,
}
CF_SAVED_WEIGHT = 0.50
CF_COMPLETED_WEIGHT = 1.00

# ── Trail Hybrid Settings ───────────────────────────────────
HYBRID_FRIEND_BOOST = 0.05   # trails friends interacted with get +0.05
CF_ONLY_DISCOUNT = 0.5       # CF-only trails (no CBF match) get halved

# Alpha = how much to trust CF vs CBF. Ramps up with interactions.
# 0 interactions → pure CBF. 30+ interactions → 70% CF.
ALPHA_THRESHOLDS = [
    (0, 0.0),       # new user: 100% CBF
    (4, 0.2),       # light user: 80% CBF, 20% CF
    (14, 0.4),      # moderate: 60% CBF, 40% CF
    (29, 0.6),      # active: 40% CBF, 60% CF
    (999, 0.7),     # power user: 30% CBF, 70% CF
]

MAX_RECOMMENDATIONS = 50


# ══════════════════════════════════════════════════════════════
#  SECTION 2: USER-TO-USER RECOMMENDATION
# ══════════════════════════════════════════════════════════════

# ── User CBF: 6 signal weights (MUST sum to 1.0) ────────��───
# Controls how much each profile attribute matters for companion matching.
USER_CBF_WEIGHTS = {
    "interest":      0.30,   # shared trekking interests (Jaccard)
    "experience":    0.20,   # similar skill level
    "availability":  0.15,   # can they trek at the same time?
    "geo":           0.15,   # can they meet easily?
    "budget":        0.10,   # similar spending power
    "age":           0.10,   # similar age (Gaussian decay)
}

# Ordinal level orders — used for "how far apart are two users?"
USER_EXPERIENCE_ORDER = ["beginner", "intermediate", "advanced", "expert"]
USER_BUDGET_ORDER = ["Low", "Medium", "High", "Very High"]

# Availability compatibility — NOT pure similarity, it's "can they actually trek together?"
# Flexible+Weekends=0.8 (one adapts), Weekends+Weekdays=0.2 (rarely works).
USER_AVAILABILITY_COMPAT = {
    ("Weekends", "Weekends"): 1.0,
    ("Weekdays", "Weekdays"): 1.0,
    ("Flexible", "Flexible"): 1.0,
    ("Long Breaks", "Long Breaks"): 1.0,
    ("Flexible", "Weekends"): 0.8,
    ("Flexible", "Weekdays"): 0.8,
    ("Flexible", "Long Breaks"): 0.8,
    ("Long Breaks", "Weekends"): 0.4,
    ("Long Breaks", "Weekdays"): 0.4,
    ("Weekends", "Weekdays"): 0.2,
}

# Age Gaussian sigma: same age=1.0, 10yr apart≈0.61, 20yr≈0.14.
USER_AGE_SIGMA = 10

# ── User CF Settings ────────────────────────────────────────
USER_CF_MIN_COMMON_TRAILS = 3   # stricter than trail CF (need 3 shared trails)
USER_CF_K_NEIGHBORS = 50        # larger pool for companion diversity

# ── User Hybrid Settings ────────────────────────────────────
USER_FOF_BOOST = 0.08              # friend-of-friend bonus
USER_MUTUAL_FRIEND_BOOST = 0.02    # per mutual friend
USER_MUTUAL_FRIEND_CAP = 5         # max 5 × 0.02 = 0.10 bonus
USER_CF_ONLY_DISCOUNT = 0.4        # CF-only candidates get 40% weight
USER_MAX_RECOMMENDATIONS = 50

# User alpha ramps slower — profile always matters for companion matching.
USER_ALPHA_THRESHOLDS = [
    (0, 0.0),       # new: 100% profile matching
    (3, 0.15),      # light: 85% CBF
    (8, 0.30),      # moderate: 70% CBF
    (20, 0.50),     # active: balanced
    (999, 0.65),    # power: 35% CBF, 65% CF (never fully CF)
]


# ══════════════════════════════════════════════════════════════
#  SECTION 3: SERVICE / CACHE / FIX SETTINGS
# ══════════════════════════════════════════════════════════════

TRAIL_CACHE_TTL_SECONDS = 600   # trail list cached 10 min in memory
CACHE_TTL_HOURS = 6             # Recommendation_Cache TTL (MongoDB auto-deletes)
BULK_WRITE_BATCH_SIZE = 100     # MongoDB bulk upsert batch size
MAX_WORKERS = 4                 # async worker count for queue processing
CRON_INTERVAL_HOURS = 6         # full bulk recomputation interval

# FIX #4: Temporal decay rate.
# λ=0.005: yesterday=0.995, 30d=0.86, 6mo=0.41, 1yr=0.16, 2yr=0.03.
TEMPORAL_DECAY_LAMBDA = 0.005

# FIX #3: Only bulk-recompute users active in last N days.
ACTIVE_USER_DAYS = 60

# FIX #6: Poll MongoDB for changes every N seconds.
INCREMENTAL_POLL_SECONDS = 60