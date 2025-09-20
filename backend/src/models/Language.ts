import mongoose, { Document, Schema } from 'mongoose';

export interface ILanguage extends Document {
  name: string;
  code: string;
  flag?: string;
  isSourceLanguage: boolean;
  isTargetLanguage: boolean;
  translationCode: string;
  enabled: boolean; // Whether the language is enabled for users
  createdAt: Date;
  updatedAt: Date;
}

const LanguageSchema = new Schema<ILanguage>({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  code: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  flag: {
    type: String,
    default: '🌍',
    trim: true
  },
  isSourceLanguage: {
    type: Boolean,
    default: true
  },
  isTargetLanguage: {
    type: Boolean,
    default: true
  },
  translationCode: {
    type: String,
    required: true,
    trim: true
  },
  enabled: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries
LanguageSchema.index({ code: 1 });
LanguageSchema.index({ isSourceLanguage: 1 });
LanguageSchema.index({ isTargetLanguage: 1 });
LanguageSchema.index({ enabled: 1 });

export const Language = mongoose.model<ILanguage>('Language', LanguageSchema);
