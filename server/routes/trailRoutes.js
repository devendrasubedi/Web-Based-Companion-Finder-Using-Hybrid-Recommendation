import express from 'express';
import {
    getAllTrails,
    getTrailById,
    getTrailImagesBatch,
    getTrailMedia,
    getTrailMapData,
    addReview
} from '../controllers/trailController.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();

/* ==============================
   TRAIL LIST (CARDS)
============================== */
router.get('/', getAllTrails);


/* ==============================
   BATCH IMAGES (CARDS PERFORMANCE)
============================== */
router.post('/batch-images', getTrailImagesBatch);


/* ==============================
   SINGLE TRAIL DETAILS
============================== */
router.get('/:id', getTrailById);


/* ==============================
   TRAIL MEDIA (GALLERY)
============================== */
router.get('/:id/media', getTrailMedia);


/* ==============================
   TRAIL MAP (GEOJSON)
============================== */
router.get('/:id/map', getTrailMapData);


/* ==============================
   ADD REVIEW
============================== */
router.post('/:id/reviews', verifyToken, addReview);


export default router;
