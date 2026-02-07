import { Trail } from '../models/trailModel.js';
import mongoose from 'mongoose';

/**
 * Debug endpoint to inspect the Cloudinary/Trail Images collection
 * GET /api/trails/debug/images
 */
export const debugImagesCollection = async (req, res) => {
    try {
        // Check if mongoose is connected
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({
                success: false,
                message: 'Database not connected',
                readyState: mongoose.connection.readyState,
                states: {
                    0: 'disconnected',
                    1: 'connected',
                    2: 'connecting',
                    3: 'disconnecting'
                }
            });
        }

        // Get the mongoose connection and switch to auth_db database
        const authDbConnection = mongoose.connection.useDb('auth_db');
        
        // Get default database safely
        let defaultDb = null;
        let defaultDbName = 'unknown';
        try {
            if (Trail.collection && Trail.collection.db) {
                defaultDb = Trail.collection.db;
                defaultDbName = defaultDb.databaseName || 'unknown';
            } else {
                defaultDb = mongoose.connection.db;
                defaultDbName = mongoose.connection.name || mongoose.connection.db?.databaseName || 'unknown';
            }
        } catch (err) {
            console.warn('Could not get default database:', err.message);
            defaultDb = mongoose.connection.db;
            defaultDbName = mongoose.connection.name || 'unknown';
        }
        
        console.log('Mongoose connection state:', mongoose.connection.readyState);
        console.log('Default database name:', defaultDbName);
        
        // Log all collections in auth_db - use the native db object
        let authCollections = [];
        let defaultCollections = [];
        
        try {
            // Get the native MongoDB database object from the connection
            const authDbNative = authDbConnection.db;
            if (authDbNative && authDbNative.listCollections) {
                authCollections = await authDbNative.listCollections().toArray();
                console.log('Available collections in auth_db:', authCollections.map(c => c.name || c));
            } else {
                console.log('Could not access native db object from authDbConnection');
            }
        } catch (err) {
            console.warn('Could not list collections from auth_db:', err.message);
            console.warn('Error details:', err);
        }
        
        try {
            if (defaultDb && defaultDb.listCollections) {
                defaultCollections = await defaultDb.listCollections().toArray();
                console.log('Available collections in default db:', defaultCollections.map(c => c.name || c));
            }
        } catch (err) {
            console.warn('Could not list collections from default database:', err.message);
        }
        
        // List of possible image collection names to check
        const possibleCollections = [
            'Cloudinary images',  // Primary collection (lowercase 'i')
            'Cloudinary Images',  // Fallback (uppercase 'I')
            'Trails_Images',
            'cloudinary_images',
            'images',
            'trail_images',
            'TrailImages',
            'CloudinaryImages',
            'Images'
        ];
        
        const results = {};
        
        // Check collections in auth_db first (primary)
        for (const colName of possibleCollections) {
            try {
                // Use the connection's collection method directly
                const collection = authDbConnection.collection(colName);
                const count = await collection.countDocuments();
                const samples = await collection.find({}).limit(3).toArray();
                
                results[colName] = {
                    exists: count > 0,
                    count,
                    samples: samples.length > 0 ? samples : [],
                    database: 'auth_db'
                };
                
                console.log(`Collection "${colName}" in auth_db: ${count} documents`);
            } catch (err) {
                console.log(`Collection "${colName}" not found in auth_db: ${err.message}`);
                // Also check in default database as fallback
                if (defaultDb) {
                    try {
                        const collection = defaultDb.collection(colName);
                        const count = await collection.countDocuments();
                        const samples = await collection.find({}).limit(3).toArray();
                        
                        results[colName] = {
                            exists: count > 0,
                            count,
                            samples: samples.length > 0 ? samples : [],
                            database: defaultDbName
                        };
                        
                        console.log(`Collection "${colName}" in ${defaultDbName}: ${count} documents`);
                    } catch (err2) {
                        results[colName] = { exists: false, error: err.message, triedBoth: true };
                    }
                } else {
                    results[colName] = { exists: false, error: err.message, database: 'auth_db' };
                }
            }
        }
        
        // Also try to get all trails and see their structure
        const trails = await Trail.find({}).select('_id name').limit(5).lean();
        console.log('Sample trails:', trails);
        
        // Check Cloudinary images collection specifically in auth_db
        let cloudinaryImagesCheck = null;
        try {
            // Use the connection's collection method directly
            const cloudinaryCollection = authDbConnection.collection('Cloudinary images');
            const cloudinaryCount = await cloudinaryCollection.countDocuments();
            const cloudinarySamples = await cloudinaryCollection.find({}).limit(3).toArray();
            
            // Check if any trails have matching images
            const trailIds = trails.map(t => String(t._id));
            const matchingImages = await cloudinaryCollection.find({ 
                trail_id: { $in: trailIds } 
            }).toArray();
            
            cloudinaryImagesCheck = {
                exists: true,
                count: cloudinaryCount,
                samples: cloudinarySamples,
                matchingTrails: matchingImages.length,
                trailIdsChecked: trailIds,
                matchingDocuments: matchingImages,
                database: 'auth_db'
            };
        } catch (err) {
            cloudinaryImagesCheck = { exists: false, error: err.message, database: 'auth_db' };
        }
        
        res.status(200).json({
            message: 'Debug information for Cloudinary images collection',
            success: true,
            collections: results,
            cloudinaryImages: cloudinaryImagesCheck,
            sampleTrails: trails,
            defaultDatabase: defaultDbName,
            authDatabase: 'auth_db',
            allAuthCollections: authCollections.map(c => c.name),
            allDefaultCollections: defaultCollections.map(c => c.name),
            mongooseReadyState: mongoose.connection.readyState
        });
        
    } catch (error) {
        console.error('Error in debugImagesCollection:', error);
        res.status(500).json({ 
            message: error.message,
            error: error.toString()
        });
    }
};

/**
 * Manually associate a Cloudinary image with a trail
 * POST /api/trails/debug/link-image
 * Body: { trail_id: "R0001", public_id: "Nepal-Treks/Everest-Base-Camp" }
 */
export const debugLinkImage = async (req, res) => {
    try {
        const { trail_id, public_id } = req.body;
        
        if (!trail_id || !public_id) {
            return res.status(400).json({ 
                message: 'Missing trail_id or public_id'
            });
        }
        
        const db = Trail.collection.db;
        const imagesCollection = db.collection('Trails_Images');
        
        // Create or update the image record
        const result = await imagesCollection.updateOne(
            { trail_id },
            {
                $set: {
                    trail_id,
                    public_id,
                    updated_at: new Date()
                }
            },
            { upsert: true }
        );
        
        console.log('Linked image:', { trail_id, public_id, result });
        
        res.status(200).json({
            message: 'Image linked successfully',
            trail_id,
            public_id,
            matched: result.matchedCount,
            modified: result.modifiedCount,
            upserted: result.upsertedId
        });
        
    } catch (error) {
        console.error('Error in debugLinkImage:', error);
        res.status(500).json({ 
            message: error.message,
            error: error.toString()
        });
    }
};

export default {
    debugImagesCollection,
    debugLinkImage
};
