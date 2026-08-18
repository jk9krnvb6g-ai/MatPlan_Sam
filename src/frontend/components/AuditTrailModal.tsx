import React from 'react';
import { RequestItem, RequestAuditLog } from '../types';
import { deptName, fmtBaht, getItemGpscCode, getItemCategory, CATEGORY_LABELS } from '../data/catalog';
import { 
  History, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  UserCheck, 
  ShieldCheck, 
  Briefcase, 
  Layers, 
  FileEdit, 
  Clock, 
  Tag, 
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { CategoryBadge } from './CategoryBadge';

interface AuditTrailModalProps {
  item: RequestItem | null;
  onClose: () => void;
}

export const AuditTrailModal: React.FC<AuditTrailModalProps> = ({
  item,
  onClose
}) => {
  if (!item) return null;

  const gpsc = item.gpscCode || getItemGpscCode(item.itemName);
  const cat = getItemCategory(item.itemName);

  // Generate synthetic timeline logs if item has no explicit auditLogs yet
  const logs: RequestAuditLog[] = (item.auditLogs && item.auditLogs.length > 0)
    ? item.auditLogs
    : [
        {
          id: `log-init-${item.id}`,
          timestamp: item.createdAt || '2026-08-01 09:30',
          role: 'staff',
          actorName: item.requesterName || 'เจ้าหน้าที่ผู้เสนอขอ',
          action: 'submit',
          actionLabelTh: 'ยื่นเสนอแผนความต้องการ',
          newQty: item.qtyOriginal || item.qtyRequested,
          newStatus: 'pending_head',
          reason: item.reason || 'ของเดิมไม่เพียงพอต่อการใช้งานตลอดปีงบประมาณ'
        },
        ...(item.qtyAdjusted !== undefined && item.qtyAdjusted !== item.qtyOriginal ? [{
          id: `log-adj-${item.id}`,
          timestamp: item.adjustedAt || '2026-08-05 11:20',
          role: (item.adjustedByRole || 'head') as any,
          actorName: item.adjustedByName || 'หัวหน้าฝ่าย/พัสดุ',
          action: 'adjust_qty' as const,
          actionLabelTh: 'ปรับลด/แก้ไขจำนวนตามกรอบวงเงิน',
          oldQty: item.qtyOriginal || item.qtyRequested,
          newQty: item.qtyAdjusted,
          comment: item.comment || 'ปรับลดให้สอดคล้องกับงบประมาณและสถิติการใช้งานจริง'
        }] : []),
        ...(item.status === 'rejected' ? [{
          id: `log-rej-${item.id}`,
          timestamp: item.rejectedAt || '2026-08-08 14:15',
          role: (item.rejectedByRole || 'head') as any,
          actorName: item.rejectedByName || 'ผู้มีอำนาจพิจารณา',
          action: 'reject' as const,
          actionLabelTh: 'ส่งกลับแก้ไข / ไม่อนุมัติ',
          oldStatus: 'pending_head' as const,
          newStatus: 'rejected' as const,
          comment: item.comment || 'ขอให้ทบทวนจำนวนใหม่อีกครั้งเนื่องจากเกินวงเงินงบประมาณ'
        }] : item.status === 'approved' ? [{
          id: `log-app-${item.id}`,
          timestamp: item.updatedAt || '2026-08-12 16:00',
          role: 'exec' as const,
          actorName: 'ผู้อำนวยการโรงพยาบาลสามชุก',
          action: 'approve' as const,
          actionLabelTh: 'อนุมัติแผนความต้องการขั้นสุดท้าย',
          newStatus: 'approved' as const,
          comment: 'อนุมัติบรรจุในแผนจัดหาประจำปีงบประมาณ'
        }] : [])
      ];

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'staff': return FileEdit;
      case 'head': return CheckSquareIcon;
      case 'proc': return Layers;
      case 'prochead': return ShieldCheck;
      case 'exec': return Briefcase;
      default: return UserCheck;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'staff': return { label: 'ผู้เสนอคำขอ', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'head': return { label: 'หัวหน้าฝ่าย/กลุ่มงาน', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'proc': return { label: 'เจ้าหน้าที่พัสดุ', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'prochead': return { label: 'หัวหน้าฝ่ายพัสดุ', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'exec': return { label: 'ผู้บริหาร / ผอ.', bg: 'bg-amber-50 text-amber-800 border-amber-200' };
      default: return { label: 'ผู้ดูแลระบบ', bg: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#F0F4F8] border border-white/80 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-[14px_14px_35px_rgba(0,0,0,0.3),-14px_-14px_35px_rgba(255,255,255,0.8)] relative max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center cursor-pointer transition-colors shadow-sm"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-slate-200/80 shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-indigo-700 text-white flex items-center justify-center shadow-[0_4px_12px_rgba(79,70,229,0.3)] shrink-0">
            <History className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
                ประวัติการแก้ไขและความเห็น (Audit Trail)
              </h3>
              <CategoryBadge category={cat} />
            </div>
            <p className="text-xs text-indigo-600 font-semibold mt-0.5">
              รหัสพัสดุ GPSC: {gpsc} • หน่วยงาน: {deptName(item.deptId)}
            </p>
          </div>
        </div>

        {/* Item Summary Card */}
        <div className="bg-white/80 border border-slate-200/70 rounded-2xl p-4 mb-5 shadow-xs shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-400 font-bold block text-[10px] uppercase">รายการวัสดุ</span>
            <span className="font-extrabold text-slate-900 text-xs sm:text-sm line-clamp-1">{item.itemName}</span>
          </div>
          <div>
            <span className="text-slate-400 font-bold block text-[10px] uppercase">จำนวนที่ขอ / ปรับปรุง</span>
            <span className="font-extrabold text-indigo-700 font-mono text-xs sm:text-sm">
              {item.qtyRequested} {item.unit}
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-bold block text-[10px] uppercase">ราคาต่อหน่วย</span>
            <span className="font-extrabold text-slate-800 font-mono text-xs sm:text-sm">
              {item.unitPrice ? fmtBaht(item.unitPrice) : '-'} บ.
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-bold block text-[10px] uppercase">สถานะปัจจุบัน</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
              item.status === 'approved' 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : item.status === 'rejected'
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {item.status === 'approved' ? 'อนุมัติแล้ว' : item.status === 'rejected' ? 'ส่งกลับแก้ไข' : 'รอการพิจารณา'}
            </span>
          </div>
        </div>

        {/* Timeline Events List */}
        <div className="overflow-y-auto pr-1 space-y-4 flex-1">
          <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            <span>ลำดับเหตุการณ์และการบันทึกความเห็น ({logs.length} รายการ)</span>
          </div>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-indigo-200/70">
            {logs.map((log, index) => {
              const roleBadge = getRoleBadge(log.role);
              const isLast = index === logs.length - 1;
              const isReject = log.action === 'reject';
              const isApprove = log.action === 'approve';
              const isAdjust = log.action === 'adjust_qty';

              return (
                <div key={log.id || index} className="relative group">
                  {/* Timeline Dot */}
                  <div className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-xs ${
                    isApprove ? 'bg-emerald-500 text-white' :
                    isReject ? 'bg-rose-500 text-white' :
                    isAdjust ? 'bg-amber-500 text-white' :
                    'bg-indigo-600 text-white'
                  }`}>
                    {isApprove ? <CheckCircle2 className="w-3 h-3" /> :
                     isReject ? <AlertCircle className="w-3 h-3" /> :
                     <Sparkles className="w-2.5 h-2.5" />}
                  </div>

                  {/* Event Card */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border ${roleBadge.bg}`}>
                          {roleBadge.label}
                        </span>
                        <span className="font-bold text-slate-800 text-xs">{log.actorName}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{log.timestamp}</span>
                      </div>
                    </div>

                    <div className="font-bold text-xs text-indigo-900 mb-1.5 flex items-center gap-1">
                      <span>{log.actionLabelTh}</span>
                    </div>

                    {/* Quantity or Status Change Breakdown */}
                    {(log.oldQty !== undefined && log.newQty !== undefined && log.oldQty !== log.newQty) && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 my-2 flex items-center gap-2 text-xs font-mono">
                        <span className="text-slate-500 line-through">{log.oldQty} {item.unit}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-extrabold text-indigo-700">{log.newQty} {item.unit}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          log.newQty < log.oldQty ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          {log.newQty - log.oldQty > 0 ? `+${log.newQty - log.oldQty}` : `${log.newQty - log.oldQty}`}
                        </span>
                      </div>
                    )}

                    {/* Reason / Remarks Content */}
                    {(log.comment || log.reason) && (
                      <div className="mt-2 bg-amber-50/70 border border-amber-200/60 rounded-xl p-2.5 text-xs text-amber-900 flex items-start gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block text-[10px] text-amber-800 uppercase">เหตุผล / ความเห็น:</span>
                          <p className="leading-relaxed mt-0.5">{log.comment || log.reason}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-5 pt-4 border-t border-slate-200/80 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold py-2.5 px-6 rounded-2xl shadow-[0_6px_20px_-3px_rgba(79,70,229,0.4),inset_0_1px_1px_rgba(255,255,255,0.4)] active:scale-95 transition-all cursor-pointer text-xs sm:text-sm"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};

function CheckSquareIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
