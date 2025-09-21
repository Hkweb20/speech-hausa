import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/mongodb-auth';
import { UsageService } from '../services/usage.service';

const router = Router();
const usageService = new UsageService();

// Check live recording usage
router.post('/check-live-recording', authenticate as any, async (req: any, res) => {
  try {
    const { requestedMinutes } = req.body;
    
    if (!requestedMinutes || requestedMinutes <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid requestedMinutes'
      });
    }

    const result = await usageService.checkLiveRecordingUsage(
      req.user.id,
      requestedMinutes
    );

    res.json(result);
  } catch (error) {
    console.error('Error checking live recording usage:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Record live recording usage
router.post('/record-live-recording', authenticate as any, async (req: any, res) => {
  try {
    const { minutes } = req.body;
    
    if (!minutes || minutes <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid minutes'
      });
    }

    await usageService.recordLiveRecordingUsage(
      req.user.id,
      minutes
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error recording live recording usage:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Check real-time streaming usage
router.post('/check-realtime-streaming', authenticate as any, async (req: any, res) => {
  try {
    const { requestedMinutes } = req.body;
    
    if (!requestedMinutes || requestedMinutes <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid requestedMinutes'
      });
    }

    const result = await usageService.checkRealTimeStreamingUsage(
      req.user.id,
      requestedMinutes
    );

    res.json(result);
  } catch (error) {
    console.error('Error checking real-time streaming usage:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Record real-time streaming usage
router.post('/record-realtime-streaming', authenticate as any, async (req: any, res) => {
  try {
    const { minutes } = req.body;
    
    if (!minutes || minutes <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid minutes'
      });
    }

    await usageService.recordRealTimeStreamingUsage(
      req.user.id,
      minutes
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error recording real-time streaming usage:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
