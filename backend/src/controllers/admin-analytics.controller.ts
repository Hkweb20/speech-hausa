import { AdminRequest } from '../middleware/admin-auth';
import { Response } from 'express';
import { User, IUser } from '../models/User';
import { AdminLog } from '../models/AdminLog';
import { logger } from '../config/logger';

export async function getSystemStats(req: AdminRequest, res: Response) {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ 
      lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    });
    
    // Get subscription tier distribution
    const tierDistribution = await User.aggregate([
      {
        $group: {
          _id: '$subscriptionTier',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get total usage statistics
    const usageStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalMinutes: { $sum: '$usageStats.totalMinutes' },
          totalFileUploads: { $sum: '$usageStats.totalFileUploads' },
          totalLiveRecordingMinutes: { $sum: '$usageStats.totalLiveRecordingMinutes' },
          totalRealTimeStreamingMinutes: { $sum: '$usageStats.totalRealTimeStreamingMinutes' },
          totalTranslationMinutes: { $sum: '$usageStats.totalTranslationMinutes' },
          totalAIRequests: { $sum: '$usageStats.totalAIRequests' },
          totalPoints: { $sum: '$pointsBalance' }
        }
      }
    ]);

    // Get daily usage for the last 30 days
    const dailyUsage = await User.aggregate([
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$usageStats.lastResetDate'
            }
          },
          dailyMinutes: { $sum: '$usageStats.dailyMinutes' },
          dailyFileUploads: { $sum: '$usageStats.dailyFileUploads' },
          dailyAIRequests: { $sum: '$usageStats.dailyAIRequests' }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 30 }
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        tierDistribution,
        usageStats: usageStats[0] || {
          totalMinutes: 0,
          totalFileUploads: 0,
          totalLiveRecordingMinutes: 0,
          totalRealTimeStreamingMinutes: 0,
          totalTranslationMinutes: 0,
          totalAIRequests: 0,
          totalPoints: 0
        },
        dailyUsage
      }
    });

  } catch (error) {
    logger.error({ error }, 'Error getting system stats');
    res.status(500).json({
      success: false,
      error: 'Failed to get system statistics'
    });
  }
}

export async function getUserAnalytics(req: AdminRequest, res: Response) {
  try {
    const { userId } = req.params;
    const { period = '30' } = req.query; // days
    
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get user's usage over time (simplified - in production you'd have time-series data)
    const analytics = {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        subscriptionTier: user.subscriptionTier,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      },
      currentUsage: user.usageStats,
      period: `${period} days`
    };

    res.json({
      success: true,
      analytics
    });

  } catch (error) {
    logger.error({ error, userId: req.params.userId }, 'Error getting user analytics');
    res.status(500).json({
      success: false,
      error: 'Failed to get user analytics'
    });
  }
}

export async function getUsageReport(req: AdminRequest, res: Response) {
  try {
    const { startDate, endDate, tier, format = 'json' } = req.query;
    
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Build query
    const query: any = {
      createdAt: { $gte: start, $lte: end }
    };
    
    if (tier) {
      query.subscriptionTier = tier;
    }

    const users = await User.find(query).select('-password');
    
    const report = {
      period: {
        start: start,
        end: end
      },
      filters: {
        tier: tier || 'all'
      },
      summary: {
        totalUsers: users.length,
        totalMinutes: users.reduce((sum, user) => sum + user.usageStats.totalMinutes, 0),
        totalFileUploads: users.reduce((sum, user) => sum + user.usageStats.totalFileUploads, 0),
        totalAIRequests: users.reduce((sum, user) => sum + user.usageStats.totalAIRequests, 0),
        totalPoints: users.reduce((sum, user) => sum + user.pointsBalance, 0)
      },
      users: users.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        subscriptionTier: user.subscriptionTier,
        usageStats: user.usageStats,
        pointsBalance: user.pointsBalance,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }))
    };

    if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(report.users);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="usage-report.csv"');
      return res.send(csv);
    }

    res.json({
      success: true,
      report
    });

  } catch (error) {
    logger.error({ error }, 'Error generating usage report');
    res.status(500).json({
      success: false,
      error: 'Failed to generate usage report'
    });
  }
}

export async function getAdminLogs(req: AdminRequest, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const action = req.query.action as string;
    const adminId = req.query.adminId as string;
    
    const skip = (page - 1) * limit;
    
    const query: any = {};
    if (action) {
      query.action = action;
    }
    if (adminId) {
      query.adminId = adminId;
    }

    const logs = await AdminLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const total = await AdminLog.countDocuments(query);

    res.json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error({ error }, 'Error getting admin logs');
    res.status(500).json({
      success: false,
      error: 'Failed to get admin logs'
    });
  }
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value).replace(/"/g, '""');
    });
    csvRows.push(values.map(v => `"${v}"`).join(','));
  }
  
  return csvRows.join('\n');
}
