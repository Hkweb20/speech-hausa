"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_auth_controller_1 = require("../controllers/admin-auth.controller");
const admin_limits_controller_1 = require("../controllers/admin-limits.controller");
const admin_users_controller_1 = require("../controllers/admin-users.controller");
const admin_analytics_controller_1 = require("../controllers/admin-analytics.controller");
const admin_languages_controller_1 = require("../controllers/admin-languages.controller");
const admin_auth_1 = require("../middleware/admin-auth");
const router = (0, express_1.Router)();
// Public admin routes (no authentication required)
router.post('/auth/login', admin_auth_controller_1.adminLogin);
router.post('/auth/logout', admin_auth_controller_1.adminLogout);
// Protected admin routes
router.use(admin_auth_1.authenticateAdmin);
// Admin profile
router.get('/auth/profile', admin_auth_controller_1.getAdminProfile);
// Subscription limits management
router.get('/limits/subscription-tiers', (0, admin_auth_1.requirePermission)('manage_limits'), admin_limits_controller_1.getSubscriptionTiers);
router.put('/limits/subscription-tiers/:tierName', (0, admin_auth_1.requirePermission)('manage_limits'), admin_limits_controller_1.updateSubscriptionTier);
router.put('/limits/subscription-tiers', (0, admin_auth_1.requirePermission)('manage_limits'), admin_limits_controller_1.updateAllSubscriptionTiers);
router.post('/limits/reset-all-daily', (0, admin_auth_1.requireRole)(['super_admin', 'admin']), admin_limits_controller_1.resetAllDailyLimits);
// User management
router.get('/users', (0, admin_auth_1.requirePermission)('manage_users'), admin_users_controller_1.getAllUsers);
router.get('/users/:id', (0, admin_auth_1.requirePermission)('manage_users'), admin_users_controller_1.getUserById);
router.get('/users/:id/usage', (0, admin_auth_1.requirePermission)('manage_users'), admin_users_controller_1.getUserUsage);
router.get('/users/:id/subscription', (0, admin_auth_1.requirePermission)('manage_users'), admin_users_controller_1.getUserSubscriptionInfo);
router.put('/users/:id', (0, admin_auth_1.requirePermission)('manage_users'), admin_users_controller_1.updateUser);
router.post('/users/:id/upgrade', (0, admin_auth_1.requirePermission)('manage_users'), admin_users_controller_1.upgradeUser);
router.post('/users/bulk-upgrade', (0, admin_auth_1.requirePermission)('manage_users'), admin_users_controller_1.bulkUpgradeUsers);
router.post('/users/:id/reset-daily', (0, admin_auth_1.requirePermission)('manage_users'), admin_users_controller_1.resetUserDailyLimits);
router.post('/users/:id/reset-monthly', (0, admin_auth_1.requirePermission)('manage_users'), admin_users_controller_1.resetUserMonthlyLimits);
router.delete('/users/:id', (0, admin_auth_1.requireRole)(['super_admin', 'admin']), admin_users_controller_1.deleteUser);
// Analytics and reporting
router.get('/analytics/system-stats', (0, admin_auth_1.requirePermission)('view_analytics'), admin_analytics_controller_1.getSystemStats);
router.get('/analytics/users/:userId', (0, admin_auth_1.requirePermission)('view_analytics'), admin_analytics_controller_1.getUserAnalytics);
router.get('/analytics/usage-report', (0, admin_auth_1.requirePermission)('view_analytics'), admin_analytics_controller_1.getUsageReport);
router.get('/analytics/logs', (0, admin_auth_1.requirePermission)('audit_logs'), admin_analytics_controller_1.getAdminLogs);
// Language management
router.get('/languages', (0, admin_auth_1.requirePermission)('manage_system'), admin_languages_controller_1.getLanguages);
router.post('/languages', (0, admin_auth_1.requirePermission)('manage_system'), admin_languages_controller_1.addLanguage);
router.put('/languages/:id', (0, admin_auth_1.requirePermission)('manage_system'), admin_languages_controller_1.updateLanguage);
router.delete('/languages/:id', (0, admin_auth_1.requirePermission)('manage_system'), admin_languages_controller_1.deleteLanguage);
router.get('/languages/available', admin_languages_controller_1.getAvailableLanguages);
exports.default = router;
