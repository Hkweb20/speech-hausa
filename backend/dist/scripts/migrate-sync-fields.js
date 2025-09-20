"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateSyncFields = migrateSyncFields;
const mongoose_1 = __importDefault(require("mongoose"));
const Transcript_1 = require("../models/Transcript");
const logger_1 = require("../config/logger");
async function migrateSyncFields() {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hausa-speech';
        await mongoose_1.default.connect(mongoUri);
        logger_1.logger.info('Connected to MongoDB for migration');
        // Find all transcripts without sync fields
        const transcriptsWithoutSyncFields = await Transcript_1.Transcript.find({
            $or: [
                { version: { $exists: false } },
                { syncStatus: { $exists: false } },
                { lastModified: { $exists: false } }
            ]
        });
        logger_1.logger.info(`Found ${transcriptsWithoutSyncFields.length} transcripts to migrate`);
        if (transcriptsWithoutSyncFields.length === 0) {
            logger_1.logger.info('No transcripts need migration');
            return;
        }
        // Update transcripts with sync fields
        const updatePromises = transcriptsWithoutSyncFields.map(transcript => {
            const updateData = {};
            if (!transcript.version) {
                updateData.version = 1;
            }
            if (!transcript.syncStatus) {
                updateData.syncStatus = 'synced';
            }
            if (!transcript.lastModified) {
                updateData.lastModified = transcript.updatedAt || transcript.createdAt || new Date();
            }
            return Transcript_1.Transcript.findByIdAndUpdate(transcript._id, updateData);
        });
        await Promise.all(updatePromises);
        logger_1.logger.info(`Successfully migrated ${transcriptsWithoutSyncFields.length} transcripts`);
        // Create indexes for better performance
        await Transcript_1.Transcript.collection.createIndex({ userId: 1, syncStatus: 1 });
        await Transcript_1.Transcript.collection.createIndex({ userId: 1, lastModified: -1 });
        await Transcript_1.Transcript.collection.createIndex({ localId: 1 });
        logger_1.logger.info('Created indexes for sync fields');
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Migration failed');
        throw error;
    }
    finally {
        await mongoose_1.default.disconnect();
        logger_1.logger.info('Disconnected from MongoDB');
    }
}
// Run migration if called directly
if (require.main === module) {
    migrateSyncFields()
        .then(() => {
        logger_1.logger.info('Migration completed successfully');
        process.exit(0);
    })
        .catch((error) => {
        logger_1.logger.error({ error }, 'Migration failed');
        process.exit(1);
    });
}
