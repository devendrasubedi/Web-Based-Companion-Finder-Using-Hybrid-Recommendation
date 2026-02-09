import { Trail, TrailGeoJSON } from '../models/trailModel.js';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';


// --- SERVER-SIDE CACHING ---
// Store image URLs in memory to avoid repeated DB lookups
const globalImageUrlCache = new Map();
// Store local file paths (legacy)
const imageCache = new Map();

// FOR THE CARDS (List View)
// Returns a compact set of fields tailored for the front-end cards and search/filter
export const getAllTrails = async (req, res) => {
    try {
        // First, get all trails
        const trails = await Trail.aggregate([
            // Optimization: Limit number of trails fetched for homepage performance
            { $limit: 20 },
            // Keep only necessary fields
            { $project: { name: 1, difficulty: 1, description: 1, location: 1, duration: 1, tags: 1, rating: 1 } },
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
                    tags: 1
                }
            }
        ]);

        // Fetch images later via batch endpoint to improve performance
        // const trailIds = trails.map(t => String(t._id));
        // let imagesMap = new Map();


        // Map to simpler keys the client expects and add images
        let cardData = trails.map(t => {
            const trailId = String(t._id);
            // const imageUrl = imagesMap.get(trailId);

            const card = {
                id: t._id,
                name: t.name,
                difficulty: t.difficulty,
                description: t.description,
                location: (t.location && (t.location.start || (t.location.provinces && t.location.provinces[0]) || '')) || '',
                duration: t.duration || 'N/A',
                image: "https://via.placeholder.com/600x400?text=Loading...", // Placeholder
                tags: t.tags || [],
                rating: t.rating || 4.5
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

// NEW: Get Map Data separately
export const getTrailMapData = async (req, res) => {
    try {
        const { id } = req.params;
        let geoJsonData = null;
        try {
            geoJsonData = await TrailGeoJSON.findOne({ trail_id: id }).lean();
        } catch (geoError) {
            console.error(`Error fetching GeoJSON for trail ${id}:`, geoError);
        }
        res.status(200).json({ geoJson: geoJsonData });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// Get image for a trail by trail ID
export const getTrailImage = (req, res) => {
    const { trailId } = req.params;
    const localPath = imageCache.get(trailId);

    if (!localPath) {
        return res.status(404).json({ message: "Image not found" });
    }

    // Convert Windows path to proper file path and construct full path
    const cleanPath = localPath.replace(/\\/g, '/');

    // Try multiple possible locations for the images folder
    let fullPath;

    // Check if images are in root project folder
    let possiblePath = path.join(process.cwd(), '..', cleanPath);
    if (fs.existsSync(possiblePath)) {
        fullPath = possiblePath;
    } else {
        // Check if images are in server folder
        possiblePath = path.join(process.cwd(), cleanPath);
        fullPath = possiblePath;
    }

    console.log('Requested image path:', fullPath);

    res.sendFile(fullPath, (err) => {
        if (err) {
            console.error('Error sending image:', err.message);
            res.status(404).json({ message: "Image file not found on disk", path: fullPath });
        }
    });
};


export { imageCache };