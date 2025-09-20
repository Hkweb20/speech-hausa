"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MobileOptimizationService = void 0;
const logger_1 = require("../config/logger");
class MobileOptimizationService {
    // Add compression middleware for mobile responses
    static addCompressionHeaders(res) {
        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes cache
        res.setHeader('Vary', 'Accept-Encoding');
    }
    // Optimize response for mobile
    static optimizeResponse(data, mobile = true) {
        if (!mobile)
            return data;
        // Remove unnecessary fields for mobile
        if (Array.isArray(data)) {
            return data.map(item => this.optimizeItem(item));
        }
        return this.optimizeItem(data);
    }
    static optimizeItem(item) {
        if (!item || typeof item !== 'object')
            return item;
        const optimized = { ...item };
        // Remove heavy fields for mobile
        delete optimized._id;
        delete optimized.__v;
        delete optimized.createdAt;
        // Keep only essential fields for list views
        if (optimized.transcripts && Array.isArray(optimized.transcripts)) {
            optimized.transcripts = optimized.transcripts.map((transcript) => ({
                id: transcript.id,
                title: transcript.title,
                timestamp: transcript.timestamp,
                duration: transcript.duration,
                language: transcript.language,
                source: transcript.source,
                syncStatus: transcript.syncStatus,
                lastModified: transcript.lastModified
            }));
        }
        return optimized;
    }
    // Add mobile-specific headers
    static addMobileHeaders(res) {
        res.setHeader('X-Mobile-Optimized', 'true');
        res.setHeader('X-Response-Size', res.get('Content-Length') || 'unknown');
    }
    // Rate limiting for mobile
    static getRateLimitConfig() {
        return {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // limit each IP to 100 requests per windowMs
            message: {
                error: 'Too many requests from this IP, please try again later.',
                retryAfter: 900 // 15 minutes in seconds
            },
            standardHeaders: true,
            legacyHeaders: false,
        };
    }
    // Mobile-specific error responses
    static createMobileErrorResponse(error, mobile = true) {
        if (!mobile)
            return error;
        const mobileError = {
            success: false,
            error: error.message || 'An error occurred',
            code: error.code || 'UNKNOWN_ERROR',
            timestamp: new Date().toISOString(),
            mobile: true
        };
        // Add retry information for network errors
        if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') {
            mobileError.retryAfter = 30; // 30 seconds
            mobileError.retryable = true;
        }
        return mobileError;
    }
    // Batch operations for mobile efficiency
    static createBatchResponse(operations, results) {
        return {
            success: true,
            data: {
                operations: operations.map((op, index) => ({
                    id: op.id,
                    success: results[index]?.success || false,
                    result: results[index]?.data || null,
                    error: results[index]?.error || null
                })),
                summary: {
                    total: operations.length,
                    successful: results.filter(r => r?.success).length,
                    failed: results.filter(r => !r?.success).length
                }
            }
        };
    }
    // Pagination optimization for mobile
    static optimizePagination(page, limit, total) {
        const maxLimit = 50; // Maximum items per page for mobile
        const optimizedLimit = Math.min(limit, maxLimit);
        return {
            page: Math.max(1, page),
            limit: optimizedLimit,
            total,
            totalPages: Math.ceil(total / optimizedLimit),
            hasNext: page * optimizedLimit < total,
            hasPrev: page > 1
        };
    }
    // Cache strategy for mobile
    static getCacheStrategy(endpoint) {
        const cacheStrategies = {
            '/api/mobile/config': { ttl: 3600, stale: 1800 }, // 1 hour, 30 min stale
            '/api/mobile/offline/transcripts': { ttl: 300, stale: 60 }, // 5 min, 1 min stale
            '/api/mobile/sync/status': { ttl: 60, stale: 30 }, // 1 min, 30 sec stale
            '/api/languages/available': { ttl: 1800, stale: 900 }, // 30 min, 15 min stale
            '/api/auth/profile': { ttl: 300, stale: 60 }, // 5 min, 1 min stale
        };
        return cacheStrategies[endpoint] || { ttl: 60, stale: 30 };
    }
    // Mobile-specific logging
    static logMobileRequest(req, res, responseTime) {
        const mobileInfo = {
            userAgent: req.get('User-Agent'),
            platform: req.get('X-Platform') || 'unknown',
            appVersion: req.get('X-App-Version') || 'unknown',
            deviceId: req.get('X-Device-Id') || 'unknown',
            responseTime,
            responseSize: res.get('Content-Length') || 0,
            endpoint: req.path,
            method: req.method
        };
        logger_1.logger.info(mobileInfo, 'Mobile API request');
    }
}
exports.MobileOptimizationService = MobileOptimizationService;
