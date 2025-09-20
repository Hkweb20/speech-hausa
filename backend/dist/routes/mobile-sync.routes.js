"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mobile_sync_controller_1 = require("../controllers/mobile-sync.controller");
const mongodb_auth_1 = require("../middleware/mongodb-auth");
const router = (0, express_1.Router)();
// Health check (no auth required)
router.get('/health', mobile_sync_controller_1.mobileHealthCheck);
// App configuration (no auth required for basic config)
router.get('/config', mobile_sync_controller_1.getAppConfig);
// All other routes require authentication
router.use(mongodb_auth_1.authenticate);
// Offline sync endpoints
router.get('/offline/transcripts', mobile_sync_controller_1.getOfflineTranscripts);
router.post('/offline/sync', mobile_sync_controller_1.syncOfflineTranscripts);
router.get('/sync/status', mobile_sync_controller_1.getSyncStatus);
router.post('/sync/resolve-conflicts', mobile_sync_controller_1.resolveSyncConflicts);
exports.default = router;
