export interface User {
    id: string;
    email: string;
    name?: string;
    language: 'ha-NG' | 'en-US' | 'fr-FR' | 'ar' | 'yo-NG' | 'ig-NG';
    isPremium: boolean;
    createdAt: string;
    lastLogin: string;
  }
  
export interface Transcript {
    id: string;
    userId: string;
    title: string;
    content: string;
    timestamp: string;
    tags: string[];
    speakers?: Speaker[];
    isLocal: boolean;
    cloudSync?: boolean;
    duration: number;
    topic?: string;
    sentiment?: 'positive' | 'neutral' | 'negative' | 'urgent';
    actionItems?: ActionItem[];
    summary?: string;
    keywords?: string[];
    formattedFor?: SocialMediaFormat;
    // Additional fields for MongoDB compatibility
    language?: 'ha-NG' | 'en-US' | 'fr-FR' | 'ar' | 'yo-NG' | 'ig-NG';
    source?: 'live' | 'file_upload';
    fileSize?: number;
    fileName?: string;
    isPremium?: boolean;
    translation?: {
      targetLanguage: string;
      translatedText: string;
      timestamp: string;
    };
    pointsSpent?: number;
  }
  
export interface Speaker {
    id: string;
    name?: string;
    segments: SpeechSegment[];
  }
  
export interface SpeechSegment {
    startTime: number;
    endTime: number;
    text: string;
    emotion?: 'excited' | 'frustrated' | 'neutral' | 'happy' | 'sad';
  }
  
export interface ActionItem {
    id: string;
    description: string;
    assignee?: string;
    dueDate?: string;
  }
  
export interface SocialMediaFormat {
    platform: 'facebook' | 'whatsapp' | 'twitter' | 'instagram' | 'linkedin';
    formattedText: string;
    hashtags?: string[];
    emojis?: string[];
    caption?: string;
  }
  
export interface TranscriptionSession {
    id: string;
    userId: string;
    startTime: string;
    endTime?: string;
    status: 'active' | 'paused' | 'completed' | 'failed';
    mode: 'online' | 'offline';
    audioStream?: Blob;
    transcript: Transcript;
  }
  
export interface CustomVocabulary {
    id: string;
    userId: string;
    term: string;
    phonetic?: string;
    context?: string;
    createdAt: string;
  }
  
export interface Analytics {
    userId: string;
    totalHoursTranscribed: number;
    averageSessionLength: number;
    accuracyScore: number;
    wordCloud: { word: string; frequency: number }[];
    commonTopics: string[];
    usageTrends: { date: string; duration: number }[];
  }
  
export interface Translation {
    id: string;
    transcriptId: string;
    sourceLanguage: 'ha-NG' | 'en-US' | 'fr-FR' | 'ar' | 'yo-NG' | 'ig-NG';
    targetLanguage: 'ha-NG' | 'en-US' | 'fr-FR' | 'ar' | 'yo-NG' | 'ig-NG';
    translatedText: string;
    culturalNotes?: string[];
  }
  
export interface PrivacySettings {
    userId: string;
    enableEncryption: boolean;
    biometricAuth: boolean;
    autoRedact: boolean;
    redactedFields?: string[];
  }
  
export interface AppSettings {
    userId: string;
    theme: 'light' | 'dark';
    fontSize: 'small' | 'medium' | 'large';
    language: 'ha-NG' | 'en-US';
    offlineMode: boolean;
    noiseCancellationLevel: 'low' | 'medium' | 'high';
  }
  
export interface CollaborationSession {
    id: string;
    transcriptId: string;
    participants: string[];
    shareLink: string;
    isLive: boolean;
    lastUpdated: string;
  }
  
export interface ChatbotQuery {
    id: string;
    transcriptId: string;
    query: string;
    response: string;
    timestamp: string;
  }

