import mongoose from "mongoose";

/* ==============================
TRAIL METADATA
   ============================== */

const PermitSchema = new mongoose.Schema(
  {
    name: String,
    acronym: String,
    rates: {
      Nepali: Number,
      SAARC: Number,
      Foreigner: Number
    }
  },
  { _id: false }
);

const ItinerarySchema = new mongoose.Schema(
  {
    day: String,
    description: String,
    points: [String]
  },
  { _id: false }
);

const TrailSchema = new mongoose.Schema(
  {
    _id: {
      type: String, // R0150, R0001
      required: true
    },

    name: {
      type: String,
      required: true,
      index: true
    },

    type: {
      type: String // Base Camp, Circuit Hike, Trek
    },

    difficulty: {
      type: String, // Easy, Moderate, Hard (add later)
      index: true
    },

    // rating: {
    //   type: Number, // add later
    //   default: 0
    // },

    description: String,

    location: {
      provinces: [String],
      districts: [String],
      start: String,
      end: String
    },

    duration: {
      min_days: Number,
      max_days: Number
    },

    distance: {
      min_km: Number,
      max_km: Number
    },

    cost: {
      min_npr: Number,
      max_npr: Number
    },

    altitude: {
      min_m: Number,
      max_m: Number
    },

    permits_required: [PermitSchema],

    tags: {
      type: [String],
      index: true
    },

    itinerary: [ItinerarySchema]
  },
  {
    collection: "Trails_metadata",
    timestamps: true
  }
);

/* ==============================
   TRAIL IMAGES
   ============================== */

const TrailImageSchema = new mongoose.Schema(
  {
    trail_id: {
      type: String,
      ref: "Trail",
      required: true,
      index: true
    },

    image_url: {
      type: String,
      required: true
    },

    is_cover: {
      type: Boolean,
      default: false
    },

    caption: String
  },
  {
    collection: "Trails_Images",
    timestamps: true
  }
);

/* ==============================
   TRAIL GEOJSON 
   ============================== */

const TrailGeoJSONSchema = new mongoose.Schema(
  {
    trail_id: {
      type: String,
      ref: "Trail",
      required: true,
      index: true
    },

    route: {
      type: {
        type: String,
        enum: ["LineString"],
        required: true
      },
      coordinates: {
        type: [[Number]], // [lng, lat]
        required: true
      }
    },

    start_point: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: [Number]
    },

    end_point: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: [Number]
    }
  },
  {
    collection: "Trails_GeoJSON"
  }
);

// export

export const Trail = mongoose.model("Trail", TrailSchema);
export const TrailImage = mongoose.model("TrailImage", TrailImageSchema);
export const TrailGeoJSON = mongoose.model("TrailGeoJSON", TrailGeoJSONSchema);
