# 📱 Mobile App Backend Integration Guide

## Overview
This document provides comprehensive guidance for integrating the Hausa Speech-to-Text backend with a native mobile application. The backend has been optimized for mobile use with offline-first architecture, smart caching, and efficient sync mechanisms.

---

## 🚀 **Backend Optimizations Completed**

### ✅ **1. Mobile-Specific API Endpoints**

#### **Base URL**: `http://localhost:4000/api/mobile`

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/health` | GET | Mobile health check | No |
| `/config` | GET | App configuration | No |
| `/offline/transcripts` | GET | Get offline transcripts | Yes |
| `/offline/sync` | POST | Sync offline transcripts | Yes |
| `/sync/status` | GET | Get sync status | Yes |
| `/sync/resolve-conflicts` | POST | Resolve sync conflicts | Yes |

#### **Push Notifications**: `http://localhost:4000/api/push`

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/register-token` | POST | Register device token | Yes |
| `/unregister-token` | DELETE | Unregister device token | Yes |
| `/tokens` | GET | Get user's device tokens | Yes |
| `/test` | POST | Send test notification | Yes |

---

## 📊 **API Response Examples**

### **1. App Configuration**
```json
GET /api/mobile/config

{
  "success": true,
  "data": {
    "version": "1.0.0",
    "minVersion": "1.0.0",
    "features": {
      "offlineMode": true,
      "realTimeSync": true,
      "pushNotifications": true,
      "backgroundSync": true,
      "maxOfflineTranscripts": 100,
      "maxFileSize": 52428800,
      "supportedFormats": ["wav", "mp3", "m4a", "webm"],
      "supportedLanguages": ["ha-NG", "en-US", "fr-FR", "ar"],
      "syncInterval": 30000,
      "retryAttempts": 3
    },
    "api": {
      "baseUrl": "http://localhost:4000",
      "timeout": 30000,
      "retryDelay": 1000
    },
    "user": {
      "id": "68cb40909e9fe1b37c10bf93",
      "subscriptionTier": "premium",
      "limits": {
        "dailyUploads": 90,
        "maxFileDuration": 300
      }
    }
  }
}
```

### **2. Offline Transcripts**
```json
GET /api/mobile/offline/transcripts?since=2025-01-01T00:00:00.000Z&limit=10

{
  "success": true,
  "data": {
    "transcripts": [
      {
        "id": "68ce8bd3ae43191d2079ebe9",
        "userId": "68cb40909e9fe1b37c10bf93",
        "title": "Live Recording",
        "content": "assalamu alaikum muna yin testing",
        "timestamp": "2025-09-20T11:11:15.350Z",
        "duration": 5.5224375,
        "language": "ha-NG",
        "source": "live",
        "isPremium": true,
        "syncStatus": "synced",
        "version": 1,
        "lastModified": "2025-09-20T11:11:15.350Z"
      }
    ],
    "syncTimestamp": "2025-09-20T12:21:00.741Z",
    "hasMore": false
  }
}
```

### **3. Sync Status**
```json
GET /api/mobile/sync/status

{
  "success": true,
  "data": {
    "lastSync": "2025-09-20T12:21:00.741Z",
    "totalTranscripts": 5,
    "pendingSync": 0,
    "conflicts": 0,
    "lastModified": "2025-09-20T11:11:15.350Z"
  }
}
```

---

## 🔄 **Offline Sync Architecture**

### **Sync Strategy**
```
┌─────────────────────────────────────┐
│           Mobile App                │
├─────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐   │
│  │   Local     │ │   Sync      │   │
│  │  Database   │ │  Manager    │   │
│  │  (SQLite)   │ │             │   │
│  └─────────────┘ └─────────────┘   │
├─────────────────────────────────────┤
│        Network Layer                │
│  ┌─────────────┐ ┌─────────────┐   │
│  │   REST      │ │  WebSocket  │   │
│  │   API       │ │  Real-time  │   │
│  └─────────────┘ └─────────────┘   │
└─────────────────────────────────────┘
```

### **Sync Flow**
1. **App Startup**: Check sync status
2. **Incremental Sync**: Get changes since last sync
3. **Upload Pending**: Send offline-created transcripts
4. **Conflict Resolution**: Handle version conflicts
5. **Background Sync**: Periodic sync every 30 seconds

---

## 📱 **Mobile App Implementation Guide**

### **1. Project Setup**

#### **React Native (Recommended)**
```bash
# Create new project
npx react-native init HausaSpeechApp --template react-native-template-typescript

# Install essential packages
npm install @react-native-async-storage/async-storage
npm install @react-native-community/netinfo
npm install react-native-sqlite-storage
npm install react-native-audio-recorder-player
npm install @react-navigation/native
npm install @react-navigation/stack
npm install @react-navigation/bottom-tabs
npm install react-native-screens
npm install react-native-safe-area-context
npm install react-native-gesture-handler
npm install react-native-reanimated
npm install react-native-vector-icons
npm install react-native-paper
npm install axios
npm install socket.io-client
npm install react-query
npm install zustand
```

#### **Flutter Alternative**
```yaml
# pubspec.yaml
dependencies:
  flutter:
    sdk: flutter
  sqflite: ^2.3.0
  dio: ^5.3.2
  connectivity_plus: ^5.0.1
  audio_recorder: ^0.0.1
  shared_preferences: ^2.2.0
  socket_io_client: ^2.0.3
```

### **2. Database Schema (SQLite)**

```sql
-- Transcripts table
CREATE TABLE transcripts (
  id TEXT PRIMARY KEY,
  local_id TEXT,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  duration REAL NOT NULL,
  language TEXT NOT NULL,
  source TEXT NOT NULL,
  is_premium INTEGER NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  version INTEGER NOT NULL DEFAULT 1,
  last_modified TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Sync queue table
CREATE TABLE sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transcript_id TEXT NOT NULL,
  operation TEXT NOT NULL, -- 'create', 'update', 'delete'
  data TEXT NOT NULL, -- JSON data
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (transcript_id) REFERENCES transcripts (id)
);

-- User settings table
CREATE TABLE user_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### **3. API Service Implementation**

#### **TypeScript Interface**
```typescript
interface MobileAPI {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  
  // Health & Config
  getHealth(): Promise<HealthResponse>;
  getConfig(): Promise<ConfigResponse>;
  
  // Authentication
  login(email: string, password: string): Promise<AuthResponse>;
  register(userData: RegisterData): Promise<AuthResponse>;
  refreshToken(): Promise<AuthResponse>;
  
  // Offline Sync
  getOfflineTranscripts(since: string, limit: number): Promise<TranscriptsResponse>;
  syncOfflineTranscripts(transcripts: Transcript[]): Promise<SyncResponse>;
  getSyncStatus(): Promise<SyncStatusResponse>;
  resolveConflicts(conflicts: Conflict[]): Promise<ConflictResolutionResponse>;
  
  // Push Notifications
  registerDeviceToken(token: string, platform: 'ios' | 'android'): Promise<void>;
  unregisterDeviceToken(token: string): Promise<void>;
  
  // Transcripts
  createTranscript(transcript: CreateTranscriptData): Promise<Transcript>;
  updateTranscript(id: string, updates: Partial<Transcript>): Promise<Transcript>;
  deleteTranscript(id: string): Promise<void>;
  getTranscript(id: string): Promise<Transcript>;
  searchTranscripts(query: string, filters: SearchFilters): Promise<TranscriptsResponse>;
}
```

#### **Implementation Example**
```typescript
class MobileAPIService implements MobileAPI {
  private axios: AxiosInstance;
  private authToken: string | null = null;

  constructor() {
    this.axios = axios.create({
      baseURL: 'http://localhost:4000/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-Platform': 'mobile',
        'X-App-Version': '1.0.0'
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.axios.interceptors.request.use(
      (config) => {
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Handle token refresh
          await this.refreshToken();
          return this.axios.request(error.config);
        }
        return Promise.reject(error);
      }
    );
  }

  async getOfflineTranscripts(since: string, limit: number = 100) {
    const response = await this.axios.get('/mobile/offline/transcripts', {
      params: { since, limit }
    });
    return response.data;
  }

  async syncOfflineTranscripts(transcripts: Transcript[]) {
    const response = await this.axios.post('/mobile/offline/sync', {
      transcripts
    });
    return response.data;
  }
}
```

### **4. Sync Manager Implementation**

```typescript
class SyncManager {
  private api: MobileAPI;
  private db: Database;
  private isOnline: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor(api: MobileAPI, db: Database) {
    this.api = api;
    this.db = db;
    this.setupNetworkListener();
  }

  private setupNetworkListener() {
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected ?? false;
      if (this.isOnline) {
        this.startSync();
      } else {
        this.stopSync();
      }
    });
  }

  async startSync() {
    if (this.syncInterval) return;

    // Initial sync
    await this.performSync();

    // Periodic sync
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, 30000); // 30 seconds
  }

  async performSync() {
    if (!this.isOnline) return;

    try {
      // 1. Get sync status
      const status = await this.api.getSyncStatus();
      
      // 2. Download new/updated transcripts
      const lastSync = await this.getLastSyncTime();
      const transcripts = await this.api.getOfflineTranscripts(lastSync);
      
      // 3. Save to local database
      await this.saveTranscripts(transcripts.data.transcripts);
      
      // 4. Upload pending changes
      await this.uploadPendingChanges();
      
      // 5. Update last sync time
      await this.updateLastSyncTime(transcripts.data.syncTimestamp);
      
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }

  async uploadPendingChanges() {
    const pendingChanges = await this.db.getPendingChanges();
    
    if (pendingChanges.length > 0) {
      const result = await this.api.syncOfflineTranscripts(pendingChanges);
      
      if (result.data.conflicts.length > 0) {
        await this.handleConflicts(result.data.conflicts);
      }
      
      await this.markAsSynced(pendingChanges);
    }
  }
}
```

---

## 🔔 **Push Notifications Setup**

### **1. Firebase Cloud Messaging (FCM)**

#### **Android Setup**
```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.VIBRATE" />

<service
  android:name=".MyFirebaseMessagingService"
  android:exported="false">
  <intent-filter>
    <action android:name="com.google.firebase.MESSAGING_EVENT" />
  </intent-filter>
</service>
```

#### **iOS Setup**
```swift
// ios/HausaSpeechApp/AppDelegate.swift
import Firebase
import UserNotifications

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {
  func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    FirebaseApp.configure()
    
    UNUserNotificationCenter.current().delegate = self
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
      // Handle permission
    }
    
    return true
  }
}
```

### **2. Push Notification Service**

```typescript
class PushNotificationService {
  private api: MobileAPI;

  constructor(api: MobileAPI) {
    this.api = api;
    this.setupNotificationHandlers();
  }

  async registerForPushNotifications() {
    try {
      const token = await messaging().getToken();
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      
      await this.api.registerDeviceToken(token, platform);
      
      // Listen for token refresh
      messaging().onTokenRefresh(async (newToken) => {
        await this.api.registerDeviceToken(newToken, platform);
      });
      
    } catch (error) {
      console.error('Failed to register for push notifications:', error);
    }
  }

  private setupNotificationHandlers() {
    // Handle background messages
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('Background message:', remoteMessage);
    });

    // Handle foreground messages
    messaging().onMessage(async (remoteMessage) => {
      console.log('Foreground message:', remoteMessage);
      // Show in-app notification
    });

    // Handle notification taps
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Notification opened app:', remoteMessage);
      // Navigate to relevant screen
    });
  }
}
```

---

## 📊 **Performance Optimization**

### **1. Caching Strategy**
```typescript
class CacheManager {
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();

  set(key: string, data: any, ttl: number = 300000) { // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear() {
    this.cache.clear();
  }
}
```

### **2. Image Optimization**
```typescript
// Optimize images for mobile
const optimizeImage = (imageUri: string, maxWidth: number = 800) => {
  return ImageResizer.createResizedImage(
    imageUri,
    maxWidth,
    maxWidth * 0.75, // 4:3 aspect ratio
    'JPEG',
    80, // Quality
    0, // Rotation
    undefined, // Output path
    false, // Keep metadata
    { mode: 'contain', onlyScaleDown: true }
  );
};
```

### **3. Network Optimization**
```typescript
class NetworkOptimizer {
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessing = false;

  async queueRequest<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) return;

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        await request();
        // Add delay between requests to avoid overwhelming server
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    this.isProcessing = false;
  }
}
```

---

## 🧪 **Testing Strategy**

### **1. Unit Tests**
```typescript
// __tests__/api.test.ts
import { MobileAPIService } from '../src/services/api';

describe('MobileAPIService', () => {
  let api: MobileAPIService;

  beforeEach(() => {
    api = new MobileAPIService();
  });

  test('should get offline transcripts', async () => {
    const result = await api.getOfflineTranscripts('2025-01-01T00:00:00.000Z', 10);
    expect(result.success).toBe(true);
    expect(result.data.transcripts).toBeDefined();
  });

  test('should handle network errors gracefully', async () => {
    // Mock network error
    jest.spyOn(api, 'getOfflineTranscripts').mockRejectedValue(new Error('Network error'));
    
    await expect(api.getOfflineTranscripts('2025-01-01T00:00:00.000Z', 10))
      .rejects.toThrow('Network error');
  });
});
```

### **2. Integration Tests**
```typescript
// __tests__/sync.test.ts
import { SyncManager } from '../src/services/sync';

describe('SyncManager', () => {
  let syncManager: SyncManager;

  test('should sync offline transcripts', async () => {
    // Mock API responses
    const mockTranscripts = [
      { id: '1', title: 'Test', content: 'Test content' }
    ];

    jest.spyOn(api, 'getOfflineTranscripts').mockResolvedValue({
      success: true,
      data: { transcripts: mockTranscripts }
    });

    await syncManager.performSync();

    const localTranscripts = await db.getTranscripts();
    expect(localTranscripts).toHaveLength(1);
  });
});
```

---

## 🚀 **Deployment Checklist**

### **Backend Deployment**
- [ ] Run database migration: `npm run migrate:sync-fields`
- [ ] Configure environment variables
- [ ] Set up push notification certificates
- [ ] Configure rate limiting
- [ ] Set up monitoring and logging
- [ ] Test all mobile endpoints

### **Mobile App Deployment**
- [ ] Configure app signing
- [ ] Set up push notification certificates
- [ ] Configure deep linking
- [ ] Test offline functionality
- [ ] Test sync mechanisms
- [ ] Performance testing
- [ ] App store submission

---

## 📚 **Additional Resources**

### **Documentation**
- [React Native Documentation](https://reactnative.dev/)
- [Flutter Documentation](https://flutter.dev/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [SQLite Documentation](https://www.sqlite.org/docs.html)

### **Tools**
- [React Native Debugger](https://github.com/jhen0409/react-native-debugger)
- [Flipper](https://fbflipper.com/)
- [React Native Performance](https://reactnative.dev/docs/performance)

---

*This document will be updated as the mobile app development progresses.*

