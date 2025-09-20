# 📱 React Native Implementation Guide

## Quick Start

### 1. Project Setup
```bash
# Create React Native project
npx react-native init HausaSpeechApp --template react-native-template-typescript

# Install dependencies
npm install @react-native-async-storage/async-storage
npm install @react-native-community/netinfo
npm install react-native-sqlite-storage
npm install react-native-audio-recorder-player
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context
npm install react-native-gesture-handler react-native-reanimated
npm install react-native-vector-icons react-native-paper
npm install axios socket.io-client
npm install react-query zustand
npm install @react-native-firebase/app @react-native-firebase/messaging
```

### 2. Project Structure
```
src/
├── components/          # Reusable UI components
├── screens/            # App screens
├── navigation/         # Navigation setup
├── services/           # API & business logic
├── store/              # State management
├── database/           # Local SQLite setup
├── utils/              # Helper functions
├── types/              # TypeScript types
└── constants/          # App constants
```

### 3. Core Services

#### API Service
```typescript
// src/services/api.ts
import axios from 'axios';

class APIService {
  private baseURL = 'http://localhost:4000';
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  async login(email: string, password: string) {
    const response = await axios.post(`${this.baseURL}/api/auth/login`, {
      email, password
    });
    return response.data;
  }

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

#### Database Service
```typescript
// src/services/database.ts
import SQLite from 'react-native-sqlite-storage';

class DatabaseService {
  private db: any = null;

  async init() {
    this.db = await SQLite.openDatabase({
      name: 'HausaSpeech.db',
      location: 'default',
    });
    await this.createTables();
  }

  private async createTables() {
    const createTranscriptsTable = `
      CREATE TABLE IF NOT EXISTS transcripts (
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
      )
    `;
    
    await this.db.executeSql(createTranscriptsTable);
  }

  async saveTranscript(transcript: any) {
    const query = `
      INSERT OR REPLACE INTO transcripts 
      (id, local_id, user_id, title, content, timestamp, duration, language, source, is_premium, sync_status, version, last_modified, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.db.executeSql(query, [
      transcript.id,
      transcript.localId,
      transcript.userId,
      transcript.title,
      transcript.content,
      transcript.timestamp,
      transcript.duration,
      transcript.language,
      transcript.source,
      transcript.isPremium ? 1 : 0,
      transcript.syncStatus,
      transcript.version,
      transcript.lastModified,
      transcript.createdAt,
      transcript.updatedAt
    ]);
  }

  async getTranscripts(limit = 100, offset = 0) {
    const query = `
      SELECT * FROM transcripts 
      ORDER BY timestamp DESC 
      LIMIT ? OFFSET ?
    `;
    
    const [results] = await this.db.executeSql(query, [limit, offset]);
    const transcripts = [];
    
    for (let i = 0; i < results.rows.length; i++) {
      transcripts.push(results.rows.item(i));
    }
    
    return transcripts;
  }
}

export default new DatabaseService();
```

#### Sync Service
```typescript
// src/services/sync.ts
import NetInfo from '@react-native-community/netinfo';
import APIService from './api';
import DatabaseService from './database';

class SyncService {
  private isOnline = false;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
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
    
    await this.performSync();
    
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, 30000); // 30 seconds
  }

  async performSync() {
    if (!this.isOnline) return;

    try {
      // Get offline transcripts
      const localTranscripts = await DatabaseService.getTranscripts();
      const pendingTranscripts = localTranscripts.filter(t => t.sync_status === 'pending');
      
      if (pendingTranscripts.length > 0) {
        // Upload pending transcripts
        const result = await APIService.syncOfflineTranscripts(pendingTranscripts);
        
        if (result.success) {
          // Mark as synced
          for (const transcript of pendingTranscripts) {
            await DatabaseService.updateSyncStatus(transcript.id, 'synced');
          }
        }
      }

      // Download new transcripts
      const lastSync = await this.getLastSyncTime();
      const response = await APIService.getOfflineTranscripts(lastSync);
      
      if (response.success) {
        for (const transcript of response.data.transcripts) {
          await DatabaseService.saveTranscript(transcript);
        }
        
        await this.updateLastSyncTime(response.data.syncTimestamp);
      }
      
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }

  stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}

export default new SyncService();
```

### 4. State Management (Zustand)

```typescript
// src/store/useAuthStore.ts
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  email: string;
  name: string;
  subscriptionTier: string;
  points: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    try {
      const response = await APIService.login(email, password);
      
      if (response.success) {
        set({
          user: response.user,
          token: response.token,
          isAuthenticated: true
        });
        
        await AsyncStorage.setItem('token', response.token);
        await AsyncStorage.setItem('user', JSON.stringify(response.user));
      }
    } catch (error) {
      throw error;
    }
  },

  logout: () => {
    set({
      user: null,
      token: null,
      isAuthenticated: false
    });
    
    AsyncStorage.removeItem('token');
    AsyncStorage.removeItem('user');
  },

  setUser: (user: User) => set({ user }),
  setToken: (token: string) => set({ token })
}));
```

### 5. Main App Component

```typescript
// App.tsx
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useAuthStore } from './src/store/useAuthStore';
import DatabaseService from './src/services/database';
import SyncService from './src/services/sync';
import AuthNavigator from './src/navigation/AuthNavigator';
import MainNavigator from './src/navigation/MainNavigator';

const queryClient = new QueryClient();

export default function App() {
  const { isAuthenticated, setUser, setToken } = useAuthStore();

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize database
      await DatabaseService.init();
      
      // Check for stored auth
      const token = await AsyncStorage.getItem('token');
      const user = await AsyncStorage.getItem('user');
      
      if (token && user) {
        setToken(token);
        setUser(JSON.parse(user));
      }
      
      // Start sync service
      SyncService.startSync();
      
    } catch (error) {
      console.error('App initialization failed:', error);
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider>
        <NavigationContainer>
          {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
        </NavigationContainer>
      </PaperProvider>
    </QueryClientProvider>
  );
}
```

### 6. Key Screens

#### Login Screen
```typescript
// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (error) {
      Alert.alert('Error', 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      <Text style={{ fontSize: 24, marginBottom: 30, textAlign: 'center' }}>
        Hausa Speech App
      </Text>
      
      <TextInput
        style={{ borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 }}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={{ borderWidth: 1, padding: 10, marginBottom: 20, borderRadius: 5 }}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity
        style={{ backgroundColor: '#007AFF', padding: 15, borderRadius: 5 }}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontSize: 16 }}>
          {loading ? 'Logging in...' : 'Login'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

#### Transcripts List Screen
```typescript
// src/screens/TranscriptsScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery } from 'react-query';
import APIService from '../services/api';

export default function TranscriptsScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery(
    'transcripts',
    () => APIService.getTranscripts(),
    {
      refetchOnWindowFocus: false,
    }
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const renderTranscript = ({ item }: { item: any }) => (
    <TouchableOpacity style={{ padding: 15, borderBottomWidth: 1 }}>
      <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{item.title}</Text>
      <Text style={{ fontSize: 14, color: '#666', marginTop: 5 }}>
        {item.content.substring(0, 100)}...
      </Text>
      <Text style={{ fontSize: 12, color: '#999', marginTop: 5 }}>
        {new Date(item.timestamp).toLocaleDateString()} • {item.duration}s
      </Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading transcripts...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={data?.data?.transcripts || []}
        renderItem={renderTranscript}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
}
```

### 7. Audio Recording

```typescript
// src/services/audioRecorder.ts
import AudioRecorderPlayer from 'react-native-audio-recorder-player';

class AudioRecorderService {
  private audioRecorderPlayer = new AudioRecorderPlayer();

  async startRecording() {
    const result = await this.audioRecorderPlayer.startRecorder();
    return result;
  }

  async stopRecording() {
    const result = await this.audioRecorderPlayer.stopRecorder();
    return result;
  }

  async transcribeAudio(audioPath: string) {
    const formData = new FormData();
    formData.append('audio', {
      uri: audioPath,
      type: 'audio/wav',
      name: 'recording.wav',
    } as any);
    formData.append('source', 'live-recording');

    const response = await APIService.transcribeAudio(formData);
    return response;
  }
}

export default new AudioRecorderService();
```

### 8. Push Notifications

```typescript
// src/services/pushNotifications.ts
import messaging from '@react-native-firebase/messaging';
import APIService from './api';

class PushNotificationService {
  async requestPermission() {
    const authStatus = await messaging().requestPermission();
    const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                   authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      await this.registerToken();
    }

    return enabled;
  }

  async registerToken() {
    const token = await messaging().getToken();
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    
    await APIService.registerDeviceToken(token, platform);
  }

  setupNotificationHandlers() {
    // Handle background messages
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('Background message:', remoteMessage);
    });

    // Handle foreground messages
    messaging().onMessage(async (remoteMessage) => {
      console.log('Foreground message:', remoteMessage);
      // Show in-app notification
    });
  }
}

export default new PushNotificationService();
```

This implementation guide provides a solid foundation for building the React Native mobile app with all the features from the website, plus mobile-specific optimizations for offline usage, background sync, and push notifications.

