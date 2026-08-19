import React from 'react';
import { RequestItem } from '../types';
import { TrendingDown, TrendingUp, UserCheck, PackageCheck, ShieldCheck, Crown, History } from 'lucide-react';

interface ItemAdjustmentBadgeProps {
  item: RequestItem;
  onViewAudit?: () => void;
  className?: string;
  compact?: boolean;
}

export const ItemAdjustmentBadge: React.FC<ItemAdjustmentBadgeProps> = ({
  item,
  onViewAudit,
  className = '',
  compact = false
}) => {
  const origQty = item.qtyOriginal !== undefined ? item.qtyOriginal : item.qtyAdjusted;
  const currentQty = item.qtyRequested;
  
  // Check if quantity has been adjusted by someone other than requester or different from original
  const hasAdjustment = (origQty !== undefined && origQty !== currentQty) || !!item.adjustedByRole;

  if (!hasAdjustment || origQty === undefined) {
    return null;
  }

  const diff = currentQty - origQty;
  const isReduced = diff < 0;
  const isIncreased = diff > 0;

  // Determine role title & icon
  let roleTitle = 'ผู้อนุมัติ';
  let RoleIcon = UserCheck;

  if (item.adjustedByRole === 'head') {
    roleTitle = 'หัวหน้ากลุ่มงาน';
    RoleIcon = UserCheck;
  } else if (item.adjustedByRole === 'proc') {
    roleTitle = 'เจ้าหน้าที่พัสดุ';
    RoleIcon = PackageCheck;
  } else if (item.adjustedByRole === 'prochead') {
    roleTitle = 'หัวหน้าฝ่ายพัสดุ';
    RoleIcon = ShieldCheck;
  } else if (item.adjustedByRole === 'exec') {
    roleTitle = 'ผู้บริหาร';
    RoleIcon = Crown;
  } else if (item.adjustedByName) {
    roleTitle = item.adjustedByName;
  }

  const actorName = item.adjustedByName ? ` (${item.adjustedByName})` : '';

  if (compact) {
    return (
      <span
        onClick={e => {
          if (onViewAudit) {
            e.stopPropagation();
            onViewAudit();
          }
        }}
        title={`มีการปรับยอดโดย ${roleTitle}${actorName}: จาก ${origQty} เป็น ${currentQty} ${item.unit} (${diff > 0 ? '+' : ''}${diff}) คลิกเพื่อดูประวัติ`}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold border transition-all ${
          onViewAudit ? 'cursor-pointer hover:opacity-85 shadow-2xs' : ''
        } ${
          isReduced
            ? 'bg-amber-50 text-amber-900 border-amber-300'
            : isIncreased
            ? 'bg-indigo-50 text-indigo-900 border-indigo-300'
            : 'bg-slate-100 text-slate-700 border-slate-200'
        } ${className}`}
      >
        {isReduced ? (
          <TrendingDown className="w-3 h-3 text-amber-700 shrink-0" />
        ) : (
          <TrendingUp className="w-3 h-3 text-indigo-700 shrink-0" />
        )}
        <span>{roleTitle}ปรับ: {origQty}➔{currentQty} ({diff > 0 ? `+${diff}` : diff})</span>
      </span>
    );
  }

  return (
    <div
      onClick={e => {
        if (onViewAudit) {
          e.stopPropagation();
          onViewAudit();
        }
      }}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
        onViewAudit ? 'cursor-pointer hover:shadow-xs' : ''
      } ${
        isReduced
          ? 'bg-amber-50/90 text-amber-950 border-amber-200 ring-1 ring-amber-300/40'
          : isIncreased
          ? 'bg-indigo-50/90 text-indigo-950 border-indigo-200 ring-1 ring-indigo-300/40'
          : 'bg-slate-50 text-slate-800 border-slate-200'
      } ${className}`}
      title={onViewAudit ? 'คลิกเพื่อดูประวัติการปรับปรุงอย่างละเอียด (Audit Trail)' : undefined}
    >
      <div className="flex items-center gap-1 shrink-0">
        <RoleIcon className={`w-3.5 h-3.5 ${isReduced ? 'text-amber-700' : 'text-indigo-700'}`} />
        <span className="font-bold">{roleTitle}</span>
      </div>

      <span className="text-slate-300">|</span>

      <div className="flex items-center gap-1">
        {isReduced ? (
          <span className="text-amber-800 flex items-center gap-0.5">
            <TrendingDown className="w-3 h-3 text-amber-600" />
            <span>ปรับลดจาก <strong>{origQty}</strong> เหลือ <strong>{currentQty}</strong> {item.unit}</span>
            <span className="font-mono text-[10px] bg-amber-200/70 text-amber-900 px-1 rounded font-bold">({diff})</span>
          </span>
        ) : (
          <span className="text-indigo-800 flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3 text-indigo-600" />
            <span>ปรับเพิ่มจาก <strong>{origQty}</strong> เป็น <strong>{currentQty}</strong> {item.unit}</span>
            <span className="font-mono text-[10px] bg-indigo-200/70 text-indigo-900 px-1 rounded font-bold">(+{diff})</span>
          </span>
        )}
      </div>

      {onViewAudit && (
        <History className="w-3 h-3 text-slate-400 ml-0.5 shrink-0" />
      )}
    </div>
  );
};
