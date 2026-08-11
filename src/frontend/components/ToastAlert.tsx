import React from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastAlertProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastAlert: React.FC<ToastAlertProps> = ({ toasts, onDismiss }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto p-4 rounded-2xl shadow-xl border flex items-start gap-3 animate-in slide-in-from-bottom-5 duration-200 ${
            t.type === 'success' 
              ? 'bg-slate-900 text-white border-emerald-500/50 shadow-emerald-950/20' 
              : t.type === 'error'
                ? 'bg-red-900 text-white border-red-500/50 shadow-red-950/20'
                : 'bg-indigo-900 text-white border-indigo-500/50 shadow-indigo-950/20'
          }`}
        >
          <div className="shrink-0 mt-0.5">
            {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            {t.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-400" />}
            {t.type === 'info' && <Info className="w-5 h-5 text-cyan-400" />}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold leading-snug">
              {t.type === 'success' ? 'ทำรายการสำเร็จ!' : t.type === 'error' ? 'ข้อผิดพลาด' : 'แจ้งเตือน'}
            </h4>
            <p className="text-[11px] text-slate-200 mt-0.5 leading-tight">{t.message}</p>
          </div>

          <button
            onClick={() => onDismiss(t.id)}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
