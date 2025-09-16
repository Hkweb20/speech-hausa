import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Admin, IAdmin } from '../models/Admin';
import { logger } from '../config/logger';

export interface AdminRequest extends Request {
  admin?: IAdmin;
}

export async function authenticateAdmin(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Access denied. No admin token provided.' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    const admin = await Admin.findById(decoded.adminId);
    
    if (!admin || !admin.isActive) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid admin token or admin account disabled.' 
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    logger.error({ error }, 'Admin authentication error');
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid admin token.' 
    });
  }
}

export function requirePermission(permission: string) {
  return (req: AdminRequest, res: Response, next: NextFunction) => {
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

export function requireRole(roles: string[]) {
  return (req: AdminRequest, res: Response, next: NextFunction) => {
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
