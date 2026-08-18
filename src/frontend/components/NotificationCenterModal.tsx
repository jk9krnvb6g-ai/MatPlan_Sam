import React, { useState } from 'react';
import { User, RequestItem, Department, WorkGroup, SubmissionSchedule, UserRole } from '../types';
import { 
  Bell, 
  UserCheck, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Building2, 
  ShieldCheck, 
  Check, 
  X, 
  Volume2, 
  VolumeX, 
  ExternalLink,
  Sparkles,
  Layers,
  ArrowRight,
  TrendingUp,
  Calendar,
  FileText,
  Filter,
  CheckCheck
} from 'lucide-react';
import { playNotificationSound, requestBrowserNotificationPermission } from '../utils/soundHelper';
import { calculateSpike, generateWorkflowNotifications, WorkflowNotification, checkSubmissionOpen } from '../utils/workflowHelper';

interface NotificationCenterModalProps {
  currentUser: User;
  users: User[];
  requests: RequestItem[];
  departments: Department[];
  workGroups?: WorkGroup[];
  schedule?: SubmissionSchedule | null;
  fiscalYear: string;
  onClose: () => void;
  onApproveUser: (username: string) => void;
  onBulkApproveUsers?: (usernames: string[]) => void;
  onSelectAuditItem?: (item: RequestItem) => void;
  onNavigateToTab?: (tab: string) => void;
  onToastAlert: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  currentUser,
  users,
  requests,
  departments,
  workGroups = [],
  schedule,
  fiscalYear,
  onClose,
  onApproveUser,
  onBulkApproveUsers,
  onSelectAuditItem,
  onNavigateToTab,
  onToastAlert
}) => {
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'superadmin';
  const pendingUsers = users.filter(u => u.status === 'pending');
  const [browserNotifEnabled, setBrowserNotifEnabled] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );
  const [filterType, setFilterType] = useState<'all' | 'action_required' | 'status_update' | 'spikes'>('all');

  const deptMap = new Map(departments.map(d => [d.id, d.name]));
  const notifications = generateWorkflowNotifications(
    currentUser,
    requests,
    users,
    departments,
    workGroups,
    schedule
  );

  // Filter notifications
  const filteredNotifs = notifications.filter(n => {
    if (filterType === 'all') return true;
    if (filterType === 'action_required') return n.type === 'action_required';
    if (filterType === 'status_update') return n.type === 'status_update';
    return true;
  });

  // Calculate department spike requests for review
  const relevantRequests = currentUser.role === 'staff' || currentUser.role === 'head'
    ? requests.filter(r => r.deptId === currentUser.deptId)
    : requests;
  const spikeRequests = relevantRequests.filter(r => calculateSpike(r.qtyLastYear, r.qtyRequested).isSpike);

  const handleEnableBrowserNotif = async () => {
    const granted = await requestBrowserNotificationPermission();
    setBrowserNotifEnabled(granted);
    if (granted) {
      playNotificationSound();
      onToastAlert('เปิดใช้งานการแจ้งเตือนผ่าน Browser สำเร็จ', 'success');
    } else {
      onToastAlert('เบราว์เซอร์ไม่อนุญาตการแจ้งเตือน หรือถูกปิดกั้นไว้', 'info');
    }
  };

  const handleTestSound = () => {
    playNotificationSound();
    onToastAlert('ทดสอบเสียงสัญญาณแจ้งเตือนสำเร็จ', 'info');
  };

  const scheduleInfo = checkSubmissionOpen(schedule);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 relative shadow-inner">
              <Bell className="w-5 h-5 text-indigo-300 animate-pulse" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-slate-900 animate-ping" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>ศูนย์การแจ้งเตือนระบบครบวงจร (Multi-Tier Notification Hub)</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 font-mono">
                  ปี {fiscalYear}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                แจ้งเตือนตามลำดับขั้นการอนุมัติ 5 ระดับ รายการขอเกินเกณฑ์ และกำหนดเวลาปฏิทินงบประมาณ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Settings & Controls Bar */}
        <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleTestSound}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs font-bold transition-all cursor-pointer"
              title="ทดสอบเสียงสัญญาณแจ้งเตือน"
            >
              <Volume2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>ทดสอบเสียงเตือน</span>
            </button>

            <button
              type="button"
              onClick={handleEnableBrowserNotif}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-2xs font-bold transition-all cursor-pointer ${
                browserNotifEnabled
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
              title="เปิดการแจ้งเตือนบนหน้าต่างเบราว์เซอร์"
            >
              <Sparkles className={`w-3.5 h-3.5 ${browserNotifEnabled ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>{browserNotifEnabled ? 'Browser Alert: เปิดใช้งานแล้ว' : 'เปิดแจ้งเตือน Browser'}</span>
            </button>
          </div>

          {isAdmin && pendingUsers.length > 0 && onBulkApproveUsers && (
            <button
              type="button"
              onClick={() => {
                onBulkApproveUsers(pendingUsers.map(u => u.username));
                onToastAlert(`อนุมัติผู้ใช้งานทั้งหมด ${pendingUsers.length} ท่านเรียบร้อยแล้ว`, 'success');
              }}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs hover:shadow-sm transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>อนุมัติสมาชิกใหม่ทั้งหมด ({pendingUsers.length} ท่าน)</span>
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="px-6 py-2 bg-slate-100/80 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto text-xs shrink-0">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              filterType === 'all'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            ทั้งหมด ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('action_required')}
            className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              filterType === 'action_required'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            ต้องดำเนินการ ({notifications.filter(n => n.type === 'action_required').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('status_update')}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              filterType === 'status_update'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            อัปเดตผลอนุมัติ ({notifications.filter(n => n.type === 'status_update').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('spikes')}
            className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              filterType === 'spikes'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
            ขอเกินเกณฑ์ &gt;30% ({spikeRequests.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-[#F8FAFC] dark:bg-slate-900/50">
          
          {/* Submission Schedule Timeline Banner */}
          <div className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-3 text-xs ${
            scheduleInfo.isClosed
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
              : scheduleInfo.daysRemaining <= 7
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
              : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center font-bold shadow-2xs shrink-0">
                <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <span className="font-bold block text-sm">กำหนดเวลาปฏิทินรับคำขอประจำปีงบประมาณ {fiscalYear}</span>
                <span className="opacity-90">{scheduleInfo.statusLabelTh}</span>
              </div>
            </div>
            {schedule && (
              <span className="font-mono text-[11px] font-bold px-2.5 py-1 bg-white dark:bg-slate-800 rounded-lg shadow-2xs shrink-0">
                {schedule.startDate} ถึง {schedule.endDate}
              </span>
            )}
          </div>

          {/* Workflow Chain Notifications List */}
          {filterType !== 'spikes' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>การแจ้งเตือนตามลำดับขั้นการปฏิบัติงาน (Workflow Notifications)</span>
                </h3>
              </div>

              {filteredNotifs.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  <span className="font-bold text-slate-700 dark:text-slate-200">ไม่มีการแจ้งเตือนค้างในหมวดหมู่นี้</span>
                  <span className="text-slate-400 text-[11px]">ระบบอัปเดตข้อมูลเป็นปัจจุบันเรียบร้อยแล้ว</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNotifs.map(notif => {
                    const isRose = notif.highlightColor === 'rose';
                    const isAmber = notif.highlightColor === 'amber';
                    const isEmerald = notif.highlightColor === 'emerald';

                    return (
                      <div
                        key={notif.id}
                        className={`p-4.5 rounded-2xl border-2 shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isRose
                            ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/80 hover:border-rose-400'
                            : isAmber
                            ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/80 hover:border-amber-400'
                            : isEmerald
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/80 hover:border-emerald-400'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black shadow-xs shrink-0 ${
                            isRose
                              ? 'bg-rose-600 text-white shadow-rose-900/30'
                              : isAmber
                              ? 'bg-amber-600 text-white shadow-amber-900/30'
                              : isEmerald
                              ? 'bg-emerald-600 text-white shadow-emerald-900/30'
                              : 'bg-indigo-600 text-white'
                          }`}>
                            {isRose ? <AlertTriangle className="w-5 h-5" /> : isEmerald ? <CheckCircle2 className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white">{notif.title}</h4>
                              {notif.count !== undefined && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                                  isRose
                                    ? 'bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-200'
                                    : isAmber
                                    ? 'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200'
                                    : 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200'
                                }`}>
                                  {notif.count} รายการ
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                              {notif.message}
                            </p>
                          </div>
                        </div>

                        {notif.targetTab && onNavigateToTab && (
                          <div className="shrink-0 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => {
                                onNavigateToTab(notif.targetTab!);
                                onClose();
                              }}
                              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                                isRose
                                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                  : isAmber
                                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                              }`}
                            >
                              <span>ไปยังหน้าพิจารณา</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Admin Pending Registrations Detailed Section */}
          {isAdmin && pendingUsers.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    <span>รายชื่อผู้สมัครสมาชิกใหม่รอการอนุมัติ</span>
                  </h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold font-mono bg-rose-100 text-rose-800 border border-rose-300">
                    {pendingUsers.length} บัญชี
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                {pendingUsers.map(u => (
                  <div 
                    key={u.username}
                    className="bg-white dark:bg-slate-800 p-4 rounded-2xl border-2 border-rose-200/80 dark:border-rose-900/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 text-white font-black flex items-center justify-center text-sm shadow-xs shrink-0">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">{u.name}</span>
                          <span className="text-xs text-slate-500 font-mono">(@{u.username})</span>
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-800 border border-amber-300">
                            รออนุมัติ
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            {deptMap.get(u.deptId) || u.deptId}
                          </span>
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          <span className="flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-400">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            สิทธิ์: {u.role === 'staff' ? 'เจ้าหน้าที่ผู้ขอ' : u.role === 'head' ? 'หัวหน้าฝ่าย' : u.role === 'proc' ? 'เจ้าหน้าที่พัสดุ' : u.role === 'prochead' ? 'หัวหน้าพัสดุ' : u.role === 'exec' ? 'ผู้บริหาร' : u.role}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => {
                          onApproveUser(u.username);
                          onToastAlert(`อนุมัติผู้ใช้งาน @${u.username} (${u.name}) สำเร็จ`, 'success');
                        }}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>อนุมัติทันที</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Spike & Quota Alert Items Section */}
          {(filterType === 'spikes' || filterType === 'all') && spikeRequests.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    รายการที่ขอเพิ่มขึ้นเกินเกณฑ์ปีก่อน (&gt;30% Spike Alert)
                  </h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold font-mono bg-amber-100 text-amber-800 border border-amber-300">
                    {spikeRequests.length} รายการ
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {spikeRequests.slice(0, 10).map(r => {
                  const spike = calculateSpike(r.qtyLastYear, r.qtyRequested);
                  return (
                    <div
                      key={r.id}
                      className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white text-xs">{r.itemName}</span>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${spike.badgeColor}`}>
                            {spike.labelTh}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3">
                          <span>ฝ่าย: {deptMap.get(r.deptId) || r.deptId}</span>
                          <span>•</span>
                          <span>ปีก่อน: {r.qtyLastYear} {r.unit} ➔ ขอปีนี้: <strong className="text-slate-900 dark:text-white">{r.qtyRequested}</strong> {r.unit}</span>
                          {r.reason && (
                            <>
                              <span>•</span>
                              <span className="italic text-slate-600 dark:text-slate-300">เหตุผล: {r.reason}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {onSelectAuditItem && (
                        <button
                          type="button"
                          onClick={() => onSelectAuditItem(r)}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold shrink-0 self-end sm:self-center cursor-pointer"
                        >
                          ดูประวัติ
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400">
            ระบบตรวจสอบและแจ้งเตือนสถานะตามลำดับขั้นการอนุมัติ 5 ระดับแบบเรียลไทม์
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-2xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
