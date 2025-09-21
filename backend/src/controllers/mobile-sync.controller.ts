import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/express.d';
import { mongoTranscriptsRepo } from '../repositories/mongodb-transcripts.repository';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../config/logger';

// Get transcripts for offline sync (incremental)
export const getOfflineTranscripts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  const { since, limit = 100 } = req.query;
  const sinceDate = since ? new Date(since as string) : new Date(0);

  try {
    // Get transcripts modified since the given date
    const transcripts = await mongoTranscriptsRepo.getOfflineTranscripts(userId, sinceDate, parseInt(limit as string));
    
    res.json({
      success: true,
      data: {
        transcripts,
        syncTimestamp: new Date().toISOString(),
        hasMore: transcripts.length === parseInt(limit as string)
      }
    });
  } catch (error) {
    logger.error({ error, userId }, 'Error getting offline transcripts');
    res.status(500).json({
      success: false,
      error: 'Failed to get offline transcripts'
    });
  }
});

// Bulk sync transcripts (for offline-created transcripts)
export const syncOfflineTranscripts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  const { transcripts } = req.body;
  
  if (!Array.isArray(transcripts)) {
    return res.status(400).json({
      success: false,
      error: 'Transcripts must be an array'
    });
  }

  try {
    const results = await mongoTranscriptsRepo.bulkSyncTranscripts(userId, transcripts);
    
    res.json({
      success: true,
      data: {
        synced: results.synced,
        conflicts: results.conflicts,
        errors: results.errors,
        syncTimestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error({ error, userId }, 'Error syncing offline transcripts');
    res.status(500).json({
      success: false,
      error: 'Failed to sync offline transcripts'
    });
  }
});

// Get sync status and metadata
export const getSyncStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  try {
    const status = await mongoTranscriptsRepo.getSyncStatus(userId);
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error({ error, userId }, 'Error getting sync status');
    res.status(500).json({
      success: false,
      error: 'Failed to get sync status'
    });
  }
});

// Resolve sync conflicts
export const resolveSyncConflicts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  const { conflicts } = req.body;
  
  if (!Array.isArray(conflicts)) {
    return res.status(400).json({
      success: false,
      error: 'Conflicts must be an array'
    });
  }

  try {
    const results = await mongoTranscriptsRepo.resolveConflicts(userId, conflicts);
    
    res.json({
      success: true,
      data: {
        resolved: results.resolved,
        errors: results.errors,
        syncTimestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error({ error, userId }, 'Error resolving sync conflicts');
    res.status(500).json({
      success: false,
      error: 'Failed to resolve sync conflicts'
    });
  }
});

// Get app configuration for mobile
export const getAppConfig = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  
  try {
    const config = {
      version: '1.0.0',
      minVersion: '1.0.0',
      features: {
        offlineMode: true,
        realTimeSync: true,
        pushNotifications: true,
        backgroundSync: true,
        maxOfflineTranscripts: 100,
        maxFileSize: 50 * 1024 * 1024, // 50MB
        supportedFormats: ['wav', 'mp3', 'm4a', 'webm'],
        supportedLanguages: ['ha-NG', 'en-US', 'fr-FR', 'ar'],
        syncInterval: 30000, // 30 seconds
        retryAttempts: 3
      },
      api: {
        baseUrl: process.env.API_BASE_URL || 'http://localhost:4000',
        timeout: 30000,
        retryDelay: 1000
      },
      user: userId ? {
        id: userId,
        subscriptionTier: req.user?.subscriptionTier || 'free',
        limits: {
          dailyMinutes: req.user?.usageStats?.dailyMinutes || 0,
          monthlyMinutes: req.user?.usageStats?.monthlyMinutes || 0,
          totalMinutes: req.user?.usageStats?.totalMinutes || 0,
          transcriptsCount: req.user?.usageStats?.transcriptsCount || 0
        }
      } : null
    };
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    logger.error({ error }, 'Error getting app config');
    res.status(500).json({
      success: false,
      error: 'Failed to get app configuration'
    });
  }
});

// Health check for mobile app
export const mobileHealthCheck = asyncHandler(async (req: Request, res: Response) => {
  try {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        database: 'connected',
        storage: 'available',
        transcription: 'available'
      },
      mobile: {
        syncEnabled: true,
        offlineMode: true,
        pushNotifications: true
      }
    };
    
    res.json(health);
  } catch (error) {
    logger.error({ error }, 'Mobile health check failed');
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Service unavailable'
    });
  }
});

