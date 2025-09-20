import mongoose from 'mongoose';
import { Transcript } from '../models/Transcript';
import { logger } from '../config/logger';

async function migrateSyncFields() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hausa-speech';
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB for migration');

    // Find all transcripts without sync fields
    const transcriptsWithoutSyncFields = await Transcript.find({
      $or: [
        { version: { $exists: false } },
        { syncStatus: { $exists: false } },
        { lastModified: { $exists: false } }
      ]
    });

    logger.info(`Found ${transcriptsWithoutSyncFields.length} transcripts to migrate`);

    if (transcriptsWithoutSyncFields.length === 0) {
      logger.info('No transcripts need migration');
      return;
    }

    // Update transcripts with sync fields
    const updatePromises = transcriptsWithoutSyncFields.map(transcript => {
      const updateData: any = {};
      
      if (!transcript.version) {
        updateData.version = 1;
      }
      
      if (!transcript.syncStatus) {
        updateData.syncStatus = 'synced';
      }
      
      if (!transcript.lastModified) {
        updateData.lastModified = transcript.updatedAt || transcript.createdAt || new Date();
      }

      return Transcript.findByIdAndUpdate(transcript._id, updateData);
    });

    await Promise.all(updatePromises);
    
    logger.info(`Successfully migrated ${transcriptsWithoutSyncFields.length} transcripts`);

    // Create indexes for better performance
    await Transcript.collection.createIndex({ userId: 1, syncStatus: 1 });
    await Transcript.collection.createIndex({ userId: 1, lastModified: -1 });
    await Transcript.collection.createIndex({ localId: 1 });
    
    logger.info('Created indexes for sync fields');

  } catch (error) {
    logger.error({ error }, 'Migration failed');
    throw error;
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateSyncFields()
    .then(() => {
      logger.info('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error({ error }, 'Migration failed');
      process.exit(1);
    });
}

export { migrateSyncFields };

