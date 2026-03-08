import { Trail, TrailGeoJSON } from '../models/trailModel.js';
import { UserTrailInteraction } from '../models/user_trail_interaction.js';
import { InteractionAggregate } from '../models/interaction_aggregate.js';
import mongoose from 'mongoose';

// Helper: recompute implicitScore
function computeScore({ saveCount = 0, isCompleted = false, rating = null }) {
    return (saveCount * 3) + (isCompleted ? 5 : 0) + (rating ? rating : 0);
}


// --- SERVER-SIDE IMAGE URL CACHING ---
const globalImageUrlCache = new Map();

// FOR THE CARDS (List View)
// Returns a compact set of fields tailored for the front-end cards and search/filter
export const getAllTrails = async (req, res) => {
    try {
        // First, get all trails
        const trails = await Trail.aggregate([
            // Optimization: Limit removed to allow Explore page to see all trails
            // { $limit: 20 },
            // Keep only necessary fields
            { $project: { name: 1, difficulty: 1, description: 1, location: 1, duration: 1, tags: 1, rating: 1, numReviews: 1, distance_km: 1, altitude: 1 } },
            {
                $addFields: {
                    durationDays: { $ifNull: ["$duration.min_days", null] }
                }
            },
            // Shape fields for the client
            {
                $project: {
                    _id: 1,
                    name: 1,
                    difficulty: 1,
                    description: 1,
                    location: 1,
                    duration: { $cond: [{ $ifNull: ["$durationDays", false] }, { $concat: [{ $toString: "$durationDays" }, " days"] }, null] },
                    tags: 1,
                    rating: 1,
                    numReviews: 1,
                    distance_km: 1,
                    altitude: 1
                }
            }
        ]);

        // Fetch images later via batch endpoint to improve performance
        // const trailIds = trails.map(t => String(t._id));
        // let imagesMap = new Map();


        // Map to simpler keys the client expects and add images
        let cardData = trails.map(t => {
            const card = {
                id: t._id,
                name: t.name,
                difficulty: t.difficulty,
                description: t.description,
                location: (t.location && (t.location.start || (t.location.provinces && t.location.provinces[0]) || '')) || '',
                duration: t.duration || 'N/A',
                image: "https://via.placeholder.com/600x400?text=Loading...", // Placeholder
                tags: t.tags || [],
                rating: t.rating || 0,
                numReviews: t.numReviews || 0,
                distance_km: t.distance_km || null,
                altitude: t.altitude || null
            };

            // Log if image is missing
            // if (!imageUrl) {
            //    console.log(`[getAllTrails] Trail ${trailId} (${t.name}) has no image, using placeholder`);
            // }

            return card;
        });

        console.log(`[getAllTrails] Returning ${cardData.length} trails. Sample trail with image:`,
            cardData.find(t => t.image && !t.image.includes('placeholder')));

        // If no trails in database, return sample data
        if (cardData.length === 0) {
            console.log('No trails in database, returning sample data');
            cardData = [
                {
                    id: 'R0001',
                    name: "Everest Base Camp",
                    location: "Solukhumbu",
                    province: "Koshi",
                    difficulty: "hard",
                    description: "Walk to the base of the world's highest peak.",
                    duration: "12 days",
                    image: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&fit=crop&q=60",
                    rating: 4.9,
                    tags: ["Mountain", "Trek"],
                    cost_min: 80000,
                    cost_max: 150000
                },
                {
                    id: 'R0002',
                    name: "Annapurna Base Camp",
                    location: "Kaski",
                    province: "Gandaki",
                    difficulty: "moderate",
                    description: "Spectacular views of Annapurna I and Machhapuchhre.",
                    duration: "8 days",
                    image: "https://images.unsplash.com/photo-1533130061792-649d45e41234?w=800&fit=crop&q=60",
                    rating: 4.8,
                    tags: ["Mountain", "Trek"]
                },
                {
                    id: 'R0003',
                    name: "Langtang Valley",
                    location: "Rasuwa",
                    province: "Bagmati",
                    difficulty: "hard",
                    description: "The valley of glaciers, rich in Tamang culture.",
                    duration: "6 days",
                    image: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800&fit=crop&q=60",
                    rating: 4.7,
                    tags: ["Valley", "Trek"]
                },
                {
                    id: 'R0004',
                    name: "Ghorepani Poon Hill",
                    location: "Myagdi",
                    province: "Gandaki",
                    difficulty: "easy",
                    description: "Famous for sunrise views over the Himalayas.",
                    duration: "4 days",
                    image: "https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?w=800&fit=crop&q=60",
                    rating: 4.6,
                    tags: ["Trek", "Views"]
                },
                {
                    id: 'R0005',
                    name: "Makalu Base Camp",
                    location: "Sankhuwasabha",
                    province: "Koshi",
                    difficulty: "hard",
                    description: "Trek to the base of Mt. Makalu with stunning mountain views.",
                    duration: "18 days",
                    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&fit=crop&q=60",
                    rating: 4.8,
                    tags: ["Mountain", "Trek"]
                },
                {
                    id: 'R0006',
                    name: "Mardi Himal",
                    location: "Kaski",
                    province: "Gandaki",
                    difficulty: "moderate",
                    description: "Off-the-beaten-path trek with Machhapuchhre views.",
                    duration: "4 days",
                    image: "https://images.unsplash.com/photo-1626014903700-1c97a8e02d82?w=800&fit=crop&q=60",
                    rating: 4.7,
                    tags: ["Trek", "Scenic"]
                },
                {
                    id: 'R0007',
                    name: "Gosaikunda Lake",
                    location: "Rasuwa",
                    province: "Bagmati",
                    difficulty: "hard",
                    description: "Sacred alpine freshwater lakes with beautiful surroundings.",
                    duration: "5 days",
                    image: "https://images.unsplash.com/photo-1542815965-ea7e5ad4269c?w=800&fit=crop&q=60",
                    rating: 4.8,
                    tags: ["Lake", "Trek"]
                },
                {
                    name: "Rara Lake",
                    location: "Mugu",
                    province: "Karnali",
                    difficulty: "moderate",
                    description: "The largest and deepest lake in Nepal with cultural significance.",
                    duration: "8 days",
                    image: "https://images.unsplash.com/photo-1533130061792-649d45e41234?w=800&fit=crop&q=60",
                    rating: 4.6,
                    tags: ["Lake", "Trek"]
                }
            ];
        }

        res.status(200).json(cardData);
    } catch (error) {
        console.error('Error in getAllTrails:', error);
        res.status(500).json({ message: error.message });
    }
};

// NEW: Batch fetch images for multiple trails
export const getTrailImagesBatch = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({ message: 'ids array is required' });
        }

        const trailIds = ids.map(String);
        let responseMap = {};

        // 1. Check Cache First
        const missingIds = [];
        trailIds.forEach(id => {
            if (globalImageUrlCache.has(id)) {
                responseMap[id] = globalImageUrlCache.get(id);
            } else {
                missingIds.push(id);
            }
        });

        if (missingIds.length > 0) {
            try {
                const authDbConnection = mongoose.connection.useDb('auth_db');
                const imagesCollection = authDbConnection.collection('Cloudinary images');

                // Prepare IDs for query (both string and ObjectId to be safe)
                const queryIds = [...missingIds];
                missingIds.forEach(id => {
                    if (mongoose.Types.ObjectId.isValid(id)) {
                        queryIds.push(new mongoose.Types.ObjectId(id));
                    }
                });

                // Fetch all image documents for these trails
                const imageDocs = await imagesCollection.find({
                    trail_id: { $in: queryIds }
                }).toArray();

                imageDocs.forEach(doc => {
                    const trailId = String(doc.trail_id);
                    let validImage = null;

                    // Helper to extract first image
                    const candidateArrays = [
                        doc.Images, doc.images, doc.image_urls, doc.urls
                    ];

                    // Try named fields
                    for (const arr of candidateArrays) {
                        if (Array.isArray(arr) && arr.length > 0) {
                            validImage = arr[0];
                            break;
                        }
                    }

                    // Fallback: search all keys
                    if (!validImage) {
                        const arrayKeys = Object.keys(doc).filter(key => Array.isArray(doc[key]));
                        if (arrayKeys.length > 0 && doc[arrayKeys[0]].length > 0) {
                            validImage = doc[arrayKeys[0]][0];
                        }
                    }

                    if (validImage) {
                        // Update Response AND Cache
                        responseMap[trailId] = validImage;
                        globalImageUrlCache.set(trailId, validImage);
                    }
                });
            } catch (imgErr) {
                console.error('[getTrailImagesBatch] Error fetching images:', imgErr);
            }
        }

        res.status(200).json(responseMap);

    } catch (error) {
        console.error('Error in getTrailImagesBatch:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getTrailById = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Fetching trail with ID:', id);

        // Try to get the trail
        const trail = await Trail.findById(id).lean();

        if (!trail) {
            // Fallback logic kept for safety (truncated for brevity)
            // ... existing sample logic if needed ...
            return res.status(404).json({ message: "Trail not found", id });
        }

        // Return trail data immediately WITHOUT images or map
        const response = {
            ...trail,
            images: [], // Client fetches via /api/trails/:id/media
            geoJson: null // Client fetches via /api/trails/:id/map
        };

        res.status(200).json(response);
    } catch (error) {
        console.error('Error in getTrailById:', error);
        res.status(500).json({ message: error.message, error: error.toString() });
    }
};

// NEW: Get Images separately for a single trail
export const getTrailMedia = async (req, res) => {
    try {
        const { id } = req.params;
        let images = [];
        try {
            const authDbConnection = mongoose.connection.useDb('auth_db');
            const imagesCollection = authDbConnection.collection('Cloudinary images');
            const imageData = await imagesCollection.findOne({ trail_id: String(id) });

            if (imageData) {
                if (imageData.Images && Array.isArray(imageData.Images)) images = imageData.Images;
                else if (imageData.images && Array.isArray(imageData.images)) images = imageData.images;
                else if (imageData.image_urls && Array.isArray(imageData.image_urls)) images = imageData.image_urls;
                else if (imageData.urls && Array.isArray(imageData.urls)) images = imageData.urls;
            }
        } catch (e) { console.error("Error fetching media", e); }

        res.status(200).json({ images });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get Map Data separately — updated for new GeoJSON schema
export const getTrailMapData = async (req, res) => {
    try {
        const { id } = req.params;
        // Use findOne with trailId (String) instead of findById (which expects ObjectId by default)
        const geoData = await TrailGeoJSON.findOne({ trailId: id }).lean();

        if (!geoData) {
            return res.status(404).json({ message: `No map data found for trail ${id}` });
        }

        res.status(200).json({
            type: "FeatureCollection",
            trailId: geoData.trailId,
            totalDistanceKm: geoData.totalDistanceKm,
            totalAscent: geoData.totalAscent || 0,
            totalDescent: geoData.totalDescent || 0,
            features: geoData.features  // each has geometry + properties.name + properties.distanceKm
        });
    } catch (error) {
        console.error(`[getTrailMapData] Error fetching GeoJSON for trail ${req.params.id}:`, error);
        res.status(500).json({ message: error.message });
    }
};


// getTrailImage removed — all images served from Cloudinary via /api/trails/:id/media



// Add a Review
export const addReview = async (req, res) => {
    try {
        const { rating, comment, userId, userName, userImage } = req.body;
        const trailId = req.params.id;

        if (!userId || !rating) {
            return res.status(400).json({ message: 'userId and rating are required' });
        }

        const numRating = Number(rating);

        // ── 1. Check trail exists and duplicate review ────────────────
        // Use lean() so we never call .save() and avoid the __v: null $inc bug
        const existing = await Trail.findById(trailId).select('reviews rating numReviews').lean();

        if (!existing) {
            return res.status(404).json({ message: 'Trail not found' });
        }

        const existingReviews = existing.reviews || [];
        const alreadyReviewed = existingReviews.find(
            (r) => r.userId?.toString() === userId.toString()
        );

        if (alreadyReviewed) {
            return res.status(400).json({ message: 'You have already reviewed this trail' });
        }

        // ── 2. Push review and recompute rating using findByIdAndUpdate ──
        // This bypasses Mongoose's version key ($inc __v) which fails when __v is null
        const newReview = {
            userName,
            userId,
            userImage: userImage || '',
            rating: numRating,
            comment: comment?.trim() || '',
            createdAt: new Date()
        };

        const updatedReviews = [...existingReviews, newReview];
        const newAvgRating = updatedReviews.reduce((acc, r) => acc + r.rating, 0) / updatedReviews.length;
        const newNumReviews = updatedReviews.length;

        // Use $set for reviews (not $push) — $push fails when the field is null in old documents
        await Trail.collection.updateOne(
            { _id: trailId },
            {
                $set: {
                    reviews: updatedReviews,
                    rating: Math.round(newAvgRating * 10) / 10,
                    numReviews: newNumReviews
                }
            }
        );

        // ── 3. Dual-write: log rate event to User_Trail_Interactions ────
        await UserTrailInteraction.create({
            userId,
            trailId,
            interactionType: 'rate',
            rating: numRating,
            source: 'browse',
            timestamp: new Date()
        });

        // ── 4. Dual-write: upsert Interaction_Aggregate with rating ─────
        let agg = await InteractionAggregate.findOne({ userId, trailId });
        if (!agg) agg = new InteractionAggregate({ userId, trailId });
        agg.rating = numRating;
        agg.lastInteraction = new Date();
        agg.implicitScore = computeScore(agg);
        await agg.save();

        res.status(201).json({
            message: 'Review added',
            reviews: updatedReviews,
            rating: Math.round(newAvgRating * 10) / 10,
            numReviews: newNumReviews
        });
    } catch (error) {
        console.error('[addReview]', error);
        res.status(500).json({ message: error.message });
    }
}