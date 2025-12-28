
import express from 'express';
const router = express.Router();
import { getUserProfile }  from '../controllers/userController.js';

// Route to get a specific user
router.get('/:id', getUserProfile);

export default  router;