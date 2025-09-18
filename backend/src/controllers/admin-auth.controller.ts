import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Admin, IAdmin } from '../models/Admin';
import { AdminLog } from '../models/AdminLog';
import { logger } from '../config/logger';

export async function adminLogin(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find admin by email
    const admin = await Admin.findOne({ email: email.toLowerCase() });
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
    const isPasswordValid = await bcrypt.compare(password, admin.password);
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
    const token = jwt.sign(
      { 
        adminId: admin._id, 
        email: admin.email, 
        role: admin.role 
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    // Log admin login
    await AdminLog.create({
      adminId: (admin._id as any).toString(),
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

    logger.info({ adminId: admin._id, email: admin.email }, 'Admin login successful');

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

  } catch (error) {
    logger.error({ error }, 'Admin login error');
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

export async function adminLogout(req: Request, res: Response) {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
      
      // Log admin logout
      await AdminLog.create({
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

  } catch (error) {
    logger.error({ error }, 'Admin logout error');
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

export async function getAdminProfile(req: Request, res: Response) {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    const admin = await Admin.findById(decoded.adminId);

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

  } catch (error) {
    logger.error({ error }, 'Get admin profile error');
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
