import React, { useState } from 'react';
import { CategoryId, Department, User, UserRole, WorkGroup } from '../types';
import { CATEGORY_LABELS, CATEGORY_ORDER, DEPARTMENTS, INITIAL_WORK_GROUPS, deptName } from '../data/catalog';
import { PaginationBar } from './PaginationBar';
import { TableControlPanel, SortOption } from './TableControlPanel';
import { UserCheck, Edit3, Key, Check, X, Shield, Users as UsersIcon, ArrowUpDown, Eye, EyeOff, Lock, Building2 } from 'lucide-react';

interface AdminUsersViewProps {
  users: User[];
  departments?: Department[];
  workGroups?: WorkGroup[];
  fiscalYear: string;
  onApproveUser: (username: string) => void;
  onUpdateUser: (username: string, name: string, roles: UserRole[], deptId: string, status?: User['status']) => void;
  onResetPassword: (username: string, newPassword: string) => void;
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
  onRequestConfirm,
  onToastAlert,
  currentUser
}) => {
  const departmentsList = departments || DEPARTMENTS;
  const workGroupsList = workGroups || INITIAL_WORK_GROUPS;
  const [editingUsername, setEditingUsername] = useState<string | null>(null);
  
  // Dedicated Password Reset Modal State
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

  const roleLabelMap: Record<UserRole, string> = {
    staff: 'ผู้ขอ',
    head: 'หัวหน้ากลุ่มงาน/ฝ่าย',
    proc: 'เจ้าหน้าที่พัสดุ',
    prochead: 'หัวหน้าฝ่ายพัสดุ',
    exec: 'ผู้บริหาร',
    admin: 'ผู้ดูแลระบบ'
  };

  // Pagination slice
  const numericSize = pageSize === 'all' ? sortedUsers.length || 1 : pageSize;
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(sortedUsers.length / numericSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageUsers = pageSize === 'all' ? sortedUsers : sortedUsers.slice((safePage - 1) * numericSize, safePage * numericSize);

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

      {/* Work Group & Department Filter Pills Bar (Image 2 Style) */}
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
              {getWgUserCount('all')}
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

      {/* Users Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
        {pendingCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            มีผู้สมัครใหม่รอการอนุมัติสิทธิ์ {pendingCount} บัญชี
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-base text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase font-mono text-sm border-b border-slate-200 select-none">
              <tr>
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

                return (
                  <tr key={u.username} className="hover:bg-slate-50/80 transition-colors">
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
                                className="px-2.5 py-1 text-slate-700 hover:text-amber-800 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-[11px] font-semibold cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
                                title="รีเซ็ตรหัสผ่าน"
                              >
                                <Key className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span className="whitespace-nowrap">รีเซ็ตรหัสผ่าน</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => startEdit(u)}
                                className="px-2.5 py-1 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-[11px] font-semibold cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
                                title="แก้ไขข้อมูล"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                <span className="whitespace-nowrap">แก้ไข</span>
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center gap-1 text-slate-400 font-sans">
                              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-[10px] font-bold">เฉพาะ Super Admin</span>
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

      {/* Redesigned Beautiful Reset Password Modal Overlay */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl border border-white/20">
                  <Key className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">เปลี่ยนรหัสผ่านผู้ใช้งาน</h3>
                  <p className="text-xs text-amber-100 mt-0.5">กำหนดรหัสผ่านใหม่สำหรับผู้ใช้งานในระบบ</p>
                </div>
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
