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
exports.Subscription = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const SubscriptionSchema = new mongoose_1.Schema({
    userId: { type: String, required: true, index: true },
    tier: {
        type: String,
        enum: ['free', 'basic', 'gold', 'premium'],
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'cancelled', 'expired', 'trial', 'pending'],
        default: 'active'
    },
    price: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    billingCycle: {
        type: String,
        enum: ['monthly', 'yearly', 'lifetime'],
        required: true
    },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    trialEndDate: { type: Date },
    autoRenew: { type: Boolean, default: true },
    paymentMethod: {
        type: { type: String, enum: ['card', 'paypal', 'apple', 'google'] },
        last4: { type: String },
        brand: { type: String }
    },
    features: {
        dailyMinutes: { type: Number, required: true },
        monthlyMinutes: { type: Number, required: true },
        maxFileSize: { type: Number, required: true },
        maxTranscripts: { type: Number, required: true },
        exportFormats: [{ type: String }],
        aiFeatures: [{ type: String }],
        cloudSync: { type: Boolean, required: true },
        offlineMode: { type: Boolean, required: true },
        prioritySupport: { type: Boolean, required: true },
        apiAccess: { type: Boolean, required: true }
    },
    limits: {
        dailyAdWatches: { type: Number, required: true },
        pointsPerAd: { type: Number, required: true },
        maxPointsBalance: { type: Number, required: true }
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
SubscriptionSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});
exports.Subscription = mongoose_1.default.model('Subscription', SubscriptionSchema);
