import express from 'express';
const router = express.Router();
import {changePassword, loadme, login, logout, register, updateUser,forgotPassword,resetPassword, verify, sendFriendLink, resetPasswordFromDashboard, sendFeedback, raiseSupportTicket, updateUserLogo, updateLandlordInfo} from './controllers/authController.js';
import {isAuthenticate} from "./middlewares/auth.js"
import { create, getAllMeetings, getMeetingById, updateMeeting, deleteMeeting, getMeetingForShare, getMeetingByMeetingId, deleteRecording, deleteScreenshot, archiveMeeting, unarchiveMeeting, getArchivedCount, recordVisitorAccess } from './controllers/meetingController.js';

// auth routes
router.route('/register').post(register);
router.route('/login').post(login);
router.route('/verify').post(verify);
router.route('/me').get(isAuthenticate,loadme);
router.route('/logout').get(logout);
router.route('/user/update').put(isAuthenticate,updateUser);
router.route('/user/change-password').put(isAuthenticate,changePassword);
router.route('/forgot-password').post(forgotPassword);
router.route('/reset-password/:token').put(resetPassword);
router.route('/send-friend-link').post(isAuthenticate, sendFriendLink);
router.route('/user/reset-password').put(isAuthenticate, resetPasswordFromDashboard);
router.route('/send-feedback').post(isAuthenticate, sendFeedback);
router.route('/raise-support-ticket').post(isAuthenticate, raiseSupportTicket);
router.route('/user/update-logo').put(isAuthenticate, updateUserLogo);
router.route('/user/update-landlord-info').put(isAuthenticate, updateLandlordInfo);

// meeting routes
router.route('/meetings/create').post(isAuthenticate, create);
router.route('/meetings/all').get(isAuthenticate, getAllMeetings);
router.route('/meetings/archived-count').get(isAuthenticate, getArchivedCount);
router.route('/meetings/:id').get(isAuthenticate, getMeetingById);
router.route('/meetings/:id').put(isAuthenticate, updateMeeting);
router.route('/meetings/:id').delete(isAuthenticate, deleteMeeting);
router.route('/meetings/:id/archive').put(isAuthenticate, archiveMeeting);
router.route('/meetings/:id/unarchive').put(isAuthenticate, unarchiveMeeting);
router.route('/meetings/by-meeting-id/:meetingId').get(isAuthenticate, getMeetingByMeetingId);
router.route('/meetings/:meetingId/recordings/:recordingId').delete(isAuthenticate, deleteRecording);
router.route('/meetings/:meetingId/screenshots/:screenshotId').delete(isAuthenticate, deleteScreenshot);

// Public route for sharing meetings (no authentication required)
router.route('/meetings/share/:id').get(getMeetingForShare);

// New public route for recording visitor access (no authentication required)
router.route('/meetings/share/:id/access').post(recordVisitorAccess);

export default router;