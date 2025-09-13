const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/hausa-speech', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  subscriptionTier: { type: String, default: 'free' },
  subscriptionStatus: { type: String, default: 'active' },
  pointsBalance: { type: Number, default: 0 },
  usageStats: {
    dailyMinutes: { type: Number, default: 0 },
    monthlyMinutes: { type: Number, default: 0 },
    totalMinutes: { type: Number, default: 0 },
    transcriptsCount: { type: Number, default: 0 },
    lastResetDate: { type: Date, default: Date.now }
  },
  preferences: {
    language: { type: String, default: 'ha-NG' },
    theme: { type: String, default: 'light' },
    autoPunctuation: { type: Boolean, default: true },
    cloudSync: { type: Boolean, default: false }
  },
  pointsHistory: { type: Array, default: [] },
  adWatchHistory: { type: Array, default: [] }
});

const User = mongoose.model('User', userSchema);

async function testRegistration() {
  try {
    console.log('Testing database connection...');
    
    // Test creating a user
    const testUser = new User({
      email: 'test-db@example.com',
      password: 'hashed-password',
      name: 'Test DB User',
      subscriptionTier: 'free',
      subscriptionStatus: 'active',
      pointsBalance: 0,
      usageStats: {
        dailyMinutes: 0,
        monthlyMinutes: 0,
        totalMinutes: 0,
        transcriptsCount: 0,
        lastResetDate: new Date()
      },
      preferences: {
        language: 'ha-NG',
        theme: 'light',
        autoPunctuation: true,
        cloudSync: false
      },
      pointsHistory: [],
      adWatchHistory: []
    });
    
    await testUser.save();
    console.log('✅ User created successfully:', testUser._id);
    
    // Test finding the user
    const foundUser = await User.findOne({ email: 'test-db@example.com' });
    console.log('✅ User found:', foundUser ? 'Yes' : 'No');
    
    // Clean up
    await User.deleteOne({ email: 'test-db@example.com' });
    console.log('✅ Test user deleted');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

testRegistration();

