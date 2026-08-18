import React from 'react';
import { User, UserRole } from '../types';
import { 
  FileEdit, 
  CheckSquare, 
  Layers, 
  ShieldCheck, 
  Briefcase, 
  Users as UsersIcon, 
  Package,
  Building2,
  Sparkles,
  History as HistoryIcon,
  Sliders,
  Settings
} from 'lucide-react';

interface SidebarProps {
  currentUser: User | null;
  activeRole: UserRole | 'users' | 'materials' | 'org' | 'logs' | 'danger' | 'settings';
  pendingCounts: Record<string, number>;
  onSelectRole: (role: UserRole | 'users' | 'materials' | 'org' | 'logs' | 'danger' | 'settings') => void;
  onChangePassword: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  activeRole,
  pendingCounts,
  onSelectRole,
}) => {
  const userRoles = currentUser?.roles && currentUser.roles.length > 0 
    ? currentUser.roles 
    : (currentUser?.role ? [currentUser.role] : []);

  const isAdmin = userRoles.includes('admin');
  const isSuperAdmin = currentUser?.username === 'admin';

  const rolesList = [
    { id: 'staff' as const, icon: FileEdit, label: '1. บันทึกความต้องการพัสดุ (ผู้ขอ)', desc: 'เจ้าหน้าที่ผู้ขอ' },
    { id: 'head' as const, icon: CheckSquare, label: '2. การอนุมัติของหัวหน้าฝ่าย/กลุ่มงาน', desc: 'หัวหน้าฝ่าย/กลุ่มงาน' },
    { id: 'proc' as const, icon: Layers, label: '3. เจ้าหน้าที่วัสดุตรวจสอบ', desc: 'เจ้าหน้าที่วัสดุ' },
    { id: 'prochead' as const, icon: ShieldCheck, label: '4. การอนุมัติของหัวหน้าวัสดุ', desc: 'หัวหน้าวัสดุ' },
    { id: 'exec' as const, icon: Briefcase, label: '5. ผู้บริหาร', desc: 'ผู้บริหาร' }
  ];

  const adminList = [
    { id: 'users' as const, icon: UsersIcon, label: 'จัดการบัญชีผู้ใช้', desc: 'สิทธิ์การใช้งาน' },
    { id: 'org' as const, icon: Building2, label: 'กลุ่มงาน & ฝ่าย', desc: 'ผังโครงสร้าง' },
    { id: 'settings' as const, icon: Sliders, label: 'ตั้งค่าระบบ', desc: 'แค็ตตาล็อก, ปฏิทิน & สำรองข้อมูล' },
    ...(isSuperAdmin ? [
      { id: 'logs' as const, icon: HistoryIcon, label: 'Log การใช้งาน', desc: 'ประวัติระบบ' }
    ] : [])
  ];

  const visibleRoles = isAdmin ? rolesList : rolesList.filter(r => userRoles.includes(r.id as UserRole));

  return (
    <div className="w-full bg-[#EBF0F6] border-b border-slate-200/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_2px_8px_rgba(163,177,198,0.2)] shrink-0 z-10 px-4 lg:px-6 py-2.5">
      <div className="flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
        {/* Horizontal Navigation Pills Dock */}
        <nav className="flex items-center gap-2 min-w-max py-0.5">
          <div className="hidden md:flex items-center gap-1.5 text-[11px] font-extrabold text-slate-500 mr-1 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>ขั้นตอนทำงาน:</span>
          </div>

          {visibleRoles.map(r => {
            const Icon = r.icon;
            const isActive = activeRole === r.id;
            const badgeCount = pendingCounts[r.id] || 0;

            return (
              <button
                key={r.id}
                type="button"
                onClick={() => onSelectRole(r.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white shadow-[4px_4px_10px_rgba(79,70,229,0.35),-2px_-2px_6px_rgba(255,255,255,0.6)] scale-[1.02]'
                    : 'bg-[#F0F4F8] text-slate-700 hover:text-indigo-900 shadow-[3px_3px_6px_rgba(163,177,198,0.35),-3px_-3px_6px_rgba(255,255,255,0.9)] hover:shadow-[inset_1.5px_1.5px_3px_rgba(163,177,198,0.35)]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-indigo-600'}`} />
                <span>{r.label}</span>

                {badgeCount > 0 && (
                  <span
                    className={`ml-1 px-2 py-0.5 text-[10px] font-black rounded-full shadow-xs ${
                      isActive
                        ? 'bg-cyan-300 text-slate-900 font-extrabold'
                        : 'bg-rose-500 text-white animate-pulse'
                    }`}
                  >
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}

          {isAdmin && (
            <>
              <div className="h-5 w-px bg-slate-300/80 mx-1 hidden sm:block" />
              <div className="hidden md:flex items-center gap-1 text-[11px] font-extrabold text-purple-600 mr-1">
                <span>ผู้ดูแล:</span>
              </div>

              {adminList.map(r => {
                const Icon = r.icon;
                const isActive = activeRole === r.id;

                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onSelectRole(r.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-[4px_4px_10px_rgba(126,34,206,0.35)] scale-[1.02]'
                        : 'bg-[#F0F4F8] text-purple-900 hover:text-purple-950 shadow-[3px_3px_6px_rgba(163,177,198,0.35),-3px_-3px_6px_rgba(255,255,255,0.9)]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-purple-600'}`} />
                    <span>{r.label}</span>
                  </button>
                );
              })}
            </>
          )}
        </nav>
      </div>
    </div>
  );
};

