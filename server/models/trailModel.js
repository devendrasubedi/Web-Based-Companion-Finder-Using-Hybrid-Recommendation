import mongoose from "mongoose";

/* ==============================
   TRAIL METADATA

   CHANGES FROM ORIGINAL:
     ~ distance: was { min_km, max_km } → now just distance_km (single accurate value)
     + altitude.totalAscent   (computed from GeoJSON)
     + altitude.totalDescent  (computed from GeoJSON)
     + difficultyScore        (raw numeric score)
     ~ difficulty             (enum validated, computed label)

   ALL computed by: scripts/sync_trail_metrics.py
   ============================== */
const PermitSchema = new mongoose.Schema({
  name: String,
  acronym: String,
  rates: { Nepali: Number, SAARC: Number, Foreigner: Number }
}, { _id: false });

const ItinerarySchema = new mongoose.Schema({
  day: String,
  description: String,
  points: [String]
}, { _id: false });

const TrailSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true, index: true },
  type: String,
  difficulty: {
    type: String,
    enum: ["Easy", "Moderate", "Difficult"],
    index: true
  },
  difficultyScore: { type: Number, default: 0 },
  description: String,
  location: {
    provinces: [String],
    districts: [String],
    start: String,
    end: String
  },
  duration: { min_days: Number, max_days: Number },
  distance_km: { type: Number, default: 0 },             // Was { min_km, max_km } → now single accurate value
  cost: { min_npr: Number, max_npr: Number },
  altitude: {
    min_m: Number,
    max_m: Number,
    totalAscent: { type: Number, default: 0 },
    totalDescent: { type: Number, default: 0 }
  },
  permits_required: [PermitSchema],
  tags: { type: [String], index: true },
  reviews: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    userImage: String,
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  rating: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 },
  itinerary: [ItinerarySchema]
}, {
  collection: "Trails_metadata",
  timestamps: true,
  versionKey: false
});

/* ==============================
   TRAIL IMAGES
   ============================== */
const TrailImageSchema = new mongoose.Schema({
  trail_id: { type: String, ref: "Trail", required: true, index: true },
  image_url: { type: String, required: true },
  is_cover: { type: Boolean, default: false },
  caption: String
}, {
  collection: "Trails_Images",
  timestamps: true
});

/* ==============================
   TRAIL GEOJSON (Updated for Elevation)
   ============================== */

const SegmentPropertiesSchema = new mongoose.Schema({
  trailId: { type: String },
  name: { type: String },
  distanceKm: { type: Number, default: 0 }
}, { _id: false });

const SegmentSchema = new mongoose.Schema({
  type: { type: String, default: "Feature" },
  geometry: {
    type: {
      type: String,
      enum: ["LineString"],
      required: true
    },
    // Updated to support [lng, lat, elevation]
    coordinates: { type: [[Number]], required: true }
  },
  properties: { type: SegmentPropertiesSchema, default: () => ({}) }
}, { _id: false });

const TrailGeoJSONSchema = new mongoose.Schema({
  trailId: { type: String, required: true, unique: true },
  trailName: { type: String, required: true },
  totalDistanceKm: { type: Number, required: true, min: 0 },

  // --- NEW ELEVATION FIELDS ---
  totalAscent: { type: Number, default: 0 },   // Total meters climbed
  totalDescent: { type: Number, default: 0 },  // Total meters descended
  // -----------------------------

  features: { type: [SegmentSchema], required: true, default: [] }
}, {
  collection: "Trail_GeoJSON_compressedE", // Updated to the enriched collection
  timestamps: true
});

TrailGeoJSONSchema.index(
  { "features.geometry": "2dsphere" },
  { name: "features_geometry_2dsphere" }
);

/* ==============================
   EXPORTS
   ============================== */
export const Trail = mongoose.model("Trail", TrailSchema);
export const TrailImage = mongoose.model("TrailImage", TrailImageSchema);

// Explicitly connecting to auth_db for the GeoJSON data
export const TrailGeoJSON = mongoose.connection.useDb("auth_db").model("TrailGeoJSON", TrailGeoJSONSchema);