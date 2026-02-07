import express from 'express';
import { getAllTrails, getTrailById, getTrailImage } from '../controllers/trailController.js';
import { debugImagesCollection, debugLinkImage } from '../controllers/debugController.js';

const router = express.Router();

// Debug endpoints - Comment out in production
// IMPORTANT: These routes must come BEFORE /:id route to avoid route conflicts
router.get('/debug/images', debugImagesCollection);
router.post('/debug/link-image', debugLinkImage);

// Test route to verify debug endpoint is accessible
router.get('/debug/test', (req, res) => {
    res.json({ message: 'Debug routes are working!', timestamp: new Date().toISOString() });
});

// Route for the "Card" view (List)
router.get('/', getAllTrails);

// Route to get an image for a trail - make it explicit so it doesn't conflict with /:id
router.get('/image/:trailId', getTrailImage);

// Route for the "Single Page" view (Details)
router.get('/:id', getTrailById);

export default router;