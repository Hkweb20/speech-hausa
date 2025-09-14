import { Request, Response } from 'express';
import { GeminiAIService } from '../services/gemini-ai.service';
import { UsageService } from '../services/usage.service';
import { logger } from '../config/logger';

const geminiService = new GeminiAIService();
const usageService = new UsageService();

/**
 * Test AI endpoint
 */
export const testAI = async (req: Request, res: Response) => {
  res.json({ message: 'AI routes working!', timestamp: new Date().toISOString() });
};

/**
 * Summarize transcribed text using Gemini AI
 */
export const summarizeText = async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    const userId = (req as any).user?.id || 'anonymous';

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text is required',
        code: 'MISSING_TEXT'
      });
    }

    if (text.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Text must be at least 10 characters long',
        code: 'TEXT_TOO_SHORT'
      });
    }

    // Check AI usage limits for authenticated users
    if (userId !== 'anonymous') {
      const usageCheck = await usageService.checkAIUsage(userId, 1);
      if (!usageCheck.allowed) {
        return res.status(403).json({
          success: false,
          error: 'AI usage limit exceeded',
          code: 'AI_USAGE_LIMIT_EXCEEDED',
          details: {
            reason: usageCheck.reason,
            remainingRequests: usageCheck.remainingRequests,
            tier: usageCheck.tier,
            resetTime: usageCheck.resetTime
          }
        });
      }
    }

    logger.info({ userId, textLength: text.length }, 'Starting text summarization');

    // Use real Gemini AI service
    const summary = await geminiService.summarizeText(text);

    // Record AI usage for authenticated users
    if (userId !== 'anonymous') {
      await usageService.recordAIUsage(userId, 1);
    }

    res.json({
      success: true,
      summary,
      originalText: text,
      summaryLength: summary.length,
      originalLength: text.length
    });

  } catch (error) {
    logger.error({ error, userId: (req as any).user?.id }, 'Error in summarizeText');
    res.status(500).json({
      success: false,
      error: 'Failed to summarize text',
      code: 'SUMMARIZATION_FAILED'
    });
  }
};

/**
 * Format text for a specific social media platform
 */
export const formatForPlatform = async (req: Request, res: Response) => {
  try {
    const { text, platform } = req.body;
    const userId = (req as any).user?.id || 'anonymous';

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text is required',
        code: 'MISSING_TEXT'
      });
    }

    if (!platform || !['facebook', 'whatsapp', 'x', 'instagram', 'telegram'].includes(platform)) {
      return res.status(400).json({
        success: false,
        error: 'Valid platform is required (facebook, whatsapp, x, instagram, telegram)',
        code: 'INVALID_PLATFORM'
      });
    }

    if (text.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Text must be at least 10 characters long',
        code: 'TEXT_TOO_SHORT'
      });
    }

    // Check AI usage limits for authenticated users
    if (userId !== 'anonymous') {
      const usageCheck = await usageService.checkAIUsage(userId, 1);
      if (!usageCheck.allowed) {
        return res.status(403).json({
          success: false,
          error: 'AI usage limit exceeded',
          code: 'AI_USAGE_LIMIT_EXCEEDED',
          details: {
            reason: usageCheck.reason,
            remainingRequests: usageCheck.remainingRequests,
            tier: usageCheck.tier,
            resetTime: usageCheck.resetTime
          }
        });
      }
    }

    logger.info({ userId, platform, textLength: text.length }, 'Starting text formatting for platform');

    // Use real Gemini AI service
    const formattedText = await geminiService.formatForSocialMedia(text, platform as any);

    // Record AI usage for authenticated users
    if (userId !== 'anonymous') {
      await usageService.recordAIUsage(userId, 1);
    }

    res.json({
      success: true,
      formattedText,
      platform,
      originalText: text,
      formattedLength: formattedText.length,
      originalLength: text.length
    });

  } catch (error) {
    logger.error({ error, userId: (req as any).user?.id, platform: req.body.platform }, 'Error in formatForPlatform');
    res.status(500).json({
      success: false,
      error: 'Failed to format text for platform',
      code: 'FORMATTING_FAILED'
    });
  }
};

/**
 * Format text for all social media platforms
 */
export const formatForAllPlatforms = async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    const userId = (req as any).user?.id || 'anonymous';

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text is required',
        code: 'MISSING_TEXT'
      });
    }

    if (text.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Text must be at least 10 characters long',
        code: 'TEXT_TOO_SHORT'
      });
    }

    // Check AI usage limits for authenticated users (counts as 1 request)
    if (userId !== 'anonymous') {
      const usageCheck = await usageService.checkAIUsage(userId, 1);
      if (!usageCheck.allowed) {
        return res.status(403).json({
          success: false,
          error: 'AI usage limit exceeded',
          code: 'AI_USAGE_LIMIT_EXCEEDED',
          details: {
            reason: usageCheck.reason,
            remainingRequests: usageCheck.remainingRequests,
            tier: usageCheck.tier,
            resetTime: usageCheck.resetTime
          }
        });
      }
    }

    logger.info({ userId, textLength: text.length }, 'Starting text formatting for all platforms');

    // Use real Gemini AI service
    const formattedTexts = await geminiService.formatForAllPlatforms(text);

    // Record AI usage for authenticated users
    if (userId !== 'anonymous') {
      await usageService.recordAIUsage(userId, 1);
    }

    res.json({
      success: true,
      formattedTexts,
      originalText: text,
      originalLength: text.length,
      platforms: Object.keys(formattedTexts)
    });

  } catch (error) {
    logger.error({ error, userId: (req as any).user?.id }, 'Error in formatForAllPlatforms');
    res.status(500).json({
      success: false,
      error: 'Failed to format text for all platforms',
      code: 'FORMATTING_FAILED'
    });
  }
};

/**
 * Get AI usage limits for the current user
 */
export const getAIUsage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'anonymous';

    if (userId === 'anonymous') {
      return res.json({
        success: true,
        usage: {
          dailyRequests: 0,
          monthlyRequests: 0,
          totalRequests: 0,
          remainingRequests: 5, // Free limit for anonymous users
          tier: 'free',
          resetTime: null
        }
      });
    }

    // Get real usage data for authenticated users
    const usage = await usageService.getAIUsage(userId);
    res.json({
      success: true,
      usage
    });

  } catch (error) {
    logger.error({ error, userId: (req as any).user?.id }, 'Error getting AI usage');
    res.status(500).json({
      success: false,
      error: 'Failed to get AI usage',
      code: 'USAGE_FETCH_FAILED'
    });
  }
};

