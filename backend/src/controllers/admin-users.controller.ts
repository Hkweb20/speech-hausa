import { AdminRequest } from '../middleware/admin-auth';
import { Response } from 'express';
import { User, IUser } from '../models/User';
import { AdminLog } from '../models/AdminLog';
import { logger } from '../config/logger';

export async function getAllUsers(req: AdminRequest, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const tier = req.query.tier as string;

    const skip = (page - 1) * limit;
    
    // Build query
    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (tier) {
      query.subscriptionTier = tier;
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error({ error }, 'Error getting all users');
    res.status(500).json({
      success: false,
      error: 'Failed to get users'
    });
  }
}

export async function getUserById(req: AdminRequest, res: Response) {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    logger.error({ error, userId: req.params.id }, 'Error getting user by ID');
    res.status(500).json({
      success: false,
      error: 'Failed to get user'
    });
  }
}

export async function getUserUsage(req: AdminRequest, res: Response) {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        subscriptionTier: user.subscriptionTier,
        usageStats: user.usageStats,
        pointsBalance: user.pointsBalance,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {
    logger.error({ error, userId: req.params.id }, 'Error getting user usage');
    res.status(500).json({
      success: false,
      error: 'Failed to get user usage'
    });
  }
}

export async function updateUser(req: AdminRequest, res: Response) {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove sensitive fields that shouldn't be updated via admin
    delete updates.password;
    delete updates._id;
    delete updates.createdAt;

    const user = await User.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Log the admin action
    await AdminLog.create({
      adminId: req.admin!._id.toString(),
      adminEmail: req.admin!.email,
      action: 'update_user',
      resource: 'user',
      resourceId: id,
      details: {
        userId: id,
        updates,
        oldUser: await User.findById(id).select('-password')
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown'
    });

    logger.info({ 
      adminId: req.admin!._id, 
      userId: id, 
      updates 
    }, 'User updated by admin');

    res.json({
      success: true,
      message: 'User updated successfully',
      user
    });

  } catch (error) {
    logger.error({ error, userId: req.params.id }, 'Error updating user');
    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
}

export async function resetUserDailyLimits(req: AdminRequest, res: Response) {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Reset daily limits
    user.usageStats.dailyMinutes = 0;
    user.usageStats.dailyFileUploads = 0;
    user.usageStats.dailyLiveRecordingMinutes = 0;
    user.usageStats.dailyRealTimeStreamingMinutes = 0;
    user.usageStats.dailyTranslationMinutes = 0;
    user.usageStats.dailyAIRequests = 0;
    user.usageStats.lastResetDate = new Date();
    
    await user.save();

    // Log the admin action
    await AdminLog.create({
      adminId: req.admin!._id.toString(),
      adminEmail: req.admin!.email,
      action: 'reset_user_limits',
      resource: 'user_limits',
      resourceId: id,
      details: {
        userId: id,
        resetType: 'daily_limits'
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown'
    });

    logger.info({ 
      adminId: req.admin!._id, 
      userId: id 
    }, 'User daily limits reset by admin');

    res.json({
      success: true,
      message: 'User daily limits reset successfully'
    });

  } catch (error) {
    logger.error({ error, userId: req.params.id }, 'Error resetting user daily limits');
    res.status(500).json({
      success: false,
      error: 'Failed to reset user daily limits'
    });
  }
}

export async function resetUserMonthlyLimits(req: AdminRequest, res: Response) {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Reset monthly limits
    user.usageStats.monthlyMinutes = 0;
    user.usageStats.monthlyFileUploads = 0;
    user.usageStats.monthlyLiveRecordingMinutes = 0;
    user.usageStats.monthlyRealTimeStreamingMinutes = 0;
    user.usageStats.monthlyTranslationMinutes = 0;
    user.usageStats.monthlyAIRequests = 0;
    
    await user.save();

    // Log the admin action
    await AdminLog.create({
      adminId: req.admin!._id.toString(),
      adminEmail: req.admin!.email,
      action: 'reset_user_limits',
      resource: 'user_limits',
      resourceId: id,
      details: {
        userId: id,
        resetType: 'monthly_limits'
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown'
    });

    logger.info({ 
      adminId: req.admin!._id, 
      userId: id 
    }, 'User monthly limits reset by admin');

    res.json({
      success: true,
      message: 'User monthly limits reset successfully'
    });

  } catch (error) {
    logger.error({ error, userId: req.params.id }, 'Error resetting user monthly limits');
    res.status(500).json({
      success: false,
      error: 'Failed to reset user monthly limits'
    });
  }
}

export async function deleteUser(req: AdminRequest, res: Response) {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Log the admin action before deletion
    await AdminLog.create({
      adminId: req.admin!._id.toString(),
      adminEmail: req.admin!.email,
      action: 'delete_user',
      resource: 'user',
      resourceId: id,
      details: {
        userId: id,
        userEmail: user.email,
        userName: user.name
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown'
    });

    await User.findByIdAndDelete(id);

    logger.info({ 
      adminId: req.admin!._id, 
      userId: id 
    }, 'User deleted by admin');

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    logger.error({ error, userId: req.params.id }, 'Error deleting user');
    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
}
