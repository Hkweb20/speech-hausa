import mongoose, { Document, Schema } from 'mongoose';

export interface IAdminLog extends Document {
  adminId: string;
  adminEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: any;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

const AdminLogSchema = new Schema<IAdminLog>({
  adminId: { 
    type: String, 
    required: true 
  },
  adminEmail: { 
    type: String, 
    required: true 
  },
  action: { 
    type: String, 
    required: true,
    enum: [
      'login',
      'logout',
      'update_limits',
      'reset_user_limits',
      'update_user',
      'create_user',
      'delete_user',
      'view_analytics',
      'system_reset',
      'export_data'
    ]
  },
  resource: { 
    type: String, 
    required: true,
    enum: [
      'subscription_tiers',
      'user',
      'user_limits',
      'analytics',
      'system',
      'admin'
    ]
  },
  resourceId: { 
    type: String 
  },
  details: { 
    type: Schema.Types.Mixed,
    required: true
  },
  ipAddress: { 
    type: String, 
    required: true 
  },
  userAgent: { 
    type: String, 
    required: true 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
});

export const AdminLog = mongoose.model<IAdminLog>('AdminLog', AdminLogSchema);
