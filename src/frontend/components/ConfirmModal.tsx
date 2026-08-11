import React from 'react';
import { AlertCircle, CheckCircle2, HelpCircle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'ยืนยันดำเนินการ',
  cancelText = 'ยกเลิก',
  variant = 'primary',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-2xl shrink-0 ${
              variant === 'danger' ? 'bg-red-50 text-red-600 border border-red-100' :
              variant === 'warning' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
              'bg-indigo-50 text-indigo-600 border border-indigo-100'
            }`}>
              {variant === 'danger' && <AlertCircle className="w-6 h-6" />}
              {variant === 'warning' && <HelpCircle className="w-6 h-6" />}
              {variant === 'primary' && <CheckCircle2 className="w-6 h-6" />}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-slate-900 leading-snug">{title}</h3>
              <p className="text-xs font-medium text-slate-600 mt-1.5 leading-relaxed">{message}</p>
            </div>

            <button
              onClick={onCancel}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs border border-slate-300 transition-all shadow-2xs"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 ${
              variant === 'danger' ? 'bg-red-600 hover:bg-red-700 shadow-red-200' :
              variant === 'warning' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200' :
              'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
