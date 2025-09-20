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
exports.Transcript = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const TranscriptSchema = new mongoose_1.Schema({
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
    // Mobile sync fields
    localId: { type: String, index: true },
    version: { type: Number, default: 1 },
    syncStatus: {
        type: String,
        enum: ['synced', 'pending', 'conflict'],
        default: 'synced',
        index: true
    },
    lastModified: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
TranscriptSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});
exports.Transcript = mongoose_1.default.model('Transcript', TranscriptSchema);
