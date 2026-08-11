import React, { useState } from 'react';
import { User } from '../types';
import { Key, X, Check } from 'lucide-react';

interface ChangePasswordModalProps {
  currentUser: User;
  onClose: () => void;
  onSavePassword: (newPw: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  currentUser,
  onClose,
  onSavePassword
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (currentPassword !== currentUser.password) {
      setErrorMsg('รหัสผ่านปัจจุบันไม่ถูกต้อง');
      return;
    }

    if (!newPassword || newPassword.length < 4) {
      setErrorMsg('รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('ยืนยันรหัสผ่านใหม่ไม่ตรงกัน');
      return;
    }

    onSavePassword(newPassword);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Key className="w-4 h-4 text-teal-700" />
            เปลี่ยนรหัสผ่าน
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-2.5 rounded-xl font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="block font-semibold text-slate-700">รหัสผ่านปัจจุบัน</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-semibold text-slate-700">รหัสผ่านใหม่</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="อย่างน้อย 4 ตัวอักษร"
              className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-semibold text-slate-700">ยืนยันรหัสผ่านใหม่</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow-md transition-colors flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              บันทึกรหัสผ่านใหม่
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
