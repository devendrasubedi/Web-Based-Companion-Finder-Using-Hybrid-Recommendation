import express from 'express';
import {
    getAllTrails,
    getTrailById,
    getTrailImage,
    getTrailImagesBatch,
    getTrailMedia,
    getTrailMapData,
    addReview
} from '../controllers/trailController.js';

const router = express.Router();

// Route for the "Card" view (List)
router.get('/', getAllTrails);

// NEW: Batch fetch images
router.post('/batch-images', getTrailImagesBatch);

// Route to get an image for a trail - make it explicit so it doesn't conflict with /:id
router.get('/image/:trailId', getTrailImage);

// Route for the "Single Page" view (Details)
router.get('/:id', getTrailById);

// NEW: Routes for separate resources (lazy loading)
router.get('/:id/media', getTrailMedia);
router.get('/:id/map', getTrailMapData);

// NEW: Add review
router.post('/:id/reviews', addReview);

export default router;