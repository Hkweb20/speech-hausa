"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mongoTranscriptsRepo = exports.MongoDBTranscriptsRepositoryImpl = void 0;
const Transcript_1 = require("../models/Transcript");
class MongoDBTranscriptsRepositoryImpl {
    async listByUser(userId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const [transcripts, total] = await Promise.all([
            Transcript_1.Transcript.find({ userId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Transcript_1.Transcript.countDocuments({ userId })
        ]);
        const totalPages = Math.ceil(total / limit);
        return {
            transcripts: transcripts.map(this.mapToDomain),
            total,
            page,
            totalPages
        };
    }
    async searchByUser(userId, query, filters = {}, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        // Build search query
        const searchQuery = { userId };
        // Text search
        if (query.trim()) {
            searchQuery.$or = [
                { content: { $regex: query, $options: 'i' } },
                { title: { $regex: query, $options: 'i' } },
                { summary: { $regex: query, $options: 'i' } },
                { keywords: { $in: [new RegExp(query, 'i')] } }
            ];
        }
        // Apply filters
        if (filters.language) {
            searchQuery.language = filters.language;
        }
        if (filters.source) {
            searchQuery.source = filters.source;
        }
        if (filters.dateFrom || filters.dateTo) {
            searchQuery.createdAt = {};
            if (filters.dateFrom) {
                searchQuery.createdAt.$gte = filters.dateFrom;
            }
            if (filters.dateTo) {
                searchQuery.createdAt.$lte = filters.dateTo;
            }
        }
        if (filters.hasTranslation !== undefined) {
            if (filters.hasTranslation) {
                searchQuery['translation.translatedText'] = { $exists: true, $ne: '' };
            }
            else {
                searchQuery.$or = [
                    { 'translation.translatedText': { $exists: false } },
                    { 'translation.translatedText': '' }
                ];
            }
        }
        if (filters.tags && filters.tags.length > 0) {
            searchQuery.tags = { $in: filters.tags };
        }
        const [transcripts, total] = await Promise.all([
            Transcript_1.Transcript.find(searchQuery)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Transcript_1.Transcript.countDocuments(searchQuery)
        ]);
        const totalPages = Math.ceil(total / limit);
        return {
            transcripts: transcripts.map(this.mapToDomain),
            total,
            page,
            totalPages
        };
    }
    async get(id) {
        try {
            const transcript = await Transcript_1.Transcript.findById(id).lean();
            return transcript ? this.mapToDomain(transcript) : undefined;
        }
        catch (error) {
            console.error('Error getting transcript:', error);
            return undefined;
        }
    }
    async create(t) {
        try {
            const transcriptData = {
                userId: t.userId,
                title: t.title,
                content: t.content,
                timestamp: new Date(t.timestamp),
                duration: t.duration,
                language: t.language || 'ha-NG',
                source: t.source || 'file_upload',
                fileSize: t.fileSize,
                fileName: t.fileName,
                isPremium: t.isPremium || false,
                speakers: t.speakers,
                summary: t.summary,
                keywords: t.keywords,
                translation: t.translation ? {
                    targetLanguage: t.translation.targetLanguage,
                    translatedText: t.translation.translatedText,
                    timestamp: new Date(t.translation.timestamp)
                } : undefined,
                pointsSpent: t.pointsSpent || 0,
                tags: t.tags || [],
                isCloudSynced: t.cloudSync || false
            };
            const transcript = new Transcript_1.Transcript(transcriptData);
            const saved = await transcript.save();
            return this.mapToDomain(saved.toObject());
        }
        catch (error) {
            console.error('Error creating transcript:', error);
            throw error;
        }
    }
    async update(id, partial) {
        try {
            const updateData = {};
            if (partial.title)
                updateData.title = partial.title;
            if (partial.content)
                updateData.content = partial.content;
            if (partial.tags)
                updateData.tags = partial.tags;
            if (partial.summary)
                updateData.summary = partial.summary;
            if (partial.keywords)
                updateData.keywords = partial.keywords;
            if (partial.translation) {
                updateData.translation = {
                    targetLanguage: partial.translation.targetLanguage,
                    translatedText: partial.translation.translatedText,
                    timestamp: new Date(partial.translation.timestamp)
                };
            }
            if (partial.cloudSync !== undefined)
                updateData.isCloudSynced = partial.cloudSync;
            const transcript = await Transcript_1.Transcript.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).lean();
            return transcript ? this.mapToDomain(transcript) : undefined;
        }
        catch (error) {
            console.error('Error updating transcript:', error);
            return undefined;
        }
    }
    async remove(id) {
        try {
            const result = await Transcript_1.Transcript.findByIdAndDelete(id);
            return !!result;
        }
        catch (error) {
            console.error('Error removing transcript:', error);
            return false;
        }
    }
    async getRecent(userId, limit = 10) {
        try {
            const transcripts = await Transcript_1.Transcript.find({ userId })
                .sort({ createdAt: -1 })
                .limit(limit)
                .lean();
            return transcripts.map(this.mapToDomain);
        }
        catch (error) {
            console.error('Error getting recent transcripts:', error);
            return [];
        }
    }
    async exportUserTranscripts(userId, format) {
        try {
            const transcripts = await Transcript_1.Transcript.find({ userId })
                .sort({ createdAt: -1 })
                .lean();
            switch (format) {
                case 'json':
                    return JSON.stringify(transcripts.map(this.mapToDomain), null, 2);
                case 'txt':
                    return transcripts.map(t => {
                        const transcript = this.mapToDomain(t);
                        return `Title: ${transcript.title}\nDate: ${transcript.timestamp}\nDuration: ${transcript.duration}s\nLanguage: ${transcript.language}\nSource: ${transcript.source}\n\nContent:\n${transcript.content}\n${transcript.translation ? `\nTranslation (${transcript.translation.targetLanguage}):\n${transcript.translation.translatedText}` : ''}\n\n---\n`;
                    }).join('\n');
                case 'csv':
                    const headers = 'Title,Date,Duration,Language,Source,Content,Translation';
                    const rows = transcripts.map(t => {
                        const transcript = this.mapToDomain(t);
                        const content = transcript.content.replace(/"/g, '""');
                        const translation = transcript.translation ? transcript.translation.translatedText.replace(/"/g, '""') : '';
                        return `"${transcript.title}","${transcript.timestamp}","${transcript.duration}","${transcript.language}","${transcript.source}","${content}","${translation}"`;
                    });
                    return [headers, ...rows].join('\n');
                default:
                    throw new Error('Unsupported export format');
            }
        }
        catch (error) {
            console.error('Error exporting transcripts:', error);
            throw error;
        }
    }
    mapToDomain(mongoTranscript) {
        return {
            id: mongoTranscript._id.toString(),
            userId: mongoTranscript.userId,
            title: mongoTranscript.title,
            content: mongoTranscript.content,
            timestamp: mongoTranscript.createdAt.toISOString(),
            duration: mongoTranscript.duration,
            language: mongoTranscript.language,
            source: mongoTranscript.source,
            fileSize: mongoTranscript.fileSize,
            fileName: mongoTranscript.fileName,
            isPremium: mongoTranscript.isPremium,
            speakers: mongoTranscript.speakers,
            summary: mongoTranscript.summary,
            keywords: mongoTranscript.keywords,
            translation: mongoTranscript.translation ? {
                targetLanguage: mongoTranscript.translation.targetLanguage,
                translatedText: mongoTranscript.translation.translatedText,
                timestamp: mongoTranscript.translation.timestamp.toISOString()
            } : undefined,
            pointsSpent: mongoTranscript.pointsSpent,
            tags: mongoTranscript.tags || [],
            cloudSync: mongoTranscript.isCloudSynced,
            isLocal: !mongoTranscript.isCloudSynced
        };
    }
}
exports.MongoDBTranscriptsRepositoryImpl = MongoDBTranscriptsRepositoryImpl;
exports.mongoTranscriptsRepo = new MongoDBTranscriptsRepositoryImpl();
