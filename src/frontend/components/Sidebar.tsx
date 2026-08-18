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
  AlertOctagon
} from 'lucide-react';

interface SidebarProps {
  currentUser: User | null;
  activeRole: UserRole | 'users' | 'materials' | 'org' | 'logs' | 'danger';
  pendingCounts: Record<string, number>;
  onSelectRole: (role: UserRole | 'users' | 'materials' | 'org' | 'logs' | 'danger') => void;
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
    { id: 'materials' as const, icon: Package, label: 'แค็ตตาล็อกวัสดุ', desc: 'รายการ & ราคา' },
    ...(isSuperAdmin ? [
      { id: 'logs' as const, icon: HistoryIcon, label: 'Log การใช้งาน', desc: 'ประวัติระบบ' },
      { id: 'danger' as const, icon: AlertOctagon, label: 'Danger Zone (ล้างข้อมูล)', desc: 'ควบคุมข้อมูลขั้นสูง' }
    ] : [])
  ];

  const visibleRoles = isAdmin ? rolesList : rolesList.filter(r => userRoles.includes(r.id as UserRole));

  return (
    <div className="w-full bg-white border-b border-slate-200 shadow-xs shrink-0 z-10 px-4 lg:px-6 py-2">
      <div className="flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
        {/* Horizontal Navigation Pills Dock */}
        <nav className="flex items-center gap-1.5 min-w-max py-0.5">
          <div className="hidden md:flex items-center gap-1.5 text-[11px] font-bold text-slate-400 mr-1 uppercase tracking-wider">
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
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-500/30 scale-[1.02]'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-indigo-600'}`} />
                <span>{r.label}</span>

                {badgeCount > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 text-[10px] font-black rounded-full border ${
                      isActive
                        ? 'bg-cyan-400 text-slate-900 border-cyan-300'
                        : 'bg-amber-100 text-amber-900 border-amber-300'
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
              <div className="h-4 w-px bg-slate-300 mx-1 hidden sm:block" />
              <div className="hidden md:flex items-center gap-1 text-[11px] font-bold text-purple-500 mr-1">
                <span>ผู้ดูแล:</span>
              </div>

              {adminList.map(r => {
                const Icon = r.icon;
                const isActive = activeRole === r.id;
                const isDanger = r.id === 'danger';

                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onSelectRole(r.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      isDanger
                        ? isActive
                          ? 'bg-red-700 text-white border-red-700 shadow-sm ring-2 ring-red-600/30 scale-[1.02]'
                          : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                        : isActive
                          ? 'bg-purple-700 text-white border-purple-700 shadow-sm ring-2 ring-purple-600/20 scale-[1.02]'
                          : 'bg-purple-50/60 text-purple-900 border-purple-200 hover:bg-purple-100'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : (isDanger ? 'text-red-600' : 'text-purple-600')}`} />
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

