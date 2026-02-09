import { Trail, TrailGeoJSON } from '../models/trailModel.js';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import { getCloudinaryCardImage, getCloudinaryDetailImage, getCloudinaryUrl } from '../utils/cloudinaryHelper.js';

// --- SERVER-SIDE CACHING ---
// Store image URLs in memory to avoid repeated DB lookups
const globalImageUrlCache = new Map(); 
// Store local file paths (legacy)
const imageCache = new Map();

// FOR THE CARDS (List View)
// Returns a compact set of fields tailored for the front-end cards and search/filter
export const getAllTrails = async (req, res) => {
    try {
        // .select() ensures we only get the fields needed for the card
        // This makes the API response much faster!
        const trails = await Trail.find({}).select('name distance duration');

        // Map the results to send basic trail data for cards
        const cardData = trails.map(trail => ({
            _id: trail._id,
            name: trail.name,
            distance: trail.distance?.min_km || 0,
            duration: trail.duration?.min_days || 0,
            thumbnail: 'default.jpg'
        }));

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
        } catch(e) { console.error("Error fetching media", e); }

        res.status(200).json({ images });
    } catch(error) {
        res.status(500).json({message: error.message});
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
    } catch(error) {
        res.status(500).json({message: error.message});
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