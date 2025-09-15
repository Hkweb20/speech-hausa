"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const UserSchema = new mongoose_1.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    subscriptionTier: {
        type: String,
        enum: ['free', 'basic', 'gold', 'premium'],
        default: 'free'
    },
    subscriptionStatus: {
        type: String,
        enum: ['active', 'cancelled', 'expired', 'trial'],
        default: 'active'
    },
    subscriptionExpiresAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date, default: Date.now },
    usageStats: {
        dailyMinutes: { type: Number, default: 0 },
        monthlyMinutes: { type: Number, default: 0 },
        totalMinutes: { type: Number, default: 0 },
        transcriptsCount: { type: Number, default: 0 },
        lastResetDate: { type: Date, default: Date.now },
        dailyAIRequests: { type: Number, default: 0 },
        monthlyAIRequests: { type: Number, default: 0 },
        totalAIRequests: { type: Number, default: 0 },
        // File upload tracking
        dailyFileUploads: { type: Number, default: 0 },
        monthlyFileUploads: { type: Number, default: 0 },
        totalFileUploads: { type: Number, default: 0 },
        // Live recording tracking
        dailyLiveRecordingMinutes: { type: Number, default: 0 },
        monthlyLiveRecordingMinutes: { type: Number, default: 0 },
        totalLiveRecordingMinutes: { type: Number, default: 0 }
    },
    pointsBalance: { type: Number, default: 0 },
    pointsHistory: [{
            type: { type: String, enum: ['earned', 'spent'], required: true },
            amount: { type: Number, required: true },
            source: {
                type: String,
                enum: ['ad_watch', 'purchase', 'summary', 'punctuation', 'translation', 'expiry'],
                required: true
            },
            description: { type: String, required: true },
            timestamp: { type: Date, default: Date.now },
            expiresAt: { type: Date }
        }],
    preferences: {
        language: { type: String, enum: ['ha-NG', 'en-US', 'fr-FR', 'ar'], default: 'ha-NG' },
        theme: { type: String, enum: ['light', 'dark'], default: 'light' },
        autoPunctuation: { type: Boolean, default: true },
        cloudSync: { type: Boolean, default: false }
    },
    adWatchHistory: [{
            adId: { type: String, required: true },
            pointsEarned: { type: Number, required: true },
            timestamp: { type: Date, default: Date.now },
            verified: { type: Boolean, default: false }
        }]
});
exports.User = mongoose_1.default.model('User', UserSchema);
