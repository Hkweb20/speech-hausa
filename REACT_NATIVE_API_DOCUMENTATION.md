# 📱 React Native Mobile App - Complete API Documentation

## Overview
This document provides comprehensive API documentation for integrating the Hausa Speech-to-Text backend with a React Native mobile application. All features from the website are available in the mobile app with mobile-optimized endpoints.

---

## 🔗 **Base URLs**

| Environment | Base URL | Description |
|-------------|----------|-------------|
| Development | `http://localhost:4000` | Local development server |
| Production | `https://api.hausaspeech.com` | Production server |

---

## 🔐 **Authentication**

### **Headers Required**
```typescript
{
  "Authorization": "Bearer <jwt_token>",
  "Content-Type": "application/json",
  "X-Platform": "mobile",
  "X-App-Version": "1.0.0",
  "X-Device-Id": "unique_device_id"
}
```

---

## 📚 **API Endpoints Reference**

## 1. **Health & Configuration**

### **GET** `/health`
**Description**: Basic health check  
**Auth Required**: No  
**Response**:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2025-09-20T12:20:34.399Z"
}
```

### **GET** `/api/mobile/health`
**Description**: Mobile-specific health check  
**Auth Required**: No  
**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-09-20T12:20:34.399Z",
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "storage": "available",
    "transcription": "available"
  },
  "mobile": {
    "syncEnabled": true,
    "offlineMode": true,
    "pushNotifications": true
  }
}
```

### **GET** `/api/mobile/config`
**Description**: Get mobile app configuration  
**Auth Required**: No  
**Response**:
```json
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

---

## 2. **Authentication & User Management**

### **POST** `/api/auth/register`
**Description**: Register new user  
**Auth Required**: No  
**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "preferences": {
    "language": "ha-NG",
    "notifications": true
  }
}
```
**Response**:
```json
{
  "success": true,
  "user": {
    "id": "68cb40909e9fe1b37c10bf93",
    "email": "user@example.com",
    "name": "John Doe",
    "subscriptionTier": "free",
    "points": 0,
    "createdAt": "2025-09-20T10:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "User registered successfully"
}
```

### **POST** `/api/auth/login`
**Description**: Login user  
**Auth Required**: No  
**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
**Response**:
```json
{
  "success": true,
  "user": {
    "id": "68cb40909e9fe1b37c10bf93",
    "email": "user@example.com",
    "name": "John Doe",
    "subscriptionTier": "premium",
    "points": 150
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Login successful"
}
```

### **POST** `/api/auth/refresh`
**Description**: Refresh authentication token  
**Auth Required**: Yes  
**Response**:
```json
{
  "success": true,
  "user": {
    "id": "68cb40909e9fe1b37c10bf93",
    "email": "user@example.com",
    "name": "John Doe",
    "subscriptionTier": "premium",
    "points": 150
  },
  "message": "Token refreshed successfully"
}
```

### **GET** `/api/auth/profile`
**Description**: Get user profile  
**Auth Required**: Yes  
**Response**:
```json
{
  "success": true,
  "user": {
    "id": "68cb40909e9fe1b37c10bf93",
    "email": "user@example.com",
    "name": "John Doe",
    "subscriptionTier": "premium",
    "points": 150,
    "preferences": {
      "language": "ha-NG",
      "notifications": true
    },
    "createdAt": "2025-09-20T10:00:00.000Z",
    "updatedAt": "2025-09-20T12:00:00.000Z"
  }
}
```

### **PUT** `/api/auth/profile`
**Description**: Update user profile  
**Auth Required**: Yes  
**Request Body**:
```json
{
  "name": "John Smith",
  "preferences": {
    "language": "en-US",
    "notifications": false
  }
}
```
**Response**:
```json
{
  "success": true,
  "user": {
    "id": "68cb40909e9fe1b37c10bf93",
    "email": "user@example.com",
    "name": "John Smith",
    "subscriptionTier": "premium",
    "points": 150,
    "preferences": {
      "language": "en-US",
      "notifications": false
    }
  }
}
```

### **GET** `/api/auth/usage`
**Description**: Get user usage statistics  
**Auth Required**: Yes  
**Response**:
```json
{
  "success": true,
  "stats": {
    "userId": "68cb40909e9fe1b37c10bf93",
    "tier": "premium",
    "points": 150,
    "limits": {
      "dailyFileUploads": 90,
      "dailyLiveRecordings": 10,
      "dailyRealtimeStreaming": 60,
      "maxFileDuration": 300,
      "maxFileSize": 52428800
    },
    "usage": {
      "dailyFileUploads": 5,
      "dailyLiveRecordings": 2,
      "dailyRealtimeStreaming": 15,
      "totalFileUploads": 150,
      "totalLiveRecordings": 45,
      "totalRealtimeStreaming": 200
    },
    "resetTimes": {
      "daily": "2025-09-21T00:00:00.000Z",
      "monthly": "2025-10-01T00:00:00.000Z"
    }
  }
}
```

### **GET** `/api/auth/subscription/tiers`
**Description**: Get available subscription tiers  
**Auth Required**: No  
**Response**:
```json
{
  "success": true,
  "tiers": {
    "free": {
      "name": "Free",
      "dailyFileUploads": 5,
      "dailyLiveRecordings": 2,
      "dailyRealtimeStreaming": 10,
      "maxFileDuration": 60,
      "maxFileSize": 10485760,
      "points": 0,
      "features": ["basic_transcription", "offline_mode"]
    },
    "basic": {
      "name": "Basic",
      "dailyFileUploads": 20,
      "dailyLiveRecordings": 5,
      "dailyRealtimeStreaming": 30,
      "maxFileDuration": 180,
      "maxFileSize": 52428800,
      "points": 50,
      "features": ["basic_transcription", "offline_mode", "ai_summarization"]
    },
    "premium": {
      "name": "Premium",
      "dailyFileUploads": 90,
      "dailyLiveRecordings": 20,
      "dailyRealtimeStreaming": 120,
      "maxFileDuration": 300,
      "maxFileSize": 104857600,
      "points": 200,
      "features": ["basic_transcription", "offline_mode", "ai_summarization", "translation", "real_time_streaming"]
    }
  }
}
```

### **POST** `/api/auth/subscription/upgrade`
**Description**: Upgrade user subscription  
**Auth Required**: Yes  
**Request Body**:
```json
{
  "tier": "premium",
  "paymentMethod": "stripe"
}
```
**Response**:
```json
{
  "success": true,
  "user": {
    "id": "68cb40909e9fe1b37c10bf93",
    "subscriptionTier": "premium",
    "points": 200
  },
  "message": "Successfully upgraded to premium tier"
}
```

### **POST** `/api/auth/subscription/cancel`
**Description**: Cancel user subscription  
**Auth Required**: Yes  
**Response**:
```json
{
  "success": true,
  "user": {
    "id": "68cb40909e9fe1b37c10bf93",
    "subscriptionTier": "free"
  },
  "message": "Subscription cancelled successfully"
}
```

---

## 3. **Speech-to-Text Transcription**

### **POST** `/api/stt/transcribe`
**Description**: Transcribe audio file  
**Auth Required**: Optional  
**Content-Type**: `multipart/form-data`  
**Request Body**:
```
audio: <file> (wav, mp3, m4a, webm)
languageCode: "ha-NG" (optional)
source: "file_upload" | "live-recording" (optional)
```
**Response**:
```json
{
  "success": true,
  "transcript": "assalamu alaikum muna yin testing na live recording",
  "confidence": 0.95,
  "id": "68ce8bd3ae43191d2079ebe9",
  "duration": 5.5224375,
  "language": "ha-NG",
  "source": "file_upload"
}
```

---

## 4. **Transcript Management**

### **GET** `/api/transcripts`
**Description**: List user transcripts  
**Auth Required**: Optional  
**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `source`: Filter by source (`file_upload`, `live`, `realtime`)
- `language`: Filter by language code
- `search`: Search in title and content

**Response**:
```json
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
        "speakers": [],
        "keywords": [],
        "pointsSpent": 0,
        "tags": [],
        "cloudSync": true,
        "isLocal": false,
        "syncStatus": "synced",
        "version": 1,
        "lastModified": "2025-09-20T11:11:15.350Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

### **GET** `/api/transcripts/:id`
**Description**: Get specific transcript  
**Auth Required**: Optional  
**Response**:
```json
{
  "success": true,
  "data": {
    "id": "68ce8bd3ae43191d2079ebe9",
    "userId": "68cb40909e9fe1b37c10bf93",
    "title": "Live Recording",
    "content": "assalamu alaikum muna yin testing",
    "timestamp": "2025-09-20T11:11:15.350Z",
    "duration": 5.5224375,
    "language": "ha-NG",
    "source": "live",
    "isPremium": true,
    "speakers": [],
    "keywords": [],
    "pointsSpent": 0,
    "tags": [],
    "cloudSync": true,
    "isLocal": false,
    "syncStatus": "synced",
    "version": 1,
    "lastModified": "2025-09-20T11:11:15.350Z"
  }
}
```

### **DELETE** `/api/transcripts/:id`
**Description**: Delete transcript  
**Auth Required**: Optional  
**Response**:
```json
{
  "success": true,
  "message": "Transcript deleted successfully"
}
```

---

## 5. **Transcript History & Search**

### **GET** `/api/history/recent`
**Description**: Get recent transcript history  
**Auth Required**: Yes  
**Query Parameters**:
- `limit`: Number of transcripts (default: 10, max: 100)
- `offset`: Offset for pagination (default: 0)

**Response**:
```json
{
  "success": true,
  "data": {
    "transcripts": [
      {
        "id": "68ce8bd3ae43191d2079ebe9",
        "title": "Live Recording",
        "content": "assalamu alaikum muna yin testing",
        "timestamp": "2025-09-20T11:11:15.350Z",
        "duration": 5.5224375,
        "language": "ha-NG",
        "source": "live",
        "isPremium": true
      }
    ],
    "total": 1,
    "hasMore": false
  }
}
```

### **GET** `/api/history/search`
**Description**: Search transcripts with filters  
**Auth Required**: Yes  
**Query Parameters**:
- `q`: Search query
- `source`: Filter by source
- `language`: Filter by language
- `dateFrom`: Start date (ISO string)
- `dateTo`: End date (ISO string)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response**:
```json
{
  "success": true,
  "data": {
    "transcripts": [
      {
        "id": "68ce8bd3ae43191d2079ebe9",
        "title": "Live Recording",
        "content": "assalamu alaikum muna yin testing",
        "timestamp": "2025-09-20T11:11:15.350Z",
        "duration": 5.5224375,
        "language": "ha-NG",
        "source": "live"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    },
    "filters": {
      "query": "testing",
      "source": "live",
      "language": "ha-NG"
    }
  }
}
```

### **GET** `/api/history/stats`
**Description**: Get transcript statistics  
**Auth Required**: Yes  
**Response**:
```json
{
  "success": true,
  "data": {
    "totalTranscripts": 150,
    "totalDuration": 3600,
    "averageDuration": 24,
    "bySource": {
      "file_upload": 100,
      "live": 30,
      "realtime": 20
    },
    "byLanguage": {
      "ha-NG": 120,
      "en-US": 20,
      "fr-FR": 10
    },
    "recentActivity": {
      "last7Days": 25,
      "last30Days": 100
    }
  }
}
```

### **GET** `/api/history/:id`
**Description**: Get specific transcript by ID  
**Auth Required**: Yes  
**Response**: Same as `/api/transcripts/:id`

### **PUT** `/api/history/:id`
**Description**: Update transcript  
**Auth Required**: Yes  
**Request Body**:
```json
{
  "title": "Updated Title",
  "content": "Updated content",
  "tags": ["tag1", "tag2"]
}
```
**Response**:
```json
{
  "success": true,
  "data": {
    "id": "68ce8bd3ae43191d2079ebe9",
    "title": "Updated Title",
    "content": "Updated content",
    "tags": ["tag1", "tag2"],
    "lastModified": "2025-09-20T12:30:00.000Z",
    "version": 2
  }
}
```

### **DELETE** `/api/history/:id`
**Description**: Delete transcript  
**Auth Required**: Yes  
**Response**:
```json
{
  "success": true,
  "message": "Transcript deleted successfully"
}
```

### **GET** `/api/history/export/:format`
**Description**: Export transcripts  
**Auth Required**: Yes  
**Path Parameters**:
- `format`: Export format (`json`, `csv`, `txt`, `pdf`)

**Query Parameters**:
- `ids`: Comma-separated transcript IDs (optional)
- `dateFrom`: Start date (optional)
- `dateTo`: End date (optional)

**Response**: File download or JSON data

---

## 6. **AI Features**

### **POST** `/api/ai/summarize`
**Description**: Generate AI summary  
**Auth Required**: Optional  
**Request Body**:
```json
{
  "content": "Long transcript content...",
  "type": "short" | "detailed",
  "language": "ha-NG"
}
```
**Response**:
```json
{
  "success": true,
  "data": {
    "summary": "Key points from the transcript...",
    "type": "short",
    "language": "ha-NG",
    "originalLength": 500,
    "summaryLength": 100
  }
}
```

### **POST** `/api/ai/format`
**Description**: Format text for specific platform  
**Auth Required**: Optional  
**Request Body**:
```json
{
  "content": "Raw transcript content...",
  "platform": "twitter" | "linkedin" | "facebook" | "instagram",
  "language": "ha-NG"
}
```
**Response**:
```json
{
  "success": true,
  "data": {
    "formattedContent": "Formatted content for Twitter...",
    "platform": "twitter",
    "characterCount": 280,
    "hashtags": ["#hausa", "#speech"]
  }
}
```

### **POST** `/api/ai/format-all`
**Description**: Format text for all platforms  
**Auth Required**: Optional  
**Request Body**:
```json
{
  "content": "Raw transcript content...",
  "language": "ha-NG"
}
```
**Response**:
```json
{
  "success": true,
  "data": {
    "formats": {
      "twitter": "Formatted for Twitter...",
      "linkedin": "Formatted for LinkedIn...",
      "facebook": "Formatted for Facebook...",
      "instagram": "Formatted for Instagram..."
    }
  }
}
```

### **GET** `/api/ai/usage`
**Description**: Get AI usage statistics  
**Auth Required**: Optional  
**Response**:
```json
{
  "success": true,
  "data": {
    "totalRequests": 150,
    "byType": {
      "summarize": 100,
      "format": 50
    },
    "lastUsed": "2025-09-20T12:00:00.000Z"
  }
}
```

---

## 7. **Translation Services**

### **POST** `/api/translation/translate`
**Description**: Translate text  
**Auth Required**: Optional  
**Request Body**:
```json
{
  "text": "Text to translate",
  "sourceLanguage": "ha-NG",
  "targetLanguage": "en-US"
}
```
**Response**:
```json
{
  "success": true,
  "data": {
    "originalText": "Text to translate",
    "translatedText": "Translated text",
    "sourceLanguage": "ha-NG",
    "targetLanguage": "en-US",
    "confidence": 0.95
  }
}
```

### **POST** `/api/translation/tts`
**Description**: Convert text to speech  
**Auth Required**: Optional  
**Request Body**:
```json
{
  "text": "Text to convert to speech",
  "language": "ha-NG",
  "voice": "ha-NG-Standard-A"
}
```
**Response**: Audio file (binary) or base64 encoded audio

### **POST** `/api/translation/translate-and-speak`
**Description**: Translate and convert to speech  
**Auth Required**: Optional  
**Request Body**:
```json
{
  "text": "Text to translate and speak",
  "sourceLanguage": "ha-NG",
  "targetLanguage": "en-US",
  "voice": "en-US-Standard-A"
}
```
**Response**: Audio file (binary) or base64 encoded audio

### **GET** `/api/translation/voices/:languageCode`
**Description**: Get available voices for language  
**Auth Required**: Optional  
**Response**:
```json
{
  "success": true,
  "data": {
    "language": "ha-NG",
    "voices": [
      {
        "name": "ha-NG-Standard-A",
        "gender": "female",
        "sampleRate": 22050
      },
      {
        "name": "ha-NG-Standard-B",
        "gender": "male",
        "sampleRate": 22050
      }
    ]
  }
}
```

### **GET** `/api/translation/languages`
**Description**: Get supported languages  
**Auth Required**: Optional  
**Response**:
```json
{
  "success": true,
  "data": {
    "languages": [
      {
        "code": "ha-NG",
        "name": "Hausa (Nigeria)",
        "nativeName": "Hausa"
      },
      {
        "code": "en-US",
        "name": "English (United States)",
        "nativeName": "English"
      }
    ]
  }
}
```

---

## 8. **Points System**

### **GET** `/api/points/balance`
**Description**: Get user points balance  
**Auth Required**: Yes  
**Response**:
```json
{
  "success": true,
  "points": 150,
  "tier": "premium",
  "limits": {
    "dailyFileUploads": 90,
    "dailyLiveRecordings": 20,
    "dailyRealtimeStreaming": 120
  }
}
```

### **GET** `/api/points/actions`
**Description**: Get available points actions  
**Auth Required**: No  
**Response**:
```json
{
  "success": true,
  "actions": [
    {
      "id": "short_summary",
      "name": "Short Summary",
      "points": 10,
      "description": "Generate a short summary of your transcript"
    },
    {
      "id": "punctuation_fix",
      "name": "Punctuation Fix",
      "points": 5,
      "description": "Fix punctuation in your transcript"
    },
    {
      "id": "short_translation",
      "name": "Short Translation",
      "points": 15,
      "description": "Translate your transcript to another language"
    }
  ]
}
```

### **POST** `/api/points/watch-ad`
**Description**: Record ad watch and award points  
**Auth Required**: Yes  
**Request Body**:
```json
{
  "adId": "ad_123456789"
}
```
**Response**:
```json
{
  "success": true,
  "pointsEarned": 10,
  "newBalance": 160,
  "message": "Points added successfully"
}
```

### **POST** `/api/points/summarize`
**Description**: Generate summary using points  
**Auth Required**: Yes  
**Request Body**:
```json
{
  "transcriptId": "68ce8bd3ae43191d2079ebe9",
  "content": "Transcript content...",
  "duration": 45
}
```
**Response**:
```json
{
  "success": true,
  "summary": "Key points from the transcript...",
  "pointsSpent": 10,
  "remainingPoints": 140
}
```

### **POST** `/api/points/punctuation`
**Description**: Fix punctuation using points  
**Auth Required**: Yes  
**Request Body**:
```json
{
  "content": "content without proper punctuation"
}
```
**Response**:
```json
{
  "success": true,
  "originalContent": "content without proper punctuation",
  "fixedContent": "Content without proper punctuation.",
  "pointsSpent": 5,
  "remainingPoints": 135
}
```

### **POST** `/api/points/translate`
**Description**: Translate content using points  
**Auth Required**: Yes  
**Request Body**:
```json
{
  "content": "Content to translate",
  "targetLanguage": "en-US",
  "duration": 30
}
```
**Response**:
```json
{
  "success": true,
  "originalContent": "Content to translate",
  "translatedContent": "Translated content",
  "targetLanguage": "en-US",
  "pointsSpent": 15,
  "remainingPoints": 120
}
```

---

## 9. **Usage Tracking**

### **POST** `/api/usage/check-live-recording`
**Description**: Check live recording usage limits  
**Auth Required**: Yes  
**Request Body**:
```json
{
  "requestedMinutes": 5
}
```
**Response**:
```json
{
  "success": true,
  "allowed": true,
  "remainingMinutes": 15,
  "tier": "premium",
  "resetTime": "2025-09-21T00:00:00.000Z"
}
```

### **POST** `/api/usage/record-live-recording`
**Description**: Record live recording usage  
**Auth Required**: Yes  
**Request Body**:
```json
{
  "minutes": 5
}
```
**Response**:
```json
{
  "success": true
}
```

### **POST** `/api/usage/check-realtime-streaming`
**Description**: Check real-time streaming usage limits  
**Auth Required**: Yes  
**Request Body**:
```json
{
  "requestedMinutes": 10
}
```
**Response**:
```json
{
  "success": true,
  "allowed": true,
  "remainingMinutes": 50,
  "tier": "premium",
  "resetTime": "2025-09-21T00:00:00.000Z"
}
```

### **POST** `/api/usage/record-realtime-streaming`
**Description**: Record real-time streaming usage  
**Auth Required**: Yes  
**Request Body**:
```json
{
  "minutes": 10
}
```
**Response**:
```json
{
  "success": true
}
```

---

## 10. **Languages**

### **GET** `/api/languages/available`
**Description**: Get available languages  
**Auth Required**: No  
**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "68cb40909e9fe1b37c10bf94",
      "code": "ha-NG",
      "name": "Hausa (Nigeria)",
      "nativeName": "Hausa",
      "enabled": true
    },
    {
      "id": "68cb40909e9fe1b37c10bf95",
      "code": "en-US",
      "name": "English (United States)",
      "nativeName": "English",
      "enabled": true
    }
  ]
}
```

---

## 11. **Mobile Sync & Offline Support**

### **GET** `/api/mobile/offline/transcripts`
**Description**: Get offline transcripts for sync  
**Auth Required**: Yes  
**Query Parameters**:
- `since`: ISO timestamp for incremental sync
- `limit`: Maximum number of transcripts (default: 100)

**Response**:
```json
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

### **POST** `/api/mobile/offline/sync`
**Description**: Sync offline transcripts  
**Auth Required**: Yes  
**Request Body**:
```json
{
  "transcripts": [
    {
      "localId": "local_123",
      "title": "Offline Recording",
      "content": "Content recorded offline",
      "timestamp": "2025-09-20T12:00:00.000Z",
      "duration": 30,
      "language": "ha-NG",
      "source": "live",
      "version": 1
    }
  ]
}
```
**Response**:
```json
{
  "success": true,
  "data": {
    "synced": 1,
    "conflicts": [],
    "errors": [],
    "syncTimestamp": "2025-09-20T12:30:00.000Z"
  }
}
```

### **GET** `/api/mobile/sync/status`
**Description**: Get sync status  
**Auth Required**: Yes  
**Response**:
```json
{
  "success": true,
  "data": {
    "lastSync": "2025-09-20T12:21:00.741Z",
    "totalTranscripts": 150,
    "pendingSync": 0,
    "conflicts": 0,
    "lastModified": "2025-09-20T11:11:15.350Z"
  }
}
```

### **POST** `/api/mobile/sync/resolve-conflicts`
**Description**: Resolve sync conflicts  
**Auth Required**: Yes  
**Request Body**:
```json
{
  "conflicts": [
    {
      "localId": "local_123",
      "serverId": "68ce8bd3ae43191d2079ebe9",
      "resolution": "use_client",
      "data": {
        "title": "Updated Title",
        "content": "Updated content"
      }
    }
  ]
}
```
**Response**:
```json
{
  "success": true,
  "data": {
    "resolved": 1,
    "errors": [],
    "syncTimestamp": "2025-09-20T12:30:00.000Z"
  }
}
```

---

## 12. **Push Notifications**

### **POST** `/api/push/register-token`
**Description**: Register device token for push notifications  
**Auth Required**: Yes  
**Request Body**:
```json
{
  "token": "device_fcm_token_here",
  "platform": "ios"
}
```
**Response**:
```json
{
  "success": true,
  "message": "Device token registered successfully"
}
```

### **DELETE** `/api/push/unregister-token`
**Description**: Unregister device token  
**Auth Required**: Yes  
**Request Body**:
```json
{
  "token": "device_fcm_token_here"
}
```
**Response**:
```json
{
  "success": true,
  "message": "Device token unregistered successfully"
}
```

### **GET** `/api/push/tokens`
**Description**: Get user's device tokens  
**Auth Required**: Yes  
**Response**:
```json
{
  "success": true,
  "data": {
    "tokens": [
      {
        "platform": "ios",
        "lastActive": "2025-09-20T12:00:00.000Z",
        "token": "abc123..."
      }
    ]
  }
}
```

### **POST** `/api/push/test`
**Description**: Send test notification  
**Auth Required**: Yes  
**Request Body**:
```json
{
  "title": "Test Notification",
  "body": "This is a test notification"
}
```
**Response**:
```json
{
  "success": true,
  "message": "Test notification sent"
}
```

---

## 13. **WebSocket Real-time Streaming**

### **Connection**
```typescript
const socket = io('http://localhost:4000/transcription', {
  auth: {
    token: 'jwt_token_here'
  },
  query: {
    premium: 'true' // for premium users
  }
});
```

### **Events**

#### **Client → Server**

**`join_session`**
```typescript
socket.emit('join_session', {
  sessionId: 'unique_session_id',
  mode: 'online' | 'offline',
  userId: 'user_id_here',
  sourceLanguage: 'ha-NG',
  targetLanguage: 'en-US'
});
```

**`audio_chunk`**
```typescript
socket.emit('audio_chunk', {
  sessionId: 'session_id',
  chunk: 'base64_encoded_audio_data'
});
```

**`end_session`**
```typescript
socket.emit('end_session', {
  sessionId: 'session_id'
});
```

**`update_languages`**
```typescript
socket.emit('update_languages', {
  sessionId: 'session_id',
  sourceLanguage: 'ha-NG',
  targetLanguage: 'en-US'
});
```

#### **Server → Client**

**`session_status`**
```typescript
socket.on('session_status', (data) => {
  console.log('Session status:', data);
  // { sessionId: 'session_id', status: 'active' | 'completed' }
});
```

**`transcript_update`**
```typescript
socket.on('transcript_update', (data) => {
  console.log('Transcript update:', data);
  // { 
  //   sessionId: 'session_id', 
  //   text: 'transcribed text', 
  //   isFinal: boolean,
  //   confidence: 0.95,
  //   language: 'ha-NG'
  // }
});
```

**`translation_update`**
```typescript
socket.on('translation_update', (data) => {
  console.log('Translation update:', data);
  // { 
  //   sessionId: 'session_id', 
  //   translatedText: 'translated text',
  //   targetLanguage: 'en-US'
  // }
});
```

**`error`**
```typescript
socket.on('error', (error) => {
  console.error('Socket error:', error);
  // { code: 'ERROR_CODE', message: 'Error message' }
});
```

---

## 14. **Error Handling**

### **Common Error Codes**

| Code | Description | Action |
|------|-------------|--------|
| `UNAUTHORIZED` | Invalid or missing token | Re-authenticate |
| `FORBIDDEN` | Insufficient permissions | Check user tier |
| `NOT_FOUND` | Resource not found | Check resource ID |
| `VALIDATION_ERROR` | Invalid request data | Fix request format |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Wait and retry |
| `PREMIUM_REQUIRED` | Premium feature | Upgrade subscription |
| `USAGE_LIMIT_EXCEEDED` | Usage limit reached | Wait for reset or upgrade |
| `NETWORK_ERROR` | Network connectivity issue | Check connection |
| `SERVER_ERROR` | Internal server error | Retry later |

### **Error Response Format**
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  },
  "timestamp": "2025-09-20T12:00:00.000Z"
}
```

---

## 15. **Rate Limiting**

### **Limits by Endpoint**

| Endpoint Category | Rate Limit | Window |
|------------------|------------|--------|
| Authentication | 10 requests | 15 minutes |
| Transcription | 5 requests | 1 minute |
| AI Features | 20 requests | 1 hour |
| Translation | 30 requests | 1 hour |
| General API | 100 requests | 15 minutes |

### **Rate Limit Headers**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1632134400
```

---

## 16. **Mobile-Specific Considerations**

### **Offline Mode**
- All transcript operations work offline
- Sync when connection is restored
- Local SQLite database for storage
- Conflict resolution for concurrent edits

### **Background Sync**
- Automatic sync every 30 seconds when online
- Manual sync trigger
- Progress indicators for sync operations
- Error handling and retry logic

### **Push Notifications**
- Real-time sync status updates
- New transcript notifications
- Usage limit warnings
- Feature announcements

### **Performance Optimization**
- Response compression (gzip)
- Image optimization
- Lazy loading for large datasets
- Caching strategies

---

## 17. **React Native Implementation Examples**

### **API Service Setup**
```typescript
import axios from 'axios';

class APIService {
  private baseURL = 'http://localhost:4000';
  private token: string | null = null;

  constructor() {
    this.setupInterceptors();
  }

  setToken(token: string) {
    this.token = token;
  }

  private setupInterceptors() {
    // Request interceptor
    axios.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      config.headers['X-Platform'] = 'mobile';
      config.headers['X-App-Version'] = '1.0.0';
      return config;
    });

    // Response interceptor
    axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle token refresh
          this.handleTokenRefresh();
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication methods
  async login(email: string, password: string) {
    const response = await axios.post(`${this.baseURL}/api/auth/login`, {
      email,
      password
    });
    return response.data;
  }

  // Transcript methods
  async getTranscripts(params?: any) {
    const response = await axios.get(`${this.baseURL}/api/transcripts`, { params });
    return response.data;
  }

  async transcribeAudio(audioFile: FormData) {
    const response = await axios.post(`${this.baseURL}/api/stt/transcribe`, audioFile, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }
}

export default new APIService();
```

### **WebSocket Integration**
```typescript
import io from 'socket.io-client';

class WebSocketService {
  private socket: any = null;

  connect(token: string) {
    this.socket = io('http://localhost:4000/transcription', {
      auth: { token },
      query: { premium: 'true' }
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.socket.on('transcript_update', (data) => {
      // Handle transcript updates
      console.log('Transcript update:', data);
    });

    this.socket.on('error', (error) => {
      // Handle errors
      console.error('Socket error:', error);
    });
  }

  joinSession(sessionId: string, mode: 'online' | 'offline') {
    this.socket.emit('join_session', {
      sessionId,
      mode,
      userId: 'user_id_here',
      sourceLanguage: 'ha-NG'
    });
  }

  sendAudioChunk(sessionId: string, audioChunk: string) {
    this.socket.emit('audio_chunk', {
      sessionId,
      chunk: audioChunk
    });
  }

  endSession(sessionId: string) {
    this.socket.emit('end_session', { sessionId });
  }
}

export default new WebSocketService();
```

---

This comprehensive API documentation covers all features available in the website and provides everything needed to build a fully-featured React Native mobile application. The mobile app will have complete feature parity with the web version, plus additional mobile-specific optimizations for offline usage, background sync, and push notifications.

