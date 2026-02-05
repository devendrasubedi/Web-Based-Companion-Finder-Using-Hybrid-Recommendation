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
        let cardData = trails.map(t => {
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
                    tags: ["Mountain", "Trek"]
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
                    id: 'R0008',
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


export const getTrailById = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Fetching trail with ID:', id);

        // First, try to get the trail
        const trail = await Trail.findById(id).lean();
        
        if (!trail) {
            console.log('Trail not found in database for ID:', id);
            
            // Fallback: Return sample trail data for demo purposes
            const sampleTrails = {
                'R0001': {
                    _id: 'R0001',
                    name: "Everest Base Camp",
                    location: { start: "Kathmandu", end: "Everest Base Camp" },
                    province: "Solukhumbu",
                    district: "Solukhumbu",
                    type: "Trek",
                    difficulty: "hard",
                    duration: { min_days: 12, max_days: 14 },
                    distance: { value: 130, unit: "km" },
                    altitude: { max_m: 5364 },
                    cost: { min_npr: 80000, max_npr: 150000 },
                    rating: 4.9,
                    description: "Walk to the base of the world's highest peak. A challenging trek with spectacular mountain views. This is one of the most popular treks in Nepal, offering breathtaking views of Mount Everest, Lhotse, and Nuptse. The trek passes through Sherpa villages, Buddhist monasteries, and pristine alpine meadows.",
                    accommodationType: "Teahouse",
                    tags: ["Mountain","Trek","Popular","Everest"],
                    image: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&fit=crop&q=60",
                    latitude: 28.0329,
                    longitude: 86.8688,
                    itinerary: [
                        { day: "Day 1", description: "Arrive in Kathmandu", points: ["Rest and acclimatize", "Visit Durbar Square"] },
                        { day: "Day 2", description: "Flight to Lukla and trek to Phakding", points: ["Scenic flight", "Easy 3-4 hour trek", "Overnight at teahouse"] },
                        { day: "Day 3", description: "Trek to Namche Bazaar", points: ["5-6 hours trekking", "Arrival in major trading hub", "Acclimatization day"] },
                        { day: "Days 4-5", description: "Acclimatization in Namche", points: ["Rest and explore the village", "Visit Everest View Hotel", "Trek to Thame (optional)"] },
                        { day: "Day 6", description: "Trek to Tengboche", points: ["5-6 hours", "Visit famous monastery"] },
                        { day: "Day 7", description: "Trek to Dingboche", points: ["5-6 hours", "Another acclimatization point"] },
                        { day: "Days 8-9", description: "Dingboche acclimatization", points: ["Rest day", "Trek around the area"] },
                        { day: "Day 10", description: "Trek to Lobuche East", points: ["6-7 hours"] },
                        { day: "Day 11", description: "Trek to Everest Base Camp", points: ["5-6 hours to EBC", "Return to Gorakshep"] },
                        { day: "Day 12", description: "Return trek to Pheriche", points: ["6-7 hours descent"] },
                        { day: "Day 13-14", description: "Return to Kathmandu", points: ["Trek back to Lukla", "Flight to Kathmandu"] }
                    ],
                    reviews: [
                        { id: 1, userName: "John Doe", rating: 5, date: "2 months ago", comment: "Amazing experience! The views are incredible." },
                        { id: 2, userName: "Jane Smith", rating: 4.5, date: "1 month ago", comment: "Challenging but rewarding. Would recommend to experienced trekkers." }
                    ]
                },
                'R0002': {
                    _id: 'R0002',
                    name: "Annapurna Base Camp",
                    location: { start: "Pokhara", end: "Annapurna Base Camp" },
                    province: "Gandaki",
                    district: "Kaski",
                    type: "Trek",
                    difficulty: "moderate",
                    duration: { min_days: 7, max_days: 10 },
                    distance: { value: 70, unit: "km" },
                    altitude: { max_m: 4130 },
                    cost: { min_npr: 60000, max_npr: 120000 },
                    rating: 4.8,
                    description: "Spectacular views of Annapurna I and Machhapuchhre. A moderate trek suitable for most fitness levels. This trek offers some of the best mountain views in the Annapurna Himalayas, with diverse landscapes from lush forests to alpine meadows.",
                    accommodationType: "Teahouse",
                    tags: ["Mountain","Trek","Scenic","Annapurna"],
                    image: "https://images.unsplash.com/photo-1533130061792-649d45e41234?w=800&fit=crop&q=60",
                    latitude: 28.5686,
                    longitude: 83.8647,
                    itinerary: [
                        { day: "Day 1", description: "Arrive in Pokhara", points: ["Rest and explore lakeside"] },
                        { day: "Day 2", description: "Trek to Nayapul then Birethanti", points: ["Short drive to Nayapul", "4-5 hours trekking"] },
                        { day: "Day 3-4", description: "Trek to Ghorepani", points: ["5-6 hours", "Rest day for acclimatization"] },
                        { day: "Day 5", description: "Poon Hill sunrise", points: ["Early morning hike", "Return to Ghorepani"] },
                        { day: "Day 6-7", description: "Trek to Annapurna Base Camp", points: ["Various viewpoints", "Lodge at base camp"] },
                        { day: "Day 8-10", description: "Return trek", points: ["Return via same route", "Extra day for rest"] }
                    ],
                    reviews: [
                        { id: 1, userName: "Sarah Wilson", rating: 5, date: "3 weeks ago", comment: "Perfect trek for beginners! Beautiful views." }
                    ]
                }
            };
            
            const sampleTrail = sampleTrails[id];
            if (sampleTrail) {
                console.log('Returning sample trail data for demo');
                return res.status(200).json(sampleTrail);
            }
            
            return res.status(404).json({ message: "Trail not found", id });
        }

        // Fetch images if available
        let imageUrl = null;
        try {
            const images = await Trail.findById(id).populate('images');
            if (images && images.images && images.images.length > 0) {
                imageUrl = images.images[0].original_url || images.images[0].url;
            }
        } catch (imgErr) {
            console.log('No images found for trail:', id);
        }

        // Add fallback image
        if (!imageUrl) {
            imageUrl = "https://via.placeholder.com/800x400?text=" + encodeURIComponent(trail.name || 'Trail');
        }

        // Return trail data with image
        const response = {
            ...trail,
            image: imageUrl
        };

        console.log('Returning trail data:', response._id);
        res.status(200).json(response);
    } catch (error) {
        console.error('Error in getTrailById:', error);
        res.status(500).json({ message: error.message, error: error.toString() });
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