import mongoose from "mongoose";

/* ==============================
   TRAIL METADATA
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
  difficulty: { type: String, index: true },
  description: String,
  location: {
    provinces: [String],
    districts: [String],
    start: String,
    end: String
  },
  duration: { min_days: Number, max_days: Number },
  distance: { min_km: Number, max_km: Number },
  cost: { min_npr: Number, max_npr: Number },
  altitude: { min_m: Number, max_m: Number },
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
  timestamps: true
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
   TRAIL GEOJSON
   ============================== */

// Matches exactly what's in your data:
// properties: { trailId, name, distanceKm } — nothing else
const SegmentPropertiesSchema = new mongoose.Schema({
  trailId: { type: String },            // "R0001 (Kathmandu Valley circuit)"
  name: { type: String },            // "Sundarijal to Jarsingpauwa"
  distanceKm: { type: Number, default: 0 } // 19.002
}, { _id: false });
// No strict:false — your data is clean and consistent

// Only LineStrings in your data — no Points, no Polygons
const SegmentSchema = new mongoose.Schema({
  type: { type: String, default: "Feature" },
  geometry: {
    type: {
      type: String,
      enum: ["LineString"], // ✅ locked — only LineStrings exist in your data
      required: true
    },
    coordinates: { type: [[Number]], required: true } // [[lng, lat], ...] — 262 points after compression
  },
  properties: { type: SegmentPropertiesSchema, default: () => ({}) }
}, { _id: false });

const TrailGeoJSONSchema = new mongoose.Schema({
  trailId: { type: String, required: true, unique: true }, // "R0001"
  trailName: { type: String, required: true },               // "Kathmandu Valley circuit"
  totalDistanceKm: { type: Number, required: true, min: 0 },       // 173.335
  features: { type: [SegmentSchema], required: true, default: [] } // Array of segments
}, {
  collection: "Trail_GeoJSON_compressed",
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
export const TrailGeoJSON = mongoose.connection.useDb("auth_db").model("TrailGeoJSON", TrailGeoJSONSchema);