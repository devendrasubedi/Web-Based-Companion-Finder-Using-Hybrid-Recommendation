import express from 'express';
import { getAllTrails, getTrailById, getTrailImage } from '../controllers/trailController.js';

const router = express.Router();

// Route for the "Card" view (List)
router.get('/', getAllTrails);

// Route to get an image for a trail - make it explicit so it doesn't conflict with /:id
router.get('/image/:trailId', getTrailImage);

// Route for the "Single Page" view (Details)
router.get('/:id', getTrailById);

export default router;