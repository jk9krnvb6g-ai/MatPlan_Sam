import React, { useState } from 'react';
import { CategoryId, Department, User, UserRole, WorkGroup } from '../types';
import { CATEGORY_LABELS, CATEGORY_ORDER, DEPARTMENTS, INITIAL_WORK_GROUPS, deptName } from '../data/catalog';
import { PaginationBar } from './PaginationBar';
import { TableControlPanel, SortOption } from './TableControlPanel';
import { 
  UserCheck, 
  Edit3, 
  Key, 
  Check, 
  X, 
  Shield, 
  Users as UsersIcon, 
  ArrowUpDown, 
  Eye, 
  EyeOff, 
  Lock, 
  Building2,
  CheckSquare,
  Square,
  MinusSquare,
  Trash2,
  KeyRound,
  Layers,
  Sparkles,
  AlertCircle
} from 'lucide-react';

interface AdminUsersViewProps {
  users: User[];
  departments?: Department[];
  workGroups?: WorkGroup[];
  fiscalYear: string;
  onApproveUser: (username: string) => void;
  onUpdateUser: (username: string, name: string, roles: UserRole[], deptId: string, status?: User['status']) => void;
  onResetPassword: (username: string, newPassword: string) => void;
  onBulkApproveUsers?: (usernames: string[]) => void;
  onBulkChangeDept?: (usernames: string[], targetDeptId: string) => void;
  onBulkResetPassword?: (usernames: string[], newPassword: string) => void;
  onBulkChangeStatus?: (usernames: string[], status: User['status']) => void;
  onBulkDeleteUsers?: (usernames: string[]) => void;
  onRequestConfirm: (opts: { title: string; message: string; confirmText?: string; variant?: 'primary' | 'danger' | 'warning'; onConfirm: () => void }) => void;
  onToastAlert: (msg: string, type?: 'success' | 'error' | 'info') => void;
  currentUser: User;
}

export const AdminUsersView: React.FC<AdminUsersViewProps> = ({
  users,
  departments,
  workGroups,
  fiscalYear,
  onApproveUser,
  onUpdateUser,
  onResetPassword,
  onBulkApproveUsers,
  onBulkChangeDept,
  onBulkResetPassword,
  onBulkChangeStatus,
  onBulkDeleteUsers,
  onRequestConfirm,
  onToastAlert,
  currentUser
}) => {
  const departmentsList = departments || DEPARTMENTS;
  const workGroupsList = workGroups || INITIAL_WORK_GROUPS;
  const [editingUsername, setEditingUsername] = useState<string | null>(null);
  
  // Selection state for batch operations
  const [selectedUsernames, setSelectedUsernames] = useState<string[]>([]);
  const [bulkDeptModalOpen, setBulkDeptModalOpen] = useState(false);
  const [bulkTargetDeptId, setBulkTargetDeptId] = useState(departmentsList[0]?.id || 'thurakan');
  const [bulkPasswordModalOpen, setBulkPasswordModalOpen] = useState(false);
  const [bulkNewPassword, setBulkNewPassword] = useState('');
  const [bulkShowPassword, setBulkShowPassword] = useState(false);
  const [bulkPwError, setBulkPwError] = useState('');

  // Dedicated Password Reset Modal State (Single User)
  const [resetModalUser, setResetModalUser] = useState<User | null>(null);
  const [modalNewPassword, setModalNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pwError, setPwError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWgId, setSelectedWgId] = useState<string>('all');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');

  const [sortField, setSortField] = useState<'name' | 'username' | 'role' | 'deptId' | 'status'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Form states for inline edit
  const [editName, setEditName] = useState('');
  const [editRoles, setEditRoles] = useState<UserRole[]>(['staff']);
  const [editDeptId, setEditDeptId] = useState('thurakan');
  const [editStatus, setEditStatus] = useState<User['status']>('approved');

  const [pageSize, setPageSize] = useState<number | 'all'>(10);
  const [currentPage, setCurrentPage] = useState(1);

  const pendingCount = users.filter(u => u.status === 'pending').length;

  const availableDepts = selectedWgId === 'all'
    ? departmentsList
    : departmentsList.filter(d => d.workGroupId === selectedWgId);

  const getWgUserCount = (wgId: string) => {
    if (wgId === 'all') return users.length;
    const wgDeptIds = departmentsList.filter(d => d.workGroupId === wgId).map(d => d.id);
    return users.filter(u => wgDeptIds.includes(u.deptId)).length;
  };

  const getDeptUserCount = (deptId: string) => {
    if (deptId === 'all') {
      if (selectedWgId === 'all') return users.length;
      return getWgUserCount(selectedWgId);
    }
    return users.filter(u => u.deptId === deptId).length;
  };

  const filteredUsers = users.filter(u => {
    // Search filter
    const matchesSearch = !searchTerm.trim() ||
      u.name.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase().trim());

    if (!matchesSearch) return false;

    // Dept / Wg filter
    if (selectedDeptId !== 'all') {
      if (u.deptId !== selectedDeptId) return false;
    } else if (selectedWgId !== 'all') {
      const uDept = departmentsList.find(d => d.id === u.deptId);
      if (!uDept || uDept.workGroupId !== selectedWgId) return false;
    }

    return true;
  });

  const activeCategoryLabel = selectedDeptId !== 'all'
    ? (departmentsList.find(d => d.id === selectedDeptId)?.name || 'ฝ่าย/แผนก')
    : selectedWgId !== 'all'
    ? (workGroupsList.find(w => w.id === selectedWgId)?.name || 'กลุ่มงาน')
    : 'ผู้ใช้งานทั้งหมด';

  const handleHeaderSort = (field: 'name' | 'username' | 'role' | 'deptId' | 'status') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let res = 0;
    if (sortField === 'name') res = a.name.localeCompare(b.name, 'th');
    else if (sortField === 'username') res = a.username.localeCompare(b.username);
    else if (sortField === 'role') {
      const aRolesStr = (a.roles || [a.role]).join(',');
      const bRolesStr = (b.roles || [b.role]).join(',');
      res = aRolesStr.localeCompare(bRolesStr);
    }
    else if (sortField === 'deptId') res = a.deptId.localeCompare(b.deptId);
    else if (sortField === 'status') res = a.status.localeCompare(b.status);
    return sortOrder === 'asc' ? res : -res;
  });

  const startEdit = (u: User) => {
    if (currentUser?.username !== 'admin') {
      onToastAlert('สิทธิ์ในการแก้ไขข้อมูลผู้ใช้งาน จำกัดเฉพาะบัญชี Super Admin (ผู้ดูแลระบบสูงสุด) เท่านั้น', 'error');
      return;
    }
    setEditingUsername(u.username);
    setEditName(u.name);
    const uRoles = u.roles && u.roles.length > 0 ? u.roles : [u.role];
    setEditRoles(uRoles);
    setEditDeptId(u.deptId);
    setEditStatus(u.status || 'approved');
  };

  const handleApprove = (u: User) => {
    if (currentUser?.username !== 'admin') {
      onToastAlert('สิทธิ์ในการอนุมัติผู้ใช้งาน จำกัดเฉพาะบัญชี Super Admin (ผู้ดูแลระบบสูงสุด) เท่านั้น', 'error');
      return;
    }
    onRequestConfirm({
      title: 'ยืนยันการอนุมัติสิทธิ์ผู้ใช้งาน',
      message: `คุณต้องการอนุมัติการใช้งานบัญชี '${u.name}' (${u.username}) หรือไม่?`,
      confirmText: 'อนุมัติการใช้งาน',
      variant: 'primary',
      onConfirm: () => {
        onApproveUser(u.username);
        onToastAlert(`อนุมัติสิทธิ์ผู้ใช้งาน '${u.name}' สำเร็จเรียบร้อยแล้ว`, 'success');
      }
    });
  };

  const saveEdit = (username: string) => {
    if (currentUser?.username !== 'admin') {
      onToastAlert('สิทธิ์ในการแก้ไขข้อมูลผู้ใช้งาน จำกัดเฉพาะบัญชี Super Admin (ผู้ดูแลระบบสูงสุด) เท่านั้น', 'error');
      return;
    }
    if (!editName.trim()) {
      onToastAlert('กรุณากรอกชื่อ-นามสกุล (*) ให้เรียบร้อย', 'error');
      return;
    }
    if (!editRoles || editRoles.length === 0) {
      onToastAlert('กรุณาเลือกอย่างน้อย 1 บทบาท', 'error');
      return;
    }

    onRequestConfirm({
      title: 'ยืนยันการบันทึกการปรับปรุงข้อมูลผู้ใช้',
      message: `คุณต้องการบันทึกข้อมูลปรับปรุงของบัญชี ${username} หรือไม่?`,
      confirmText: 'บันทึกข้อมูล',
      variant: 'primary',
      onConfirm: () => {
        onUpdateUser(username, editName.trim(), editRoles, editDeptId, editStatus);
        onToastAlert(`บันทึกข้อมูลผู้ใช้ ${username} เรียบร้อยแล้ว`, 'success');
        setEditingUsername(null);
      }
    });
  };

  const handleOpenResetPasswordModal = (user: User) => {
    if (currentUser?.username !== 'admin') {
      onToastAlert('สิทธิ์ในการรีเซ็ตรหัสผ่านผู้ใช้งาน จำกัดเฉพาะบัญชี Super Admin (ผู้ดูแลระบบสูงสุด) เท่านั้น', 'error');
      return;
    }
    setResetModalUser(user);
    setModalNewPassword('');
    setShowPassword(false);
    setPwError('');
  };

  const handleConfirmPasswordReset = () => {
    if (!resetModalUser) return;

    if (!modalNewPassword || modalNewPassword.length < 4) {
      setPwError('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร');
      return;
    }

    const targetUser = resetModalUser;
    onResetPassword(targetUser.username, modalNewPassword);
    onToastAlert(`เปลี่ยนรหัสผ่านของผู้ใช้งาน '${targetUser.name}' (@${targetUser.username}) สำเร็จเรียบร้อยแล้ว`, 'success');
    setResetModalUser(null);
    setModalNewPassword('');
    setPwError('');
  };

  // Bulk Selection Handlers
  const handleToggleSelectUser = (username: string) => {
    setSelectedUsernames(prev => 
      prev.includes(username) 
        ? prev.filter(u => u !== username) 
        : [...prev, username]
    );
  };

  // Pagination slice
  const numericSize = pageSize === 'all' ? sortedUsers.length || 1 : pageSize;
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(sortedUsers.length / numericSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageUsers = pageSize === 'all' ? sortedUsers : sortedUsers.slice((safePage - 1) * numericSize, safePage * numericSize);

  const isAllPageSelected = pageUsers.length > 0 && pageUsers.every(u => selectedUsernames.includes(u.username));
  const isSomePageSelected = pageUsers.some(u => selectedUsernames.includes(u.username)) && !isAllPageSelected;

  const handleToggleSelectAllPage = () => {
    if (isAllPageSelected) {
      const pageUsernames = pageUsers.map(u => u.username);
      setSelectedUsernames(prev => prev.filter(u => !pageUsernames.includes(u)));
    } else {
      const pageUsernames = pageUsers.map(u => u.username);
      setSelectedUsernames(prev => Array.from(new Set([...prev, ...pageUsernames])));
    }
  };

  const handleSelectAllFiltered = () => {
    setSelectedUsernames(sortedUsers.map(u => u.username));
  };

  const handleClearSelection = () => {
    setSelectedUsernames([]);
  };

  // Bulk Actions
  const handleBulkApprove = () => {
    if (currentUser?.username !== 'admin') {
      onToastAlert('สิทธิ์ในการอนุมัติผู้ใช้งาน จำกัดเฉพาะ Super Admin เท่านั้น', 'error');
      return;
    }
    const pendingSelected = users.filter(u => selectedUsernames.includes(u.username) && u.status === 'pending');
    if (pendingSelected.length === 0) {
      onToastAlert('ในรายการที่เลือกไม่มีผู้ใช้งานที่สถานะรออนุมัติ (Pending)', 'info');
      return;
    }

    onRequestConfirm({
      title: 'ยืนยันการอนุมัติสิทธิ์ผู้ใช้งานพร้อมกัน',
      message: `คุณต้องการอนุมัติการใช้งานให้แก่ผู้ใช้จำนวน ${pendingSelected.length} บัญชี หรือไม่?`,
      confirmText: `อนุมัติทั้งหมด (${pendingSelected.length})`,
      variant: 'primary',
      onConfirm: () => {
        if (onBulkApproveUsers) {
          onBulkApproveUsers(pendingSelected.map(u => u.username));
        } else {
          pendingSelected.forEach(u => onApproveUser(u.username));
        }
        onToastAlert(`อนุมัติผู้ใช้งานจำนวน ${pendingSelected.length} บัญชี สำเร็จเรียบร้อยแล้ว`, 'success');
        setSelectedUsernames([]);
      }
    });
  };

  const handleBulkChangeDeptConfirm = () => {
    if (currentUser?.username !== 'admin') {
      onToastAlert('สิทธิ์ในการย้ายกลุ่มงาน/ฝ่าย จำกัดเฉพาะ Super Admin เท่านั้น', 'error');
      return;
    }
    if (selectedUsernames.length === 0) return;

    const targetDept = departmentsList.find(d => d.id === bulkTargetDeptId);
    onRequestConfirm({
      title: 'ยืนยันการย้ายหน่วยงาน/ฝ่ายแบบกลุ่ม',
      message: `คุณต้องการย้ายผู้ใช้งานจำนวน ${selectedUsernames.length} บัญชี ไปยังฝ่าย '${targetDept?.name || bulkTargetDeptId}' หรือไม่?`,
      confirmText: 'ยืนยันการย้ายฝ่าย',
      variant: 'primary',
      onConfirm: () => {
        if (onBulkChangeDept) {
          onBulkChangeDept(selectedUsernames, bulkTargetDeptId);
        } else {
          selectedUsernames.forEach(uname => {
            const u = users.find(x => x.username === uname);
            if (u) {
              const roles = u.roles && u.roles.length > 0 ? u.roles : [u.role];
              onUpdateUser(u.username, u.name, roles, bulkTargetDeptId, u.status);
            }
          });
        }
        onToastAlert(`ย้ายผู้ใช้งานจำนวน ${selectedUsernames.length} บัญชี ไปยัง '${targetDept?.name}' สำเร็จ`, 'success');
        setBulkDeptModalOpen(false);
        setSelectedUsernames([]);
      }
    });
  };

  const handleBulkResetPasswordConfirm = () => {
    if (currentUser?.username !== 'admin') {
      onToastAlert('สิทธิ์ในการรีเซ็ตรหัสผ่าน จำกัดเฉพาะ Super Admin เท่านั้น', 'error');
      return;
    }
    if (!bulkNewPassword || bulkNewPassword.length < 4) {
      setBulkPwError('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร');
      return;
    }

    onRequestConfirm({
      title: 'ยืนยันการรีเซ็ตรหัสผ่านแบบกลุ่ม',
      message: `คุณต้องการเปลี่ยนรหัสผ่านของผู้ใช้งานที่เลือกจำนวน ${selectedUsernames.length} บัญชี เป็นรหัสผ่านใหม่นี้หรือไม่?`,
      confirmText: 'ยืนยันเปลี่ยนรหัสผ่าน',
      variant: 'warning',
      onConfirm: () => {
        if (onBulkResetPassword) {
          onBulkResetPassword(selectedUsernames, bulkNewPassword);
        } else {
          selectedUsernames.forEach(uname => {
            onResetPassword(uname, bulkNewPassword);
          });
        }
        onToastAlert(`รีเซ็ตรหัสผ่านให้แก่ผู้ใช้จำนวน ${selectedUsernames.length} บัญชี เรียบร้อยแล้ว`, 'success');
        setBulkPasswordModalOpen(false);
        setBulkNewPassword('');
        setBulkPwError('');
        setSelectedUsernames([]);
      }
    });
  };

  const handleBulkSetStatus = (status: User['status'], label: string) => {
    if (currentUser?.username !== 'admin') {
      onToastAlert('สิทธิ์ในการเปลี่ยนสถานะ จำกัดเฉพาะ Super Admin เท่านั้น', 'error');
      return;
    }
    const safeSelected = selectedUsernames.filter(u => u !== 'admin');
    if (safeSelected.length === 0) {
      onToastAlert('ไม่สามารถแก้ไขสถานะของบัญชี Super Admin ได้', 'error');
      return;
    }

    onRequestConfirm({
      title: `ยืนยันการปรับสถานะเป็น '${label}'`,
      message: `คุณต้องการปรับสถานะของผู้ใช้งานจำนวน ${safeSelected.length} บัญชี เป็น '${label}' หรือไม่?`,
      confirmText: `ปรับสถานะเป็น ${label}`,
      variant: status === 'inactive' ? 'danger' : 'primary',
      onConfirm: () => {
        if (onBulkChangeStatus) {
          onBulkChangeStatus(safeSelected, status);
        } else {
          safeSelected.forEach(uname => {
            const u = users.find(x => x.username === uname);
            if (u) {
              const roles = u.roles && u.roles.length > 0 ? u.roles : [u.role];
              onUpdateUser(u.username, u.name, roles, u.deptId, status);
            }
          });
        }
        onToastAlert(`ปรับสถานะของผู้ใช้ ${safeSelected.length} บัญชี เป็น '${label}' เรียบร้อยแล้ว`, 'success');
        setSelectedUsernames([]);
      }
    });
  };

  const handleBulkDelete = () => {
    if (currentUser?.username !== 'admin') {
      onToastAlert('สิทธิ์ในการลบผู้ใช้งาน จำกัดเฉพาะ Super Admin เท่านั้น', 'error');
      return;
    }
    const safeSelected = selectedUsernames.filter(u => u !== 'admin' && u !== currentUser?.username);
    if (safeSelected.length === 0) {
      onToastAlert('ไม่สามารถลบบัญชี Super Admin หรือบัญชีที่กำลังเข้าสู่ระบบอยู่ได้', 'error');
      return;
    }

    onRequestConfirm({
      title: 'ยืนยันการลบบัญชีผู้ใช้งานออกจากระบบ',
      message: `คำเตือน: คุณต้องการลบบัญชีผู้ใช้งานจำนวน ${safeSelected.length} บัญชี ออกจากระบบอย่างถาวรหรือไม่?`,
      confirmText: `ลบ ${safeSelected.length} บัญชี`,
      variant: 'danger',
      onConfirm: () => {
        if (onBulkDeleteUsers) {
          onBulkDeleteUsers(safeSelected);
        } else {
          onToastAlert(`ลบผู้ใช้งานจำนวน ${safeSelected.length} บัญชี สำเร็จ`, 'success');
        }
        setSelectedUsernames([]);
      }
    });
  };

  const roleLabelMap: Record<UserRole, string> = {
    staff: 'ผู้ขอ',
    head: 'หัวหน้ากลุ่มงาน/ฝ่าย',
    proc: 'เจ้าหน้าที่พัสดุ',
    prochead: 'หัวหน้าฝ่ายพัสดุ',
    exec: 'ผู้บริหาร',
    admin: 'ผู้ดูแลระบบ'
  };

  return (
    <div className="space-y-5">
      {/* Merged Control Panel */}
      <TableControlPanel
        title="รายชื่อผู้ใช้งานทั้งหมดในระบบ"
        categoryLabel={activeCategoryLabel}
        fiscalYear={fiscalYear}
        totalCount={sortedUsers.length}
        searchTerm={searchTerm}
        searchPlaceholder="ค้นหาชื่อ หรือ Username..."
        onSearchChange={term => {
          setSearchTerm(term);
          setCurrentPage(1);
        }}
      />

      {/* Work Group & Department Filter Pills Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs space-y-3">
        {/* Row 1: กลุ่มงาน */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 shrink-0 pr-1">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
            <span>กลุ่มงาน:</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedWgId('all');
              setSelectedDeptId('all');
              setCurrentPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none ${
              selectedWgId === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-indigo-50/70 text-indigo-900 hover:bg-indigo-100/80 border border-indigo-100'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${selectedWgId === 'all' ? 'bg-slate-300' : 'bg-indigo-500'}`} />
            <span>ทั้งหมดทุกกลุ่มงาน</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${selectedWgId === 'all' ? 'bg-white/20 text-white' : 'bg-indigo-200/60 text-indigo-950'}`}>
              {users.length}
            </span>
          </button>

          {workGroupsList.map(wg => {
            const isSelected = selectedWgId === wg.id;
            const count = getWgUserCount(wg.id);
            return (
              <button
                key={wg.id}
                type="button"
                onClick={() => {
                  setSelectedWgId(wg.id);
                  const deptsInWg = departmentsList.filter(d => d.workGroupId === wg.id);
                  if (!deptsInWg.some(d => d.id === selectedDeptId)) {
                    setSelectedDeptId('all');
                  }
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-indigo-50/50 text-indigo-900 hover:bg-indigo-100/70 border border-indigo-100/80'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-500'}`} />
                <span>{wg.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${isSelected ? 'bg-white/25 text-white' : 'bg-indigo-200/50 text-indigo-950'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Row 2: ฝ่าย / แผนก */}
        <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 shrink-0 pr-1">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-600"></span>
            <span>ฝ่าย/แผนก:</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedDeptId('all');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none ${
              selectedDeptId === 'all'
                ? 'bg-slate-800 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${selectedDeptId === 'all' ? 'bg-slate-300' : 'bg-slate-400'}`} />
            <span>ทั้งหมดทุกฝ่าย/แผนก</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${selectedDeptId === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'}`}>
              {getDeptUserCount('all')}
            </span>
          </button>

          {availableDepts.map(d => {
            const isSelected = selectedDeptId === d.id;
            const count = getDeptUserCount(d.id);
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  setSelectedDeptId(d.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                  isSelected
                    ? 'bg-cyan-600 text-white shadow-2xs'
                    : 'bg-cyan-50/50 text-cyan-900 hover:bg-cyan-100/70 border border-cyan-100'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-cyan-500'}`} />
                <span>{d.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${isSelected ? 'bg-white/25 text-white' : 'bg-cyan-200/50 text-cyan-950'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Floating / Sticky Bulk Action Bar for Selected Users */}
      {selectedUsernames.length > 0 && (
        <div className="bg-indigo-950 text-white border border-indigo-700/60 rounded-2xl p-3.5 shadow-xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-sm shrink-0">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>เลือกแล้ว <span className="text-amber-300 font-extrabold text-sm">{selectedUsernames.length}</span> รายการ</span>
                <span className="text-indigo-400">|</span>
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="text-[11px] text-indigo-300 hover:text-white underline cursor-pointer"
                >
                  เลือกทั้งหมดตามตัวกรอง ({sortedUsers.length} รายการ)
                </button>
              </div>
              <div className="text-[11px] text-indigo-300">
                เลือกคำสั่งที่ต้องการทำกับผู้ใช้ที่เลือกไว้
              </div>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleBulkApprove}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="อนุมัติผู้ใช้ที่เลือก (สำหรับสถานะ Pending)"
            >
              <UserCheck className="w-3.5 h-3.5" />
              อนุมัติที่เลือก
            </button>

            <button
              type="button"
              onClick={() => setBulkDeptModalOpen(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="เปลี่ยนกลุ่มงาน / ฝ่ายพร้อมกัน"
            >
              <Building2 className="w-3.5 h-3.5" />
              ย้ายฝ่าย
            </button>

            <button
              type="button"
              onClick={() => {
                setBulkPasswordModalOpen(true);
                setBulkNewPassword('');
                setBulkPwError('');
              }}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="รีเซ็ตรหัสผ่านแบบกลุ่ม"
            >
              <KeyRound className="w-3.5 h-3.5" />
              รีเซ็ตรหัสผ่าน
            </button>

            <button
              type="button"
              onClick={() => handleBulkSetStatus('inactive', 'ระงับการใช้งาน')}
              className="px-2.5 py-1.5 bg-rose-900/80 hover:bg-rose-800 text-rose-200 border border-rose-700 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="ระงับการใช้งานที่เลือก"
            >
              <Lock className="w-3.5 h-3.5" />
              ระงับใช้งาน
            </button>

            <button
              type="button"
              onClick={handleBulkDelete}
              className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="ลบผู้ใช้ที่เลือกออกจากระบบ"
            >
              <Trash2 className="w-3.5 h-3.5" />
              ลบ
            </button>

            <button
              type="button"
              onClick={handleClearSelection}
              className="px-2.5 py-1.5 bg-indigo-900 hover:bg-indigo-800 text-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ml-1"
            >
              <X className="w-3.5 h-3.5" />
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* Users Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
        {pendingCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl text-xs font-bold flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>มีผู้สมัครใหม่รอการอนุมัติสิทธิ์ {pendingCount} บัญชี</span>
            </div>
            {currentUser?.username === 'admin' && (
              <button
                type="button"
                onClick={() => {
                  const pendingUsernames = users.filter(u => u.status === 'pending').map(u => u.username);
                  setSelectedUsernames(pendingUsernames);
                }}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
              >
                เลือกทั้งหมดที่รออนุมัติ ({pendingCount})
              </button>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-base text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase font-mono text-sm border-b border-slate-200 select-none">
              <tr>
                {/* Select All Checkbox Header */}
                <th className="p-2.5 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleToggleSelectAllPage}
                    className="p-1 rounded hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer flex items-center justify-center"
                    title={isAllPageSelected ? 'ยกเลิกการเลือกหน้านี้' : 'เลือกทั้งหมดในหน้านี้'}
                  >
                    {isAllPageSelected ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                    ) : isSomePageSelected ? (
                      <MinusSquare className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </th>
                <th 
                  onClick={() => handleHeaderSort('name')}
                  className="p-2.5 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>ชื่อ-นามสกุล</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleHeaderSort('username')}
                  className="p-2.5 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>ชื่อผู้ใช้ (Username)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleHeaderSort('role')}
                  className="p-2.5 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>บทบาท (Role)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleHeaderSort('deptId')}
                  className="p-2.5 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>หน่วยงาน / แผนก</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleHeaderSort('status')}
                  className="p-2.5 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>สถานะ</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-2.5 text-right w-48 whitespace-nowrap">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageUsers.map(u => {
                const isEditing = editingUsername === u.username;
                const userRolesList = u.roles && u.roles.length > 0 ? u.roles : [u.role];
                const isLockedSuperAdmin = u.username === 'admin' && currentUser?.username !== 'admin';
                const isSelected = selectedUsernames.includes(u.username);

                return (
                  <tr 
                    key={u.username} 
                    className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-indigo-50/40' : ''}`}
                  >
                    {/* Row Checkbox */}
                    <td className="p-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleSelectUser(u.username)}
                        className="p-1 rounded hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer flex items-center justify-center"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </td>

                    <td className="p-2.5 font-bold text-slate-900">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:outline-none focus:border-indigo-600 font-bold"
                        />
                      ) : (
                        u.name
                      )}
                    </td>

                    <td className="p-2.5 font-mono text-slate-600">{u.username}</td>

                    <td className="p-2.5 font-medium text-slate-800">
                      {isEditing ? (
                        <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 min-w-[240px]">
                          <div className="text-[10px] font-bold text-slate-500">เลือกบทบาท (เลือกได้มากกว่า 1)</div>
                          <div className="grid grid-cols-2 gap-1">
                            {(['staff', 'head', 'proc', 'prochead', 'exec', 'admin'] as UserRole[]).map(r => {
                              const checked = editRoles.includes(r);
                              return (
                                <label
                                  key={r}
                                  className={`px-2 py-1 rounded-lg text-[10.5px] font-bold cursor-pointer transition-all border flex items-center gap-1.5 select-none ${
                                    checked
                                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={e => {
                                      if (e.target.checked) {
                                        setEditRoles(prev => [...prev, r]);
                                      } else {
                                        if (editRoles.length <= 1) {
                                          onToastAlert('ผู้ใช้งานต้องมีอย่างน้อย 1 บทบาท', 'error');
                                          return;
                                        }
                                        setEditRoles(prev => prev.filter(x => x !== r));
                                      }
                                    }}
                                    className="w-3 h-3 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 shrink-0"
                                  />
                                  <span className="truncate">{roleLabelMap[r]}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1 items-center">
                          {userRolesList.map(r => (
                            <span 
                              key={r} 
                              className={`px-2.5 py-0.5 rounded-full font-bold text-[10.5px] border ${
                                u.username === 'admin' && r === 'admin'
                                  ? 'bg-purple-900 text-purple-100 border-purple-700 shadow-xs'
                                  : r === 'admin' 
                                  ? 'bg-purple-100 text-purple-900 border-purple-300' 
                                  : r === 'prochead' || r === 'proc'
                                  ? 'bg-cyan-50 text-cyan-800 border-cyan-200'
                                  : r === 'head'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : r === 'exec'
                                  ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                                  : 'bg-slate-100 text-slate-800 border-slate-200'
                              }`}
                            >
                              {u.username === 'admin' && r === 'admin' ? 'ผู้ดูแลระบบสูงสุด (Super Admin)' : (roleLabelMap[r] || r)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="p-2.5 text-slate-700">
                      {isEditing ? (
                        <select
                          value={editDeptId}
                          onChange={e => setEditDeptId(e.target.value)}
                          className="px-2 py-1 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:border-indigo-600 font-medium"
                        >
                          {departmentsList.map(d => {
                            const wg = workGroupsList.find(w => w.id === d.workGroupId);
                            return (
                              <option key={d.id} value={d.id}>
                                {d.name} {wg ? `(${wg.name})` : ''}
                              </option>
                            );
                          })}
                        </select>
                      ) : (
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900">
                            {departmentsList.find(d => d.id === u.deptId)?.name || deptName(u.deptId)}
                          </div>
                          {(() => {
                            const d = departmentsList.find(x => x.id === u.deptId);
                            const wg = d ? workGroupsList.find(w => w.id === d.workGroupId) : null;
                            return wg ? (
                              <div className="text-[10px] text-indigo-700 font-semibold flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-indigo-500" />
                                <span>{wg.name}</span>
                              </div>
                            ) : null;
                          })()}
                        </div>
                      )}
                    </td>

                    <td className="p-2.5 text-center">
                      {isLockedSuperAdmin ? (
                        <div className="px-2.5 py-1 inline-flex items-center gap-1 bg-purple-50 text-purple-800 border border-purple-150 rounded-full text-[10.5px] font-bold">
                          <Lock className="w-3 h-3 text-purple-600" />
                          <span>อนุมัติแล้ว (สิทธิ์ระบบสูงสุด)</span>
                        </div>
                      ) : isEditing ? (
                        <select
                          value={editStatus}
                          onChange={e => setEditStatus(e.target.value as User['status'])}
                          className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold focus:outline-none focus:border-indigo-600 cursor-pointer shadow-2xs"
                        >
                          <option value="approved">อนุมัติแล้ว</option>
                          <option value="active">อนุมัติแล้ว (Active)</option>
                          <option value="pending">รอการอนุมัติ</option>
                          <option value="inactive">ระงับการใช้งาน</option>
                        </select>
                      ) : (
                        <select
                          value={u.status === 'active' ? 'approved' : u.status}
                          disabled={currentUser?.username !== 'admin'}
                          onChange={e => {
                            if (currentUser?.username !== 'admin') {
                              onToastAlert('สิทธิ์ในการเปลี่ยนสถานะผู้ใช้งาน จำกัดเฉพาะบัญชี Super Admin (ผู้ดูแลระบบสูงสุด) เท่านั้น', 'error');
                              return;
                            }
                            const newSt = e.target.value as User['status'];
                            const userRoles = u.roles && u.roles.length > 0 ? u.roles : [u.role];
                            onUpdateUser(u.username, u.name, userRoles, u.deptId, newSt);
                            const labelMap: Record<string, string> = {
                              approved: 'อนุมัติแล้ว',
                              active: 'อนุมัติแล้ว',
                              pending: 'รอการอนุมัติ',
                              inactive: 'ระงับการใช้งาน'
                            };
                            onToastAlert(`เปลี่ยนสถานะของผู้ใช้ '${u.name}' เป็น '${labelMap[newSt] || newSt}' เรียบร้อยแล้ว`, 'success');
                          }}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all outline-none ${
                            currentUser?.username !== 'admin' ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
                          } ${
                            u.status === 'approved' || u.status === 'active'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                              : u.status === 'inactive'
                              ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                              : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          <option value="approved" className="bg-white text-slate-800">✓ อนุมัติแล้ว</option>
                          <option value="pending" className="bg-white text-slate-800">⏳ รอการอนุมัติ</option>
                          <option value="inactive" className="bg-white text-slate-800">⛔ ระงับการใช้งาน</option>
                        </select>
                      )}
                    </td>

                    <td className="p-2.5 text-right whitespace-nowrap">
                      {u.status === 'pending' ? (
                        currentUser?.username === 'admin' ? (
                          <button
                            type="button"
                            onClick={() => handleApprove(u)}
                            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-2xs transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5 shrink-0" />
                            <span className="whitespace-nowrap">อนุมัติสิทธิ์</span>
                          </button>
                        ) : (
                          <div className="flex items-center justify-end gap-1 text-slate-450 font-sans">
                            <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-[10px] font-bold">รอ Super Admin</span>
                          </div>
                        )
                      ) : isEditing ? (
                        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap shrink-0">
                          <button
                            type="button"
                            onClick={() => saveEdit(u.username)}
                            className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-2xs transition-colors shrink-0 cursor-pointer"
                            title="บันทึก"
                          >
                            <Check className="w-3.5 h-3.5 shrink-0" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingUsername(null)}
                            className="p-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 shadow-2xs transition-colors shrink-0 cursor-pointer"
                            title="ยกเลิก"
                          >
                            <X className="w-3.5 h-3.5 shrink-0" />
                          </button>
                        </div>
                      ) : isLockedSuperAdmin ? (
                        <div className="flex items-center justify-end gap-1 text-slate-400 font-sans">
                          <Lock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span className="text-purple-700 bg-purple-50 border border-purple-150 px-2 py-0.5 rounded-lg text-[10px] font-bold">คุ้มครองโดยระบบสูงสุด</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap flex-nowrap shrink-0">
                          {currentUser?.username === 'admin' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenResetPasswordModal(u)}
                                className="px-2 py-1 text-xs font-bold text-amber-700 hover:text-amber-800 hover:bg-amber-50 border border-amber-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                title="ตั้งรหัสผ่านใหม่ให้ผู้ใช้งานนี้"
                              >
                                <Key className="w-3.5 h-3.5 text-amber-600" />
                                <span>รหัสผ่าน</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => startEdit(u)}
                                className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>แก้ไข</span>
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center justify-end gap-1 text-slate-400 font-sans">
                              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg text-[10px] font-bold">เฉพาะ Super Admin</span>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <PaginationBar
          pageSize={pageSize}
          currentPage={currentPage}
          totalItems={sortedUsers.length}
          onPageSizeChange={s => { setPageSize(s); setCurrentPage(1); }}
          onPageChange={p => setCurrentPage(p)}
        />
      </div>

      {/* Bulk Change Department Modal */}
      {bulkDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 px-5 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-300" />
                <h3 className="text-sm font-bold">ย้ายกลุ่มงาน / ฝ่ายผู้ใช้งานแบบกลุ่ม</h3>
              </div>
              <button
                type="button"
                onClick={() => setBulkDeptModalOpen(false)}
                className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 space-y-1">
                <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                  จำนวนผู้ใช้งานที่เลือก: {selectedUsernames.length} บัญชี
                </div>
                <div className="text-xs text-indigo-900 font-mono truncate">
                  {selectedUsernames.slice(0, 5).map(u => '@' + u).join(', ')}
                  {selectedUsernames.length > 5 ? ` และอีก ${selectedUsernames.length - 5} บัญชี...` : ''}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  เลือกกลุ่มงาน / ฝ่ายปลายทางที่ต้องการย้ายไป <span className="text-rose-500">*</span>
                </label>
                <select
                  value={bulkTargetDeptId}
                  onChange={e => setBulkTargetDeptId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {departmentsList.map(d => {
                    const wg = workGroupsList.find(w => w.id === d.workGroupId);
                    return (
                      <option key={d.id} value={d.id}>
                        {d.name} {wg ? `(${wg.name})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBulkDeptModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleBulkChangeDeptConfirm}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  ยืนยันการย้ายฝ่าย
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Reset Password Modal */}
      {bulkPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-5 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-200" />
                <h3 className="text-sm font-bold">รีเซ็ตรหัสผ่านผู้ใช้งานแบบกลุ่ม ({selectedUsernames.length} บัญชี)</h3>
              </div>
              <button
                type="button"
                onClick={() => setBulkPasswordModalOpen(false)}
                className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-1">
                <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                  จำนวนผู้ใช้ที่จะถูกเปลี่ยนรหัสผ่าน: {selectedUsernames.length} บัญชี
                </div>
                <div className="text-xs text-amber-900 font-mono truncate">
                  {selectedUsernames.slice(0, 5).map(u => '@' + u).join(', ')}
                  {selectedUsernames.length > 5 ? ` และอีก ${selectedUsernames.length - 5} บัญชี...` : ''}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  รหัสผ่านใหม่ร่วมกัน <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={bulkShowPassword ? 'text' : 'password'}
                    value={bulkNewPassword}
                    onChange={e => {
                      setBulkNewPassword(e.target.value);
                      if (bulkPwError) setBulkPwError('');
                    }}
                    placeholder="ป้อนรหัสผ่านใหม่ร่วมกัน (อย่างน้อย 4 ตัวอักษร)"
                    className={`w-full pl-9 pr-10 py-2.5 bg-slate-50 border ${
                      bulkPwError ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:border-amber-500 focus:ring-amber-100'
                    } rounded-xl text-xs font-medium focus:outline-none focus:ring-2 transition-all`}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setBulkShowPassword(!bulkShowPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {bulkShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {bulkPwError ? (
                  <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1 mt-1">
                    <X className="w-3 h-3" /> {bulkPwError}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-1">
                    รหัสผ่านนี้จะมีผลกับผู้ใช้งานทุกคนที่เลือกไว้ในครั้งนี้
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBulkPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleBulkResetPasswordConfirm}
                  disabled={!bulkNewPassword || bulkNewPassword.length < 4}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" />
                  ยืนยันเปลี่ยนรหัสผ่าน
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Reset Password Modal for Single User */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 px-5 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-200" />
                <h3 className="text-sm font-bold">รีเซ็ตรหัสผ่านผู้ใช้งาน (Super Admin)</h3>
              </div>
              <button
                type="button"
                onClick={() => setResetModalUser(null)}
                className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Target Details */}
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">บัญชีผู้ใช้งานที่เลือก</div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900">{resetModalUser.name}</div>
                    <div className="text-xs text-slate-500 font-mono">@{resetModalUser.username}</div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                      {roleLabelMap[resetModalUser.role] || resetModalUser.role}
                    </span>
                    <div className="text-[11px] text-slate-500 mt-1">{deptName(resetModalUser.deptId)}</div>
                  </div>
                </div>
              </div>

              {/* Password Input Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  รหัสผ่านใหม่ <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={modalNewPassword}
                    onChange={e => {
                      setModalNewPassword(e.target.value);
                      if (pwError) setPwError('');
                    }}
                    placeholder="ป้อนรหัสผ่านใหม่ (อย่างน้อย 4 ตัวอักษร)"
                    className={`w-full pl-9 pr-10 py-2.5 bg-slate-50 border ${
                      pwError ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:border-amber-500 focus:ring-amber-100'
                    } rounded-xl text-xs font-medium focus:outline-none focus:ring-2 transition-all`}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {pwError ? (
                  <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1 mt-1">
                    <X className="w-3 h-3" /> {pwError}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-1">
                    รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษรขึ้นไป
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPasswordReset}
                  disabled={!modalNewPassword || modalNewPassword.length < 4}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" />
                  ยืนยันตั้งรหัสผ่านใหม่
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
