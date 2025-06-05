import express from 'express';
import { 
    create, 
    getAllMeetings, 
    getMeetingById, 
    updateMeeting, 
    deleteMeeting,
    getMeetingForShare 
} from '../controllers/meetingController.js';
import { isAuthenticated } from '../middlewares/auth.js';

const router = express.Router();

// Protected routes (require authentication)
router.post('/create', isAuthenticated, create);
router.get('/all', isAuthenticated, getAllMeetings);
router.get('/:id', isAuthenticated, getMeetingById);
router.put('/:id', isAuthenticated, updateMeeting);
router.delete('/:id', isAuthenticated, deleteMeeting);

// Public route for sharing
router.get('/share/:id', getMeetingForShare);

export default router;
