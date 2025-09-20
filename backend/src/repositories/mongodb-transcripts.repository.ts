import { Transcript } from '../types/domain';
import { Transcript as TranscriptModel, ITranscript } from '../models/Transcript';
import { Types } from 'mongoose';

export interface MongoDBTranscriptsRepository {
  listByUser(userId: string, page?: number, limit?: number): Promise<{ transcripts: Transcript[]; total: number; page: number; totalPages: number }>;
  searchByUser(userId: string, query: string, filters?: SearchFilters, page?: number, limit?: number): Promise<{ transcripts: Transcript[]; total: number; page: number; totalPages: number }>;
  get(id: string): Promise<Transcript | undefined>;
  create(t: Transcript): Promise<Transcript>;
  update(id: string, partial: Partial<Transcript>): Promise<Transcript | undefined>;
  remove(id: string): Promise<boolean>;
  getRecent(userId: string, limit?: number): Promise<Transcript[]>;
  exportUserTranscripts(userId: string, format: 'json' | 'txt' | 'csv'): Promise<string>;
}

export interface SearchFilters {
  language?: string;
  source?: 'live' | 'file_upload';
  dateFrom?: Date;
  dateTo?: Date;
  hasTranslation?: boolean;
  tags?: string[];
}

export class MongoDBTranscriptsRepositoryImpl implements MongoDBTranscriptsRepository {
  
  async listByUser(userId: string, page: number = 1, limit: number = 10): Promise<{ transcripts: Transcript[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    
    const [transcripts, total] = await Promise.all([
      TranscriptModel.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      TranscriptModel.countDocuments({ userId })
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      transcripts: transcripts.map(this.mapToDomain),
      total,
      page,
      totalPages
    };
  }

  async searchByUser(userId: string, query: string, filters: SearchFilters = {}, page: number = 1, limit: number = 10): Promise<{ transcripts: Transcript[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    
    // Build search query
    const searchQuery: any = { userId };
    
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
      } else {
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
      TranscriptModel.find(searchQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      TranscriptModel.countDocuments(searchQuery)
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      transcripts: transcripts.map(this.mapToDomain),
      total,
      page,
      totalPages
    };
  }

  async get(id: string): Promise<Transcript | undefined> {
    try {
      const transcript = await TranscriptModel.findById(id).lean();
      return transcript ? this.mapToDomain(transcript) : undefined;
    } catch (error) {
      console.error('Error getting transcript:', error);
      return undefined;
    }
  }

  async create(t: Transcript): Promise<Transcript> {
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

      const transcript = new TranscriptModel(transcriptData);
      const saved = await transcript.save();
      return this.mapToDomain(saved.toObject());
    } catch (error) {
      console.error('Error creating transcript:', error);
      throw error;
    }
  }

  async update(id: string, partial: Partial<Transcript>): Promise<Transcript | undefined> {
    try {
      const updateData: any = {};
      
      if (partial.title) updateData.title = partial.title;
      if (partial.content) updateData.content = partial.content;
      if (partial.tags) updateData.tags = partial.tags;
      if (partial.summary) updateData.summary = partial.summary;
      if (partial.keywords) updateData.keywords = partial.keywords;
      if (partial.translation) {
        updateData.translation = {
          targetLanguage: partial.translation.targetLanguage,
          translatedText: partial.translation.translatedText,
          timestamp: new Date(partial.translation.timestamp)
        };
      }
      if (partial.cloudSync !== undefined) updateData.isCloudSynced = partial.cloudSync;

      const transcript = await TranscriptModel.findByIdAndUpdate(
        id, 
        updateData, 
        { new: true, runValidators: true }
      ).lean();

      return transcript ? this.mapToDomain(transcript) : undefined;
    } catch (error) {
      console.error('Error updating transcript:', error);
      return undefined;
    }
  }

  async remove(id: string): Promise<boolean> {
    try {
      const result = await TranscriptModel.findByIdAndDelete(id);
      return !!result;
    } catch (error) {
      console.error('Error removing transcript:', error);
      return false;
    }
  }

  async getRecent(userId: string, limit: number = 10): Promise<Transcript[]> {
    try {
      const transcripts = await TranscriptModel.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
      
      return transcripts.map(this.mapToDomain);
    } catch (error) {
      console.error('Error getting recent transcripts:', error);
      return [];
    }
  }

  async exportUserTranscripts(userId: string, format: 'json' | 'txt' | 'csv'): Promise<string> {
    try {
      const transcripts = await TranscriptModel.find({ userId })
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
    } catch (error) {
      console.error('Error exporting transcripts:', error);
      throw error;
    }
  }

  private mapToDomain(mongoTranscript: any): Transcript {
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

  // Mobile sync methods
  async getOfflineTranscripts(userId: string, since: Date, limit: number): Promise<Transcript[]> {
    try {
      const transcripts = await TranscriptModel.find({
        userId,
        updatedAt: { $gt: since }
      })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();

      return transcripts.map(this.mapToDomain);
    } catch (error) {
      console.error('Error getting offline transcripts:', error);
      throw error;
    }
  }

  async bulkSyncTranscripts(userId: string, transcripts: any[]): Promise<{
    synced: number;
    conflicts: any[];
    errors: any[];
  }> {
    const results = {
      synced: 0,
      conflicts: [],
      errors: []
    };

    for (const transcript of transcripts) {
      try {
        // Check if transcript exists
        const existing = await TranscriptModel.findOne({
          userId,
          $or: [
            { id: transcript.id },
            { localId: transcript.localId }
          ]
        });

        if (existing) {
          // Check for conflicts
          if (existing.version && transcript.version && existing.version !== transcript.version) {
            results.conflicts.push({
              localId: transcript.localId,
              serverId: existing.id,
              conflict: 'version_mismatch',
              serverVersion: existing.version,
              clientVersion: transcript.version
            });
            continue;
          }

          // Update existing transcript
          const updateData = {
            ...transcript,
            userId,
            updatedAt: new Date(),
            version: (existing.version || 0) + 1,
            syncStatus: 'synced'
          };

          await TranscriptModel.findByIdAndUpdate(existing._id, updateData);
        } else {
          // Create new transcript
          const transcriptData = {
            ...transcript,
            userId,
            createdAt: new Date(),
            updatedAt: new Date(),
            version: 1,
            syncStatus: 'synced'
          };

          await TranscriptModel.create(transcriptData);
        }

        results.synced++;
      } catch (error) {
        console.error('Error syncing transcript:', error);
        results.errors.push({
          localId: transcript.localId,
          error: error.message
        });
      }
    }

    return results;
  }

  async getSyncStatus(userId: string): Promise<{
    lastSync: Date;
    totalTranscripts: number;
    pendingSync: number;
    conflicts: number;
    lastModified: Date;
  }> {
    try {
      const [totalTranscripts, pendingSync, conflicts, lastModified] = await Promise.all([
        TranscriptModel.countDocuments({ userId }),
        TranscriptModel.countDocuments({ userId, syncStatus: 'pending' }),
        TranscriptModel.countDocuments({ userId, syncStatus: 'conflict' }),
        TranscriptModel.findOne({ userId }).sort({ updatedAt: -1 }).select('updatedAt')
      ]);

      return {
        lastSync: new Date(),
        totalTranscripts,
        pendingSync,
        conflicts,
        lastModified: lastModified?.updatedAt || new Date()
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      throw error;
    }
  }

  async resolveConflicts(userId: string, conflicts: any[]): Promise<{
    resolved: number;
    errors: any[];
  }> {
    const results = {
      resolved: 0,
      errors: []
    };

    for (const conflict of conflicts) {
      try {
        const { localId, serverId, resolution, data } = conflict;

        if (resolution === 'use_client') {
          // Use client data
          await TranscriptModel.findByIdAndUpdate(serverId, {
            ...data,
            userId,
            updatedAt: new Date(),
            version: (data.version || 0) + 1,
            syncStatus: 'synced'
          });
        } else if (resolution === 'use_server') {
          // Use server data, update client
          const serverTranscript = await TranscriptModel.findById(serverId);
          // This would typically be handled by the client
        } else if (resolution === 'merge') {
          // Merge data (custom logic needed)
          const serverTranscript = await TranscriptModel.findById(serverId);
          const mergedData = {
            ...serverTranscript,
            ...data,
            content: `${serverTranscript.content}\n\n--- Merged ---\n\n${data.content}`,
            updatedAt: new Date(),
            version: (serverTranscript.version || 0) + 1,
            syncStatus: 'synced'
          };
          await TranscriptModel.findByIdAndUpdate(serverId, mergedData);
        }

        results.resolved++;
      } catch (error) {
        console.error('Error resolving conflict:', error);
        results.errors.push({
          localId: conflict.localId,
          error: error.message
        });
      }
    }

    return results;
  }
}

export const mongoTranscriptsRepo = new MongoDBTranscriptsRepositoryImpl();


