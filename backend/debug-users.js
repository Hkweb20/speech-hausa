#!/usr/bin/env node

/**
 * Debug script to check existing users and their subscription tiers
 * Run with: node debug-users.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import the User model
const { User } = require('./dist/models/User');
const { SUBSCRIPTION_TIERS } = require('./dist/config/subscription');

async function debugUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hausa-speech');
    console.log('Connected to MongoDB');

    // Get all users
    const users = await User.find({}).select('email subscriptionTier usageStats createdAt lastLogin');
    
    console.log(`\n📊 Found ${users.length} users in database\n`);
    
    // Group users by subscription tier
    const tierCounts = {};
    const usersByTier = {};
    
    users.forEach(user => {
      const tier = user.subscriptionTier || 'unknown';
      tierCounts[tier] = (tierCounts[tier] || 0) + 1;
      
      if (!usersByTier[tier]) {
        usersByTier[tier] = [];
      }
      usersByTier[tier].push(user);
    });
    
    // Display tier counts
    console.log('📈 Users by subscription tier:');
    Object.entries(tierCounts).forEach(([tier, count]) => {
      console.log(`  ${tier}: ${count} users`);
    });
    
    // Display subscription tier configurations
    console.log('\n⚙️  Subscription tier configurations:');
    Object.entries(SUBSCRIPTION_TIERS).forEach(([tierName, tier]) => {
      console.log(`\n  ${tierName.toUpperCase()}:`);
      console.log(`    Name: ${tier.name}`);
      console.log(`    Daily File Uploads: ${tier.features.dailyFileUploads === -1 ? 'Unlimited' : tier.features.dailyFileUploads}`);
      console.log(`    Max File Duration: ${tier.features.maxFileDuration === -1 ? 'Unlimited' : tier.features.maxFileDuration + ' minutes'}`);
      console.log(`    Daily Minutes: ${tier.features.dailyMinutes === -1 ? 'Unlimited' : tier.features.dailyMinutes}`);
    });
    
    // Check for users with potential issues
    console.log('\n🔍 Checking for potential issues:');
    
    // Check users with high daily uploads
    const usersWithHighUploads = users.filter(user => 
      user.usageStats.dailyFileUploads > 5
    );
    
    if (usersWithHighUploads.length > 0) {
      console.log(`\n⚠️  Users with high daily uploads (>5):`);
      usersWithHighUploads.forEach(user => {
        console.log(`  ${user.email} (${user.subscriptionTier}): ${user.usageStats.dailyFileUploads} uploads today`);
      });
    }
    
    // Check users with old lastResetDate
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const usersWithOldReset = users.filter(user => {
      const lastReset = new Date(user.usageStats.lastResetDate);
      return lastReset < today && user.usageStats.dailyFileUploads > 0;
    });
    
    if (usersWithOldReset.length > 0) {
      console.log(`\n🔄 Users with old reset date (should reset daily uploads):`);
      usersWithOldReset.forEach(user => {
        const lastReset = new Date(user.usageStats.lastResetDate);
        console.log(`  ${user.email} (${user.subscriptionTier}): Last reset ${lastReset.toISOString()}, ${user.usageStats.dailyFileUploads} uploads today`);
      });
    }
    
    // Check premium users specifically
    const premiumUsers = users.filter(user => user.subscriptionTier === 'premium');
    if (premiumUsers.length > 0) {
      console.log(`\n💎 Premium users (${premiumUsers.length}):`);
      premiumUsers.forEach(user => {
        const tier = SUBSCRIPTION_TIERS[user.subscriptionTier];
        console.log(`  ${user.email}:`);
        console.log(`    Daily uploads: ${user.usageStats.dailyFileUploads}/${tier.features.dailyFileUploads}`);
        console.log(`    Max file duration: ${tier.features.maxFileDuration} minutes`);
        console.log(`    Last reset: ${user.usageStats.lastResetDate}`);
        console.log(`    Last login: ${user.lastLogin}`);
      });
    }
    
    // Check for users with invalid subscription tiers
    const validTiers = Object.keys(SUBSCRIPTION_TIERS);
    const usersWithInvalidTiers = users.filter(user => 
      !validTiers.includes(user.subscriptionTier)
    );
    
    if (usersWithInvalidTiers.length > 0) {
      console.log(`\n❌ Users with invalid subscription tiers:`);
      usersWithInvalidTiers.forEach(user => {
        console.log(`  ${user.email}: "${user.subscriptionTier}" (should be one of: ${validTiers.join(', ')})`);
      });
    }
    
    console.log('\n✅ Debug complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the debug script
debugUsers();
