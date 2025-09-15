#!/usr/bin/env node

/**
 * Reset daily uploads for users who have stale data
 * Run with: node reset-daily-uploads.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import the User model
const { User } = require('./dist/models/User');

async function resetDailyUploads() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hausa-speech');
    console.log('Connected to MongoDB');

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    console.log(`\n🔄 Resetting daily uploads for users with stale data...`);
    console.log(`Today's date: ${today.toISOString()}`);
    
    // Find users with old lastResetDate
    const usersToReset = await User.find({
      'usageStats.lastResetDate': { $lt: today },
      'usageStats.dailyFileUploads': { $gt: 0 }
    });
    
    console.log(`Found ${usersToReset.length} users with stale daily upload data`);
    
    if (usersToReset.length === 0) {
      console.log('✅ No users need reset');
      return;
    }
    
    // Show users that will be reset
    console.log('\n📋 Users to be reset:');
    usersToReset.forEach(user => {
      const lastReset = new Date(user.usageStats.lastResetDate);
      console.log(`  ${user.email} (${user.subscriptionTier}): ${user.usageStats.dailyFileUploads} uploads, last reset ${lastReset.toISOString()}`);
    });
    
    // Reset daily uploads for these users
    const result = await User.updateMany(
      {
        'usageStats.lastResetDate': { $lt: today },
        'usageStats.dailyFileUploads': { $gt: 0 }
      },
      {
        $set: {
          'usageStats.dailyFileUploads': 0,
          'usageStats.lastResetDate': today
        }
      }
    );
    
    console.log(`\n✅ Reset daily uploads for ${result.modifiedCount} users`);
    
    // Verify the reset
    const resetUsers = await User.find({
      'usageStats.lastResetDate': today,
      'usageStats.dailyFileUploads': 0
    });
    
    console.log(`\n🔍 Verification: ${resetUsers.length} users now have 0 daily uploads`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the reset script
resetDailyUploads();
