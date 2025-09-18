"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateAdmin = authenticateAdmin;
exports.requirePermission = requirePermission;
exports.requireRole = requireRole;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Admin_1 = require("../models/Admin");
const logger_1 = require("../config/logger");
async function authenticateAdmin(req, res, next) {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Access denied. No admin token provided.'
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        const admin = await Admin_1.Admin.findById(decoded.adminId);
        if (!admin || !admin.isActive) {
            return res.status(401).json({
                success: false,
                error: 'Invalid admin token or admin account disabled.'
            });
        }
        req.admin = admin;
        next();
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Admin authentication error');
        return res.status(401).json({
            success: false,
            error: 'Invalid admin token.'
        });
    }
}
function requirePermission(permission) {
    return (req, res, next) => {
        if (!req.admin) {
            return res.status(401).json({
                success: false,
                error: 'Admin authentication required.'
            });
        }
        if (req.admin.role === 'super_admin') {
            return next(); // Super admin has all permissions
        }
        if (!req.admin.permissions.includes(permission)) {
            return res.status(403).json({
                success: false,
                error: `Insufficient permissions. Required: ${permission}`
            });
        }
        next();
    };
}
function requireRole(roles) {
    return (req, res, next) => {
        if (!req.admin) {
            return res.status(401).json({
                success: false,
                error: 'Admin authentication required.'
            });
        }
        if (!roles.includes(req.admin.role)) {
            return res.status(403).json({
                success: false,
                error: `Insufficient role. Required: ${roles.join(' or ')}`
            });
        }
        next();
    };
}
