import mongoose from 'mongoose';
import { Language } from '../models/Language';
import { logger } from '../config/logger';

const defaultLanguages = [
  {
    name: 'Hausa',
    code: 'ha-NG',
    flag: '🇳🇬',
    isSourceLanguage: true,
    isTargetLanguage: true,
    translationCode: 'ha',
    enabled: true
  },
  {
    name: 'Yoruba',
    code: 'yo-NG',
    flag: '🇳🇬',
    isSourceLanguage: true,
    isTargetLanguage: true,
    translationCode: 'yo',
    enabled: true
  },
  {
    name: 'Igbo',
    code: 'ig-NG',
    flag: '🇳🇬',
    isSourceLanguage: true,
    isTargetLanguage: true,
    translationCode: 'ig',
    enabled: true
  },
  {
    name: 'Arabic',
    code: 'ar-SA',
    flag: '🇸🇦',
    isSourceLanguage: true,
    isTargetLanguage: true,
    translationCode: 'ar',
    enabled: true
  },
  {
    name: 'English',
    code: 'en-US',
    flag: '🇺🇸',
    isSourceLanguage: false,
    isTargetLanguage: true,
    translationCode: 'en',
    enabled: true
  }
];

export async function seedLanguages() {
  try {
    // Check if languages already exist
    const existingLanguages = await Language.find();
    
    if (existingLanguages.length > 0) {
      logger.info(`${existingLanguages.length} languages already exist, skipping seed`);
      return;
    }
    
    // Insert default languages
    await Language.insertMany(defaultLanguages);
    
    logger.info(`Successfully seeded ${defaultLanguages.length} default languages`);
  } catch (error: any) {
    logger.error('Error seeding languages:', error);
    throw error;
  }
}

// Run seeder if called directly
if (require.main === module) {
  mongoose.connect('mongodb://localhost:27017/hausa-speech')
    .then(async () => {
      await seedLanguages();
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Database connection error:', error);
      process.exit(1);
    });
}
