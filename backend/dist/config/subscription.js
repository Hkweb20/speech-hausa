"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AD_REWARDS = exports.POINTS_ACTIONS = exports.SUBSCRIPTION_TIERS = void 0;
exports.SUBSCRIPTION_TIERS = {
    free: {
        name: 'Free (Ad-supported)',
        price: 0,
        currency: 'USD',
        billingCycle: 'monthly',
        features: {
            dailyMinutes: 5, // 5 minutes live OR 10 minutes file per day
            monthlyMinutes: 150, // 5 * 30 days
            maxFileSize: 2, // 2 minutes max per file
            maxTranscripts: 10, // local storage only
            exportFormats: ['txt'],
            aiFeatures: ['basic_punctuation'],
            cloudSync: false,
            offlineMode: false,
            prioritySupport: false,
            apiAccess: false,
            dailyAIRequests: 5,
            monthlyAIRequests: 150,
            // File upload limits
            dailyFileUploads: 2, // 2 file uploads per day
            maxFileDuration: 3, // 3 minutes max per file
            // Live recording limits
            dailyLiveRecordingMinutes: 5, // 5 minutes of live recording per day
            // Real-time streaming limits
            dailyRealTimeStreamingMinutes: 3, // 3 minutes of real-time streaming per day
            // Translation limits
            dailyTranslationMinutes: 0 // No translation access for free users
        },
        limits: {
            dailyAdWatches: 5, // 5 ads per day = 50 points
            pointsPerAd: 10,
            maxPointsBalance: 1000
        },
        description: 'Perfect for occasional use with rewarded ads for extra features'
    },
    basic: {
        name: 'Basic',
        price: 299, // $2.99
        currency: 'USD',
        billingCycle: 'monthly',
        features: {
            dailyMinutes: 4, // 4 minutes per day = 120 minutes per month
            monthlyMinutes: 120,
            maxFileSize: 10, // 10 minutes max per file
            maxTranscripts: 1000, // cloud storage
            exportFormats: ['txt', 'docx'],
            aiFeatures: ['basic_punctuation', 'auto_capitalization', 'limited_summary'],
            cloudSync: true,
            offlineMode: false,
            prioritySupport: false,
            apiAccess: false,
            dailyAIRequests: 20,
            monthlyAIRequests: 600,
            // File upload limits
            dailyFileUploads: 5, // 5 file uploads per day
            maxFileDuration: 10, // 10 minutes max per file
            // Live recording limits
            dailyLiveRecordingMinutes: 10, // 10 minutes of live recording per day
            // Real-time streaming limits
            dailyRealTimeStreamingMinutes: 3, // 3 minutes of real-time streaming per day
            // Translation limits
            dailyTranslationMinutes: 0 // No translation access for basic users
        },
        limits: {
            dailyAdWatches: 0, // no ads
            pointsPerAd: 0,
            maxPointsBalance: 0
        },
        description: 'Ad-free experience with cloud backup and basic AI features'
    },
    gold: {
        name: 'Gold (Full-featured)',
        price: 999, // $9.99
        currency: 'USD',
        billingCycle: 'monthly',
        features: {
            dailyMinutes: -1, // unlimited
            monthlyMinutes: -1, // unlimited
            maxFileSize: 60, // 60 minutes max per file
            maxTranscripts: -1, // unlimited
            exportFormats: ['txt', 'docx', 'pdf', 'srt'],
            aiFeatures: [
                'basic_punctuation',
                'auto_capitalization',
                'unlimited_summary',
                'translation',
                'speaker_diarization',
                'keywords_extraction'
            ],
            cloudSync: true,
            offlineMode: true, // optional Whisper download
            prioritySupport: true,
            apiAccess: false,
            dailyAIRequests: 100,
            monthlyAIRequests: 3000,
            // File upload limits
            dailyFileUploads: 20, // 20 file uploads per day
            maxFileDuration: 60, // 60 minutes max per file
            // Live recording limits
            dailyLiveRecordingMinutes: 60, // 60 minutes of live recording per day
            // Real-time streaming limits
            dailyRealTimeStreamingMinutes: 10, // 10 minutes of real-time streaming per day
            // Translation limits
            dailyTranslationMinutes: 15 // 15 minutes of translation per day for Gold users
        },
        limits: {
            dailyAdWatches: 0, // no ads
            pointsPerAd: 0,
            maxPointsBalance: 0
        },
        description: 'Everything you need for professional transcription work'
    },
    premium: {
        name: 'Premium',
        price: 999, // $9.99
        currency: 'USD',
        billingCycle: 'monthly',
        features: {
            dailyMinutes: -1, // unlimited
            monthlyMinutes: -1, // unlimited
            maxFileSize: -1, // unlimited
            maxTranscripts: -1, // unlimited
            exportFormats: ['txt', 'docx', 'pdf', 'srt', 'json', 'xml'],
            aiFeatures: [
                'basic_punctuation',
                'auto_capitalization',
                'unlimited_summary',
                'translation',
                'speaker_diarization',
                'keywords_extraction',
                'sentiment_analysis',
                'batch_processing',
                'custom_vocabulary'
            ],
            cloudSync: true,
            offlineMode: true,
            prioritySupport: true,
            apiAccess: true,
            dailyAIRequests: -1, // unlimited
            monthlyAIRequests: -1, // unlimited
            // File upload limits - Premium gets 10 uploads/day, 5 min max per file
            dailyFileUploads: 10, // 10 file uploads per day
            maxFileDuration: 5, // 5 minutes max per file
            // Live recording limits - Premium gets 30 minutes per day
            dailyLiveRecordingMinutes: 30, // 30 minutes of live recording per day
            // Real-time streaming limits - Premium gets 10 minutes per day
            dailyRealTimeStreamingMinutes: 10, // 10 minutes of real-time streaming per day
            // Translation limits - Premium gets 30 minutes per day
            dailyTranslationMinutes: 30 // 30 minutes of translation per day for Premium users
        },
        limits: {
            dailyAdWatches: 0, // no ads
            pointsPerAd: 0,
            maxPointsBalance: 0
        },
        description: 'Premium features with 10 daily uploads and 5-minute file limit'
    }
};
exports.POINTS_ACTIONS = {
    short_summary: {
        id: 'short_summary',
        name: 'Short Summary',
        cost: 10,
        description: 'Generate a summary for transcripts up to 60 seconds',
        requirements: {
            maxDuration: 60
        }
    },
    punctuation_fix: {
        id: 'punctuation_fix',
        name: 'Punctuation Fix',
        cost: 5,
        description: 'Fix punctuation and grammar for one paragraph',
        requirements: {
            maxLength: 500
        }
    },
    short_translation: {
        id: 'short_translation',
        name: 'Short Translation',
        cost: 15,
        description: 'Translate short text up to 60 seconds',
        requirements: {
            maxDuration: 60
        }
    },
    grammar_check: {
        id: 'grammar_check',
        name: 'Grammar Check',
        cost: 8,
        description: 'Check and fix grammar for one paragraph',
        requirements: {
            maxLength: 300
        }
    }
};
exports.AD_REWARDS = {
    POINTS_PER_AD: 10,
    MAX_DAILY_ADS: 5,
    POINTS_EXPIRY_DAYS: 90
};
