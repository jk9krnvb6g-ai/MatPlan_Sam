import { RequestItem, User, Department, WorkGroup, SubmissionSchedule, UserRole } from '../types';

export interface SpikeAnalysis {
  isSpike: boolean;
  percentIncrease: number;
  labelTh: string;
  badgeColor: string;
  level: 'normal' | 'moderate' | 'high' | 'new_item';
}

/**
 * Calculates whether a request is a spike (> 30% increase compared to previous year)
 */
export function calculateSpike(qtyLastYear: number, qtyRequested: number): SpikeAnalysis {
  if (qtyLastYear <= 0) {
    if (qtyRequested > 0) {
      return {
        isSpike: true,
        percentIncrease: 100,
        labelTh: 'รายการใหม่ (ไม่มีฐานปีก่อน)',
        badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
        level: 'new_item'
      };
    }
    return {
      isSpike: false,
      percentIncrease: 0,
      labelTh: 'ปกติ',
      badgeColor: 'bg-slate-100 text-slate-700',
      level: 'normal'
    };
  }

  const diff = qtyRequested - qtyLastYear;
  const percent = Math.round((diff / qtyLastYear) * 100);

  if (percent >= 50) {
    return {
      isSpike: true,
      percentIncrease: percent,
      labelTh: `ขอเพิ่มขึ้น +${percent}% (สูงผิดปกติ)`,
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800 animate-pulse',
      level: 'high'
    };
  } else if (percent >= 30) {
    return {
      isSpike: true,
      percentIncrease: percent,
      labelTh: `ขอเพิ่มขึ้น +${percent}% (>30%)`,
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800',
      level: 'moderate'
    };
  }

  return {
    isSpike: false,
    percentIncrease: percent,
    labelTh: percent > 0 ? `+${percent}%` : `${percent}%`,
    badgeColor: 'bg-slate-100 text-slate-700',
    level: 'normal'
  };
}

/**
 * Checks if current date falls within submission schedule timeline
 */
export function checkSubmissionOpen(schedule?: SubmissionSchedule | null): {
  isOpen: boolean;
  isUpcoming: boolean;
  isClosed: boolean;
  daysRemaining: number;
  statusLabelTh: string;
} {
  if (!schedule) {
    return {
      isOpen: true,
      isUpcoming: false,
      isClosed: false,
      daysRemaining: 999,
      statusLabelTh: 'เปิดรับคำขอตามปกติ'
    };
  }

  if (!schedule.isOpen) {
    return {
      isOpen: false,
      isUpcoming: false,
      isClosed: true,
      daysRemaining: 0,
      statusLabelTh: 'ผู้ดูแลระบบปิดรับคำขอชั่วคราว'
    };
  }

  const now = new Date();
  const start = schedule.startDate ? new Date(schedule.startDate) : null;
  const end = schedule.endDate ? new Date(schedule.endDate + 'T23:59:59') : null;

  if (start && now < start) {
    const diffDays = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return {
      isOpen: false,
      isUpcoming: true,
      isClosed: false,
      daysRemaining: diffDays,
      statusLabelTh: `จะเปิดรับคำขอในอีก ${diffDays} วัน (${schedule.startDate})`
    };
  }

  if (end && now > end) {
    if (schedule.allowLateSubmission) {
      return {
        isOpen: true,
        isUpcoming: false,
        isClosed: false,
        daysRemaining: 0,
        statusLabelTh: 'เปิดรับคำขอยื่นล่าช้าเป็นกรณีพิเศษ (Late Submission)'
      };
    }
    return {
      isOpen: false,
      isUpcoming: false,
      isClosed: true,
      daysRemaining: 0,
      statusLabelTh: `สิ้นสุดระยะเวลารับคำขอแล้ว (ปิดเมื่อ ${schedule.endDate})`
    };
  }

  if (end) {
    const diffDays = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    return {
      isOpen: true,
      isUpcoming: false,
      isClosed: false,
      daysRemaining: diffDays,
      statusLabelTh: `เปิดรับคำขอ (เหลือเวลาอีก ${diffDays} วัน ถึง ${schedule.endDate})`
    };
  }

  return {
    isOpen: true,
    isUpcoming: false,
    isClosed: false,
    daysRemaining: 999,
    statusLabelTh: 'เปิดรับคำขอตามปกติ'
  };
}

export interface WorkflowNotification {
  id: string;
  roleTarget: UserRole | 'admin' | 'all';
  type: 'action_required' | 'status_update' | 'spike_alert' | 'schedule_alert' | 'system';
  title: string;
  message: string;
  count?: number;
  highlightColor: 'rose' | 'amber' | 'emerald' | 'indigo' | 'blue';
  targetTab?: string;
  timestamp: string;
  items?: RequestItem[];
}

/**
 * Generates 5-tier workflow notifications dynamically based on role and current state
 */
export function generateWorkflowNotifications(
  currentUser: User,
  requests: RequestItem[],
  users: User[],
  departments: Department[],
  workGroups: WorkGroup[],
  schedule?: SubmissionSchedule | null
): WorkflowNotification[] {
  const notifs: WorkflowNotification[] = [];
  const deptMap = new Map(departments.map(d => [d.id, d.name]));
  const userDeptRequests = requests.filter(r => r.deptId === currentUser.deptId);

  // 1. Admin / SuperAdmin: Pending User Registrations
  if (currentUser.role === 'admin' || currentUser.username === 'admin') {
    const pendingUsers = users.filter(u => u.status === 'pending');
    if (pendingUsers.length > 0) {
      notifs.push({
        id: 'admin-pending-users',
        roleTarget: 'admin',
        type: 'action_required',
        title: 'ผู้สมัครสมาชิกใหม่รอการอนุมัติ',
        message: `มีผู้ใช้งานสมัครใหม่จำนวน ${pendingUsers.length} ท่าน รอผู้ดูแลระบบตรวจสอบและอนุมัติสิทธิ์เข้าใช้งาน`,
        count: pendingUsers.length,
        highlightColor: 'rose',
        targetTab: 'users',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 2. Level 1: Staff -> Head Notification
  // (When Head logs in, show pending requests from their department)
  if (currentUser.role === 'head' || currentUser.role === 'admin' || currentUser.username === 'admin') {
    const pendingHeadReqs = currentUser.role === 'head'
      ? requests.filter(r => r.deptId === currentUser.deptId && r.status === 'pending_head')
      : requests.filter(r => r.status === 'pending_head');

    if (pendingHeadReqs.length > 0) {
      const spikeReqs = pendingHeadReqs.filter(r => calculateSpike(r.qtyLastYear, r.qtyRequested).isSpike);
      notifs.push({
        id: 'head-pending-approval',
        roleTarget: 'head',
        type: 'action_required',
        title: 'คำขอใหม่รอหัวหน้าฝ่ายพิจารณา',
        message: currentUser.role === 'head'
          ? `มีคำขอใหม่จำนวน ${pendingHeadReqs.length} รายการจากฝ่ายของท่าน (${deptMap.get(currentUser.deptId) || currentUser.deptId}) รอพิจารณาอนุมัติ/ส่งต่อ${spikeReqs.length > 0 ? ` (พบรายการขอเกินเกณฑ์ >30% จำนวน ${spikeReqs.length} รายการ)` : ''}`
          : `มีคำขอรอหัวหน้าฝ่ายอนุมัติทั้งหมด ${pendingHeadReqs.length} รายการ`,
        count: pendingHeadReqs.length,
        highlightColor: 'rose',
        targetTab: 'head',
        timestamp: new Date().toISOString(),
        items: pendingHeadReqs
      });
    }
  }

  // 3. Level 2: Head -> Procurement Notification
  // (When Procurement logs in, show requests approved by Head and pending Procurement price checking)
  if (currentUser.role === 'proc' || currentUser.role === 'admin' || currentUser.username === 'admin') {
    const pendingProcReqs = requests.filter(r => r.status === 'pending_proc');
    if (pendingProcReqs.length > 0) {
      const distinctDepts = new Set(pendingProcReqs.map(r => r.deptId)).size;
      const spikeReqs = pendingProcReqs.filter(r => calculateSpike(r.qtyLastYear, r.qtyRequested).isSpike);
      notifs.push({
        id: 'proc-pending-verification',
        roleTarget: 'proc',
        type: 'action_required',
        title: 'คำขอผ่านการรับรองจากหัวหน้าฝ่าย รอพัสดุตรวจสอบราคากลาง',
        message: `มีคำขอผ่านการรับรองจากหัวหน้าฝ่าย ${distinctDepts} แผนก รวม ${pendingProcReqs.length} รายการ รอเจ้าหน้าที่พัสดุตรวจสอบราคากลางและยืนยัน${spikeReqs.length > 0 ? ` (พบรายการขอเกินเกณฑ์ ${spikeReqs.length} รายการ)` : ''}`,
        count: pendingProcReqs.length,
        highlightColor: 'amber',
        targetTab: 'proc',
        timestamp: new Date().toISOString(),
        items: pendingProcReqs
      });
    }
  }

  // 4. Level 3: Procurement -> Procurement Head Notification
  // (When Proc Head logs in, show requests pending Proc Head review)
  if (currentUser.role === 'prochead' || currentUser.role === 'admin' || currentUser.username === 'admin') {
    const pendingProcHeadReqs = requests.filter(r => r.status === 'pending_proc_head');
    if (pendingProcHeadReqs.length > 0) {
      const distinctDepts = new Set(pendingProcHeadReqs.map(r => r.deptId)).size;
      notifs.push({
        id: 'prochead-pending-review',
        roleTarget: 'prochead',
        type: 'action_required',
        title: 'งบประมาณที่พัสดุสรุปยอดแล้ว รอหัวหน้าพัสดุตรวจทาน',
        message: `มีรายการที่เจ้าหน้าที่พัสดุตรวจสอบราคากลางแล้วจาก ${distinctDepts} แผนก รวม ${pendingProcHeadReqs.length} รายการ รอหัวหน้าพัสดุตรวจทานสรุปยอดและส่งเสนอผู้บริหาร`,
        count: pendingProcHeadReqs.length,
        highlightColor: 'indigo',
        targetTab: 'prochead',
        timestamp: new Date().toISOString(),
        items: pendingProcHeadReqs
      });
    }
  }

  // 5. Level 4: Procurement Head -> Executive Notification
  // (When Executive logs in, show requests pending Executive final approval)
  if (currentUser.role === 'exec' || currentUser.role === 'admin' || currentUser.username === 'admin') {
    const pendingExecReqs = requests.filter(r => r.status === 'pending_exec');
    if (pendingExecReqs.length > 0) {
      const distinctDepts = new Set(pendingExecReqs.map(r => r.deptId)).size;
      notifs.push({
        id: 'exec-pending-approval',
        roleTarget: 'exec',
        type: 'action_required',
        title: 'รายงานงบประมาณประจำปี รอผู้บริหารลงนามอนุมัติจัดสรร',
        message: `มีรายงานงบประมาณที่ผ่านการกลั่นกรองจากคณะกรรมการพัสดุแล้ว (${distinctDepts} แผนก, ${pendingExecReqs.length} รายการ) รอผู้บริหารลงนามอนุมัติขั้นสุดท้าย`,
        count: pendingExecReqs.length,
        highlightColor: 'emerald',
        targetTab: 'exec',
        timestamp: new Date().toISOString(),
        items: pendingExecReqs
      });
    }
  }

  // 6. Level 5: Executive/Committee -> Staff & Head Outcome Notifications
  // (Rejected, Adjusted, and Approved updates for Staff & Head of that department)
  if (currentUser.role === 'staff' || currentUser.role === 'head') {
    // 6.1 Rejected Items Notification
    const rejectedReqs = userDeptRequests.filter(r => r.status === 'rejected');
    if (rejectedReqs.length > 0) {
      notifs.push({
        id: 'staff-rejected-items',
        roleTarget: currentUser.role,
        type: 'status_update',
        title: 'มีรายการถูกตีกลับแก้ไข',
        message: `มีคำขอของฝ่ายท่านถูกตีกลับแก้ไขจำนวน ${rejectedReqs.length} รายการ กรุณาตรวจสอบเหตุผลและปรับปรุงข้อมูล`,
        count: rejectedReqs.length,
        highlightColor: 'rose',
        targetTab: 'rejected',
        timestamp: new Date().toISOString(),
        items: rejectedReqs
      });
    }

    // 6.2 Adjusted Items Notification
    const adjustedReqs = userDeptRequests.filter(
      r => (r.qtyAdjusted !== undefined && r.qtyAdjusted !== r.qtyRequested) ||
           (r.qtyOriginal !== undefined && r.qtyOriginal !== r.qtyRequested)
    );
    if (adjustedReqs.length > 0) {
      notifs.push({
        id: 'staff-adjusted-items',
        roleTarget: currentUser.role,
        type: 'status_update',
        title: 'มีรายการถูกปรับลดจำนวนโดยกรรมการ/พัสดุ',
        message: `มีคำขอของฝ่ายท่านจำนวน ${adjustedReqs.length} รายการ ถูกปรับยอดความต้องการตามเกณฑ์ราคากลาง`,
        count: adjustedReqs.length,
        highlightColor: 'amber',
        targetTab: currentUser.role === 'staff' ? 'staff' : 'head',
        timestamp: new Date().toISOString(),
        items: adjustedReqs
      });
    }

    // 6.3 Approved Final Budget Notification
    const approvedReqs = userDeptRequests.filter(r => r.status === 'approved');
    if (approvedReqs.length > 0) {
      notifs.push({
        id: 'staff-approved-items',
        roleTarget: currentUser.role,
        type: 'status_update',
        title: 'ผู้บริหารลงนามอนุมัติงบประมาณของฝ่ายเรียบร้อยแล้ว',
        message: `มีคำขอของฝ่ายท่านที่ผ่านการอนุมัติจัดสรรขั้นสุดท้ายแล้วจำนวน ${approvedReqs.length} รายการ (จากทั้งหมด ${userDeptRequests.length} รายการ)`,
        count: approvedReqs.length,
        highlightColor: 'emerald',
        targetTab: currentUser.role === 'staff' ? 'staff' : 'head',
        timestamp: new Date().toISOString(),
        items: approvedReqs
      });
    }
  }

  // 7. Timeline Schedule Alert
  const scheduleStatus = checkSubmissionOpen(schedule);
  if (scheduleStatus.isClosed) {
    notifs.push({
      id: 'schedule-closed-alert',
      roleTarget: 'all',
      type: 'schedule_alert',
      title: 'แจ้งเตือนกำหนดเวลาปฏิทินงบประมาณ',
      message: scheduleStatus.statusLabelTh,
      highlightColor: 'rose',
      timestamp: new Date().toISOString()
    });
  } else if (scheduleStatus.isOpen && scheduleStatus.daysRemaining <= 7 && scheduleStatus.daysRemaining > 0) {
    notifs.push({
      id: 'schedule-closing-soon-alert',
      roleTarget: 'all',
      type: 'schedule_alert',
      title: 'ใกล้สิ้นสุดระยะเวลารับคำขอประจำปี',
      message: `เหลือเวลาอีกเพียง ${scheduleStatus.daysRemaining} วัน ก่อนปิดรับคำขอประจำปี (${schedule?.endDate})`,
      highlightColor: 'amber',
      timestamp: new Date().toISOString()
    });
  }

  return notifs;
}
