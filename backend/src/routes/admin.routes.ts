import { Router } from 'express';
import { adminLogin, adminLogout, getAdminProfile } from '../controllers/admin-auth.controller';
import { 
  getSubscriptionTiers, 
  updateSubscriptionTier, 
  updateAllSubscriptionTiers,
  resetAllDailyLimits,
  getDailyResetStatus,
  triggerDailyReset
} from '../controllers/admin-limits.controller';
import {
  getAllUsers,
  getUserById,
  getUserUsage,
  updateUser,
  resetUserDailyLimits,
  resetUserMonthlyLimits,
  deleteUser,
  upgradeUser,
  bulkUpgradeUsers,
  getUserSubscriptionInfo
} from '../controllers/admin-users.controller';
import {
  getSystemStats,
  getUserAnalytics,
  getUsageReport,
  getAdminLogs
} from '../controllers/admin-analytics.controller';
import {
  getLanguages,
  addLanguage,
  updateLanguage,
  deleteLanguage,
  toggleLanguageStatus,
  getAvailableLanguages
} from '../controllers/admin-languages.controller';
import { 
  authenticateAdmin, 
  requirePermission, 
  requireRole 
} from '../middleware/admin-auth';

const router = Router();

// Public admin routes (no authentication required)
router.post('/auth/login', adminLogin);
router.post('/auth/logout', adminLogout);

// Protected admin routes
router.use(authenticateAdmin);

// Admin profile
router.get('/auth/profile', getAdminProfile);

// Subscription limits management
router.get('/limits/subscription-tiers', 
  requirePermission('manage_limits'), 
  getSubscriptionTiers
);
router.put('/limits/subscription-tiers/:tierName', 
  requirePermission('manage_limits'), 
  updateSubscriptionTier
);
router.put('/limits/subscription-tiers', 
  requirePermission('manage_limits'), 
  updateAllSubscriptionTiers
);
router.post('/limits/reset-all-daily', 
  requireRole(['super_admin', 'admin']), 
  resetAllDailyLimits
);

// Daily reset service management
router.get('/limits/daily-reset/status', 
  requireRole(['super_admin', 'admin']), 
  getDailyResetStatus
);
router.post('/limits/daily-reset/trigger', 
  requireRole(['super_admin', 'admin']), 
  triggerDailyReset
);

// User management
router.get('/users', 
  requirePermission('manage_users'), 
  getAllUsers
);
router.get('/users/:id', 
  requirePermission('manage_users'), 
  getUserById
);
router.get('/users/:id/usage', 
  requirePermission('manage_users'), 
  getUserUsage
);
router.get('/users/:id/subscription', 
  requirePermission('manage_users'), 
  getUserSubscriptionInfo
);
router.put('/users/:id', 
  requirePermission('manage_users'), 
  updateUser
);
router.post('/users/:id/upgrade', 
  requirePermission('manage_users'), 
  upgradeUser
);
router.post('/users/bulk-upgrade', 
  requirePermission('manage_users'), 
  bulkUpgradeUsers
);
router.post('/users/:id/reset-daily', 
  requirePermission('manage_users'), 
  resetUserDailyLimits
);
router.post('/users/:id/reset-monthly', 
  requirePermission('manage_users'), 
  resetUserMonthlyLimits
);
router.delete('/users/:id', 
  requireRole(['super_admin', 'admin']), 
  deleteUser
);

// Analytics and reporting
router.get('/analytics/system-stats', 
  requirePermission('view_analytics'), 
  getSystemStats
);
router.get('/analytics/users/:userId', 
  requirePermission('view_analytics'), 
  getUserAnalytics
);
router.get('/analytics/usage-report', 
  requirePermission('view_analytics'), 
  getUsageReport
);
router.get('/analytics/logs', 
  requirePermission('audit_logs'), 
  getAdminLogs
);

// Language management
router.get('/languages', 
  requirePermission('manage_system'), 
  getLanguages
);
router.post('/languages', 
  requirePermission('manage_system'), 
  addLanguage
);
router.put('/languages/:id', 
  requirePermission('manage_system'), 
  updateLanguage
);
router.delete('/languages/:id', 
  requirePermission('manage_system'), 
  deleteLanguage
);
router.patch('/languages/:id/toggle', 
  requirePermission('manage_system'), 
  toggleLanguageStatus
);
router.get('/languages/available', 
  getAvailableLanguages
);

export default router;
