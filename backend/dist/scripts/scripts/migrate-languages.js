"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateLanguages = migrateLanguages;
const mongoose_1 = __importDefault(require("mongoose"));
const Language_1 = require("../models/Language");
const logger_1 = require("../config/logger");
async function migrateLanguages() {
    try {
        logger_1.logger.info('Starting language migration...');
        // Update all existing languages to have enabled: true
        const result = await Language_1.Language.updateMany({ enabled: { $exists: false } }, { $set: { enabled: true } });
        logger_1.logger.info(`Updated ${result.modifiedCount} languages with enabled field`);
        // Check if we have any languages
        const languageCount = await Language_1.Language.countDocuments();
        logger_1.logger.info(`Total languages in database: ${languageCount}`);
        if (languageCount === 0) {
            logger_1.logger.info('No languages found, seeding default languages...');
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
            for (const lang of defaultLanguages) {
                const existingLanguage = await Language_1.Language.findOne({ code: lang.code });
                if (!existingLanguage) {
                    await Language_1.Language.create(lang);
                    logger_1.logger.info(`Seeded language: ${lang.name} (${lang.code})`);
                }
                else {
                    // Update existing language with enabled field
                    await Language_1.Language.updateOne({ code: lang.code }, { $set: { enabled: true } });
                    logger_1.logger.info(`Updated existing language: ${lang.name} (${lang.code})`);
                }
            }
        }
        logger_1.logger.info('Language migration completed successfully');
    }
    catch (error) {
        logger_1.logger.error('Error during language migration:', error);
        throw error;
    }
}
// Run migration if called directly
if (require.main === module) {
    mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hausa-stt')
        .then(() => migrateLanguages())
        .then(() => {
        logger_1.logger.info('Migration completed');
        process.exit(0);
    })
        .catch((error) => {
        logger_1.logger.error('Migration failed:', error);
        process.exit(1);
    });
}
