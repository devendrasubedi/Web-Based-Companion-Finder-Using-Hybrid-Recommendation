import { Trail } from '../models/trailModel.js';

// FOR THE CARDS (List View)
export const getAllTrails = async (req, res) => {
    try {
        // .select() ensures we only get the fields needed for the card
        // This makes the API response much faster!
        const trails = await Trail.find({}).select('name distance duration images');

        // Optional: Map the results to only send the FIRST image for the card
        const cardData = trails.map(trail => ({
            _id: trail._id,
            name: trail.name,
            distance: trail.distance.min_km,
            duration: trail.duration.min_days,
            thumbnail: trail.images[0]?.local_path || 'default.jpg'
        }));

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

            // 4. Clean up the arrays into single objects/arrays
            {
                $addFields: {
                    // Extract the 'images' array from the first match
                    images: { $arrayElemAt: ["$imageJoin.images", 0] },
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