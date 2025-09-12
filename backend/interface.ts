interface User {
    id: string;
    email: string;
    name?: string;
    language: 'ha-NG' | 'en-US' | 'fr-FR' | 'ar' | 'yo-NG' | 'ig-NG';
    isPremium: boolean;
    createdAt: string;
    lastLogin: string;
  }
  
  interface Transcript {
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
  }
  
  interface Speaker {
    id: string;
    name?: string;
    segments: SpeechSegment[];
  }
  
  interface SpeechSegment {
    startTime: number;
    endTime: number;
    text: string;
    emotion?: 'excited' | 'frustrated' | 'neutral' | 'happy' | 'sad';
  }
  
  interface ActionItem {
    id: string;
    description: string;
    assignee?: string;
    dueDate?: string;
  }
  
  interface SocialMediaFormat {
    platform: 'facebook' | 'whatsapp' | 'twitter' | 'instagram' | 'linkedin';
    formattedText: string;
    hashtags?: string[];
    emojis?: string[];
    caption?: string;
  }
  
  interface TranscriptionSession {
    id: string;
    userId: string;
    startTime: string;
    endTime?: string;
    status: 'active' | 'paused' | 'completed' | 'failed';
    mode: 'online' | 'offline';
    audioStream?: Blob;
    transcript: Transcript;
  }
  
  interface CustomVocabulary {
    id: string;
    userId: string;
    term: string;
    phonetic?: string;
    context?: string;
    createdAt: string;
  }
  
  interface Analytics {
    userId: string;
    totalHoursTranscribed: number;
    averageSessionLength: number;
    accuracyScore: number;
    wordCloud: { word: string; frequency: number }[];
    commonTopics: string[];
    usageTrends: { date: string; duration: number }[];
  }
  
  interface Translation {
    id: string;
    transcriptId: string;
    sourceLanguage: 'ha-NG' | 'en-US' | 'fr-FR' | 'ar' | 'yo-NG' | 'ig-NG';
    targetLanguage: 'ha-NG' | 'en-US' | 'fr-FR' | 'ar' | 'yo-NG' | 'ig-NG';
    translatedText: string;
    culturalNotes?: string[];
  }
  
  interface PrivacySettings {
    userId: string;
    enableEncryption: boolean;
    biometricAuth: boolean;
    autoRedact: boolean;
    redactedFields?: string[];
  }
  
  interface AppSettings {
    userId: string;
    theme: 'light' | 'dark';
    fontSize: 'small' | 'medium' | 'large';
    language: 'ha-NG' | 'en-US';
    offlineMode: boolean;
    noiseCancellationLevel: 'low' | 'medium' | 'high';
  }
  
  interface CollaborationSession {
    id: string;
    transcriptId: string;
    participants: string[];
    shareLink: string;
    isLive: boolean;
    lastUpdated: string;
  }
  
  interface ChatbotQuery {
    id: string;
    transcriptId: string;
    query: string;
    response: string;
    timestamp: string;
  }