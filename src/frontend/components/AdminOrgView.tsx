import React, { useState } from 'react';
import { CategoryId, Department, User, WorkGroup } from '../types';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../data/catalog';
import { 
  Building2, 
  FolderPlus, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  Layers, 
  Users as UsersIcon, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  FileText,
  Sparkles,
  Briefcase
} from 'lucide-react';

interface AdminOrgViewProps {
  workGroups: WorkGroup[];
  departments: Department[];
  users: User[];
  fiscalYear: string;
  onAddWorkGroup: (name: string, description?: string) => void;
  onUpdateWorkGroup: (id: string, name: string, description?: string) => void;
  onDeleteWorkGroup: (id: string) => void;
  onAddDepartment: (name: string, category: CategoryId, workGroupId: string) => void;
  onUpdateDepartment: (id: string, name: string, category: CategoryId, workGroupId: string) => void;
  onDeleteDepartment: (id: string) => void;
  onRequestConfirm: (opts: { title: string; message: string; confirmText?: string; variant?: 'primary' | 'danger' | 'warning'; onConfirm: () => void }) => void;
  onToastAlert: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminOrgView: React.FC<AdminOrgViewProps> = ({
  workGroups,
  departments,
  users,
  fiscalYear,
  onAddWorkGroup,
  onUpdateWorkGroup,
  onDeleteWorkGroup,
  onAddDepartment,
  onUpdateDepartment,
  onDeleteDepartment,
  onRequestConfirm,
  onToastAlert
}) => {
  // Active Filter / Selected Group
  const [selectedWgId, setSelectedWgId] = useState<string | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showWgModal, setShowWgModal] = useState(false);
  const [editingWg, setEditingWg] = useState<WorkGroup | null>(null);
  const [wgName, setWgName] = useState('');
  const [wgDesc, setWgDesc] = useState('');

  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptNameInput, setDeptNameInput] = useState('');
  const [deptCategory, setDeptCategory] = useState<CategoryId>('office');
  const [deptWgId, setDeptWgId] = useState<string>('');

  // Open Work Group Modal for Add or Edit
  const openAddWgModal = () => {
    setEditingWg(null);
    setWgName('');
    setWgDesc('');
    setShowWgModal(true);
  };

  const openEditWgModal = (wg: WorkGroup) => {
    setEditingWg(wg);
    setWgName(wg.name);
    setWgDesc(wg.description || '');
    setShowWgModal(true);
  };

  const handleSaveWorkGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wgName.trim()) {
      onToastAlert('กรุณากรอกชื่อกลุ่มงาน (*) ให้เรียบร้อย', 'error');
      return;
    }

    if (editingWg) {
      onUpdateWorkGroup(editingWg.id, wgName.trim(), wgDesc.trim());
      onToastAlert(`บันทึกการแก้ไขกลุ่มงาน '${wgName.trim()}' สำเร็จ`, 'success');
    } else {
      onAddWorkGroup(wgName.trim(), wgDesc.trim());
      onToastAlert(`เพิ่มกลุ่มงานใหม่ '${wgName.trim()}' เรียบร้อยแล้ว`, 'success');
    }
    setShowWgModal(false);
  };

  const handleDeleteWg = (wg: WorkGroup) => {
    const childDepts = departments.filter(d => d.workGroupId === wg.id);
    if (childDepts.length > 0) {
      onRequestConfirm({
        title: 'ไม่สามารถลบกลุ่มงานนี้ได้',
        message: `กลุ่มงาน '${wg.name}' มีฝ่าย/แผนกสังกัดอยู่จำนวน ${childDepts.length} รายการ กรุณาย้ายหรือลบฝ่าย/แผนกที่เกี่ยวข้องออกก่อน`,
        confirmText: 'รับทราบ',
        variant: 'warning',
        onConfirm: () => {}
      });
      return;
    }

    onRequestConfirm({
      title: 'ยืนยันการลบกลุ่มงาน',
      message: `คุณต้องการลบกลุ่มงาน '${wg.name}' ออกจากระบบหรือไม่?`,
      confirmText: 'ลบกลุ่มงาน',
      variant: 'danger',
      onConfirm: () => {
        onDeleteWorkGroup(wg.id);
        onToastAlert(`ลบกลุ่มงาน '${wg.name}' เรียบร้อยแล้ว`, 'info');
      }
    });
  };

  // Open Department Modal for Add or Edit
  const openAddDeptModal = (defaultWgId?: string) => {
    setEditingDept(null);
    setDeptNameInput('');
    setDeptCategory('office');
    setDeptWgId(defaultWgId || (workGroups[0]?.id || ''));
    setShowDeptModal(true);
  };

  const openEditDeptModal = (dept: Department) => {
    setEditingDept(dept);
    setDeptNameInput(dept.name);
    setDeptCategory(dept.category);
    setDeptWgId(dept.workGroupId || workGroups[0]?.id || '');
    setShowDeptModal(true);
  };

  const handleSaveDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptNameInput.trim()) {
      onToastAlert('กรุณากรอกชื่อฝ่าย/แผนก (*) ให้เรียบร้อย', 'error');
      return;
    }
    if (!deptWgId) {
      onToastAlert('กรุณาเลือกกลุ่มงานสังกัดให้เรียบร้อย', 'error');
      return;
    }

    if (editingDept) {
      onUpdateDepartment(editingDept.id, deptNameInput.trim(), deptCategory, deptWgId);
      onToastAlert(`บันทึกการแก้ไขฝ่าย/แผนก '${deptNameInput.trim()}' สำเร็จ`, 'success');
    } else {
      onAddDepartment(deptNameInput.trim(), deptCategory, deptWgId);
      onToastAlert(`เพิ่มฝ่าย/แผนกใหม่ '${deptNameInput.trim()}' เรียบร้อยแล้ว`, 'success');
    }
    setShowDeptModal(false);
  };

  const handleDeleteDept = (dept: Department) => {
    const userCount = users.filter(u => u.deptId === dept.id).length;
    if (userCount > 0) {
      onRequestConfirm({
        title: 'ยืนยันการลบฝ่าย/แผนกที่มีผู้ใช้งาน',
        message: `ฝ่าย/แผนก '${dept.name}' มีบัญชีผู้ใช้งานสังกัดอยู่จำนวน ${userCount} บัญชี หากลบฝ่ายนี้ บัญชีผู้ใช้งานที่เกี่ยวข้องจะถูกย้ายเป็นฝ่ายทั่วไป คุณต้องการลบหรือไม่?`,
        confirmText: 'ลบฝ่าย/แผนก',
        variant: 'danger',
        onConfirm: () => {
          onDeleteDepartment(dept.id);
          onToastAlert(`ลบฝ่าย/แผนก '${dept.name}' เรียบร้อยแล้ว`, 'info');
        }
      });
      return;
    }

    onRequestConfirm({
      title: 'ยืนยันการลบฝ่าย/แผนก',
      message: `คุณต้องการลบฝ่าย/แผนก '${dept.name}' ออกจากระบบหรือไม่?`,
      confirmText: 'ลบฝ่าย/แผนก',
      variant: 'danger',
      onConfirm: () => {
        onDeleteDepartment(dept.id);
        onToastAlert(`ลบฝ่าย/แผนก '${dept.name}' เรียบร้อยแล้ว`, 'info');
      }
    });
  };

  // Filtered departments
  const filteredDepartments = departments.filter(d => {
    const matchesWg = selectedWgId === 'all' || d.workGroupId === selectedWgId;
    const matchesSearch = !searchTerm.trim() || 
      d.name.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
      workGroups.find(wg => wg.id === d.workGroupId)?.name.toLowerCase().includes(searchTerm.toLowerCase().trim());
    return matchesWg && matchesSearch;
  });

  // Calculate largest group
  const wgDeptCounts = workGroups.map(wg => ({
    wg,
    count: departments.filter(d => d.workGroupId === wg.id).length
  }));
  const largestGroup = wgDeptCounts.sort((a, b) => b.count - a.count)[0];

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Overview Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white p-4 rounded-2xl shadow-sm relative overflow-hidden flex items-center justify-between">
          <div className="space-y-1 relative z-10">
            <span className="text-xs text-indigo-100 font-semibold flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-indigo-200" />
              กลุ่มงานทั้งหมด (Work Groups)
            </span>
            <div className="text-2xl font-black font-mono">{workGroups.length} <span className="text-sm font-normal text-indigo-200">กลุ่มงาน</span></div>
          </div>
          <Building2 className="w-16 h-16 absolute -right-3 -bottom-3 text-white/10" />
        </div>

        <div className="bg-gradient-to-br from-teal-600 to-emerald-700 text-white p-4 rounded-2xl shadow-sm relative overflow-hidden flex items-center justify-between">
          <div className="space-y-1 relative z-10">
            <span className="text-xs text-teal-100 font-semibold flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-teal-200" />
              ฝ่าย / แผนก ทั้งหมด (Divisions)
            </span>
            <div className="text-2xl font-black font-mono">{departments.length} <span className="text-sm font-normal text-teal-200">ฝ่าย/แผนก</span></div>
          </div>
          <Layers className="w-16 h-16 absolute -right-3 -bottom-3 text-white/10" />
        </div>

        <div className="bg-gradient-to-br from-purple-600 to-indigo-800 text-white p-4 rounded-2xl shadow-sm relative overflow-hidden flex items-center justify-between">
          <div className="space-y-1 relative z-10 min-w-0 pr-2">
            <span className="text-xs text-purple-200 font-semibold flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-purple-300" />
              กลุ่มงานที่มีฝ่ายมากที่สุด
            </span>
            <div className="text-base font-bold truncate">
              {largestGroup ? largestGroup.wg.name : '-'}
            </div>
            <div className="text-xs text-purple-200 font-mono">
              {largestGroup ? `${largestGroup.count} ฝ่าย/แผนกสังกัด` : ''}
            </div>
          </div>
          <Sparkles className="w-16 h-16 absolute -right-3 -bottom-3 text-white/10" />
        </div>
      </div>

      {/* Main Grid: Left = Work Groups List, Right = Department/Divisions Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Work Groups List (กลุ่มงาน) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3.5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>รายชื่อกลุ่มงาน (Work Groups)</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                1 กลุ่มงาน สามารถมีได้หลายฝ่าย/แผนก
              </p>
            </div>
            <button
              type="button"
              onClick={openAddWgModal}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มกลุ่มงาน</span>
            </button>
          </div>

          {/* Quick Filter: All vs Specific Work Group */}
          <div className="space-y-2 flex-1 overflow-y-auto max-h-[580px] pr-1">
            <button
              type="button"
              onClick={() => setSelectedWgId('all')}
              className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                selectedWgId === 'all'
                  ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200 shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg font-bold text-xs ${selectedWgId === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900">แสดงทุกกลุ่มงาน (ทั้งหมด)</div>
                  <div className="text-[10px] text-slate-500">แสดงฝ่าย/แผนกจากทุกกลุ่มงาน ({departments.length} ฝ่าย)</div>
                </div>
              </div>
              <span className={`text-xs font-extrabold font-mono px-2 py-0.5 rounded-md ${selectedWgId === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {departments.length}
              </span>
            </button>

            {workGroups.map(wg => {
              const count = departments.filter(d => d.workGroupId === wg.id).length;
              const isSelected = selectedWgId === wg.id;

              return (
                <div
                  key={wg.id}
                  className={`p-3 rounded-xl border transition-all flex flex-col gap-2 relative ${
                    isSelected
                      ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-300/80 shadow-2xs'
                      : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedWgId(wg.id)}
                      className="flex-1 text-left cursor-pointer space-y-0.5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{wg.name}</span>
                        <span className="text-[10px] font-bold font-mono px-2 py-0.2 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                          {count} ฝ่าย/แผนก
                        </span>
                      </div>
                      {wg.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-1">{wg.description}</p>
                      )}
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditWgModal(wg)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="แก้ไขชื่อ/รายละเอียดกลุ่มงาน"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteWg(wg)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="ลบกลุ่มงาน"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100/80">
                    <button
                      type="button"
                      onClick={() => openAddDeptModal(wg.id)}
                      className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>เพิ่มฝ่ายในกลุ่มนี้</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedWgId(wg.id)}
                      className="text-slate-400 hover:text-slate-700 flex items-center gap-0.5"
                    >
                      <span>ดูฝ่ายทั้งหมด</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Departments & Divisions Table (ฝ่าย/แผนก) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3.5 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-600" />
                <span>รายชื่อฝ่าย / แผนก (Divisions & Departments)</span>
                <span className="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                  {filteredDepartments.length} รายการ
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                {selectedWgId === 'all' 
                  ? 'แสดงฝ่าย/แผนกทั้งหมดในระบบ' 
                  : `กำลังแสดงเฉพาะฝ่าย/แผนกใน: ${workGroups.find(w => w.id === selectedWgId)?.name || ''}`
                }
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openAddDeptModal(selectedWgId !== 'all' ? selectedWgId : undefined)}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มฝ่าย / แผนก</span>
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อฝ่าย, แผนก หรือกลุ่มงาน..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 focus:bg-white focus:ring-1 focus:ring-teal-600"
            />
          </div>

          {/* Departments Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden flex-1 min-h-[380px]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-base">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-sm">
                  <tr>
                    <th className="p-3">ลำดับ</th>
                    <th className="p-3">ชื่อฝ่าย / แผนก</th>
                    <th className="p-3">สังกัดกลุ่มงาน</th>
                    <th className="p-3">หมวดพัสดุหลัก</th>
                    <th className="p-3 text-center">ผู้ใช้งาน</th>
                    <th className="p-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDepartments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 space-y-2">
                        <FolderPlus className="w-8 h-8 mx-auto text-slate-300" />
                        <div>ไม่พบรายการฝ่าย/แผนกที่ค้นหา</div>
                      </td>
                    </tr>
                  ) : (
                    filteredDepartments.map((dept, idx) => {
                      const wgObj = workGroups.find(w => w.id === dept.workGroupId);
                      const userCount = users.filter(u => u.deptId === dept.id).length;

                      return (
                        <tr key={dept.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                          <td className="p-3 font-bold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <span>{dept.name}</span>
                              {dept.id.startsWith('ipd') || dept.id === 'delivery' || dept.id === 'imc' ? (
                                <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-1.5 py-0.2 rounded border border-rose-200">
                                  การพยาบาล
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="p-3 text-slate-700">
                            {wgObj ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                <Building2 className="w-3 h-3 text-indigo-600 shrink-0" />
                                {wgObj.name}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">ไม่ได้ระบุ</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-600">
                            <span className="bg-slate-100 text-slate-700 text-[11px] px-2 py-0.5 rounded-md font-medium">
                              {CATEGORY_LABELS[dept.category] || dept.category}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`font-mono font-bold px-2 py-0.5 rounded-full text-[11px] ${
                              userCount > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {userCount} คน
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditDeptModal(dept)}
                                className="p-1.5 text-slate-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                                title="แก้ไขฝ่าย/แผนก"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteDept(dept)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="ลบฝ่าย/แผนก"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Add/Edit Work Group (กลุ่มงาน) */}
      {showWgModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>{editingWg ? 'แก้ไขข้อมูลกลุ่มงาน' : 'เพิ่มกลุ่มงานใหม่'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowWgModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveWorkGroup} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อกลุ่มงาน <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={wgName}
                  onChange={e => setWgName(e.target.value)}
                  placeholder="เช่น กลุ่มการพยาบาล, กลุ่มงานบริหารทั่วไป"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:bg-white font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  คำอธิบายเพิ่มเติม / ขอบเขตงาน
                </label>
                <textarea
                  value={wgDesc}
                  onChange={e => setWgDesc(e.target.value)}
                  placeholder="เช่น ดูแลการรักษา พยาบาล หอผู้ป่วย ห้องคลอด และห้องผ่าตัด"
                  rows={3}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:bg-white font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowWgModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer transition-all shadow-xs"
                >
                  {editingWg ? 'บันทึกการแก้ไข' : 'เพิ่มกลุ่มงาน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Department / Division (ฝ่าย/แผนก) */}
      {showDeptModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-600" />
                <span>{editingDept ? 'แก้ไขข้อมูลฝ่าย / แผนก' : 'เพิ่มฝ่าย / แผนกใหม่'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowDeptModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDepartment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อฝ่าย / แผนก <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={deptNameInput}
                  onChange={e => setDeptNameInput(e.target.value)}
                  placeholder="เช่น ผู้ป่วยใน 1, ผู้ป่วยใน 2, ผู้ป่วยใน IMC, ห้องคลอด"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 focus:bg-white font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  สังกัดกลุ่มงาน <span className="text-rose-500">*</span>
                </label>
                <select
                  value={deptWgId}
                  onChange={e => setDeptWgId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 focus:bg-white font-medium cursor-pointer"
                  required
                >
                  {workGroups.map(wg => (
                    <option key={wg.id} value={wg.id}>
                      {wg.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  หมวดหมู่พัสดุหลักของฝ่าย
                </label>
                <select
                  value={deptCategory}
                  onChange={e => setDeptCategory(e.target.value as CategoryId)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 focus:bg-white font-medium cursor-pointer"
                >
                  {CATEGORY_ORDER.map(cat => (
                    <option key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl cursor-pointer transition-all shadow-xs"
                >
                  {editingDept ? 'บันทึกการแก้ไข' : 'เพิ่มฝ่าย / แผนก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
