import mongoose, { Document, Schema } from 'mongoose';

export interface ITranscript extends Document {
  userId: string;
  title: string;
  content: string;
  timestamp: Date;
  duration: number; // in seconds
  language: 'ha-NG' | 'en-US' | 'fr-FR' | 'ar';
  source: 'live' | 'file_upload';
  fileSize?: number; // in bytes
  fileName?: string;
  isPremium: boolean; // whether this was created with premium features
  speakers?: Array<{
    id: string;
    name?: string;
    segments: Array<{
      startTime: number;
      endTime: number;
      text: string;
    }>;
  }>;
  summary?: string;
  keywords?: string[];
  translation?: {
    targetLanguage: string;
    translatedText: string;
    timestamp: Date;
  };
  pointsSpent: number; // points used for AI features
  tags: string[];
  isCloudSynced: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TranscriptSchema = new Schema<ITranscript>({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  duration: { type: Number, required: true },
  language: { 
    type: String, 
    enum: ['ha-NG', 'en-US', 'fr-FR', 'ar'], 
    default: 'ha-NG' 
  },
  source: { 
    type: String, 
    enum: ['live', 'file_upload'], 
    required: true 
  },
  fileSize: { type: Number },
  fileName: { type: String },
  isPremium: { type: Boolean, default: false },
  speakers: [{
    id: { type: String, required: true },
    name: { type: String },
    segments: [{
      startTime: { type: Number, required: true },
      endTime: { type: Number, required: true },
      text: { type: String, required: true }
    }]
  }],
  summary: { type: String },
  keywords: [{ type: String }],
  translation: {
    targetLanguage: { type: String },
    translatedText: { type: String },
    timestamp: { type: Date }
  },
  pointsSpent: { type: Number, default: 0 },
  tags: [{ type: String }],
  isCloudSynced: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

TranscriptSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Transcript = mongoose.model<ITranscript>('Transcript', TranscriptSchema);
