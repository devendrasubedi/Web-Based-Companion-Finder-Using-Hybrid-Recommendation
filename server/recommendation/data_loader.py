"""
Loads all data from MongoDB once per request.
Every function gets fresh data — no stale cache.
"""

from pymongo import MongoClient

MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "auth_db"

client = MongoClient(MONGO_URI)
db = client[DB_NAME]


def load_all():
    """Load everything the engine needs"""
    profiles = list(db["userprofiles"].find({}))
    interactions = list(db["User_Trail_Interactions"].find({}))
    trails = list(db["Trails_metadata"].find({}, {
        "_id": 1, "name": 1, "difficulty": 1, "tags": 1,
        "location": 1, "duration": 1, "cost": 1,
        "altitude": 1, "distance_km": 1, "difficultyScore": 1,
        "rating": 1, "numReviews": 1
    }))
    friendships = list(db["User_Relationships"].find({"status": "accepted"}))
    blocked = list(db["User_Relationships"].find({"status": "blocked"}))

    return profiles, interactions, trails, friendships, blocked


def get_user_profile(user_id, profiles):
    """Find a single user from the loaded profiles list"""
    for p in profiles:
        if p["userId"] == user_id:
            return p
    return None