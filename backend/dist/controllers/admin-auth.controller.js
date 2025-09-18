"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminLogin = adminLogin;
exports.adminLogout = adminLogout;
exports.getAdminProfile = getAdminProfile;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Admin_1 = require("../models/Admin");
const AdminLog_1 = require("../models/AdminLog");
const logger_1 = require("../config/logger");
async function adminLogin(req, res) {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }
        // Find admin by email
        const admin = await Admin_1.Admin.findOne({ email: email.toLowerCase() });
        if (!admin) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        if (!admin.isActive) {
            return res.status(401).json({
                success: false,
                error: 'Admin account is disabled'
            });
        }
        // Check password
        const isPasswordValid = await bcryptjs_1.default.compare(password, admin.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        // Update last login
        admin.lastLogin = new Date();
        await admin.save();
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({
            adminId: admin._id,
            email: admin.email,
            role: admin.role
        }, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '24h' });
        // Log admin login
        await AdminLog_1.AdminLog.create({
            adminId: admin._id.toString(),
            adminEmail: admin.email,
            action: 'login',
            resource: 'admin',
            details: {
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            },
            ipAddress: req.ip || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown'
        });
        logger_1.logger.info({ adminId: admin._id, email: admin.email }, 'Admin login successful');
        res.json({
            success: true,
            token,
            admin: {
                id: admin._id,
                email: admin.email,
                name: admin.name,
                role: admin.role,
                permissions: admin.permissions,
                lastLogin: admin.lastLogin
            }
        });
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Admin login error');
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}
async function adminLogout(req, res) {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (token) {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'fallback-secret');
            // Log admin logout
            await AdminLog_1.AdminLog.create({
                adminId: decoded.adminId,
                adminEmail: decoded.email,
                action: 'logout',
                resource: 'admin',
                details: {
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent')
                },
                ipAddress: req.ip || 'unknown',
                userAgent: req.get('User-Agent') || 'unknown'
            });
        }
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Admin logout error');
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}
async function getAdminProfile(req, res) {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        const admin = await Admin_1.Admin.findById(decoded.adminId);
        if (!admin || !admin.isActive) {
            return res.status(401).json({
                success: false,
                error: 'Invalid admin token'
            });
        }
        res.json({
            success: true,
            admin: {
                id: admin._id,
                email: admin.email,
                name: admin.name,
                role: admin.role,
                permissions: admin.permissions,
                lastLogin: admin.lastLogin,
                createdAt: admin.createdAt
            }
        });
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Get admin profile error');
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}
