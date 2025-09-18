"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const Admin_1 = require("../models/Admin");
const logger_1 = require("../config/logger");
async function createAdmin() {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hausa-stt';
        await mongoose_1.default.connect(mongoUri);
        logger_1.logger.info('Connected to MongoDB');
        // Check if admin already exists
        const existingAdmin = await Admin_1.Admin.findOne({ email: 'admin@hausa-stt.com' });
        if (existingAdmin) {
            logger_1.logger.info('Admin user already exists');
            process.exit(0);
        }
        // Create admin user
        const hashedPassword = await bcryptjs_1.default.hash('admin123', 10);
        const admin = new Admin_1.Admin({
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
        logger_1.logger.info('Admin user created successfully');
        logger_1.logger.info('Email: admin@hausa-stt.com');
        logger_1.logger.info('Password: admin123');
        logger_1.logger.info('Please change the password after first login!');
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Error creating admin user');
    }
    finally {
        await mongoose_1.default.disconnect();
        process.exit(0);
    }
}
// Run the script
createAdmin();
