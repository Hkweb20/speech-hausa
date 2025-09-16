import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Admin } from '../models/Admin';
import { logger } from '../config/logger';

async function createAdmin() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hausa-stt';
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'admin@hausa-stt.com' });
    if (existingAdmin) {
      logger.info('Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const admin = new Admin({
      email: 'admin@hausa-stt.com',
      password: hashedPassword,
      name: 'System Administrator',
      role: 'super_admin',
      permissions: [
        'manage_users',
        'manage_limits',
        'view_analytics',
        'manage_subscriptions',
        'system_settings',
        'audit_logs'
      ],
      isActive: true
    });

    await admin.save();
    logger.info('Admin user created successfully');
    logger.info('Email: admin@hausa-stt.com');
    logger.info('Password: admin123');
    logger.info('Please change the password after first login!');

  } catch (error) {
    logger.error({ error }, 'Error creating admin user');
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Run the script
createAdmin();
