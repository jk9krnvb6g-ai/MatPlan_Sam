export type UserRole = 'staff' | 'head' | 'proc' | 'prochead' | 'exec' | 'admin';

export type CategoryId = string;

export type RequestStatus = 
  | 'pending_head'
  | 'pending_proc'
  | 'pending_proc_head'
  | 'pending_exec'
  | 'approved'
  | 'rejected';

export interface WorkGroup {
  id: string;
  name: string;
  description?: string;
  code?: string;
}

export interface Department {
  id: string;
  name: string;
  category: CategoryId;
  workGroupId?: string;
}

export interface User {
  username: string;
  password: string;
  role: UserRole;
  roles?: UserRole[];
  name: string;
  category?: CategoryId;
  deptId: string;
  status: 'active' | 'pending' | 'inactive';
}

export interface MaterialItem {
  id?: string;
  name: string;
  category: CategoryId;
  unit: string;
  price: number;
  active: boolean;
  isCustom?: boolean;
  gpscCode?: string;
}

export interface DepartmentRevisionPermission {
  deptId: string;
  isUnlocked: boolean;
  unlockedAt?: string;
  unlockedBy?: string;
  expiresAt?: string;
  note?: string;
}

export interface RequestAuditLog {
  id: string;
  timestamp: string;
  role: UserRole;
  actorName: string;
  action: 'submit' | 'approve' | 'reject' | 'adjust_qty' | 'update_price' | 'remark' | 'revision';
  actionLabelTh: string;
  oldQty?: number;
  newQty?: number;
  oldStatus?: RequestStatus;
  newStatus?: RequestStatus;
  comment?: string;
  reason?: string;
}

export interface RequestItem {
  id: string;
  deptId: string;
  itemName: string;
  unit: string;
  qtyLastYear: number;
  qtyRequested: number;
  status: RequestStatus;
  comment: string;
  reason: string;
  unitPrice: number | null;
  fiscalYear?: string;
  createdAt?: string;
  updatedAt?: string;

  // Material item metadata
  gpscCode?: string;

  // Requester identity
  requesterName?: string;
  requesterSubDept?: string;

  // Quantity tracking & Adjustment history
  qtyOriginal?: number;
  qtyAdjusted?: number;
  adjustedByRole?: UserRole;
  adjustedByName?: string;
  adjustedAt?: string;

  // Rejection & Return tracking
  rejectedByRole?: UserRole;
  rejectedByName?: string;
  rejectedAt?: string;

  // Audit trail & detailed remarks history
  auditLogs?: RequestAuditLog[];

  // Mid-Year Revision Plan tracking
  isRevisionItem?: boolean;          // True if this is an adjustment or newly added revision item
  revisionType?: 'add' | 'modify' | 'cancel' | 'none'; // Item revision action
  revisionBaseQty?: number;          // Original approved quantity before revision
  revisionReason?: string;           // Reason for adjusting the mid-year plan
  revisionStatus?: 'draft' | 'submitted' | 'approved' | 'rejected'; // Revision specific workflow status
  revisionRequestedAt?: string;
  revisionRequestedBy?: string;
}

export interface HistoryData {
  2566: number;
  2567: number;
  2568: number;
}

export interface SubmissionSchedule {
  startDate: string;        // e.g. "2026-01-01"
  endDate: string;          // e.g. "2026-03-31"
  isOpen: boolean;          // Manual master switch
  allowLateSubmission: boolean;
  announcement?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  username: string;
  name: string;
  actionType: 'add' | 'edit' | 'delete' | 'status_change' | 'auth' | 'other';
  module: 'users' | 'materials' | 'org' | 'requests' | 'system' | 'custom_category';
  description: string;
}

