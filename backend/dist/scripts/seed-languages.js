"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedLanguages = seedLanguages;
const mongoose_1 = __importDefault(require("mongoose"));
const Language_1 = require("../models/Language");
const logger_1 = require("../config/logger");
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
async function seedLanguages() {
    try {
        // Check if languages already exist
        const existingLanguages = await Language_1.Language.find();
        if (existingLanguages.length > 0) {
            logger_1.logger.info(`${existingLanguages.length} languages already exist, skipping seed`);
            return;
        }
        // Insert default languages
        await Language_1.Language.insertMany(defaultLanguages);
        logger_1.logger.info(`Successfully seeded ${defaultLanguages.length} default languages`);
    }
    catch (error) {
        logger_1.logger.error('Error seeding languages:', error);
        throw error;
    }
}
// Run seeder if called directly
if (require.main === module) {
    mongoose_1.default.connect('mongodb://localhost:27017/hausa-speech')
        .then(async () => {
        await seedLanguages();
        process.exit(0);
    })
        .catch((error) => {
        logger_1.logger.error('Database connection error:', error);
        process.exit(1);
    });
}
