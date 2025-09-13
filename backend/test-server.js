const express = require('express');
const app = express();

app.use(express.json());

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Test server is working', timestamp: new Date().toISOString() });
});

// Simple registration route
app.post('/api/auth/register', async (req, res) => {
  console.log('Registration request received:', req.body);
  
  const { email, password, name } = req.body;
  
  if (!email || !password || !name) {
    return res.status(400).json({
      error: 'Email, password, and name are required',
      code: 'MISSING_REQUIRED_FIELDS'
    });
  }
  
  // Simulate successful registration
  res.status(201).json({
    success: true,
    user: {
      id: 'test-id',
      email: email,
      name: name,
      subscriptionTier: 'free',
      subscriptionStatus: 'active',
      pointsBalance: 0,
      isPremium: false,
      usageStats: {
        dailyMinutes: 0,
        monthlyMinutes: 0,
        totalMinutes: 0,
        transcriptsCount: 0
      }
    },
    token: 'test-token',
    message: 'User registered successfully'
  });
});

const PORT = 4001;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});

