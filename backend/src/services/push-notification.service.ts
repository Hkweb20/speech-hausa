import { logger } from '../config/logger';

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  sound?: string;
  priority?: 'high' | 'normal';
}

export interface DeviceToken {
  userId: string;
  token: string;
  platform: 'ios' | 'android';
  lastActive: Date;
}

export class PushNotificationService {
  private deviceTokens: Map<string, DeviceToken[]> = new Map();

  // Register device token for push notifications
  registerDeviceToken(userId: string, token: string, platform: 'ios' | 'android'): void {
    if (!this.deviceTokens.has(userId)) {
      this.deviceTokens.set(userId, []);
    }

    const tokens = this.deviceTokens.get(userId)!;
    const existingToken = tokens.find(t => t.token === token);

    if (existingToken) {
      existingToken.lastActive = new Date();
    } else {
      tokens.push({
        userId,
        token,
        platform,
        lastActive: new Date()
      });
    }

    logger.info({ userId, platform, tokenCount: tokens.length }, 'Device token registered');
  }

  // Unregister device token
  unregisterDeviceToken(userId: string, token: string): void {
    const tokens = this.deviceTokens.get(userId);
    if (tokens) {
      const index = tokens.findIndex(t => t.token === token);
      if (index > -1) {
        tokens.splice(index, 1);
        logger.info({ userId, tokenCount: tokens.length }, 'Device token unregistered');
      }
    }
  }

  // Send push notification to user
  async sendToUser(userId: string, payload: PushNotificationPayload): Promise<void> {
    const tokens = this.deviceTokens.get(userId);
    if (!tokens || tokens.length === 0) {
      logger.warn({ userId }, 'No device tokens found for user');
      return;
    }

    const promises = tokens.map(token => this.sendToDevice(token, payload));
    await Promise.allSettled(promises);
  }

  // Send push notification to specific device
  private async sendToDevice(deviceToken: DeviceToken, payload: PushNotificationPayload): Promise<void> {
    try {
      // This is a placeholder implementation
      // In production, you would integrate with:
      // - Firebase Cloud Messaging (FCM) for Android
      // - Apple Push Notification Service (APNs) for iOS
      
      logger.info({
        userId: deviceToken.userId,
        platform: deviceToken.platform,
        title: payload.title
      }, 'Sending push notification');

      // Simulate sending notification
      await new Promise(resolve => setTimeout(resolve, 100));

      logger.info({ userId: deviceToken.userId }, 'Push notification sent successfully');
    } catch (error) {
      logger.error({ error, userId: deviceToken.userId }, 'Failed to send push notification');
    }
  }

  // Send notification to all users (broadcast)
  async broadcast(payload: PushNotificationPayload): Promise<void> {
    const allUserIds = Array.from(this.deviceTokens.keys());
    const promises = allUserIds.map(userId => this.sendToUser(userId, payload));
    await Promise.allSettled(promises);
  }

  // Get user's device tokens
  getUserTokens(userId: string): DeviceToken[] {
    return this.deviceTokens.get(userId) || [];
  }

  // Clean up inactive tokens (older than 30 days)
  cleanupInactiveTokens(): void {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const [userId, tokens] of this.deviceTokens.entries()) {
      const activeTokens = tokens.filter(token => token.lastActive > thirtyDaysAgo);
      this.deviceTokens.set(userId, activeTokens);
      
      if (activeTokens.length !== tokens.length) {
        logger.info({ 
          userId, 
          removed: tokens.length - activeTokens.length,
          remaining: activeTokens.length 
        }, 'Cleaned up inactive device tokens');
      }
    }
  }
}

export const pushNotificationService = new PushNotificationService();

