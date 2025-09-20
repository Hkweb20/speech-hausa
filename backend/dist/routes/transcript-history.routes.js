"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const transcript_history_controller_1 = require("../controllers/transcript-history.controller");
const mongodb_auth_1 = require("../middleware/mongodb-auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(mongodb_auth_1.authenticate);
// Get recent transcript history
router.get('/recent', transcript_history_controller_1.getRecentTranscripts);
// Search transcripts with filters
router.get('/search', transcript_history_controller_1.searchTranscripts);
// Get transcript statistics
router.get('/stats', transcript_history_controller_1.getTranscriptStats);
// Get specific transcript by ID
router.get('/:id', transcript_history_controller_1.getTranscriptById);
// Update transcript
router.put('/:id', transcript_history_controller_1.updateTranscript);
// Delete transcript
router.delete('/:id', transcript_history_controller_1.deleteTranscript);
// Export transcripts
router.get('/export/:format', transcript_history_controller_1.exportTranscripts);
exports.default = router;
