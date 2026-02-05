
import express from 'express';
const router = express.Router();
import { getAllUsers, getUserProfile }  from '../controllers/userController.js';

// Route to list users (minimal info for cards)  --> GET /api/users
router.get('/', getAllUsers);

// Route to get a specific user
router.get('/:id', getUserProfile);

export default  router;