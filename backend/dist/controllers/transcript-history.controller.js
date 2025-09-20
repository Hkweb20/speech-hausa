"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTranscriptStats = exports.exportTranscripts = exports.deleteTranscript = exports.updateTranscript = exports.getTranscriptById = exports.searchTranscripts = exports.getRecentTranscripts = void 0;
const mongodb_transcripts_repository_1 = require("../repositories/mongodb-transcripts.repository");
const asyncHandler_1 = require("../utils/asyncHandler");
// Get recent transcript history for a user
exports.getRecentTranscripts = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    try {
        const result = await mongodb_transcripts_repository_1.mongoTranscriptsRepo.listByUser(userId, page, limit);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Error getting recent transcripts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve transcript history'
        });
    }
});
// Search transcripts with filters
exports.searchTranscripts = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    const { query, language, source, dateFrom, dateTo, hasTranslation, tags } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const filters = {};
    if (language)
        filters.language = language;
    if (source)
        filters.source = source;
    if (dateFrom)
        filters.dateFrom = new Date(dateFrom);
    if (dateTo)
        filters.dateTo = new Date(dateTo);
    if (hasTranslation !== undefined)
        filters.hasTranslation = hasTranslation === 'true';
    if (tags)
        filters.tags = tags.split(',');
    try {
        const result = await mongodb_transcripts_repository_1.mongoTranscriptsRepo.searchByUser(userId, query || '', filters, page, limit);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Error searching transcripts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search transcripts'
        });
    }
});
// Get a specific transcript by ID
exports.getTranscriptById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    try {
        const transcript = await mongodb_transcripts_repository_1.mongoTranscriptsRepo.get(id);
        if (!transcript) {
            return res.status(404).json({
                success: false,
                error: 'Transcript not found'
            });
        }
        // Verify the transcript belongs to the user
        if (transcript.userId !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }
        res.json({
            success: true,
            data: transcript
        });
    }
    catch (error) {
        console.error('Error getting transcript:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve transcript'
        });
    }
});
// Update a transcript (title, tags, etc.)
exports.updateTranscript = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    const { id } = req.params;
    const updates = req.body;
    if (!userId) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    try {
        // First verify the transcript belongs to the user
        const existingTranscript = await mongodb_transcripts_repository_1.mongoTranscriptsRepo.get(id);
        if (!existingTranscript) {
            return res.status(404).json({
                success: false,
                error: 'Transcript not found'
            });
        }
        if (existingTranscript.userId !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }
        const updatedTranscript = await mongodb_transcripts_repository_1.mongoTranscriptsRepo.update(id, updates);
        if (!updatedTranscript) {
            return res.status(500).json({
                success: false,
                error: 'Failed to update transcript'
            });
        }
        res.json({
            success: true,
            data: updatedTranscript
        });
    }
    catch (error) {
        console.error('Error updating transcript:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update transcript'
        });
    }
});
// Delete a transcript
exports.deleteTranscript = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    try {
        // First verify the transcript belongs to the user
        const existingTranscript = await mongodb_transcripts_repository_1.mongoTranscriptsRepo.get(id);
        if (!existingTranscript) {
            return res.status(404).json({
                success: false,
                error: 'Transcript not found'
            });
        }
        if (existingTranscript.userId !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }
        const deleted = await mongodb_transcripts_repository_1.mongoTranscriptsRepo.remove(id);
        if (!deleted) {
            return res.status(500).json({
                success: false,
                error: 'Failed to delete transcript'
            });
        }
        res.json({
            success: true,
            message: 'Transcript deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting transcript:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete transcript'
        });
    }
});
// Export transcripts in various formats
exports.exportTranscripts = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    const { format } = req.params;
    if (!userId) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    if (!['json', 'txt', 'csv'].includes(format)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid export format. Supported formats: json, txt, csv'
        });
    }
    try {
        const exportData = await mongodb_transcripts_repository_1.mongoTranscriptsRepo.exportUserTranscripts(userId, format);
        // Set appropriate headers based on format
        const contentType = {
            json: 'application/json',
            txt: 'text/plain',
            csv: 'text/csv'
        };
        const filename = `transcripts_${new Date().toISOString().split('T')[0]}.${format}`;
        res.setHeader('Content-Type', contentType[format]);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(exportData);
    }
    catch (error) {
        console.error('Error exporting transcripts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to export transcripts'
        });
    }
});
// Get transcript statistics for dashboard
exports.getTranscriptStats = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    try {
        // Get recent transcripts for stats
        const recentTranscripts = await mongodb_transcripts_repository_1.mongoTranscriptsRepo.getRecent(userId, 50);
        const stats = {
            totalTranscripts: recentTranscripts.length,
            totalDuration: recentTranscripts.reduce((sum, t) => sum + t.duration, 0),
            averageDuration: recentTranscripts.length > 0 ? recentTranscripts.reduce((sum, t) => sum + t.duration, 0) / recentTranscripts.length : 0,
            languageDistribution: recentTranscripts.reduce((acc, t) => {
                acc[t.language] = (acc[t.language] || 0) + 1;
                return acc;
            }, {}),
            sourceDistribution: recentTranscripts.reduce((acc, t) => {
                acc[t.source] = (acc[t.source] || 0) + 1;
                return acc;
            }, {}),
            recentActivity: recentTranscripts.slice(0, 10).map(t => ({
                id: t.id,
                title: t.title,
                timestamp: t.timestamp,
                duration: t.duration,
                language: t.language,
                source: t.source
            }))
        };
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        console.error('Error getting transcript stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve transcript statistics'
        });
    }
});
