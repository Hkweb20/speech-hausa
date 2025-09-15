"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongodb_auth_1 = require("../middleware/mongodb-auth");
const usage_service_1 = require("../services/usage.service");
const router = (0, express_1.Router)();
const usageService = new usage_service_1.UsageService();
// Check live recording usage
router.post('/check-live-recording', mongodb_auth_1.authenticate, async (req, res) => {
    try {
        const { requestedMinutes } = req.body;
        if (!requestedMinutes || requestedMinutes <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid requestedMinutes'
            });
        }
        const result = await usageService.checkLiveRecordingUsage(req.user.id, requestedMinutes);
        res.json(result);
    }
    catch (error) {
        console.error('Error checking live recording usage:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Record live recording usage
router.post('/record-live-recording', mongodb_auth_1.authenticate, async (req, res) => {
    try {
        const { minutes } = req.body;
        if (!minutes || minutes <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid minutes'
            });
        }
        await usageService.recordLiveRecordingUsage(req.user.id, minutes);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error recording live recording usage:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
exports.default = router;
