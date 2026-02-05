import { Trail } from '../models/trailModel.js';
import path from 'path';
import fs from 'fs';

// Store image paths for retrieval
const imageCache = new Map();

// FOR THE CARDS (List View)
// Returns a compact set of fields tailored for the front-end cards and search/filter
export const getAllTrails = async (req, res) => {
    try {
        const trails = await Trail.aggregate([
            // Keep only necessary fields
            { $project: { name: 1, difficulty: 1, description: 1, location: 1, duration: 1, tags: 1 } },
            // Lookup the first image from Trails_Images
            {
                $lookup: {
                    from: "Trails_Images",
                    localField: "_id",
                    foreignField: "trail_id",
                    as: "images"
                }
            },
            {
                $addFields: {
                    thumbnail: {
                        $cond: [
                            { $gt: [{ $size: "$images" }, 0] },
                            { $getField: { field: "original_url", input: { $arrayElemAt: [{ $arrayElemAt: ["$images.images", 0] }, 0] } } },
                            null
                        ]
                    },
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
                    thumbnail: { $ifNull: ["$thumbnail", null] }
                }
            }
        ]);

        // Map to simpler keys the client expects
        const cardData = trails.map(t => {
            return {
                id: t._id,
                name: t.name,
                difficulty: t.difficulty,
                description: t.description,
                location: (t.location && (t.location.start || (t.location.provinces && t.location.provinces[0]) || '')) || '',
                duration: t.duration || 'N/A',
                image: t.thumbnail || "https://via.placeholder.com/600x400?text=Trail",
                tags: t.tags || []
            };
        });

        res.status(200).json(cardData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


export const getTrailById = async (req, res) => {
    try {
        const { id } = req.params;

        const trailData = await Trail.aggregate([
            // 1. Find the trail in Trails_metadata (e.g., "R0102")
            { $match: { _id: id } },

            // 2. Join with Trails_Images
            {
                $lookup: {
                    from: "Trails_Images",
                    localField: "_id",
                    foreignField: "trail_id",
                    as: "imageJoin"
                }
            },

            // 3. Join with Trails_GeoJSON
            {
                $lookup: {
                    from: "Trails_GeoJSON",
                    localField: "_id",
                    foreignField: "trail_id",
                    as: "geoJoin"
                }
            },

            // 4. Extract and format the image URL and GeoJSON
            {
                $addFields: {
                    // Extract the original_url from first image in the images array
                    image: {
                        $cond: [
                            { $gt: [{ $size: "$imageJoin" }, 0] },
                            {
                                $cond: [
                                    { $gt: [{ $size: { $arrayElemAt: ["$imageJoin.images", 0] } }, 0] },
                                    { $arrayElemAt: [{ $arrayElemAt: [{ $arrayElemAt: ["$imageJoin.images", 0] }, "original_url"] }, 0] },
                                    "https://via.placeholder.com/800x400?text=Trail"
                                ]
                            },
                            "https://via.placeholder.com/800x400?text=Trail"
                        ]
                    },
                    // Extract the entire GeoJSON document from the first match
                    geoData: { $arrayElemAt: ["$geoJoin", 0] }
                }
            },

            // 5. Remove the extra "Join" fields from the final JSON
            { $project: { imageJoin: 0, geoJoin: 0 } }
        ]);

        if (!trailData || trailData.length === 0) {
            return res.status(404).json({ message: "Trail not found" });
        }

        res.status(200).json(trailData[0]);
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