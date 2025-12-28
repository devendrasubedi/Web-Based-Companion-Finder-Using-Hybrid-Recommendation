import express from 'express';
import { getAllTrails, getTrailById } from '../controllers/trail.controller.js';

const router = express.Router();

// Route for the "Card" view (List)
router.get('/', getAllTrails);

// Route for the "Single Page" view (Details)
router.get('/:id', getTrailById);

export default router;