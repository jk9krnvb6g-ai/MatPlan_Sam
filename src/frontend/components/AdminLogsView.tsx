import React, { useState } from 'react';
import { LogEntry, User } from '../types';
import { PaginationBar } from './PaginationBar';
import { TableControlPanel } from './TableControlPanel';
import { 
  History, 
  Search, 
  Trash2, 
  Filter, 
  FileClock, 
  User as UserIcon, 
  Calendar, 
  Layers, 
  Info,
  Database,
  Download
} from 'lucide-react';

interface AdminLogsViewProps {
  logs: LogEntry[];
  currentUser: User;
  onRequestConfirm: (opts: { 
    title: string; 
    message: string; 
    confirmText?: string; 
    variant?: 'primary' | 'danger' | 'warning'; 
    onConfirm: () => void; 
  }) => void;
  onClearLogs: () => void;
  onToastAlert: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminLogsView: React.FC<AdminLogsViewProps> = ({
  logs,
  currentUser,
  onRequestConfirm,
  onClearLogs,
  onToastAlert
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedActionType, setSelectedActionType] = useState<string>('all');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(15);

  const actionTypes = [
    { value: 'all', label: 'ทุกประเภท' },
    { value: 'add', label: '➕ เพิ่มข้อมูล' },
    { value: 'edit', label: '📝 แก้ไขข้อมูล' },
    { value: 'delete', label: '❌ ลบข้อมูล' },
    { value: 'status_change', label: '🔄 เปลี่ยนสถานะ' },
    { value: 'auth', label: '🔑 การเข้าสู่ระบบ' },
    { value: 'other', label: '⚙️ อื่นๆ' },
  ];

  const modules = [
    { value: 'all', label: 'ทุกส่วนงาน' },
    { value: 'users', label: '👤 บัญชีผู้ใช้งาน' },
    { value: 'materials', label: '📦 แค็ตตาล็อกวัสดุ' },
    { value: 'custom_category', label: '🏷️ หมวดหมู่ประเภทวัสดุ' },
    { value: 'org', label: '🏢 กลุ่มงานและฝ่าย' },
    { value: 'requests', label: '📋 รายการขอวัสดุ' },
    { value: 'system', label: '⚙️ ระบบ' },
  ];

  const getActionBadgeStyle = (type: string) => {
    switch (type) {
      case 'add':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'edit':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'delete':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'status_change':
        return 'bg-cyan-50 text-cyan-800 border-cyan-200';
      case 'auth':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-800 border-slate-200';
    }
  };

  const getActionLabel = (type: string) => {
    switch (type) {
      case 'add': return 'เพิ่มข้อมูล';
      case 'edit': return 'แก้ไขข้อมูล';
      case 'delete': return 'ลบข้อมูล';
      case 'status_change': return 'เปลี่ยนสถานะ';
      case 'auth': return 'เข้าสู่ระบบ';
      default: return 'อื่นๆ';
    }
  };

  const getModuleLabel = (mod: string) => {
    switch (mod) {
      case 'users': return 'บัญชีผู้ใช้งาน';
      case 'materials': return 'แค็ตตาล็อกวัสดุ';
      case 'custom_category': return 'หมวดหมู่ประเภทวัสดุ';
      case 'org': return 'กลุ่มงานและฝ่าย';
      case 'requests': return 'รายการขอวัสดุ';
      case 'system': return 'ระบบ';
      default: return 'ระบบ';
    }
  };

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }) + ' น.';
    } catch {
      return isoString;
    }
  };

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchTerm.trim() || 
      log.description.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
      log.username.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
      log.name.toLowerCase().includes(searchTerm.toLowerCase().trim());
      
    const matchesAction = selectedActionType === 'all' || log.actionType === selectedActionType;
    const matchesModule = selectedModule === 'all' || log.module === selectedModule;

    return matchesSearch && matchesAction && matchesModule;
  });

  const handleClearClick = () => {
    if (currentUser.username !== 'admin') {
      onToastAlert('สิทธิ์ในการล้าง Log ประวัติระบบ จำกัดเฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้น', 'error');
      return;
    }

    onRequestConfirm({
      title: '⚠️ ยืนยันการล้างประวัติการใช้งานทั้งหมด',
      message: 'คุณแน่ใจหรือไม่ว่าต้องการลบ Log ประวัติการทำงานทั้งหมดในระบบ? การลบนี้จะไม่ส่งผลต่อข้อมูลผู้ใช้หรือพัสดุใดๆ แต่ประวัติการทำกิจกรรมทั้งหมดจะหายไปและไม่สามารถกู้คืนได้!',
      confirmText: 'ยืนยันล้างประวัติ',
      variant: 'danger',
      onConfirm: () => {
        onClearLogs();
        onToastAlert('ล้างประวัติการทำงานในระบบทั้งหมดเรียบร้อยแล้ว', 'info');
      }
    });
  };

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      onToastAlert('ไม่มีข้อมูลประวัติกิจกรรมที่จะส่งออก', 'error');
      return;
    }
    
    const headers = ['ลำดับ', 'วัน-เวลา', 'ผู้ใช้งาน', 'บทบาท', 'ประเภท', 'โมดูล', 'รายละเอียดกิจกรรม'];
    const csvRows = [
      '\uFEFF' + headers.join(',') // Thai Excel UTF-8 BOM
    ];
    
    filteredLogs.forEach((log, index) => {
      const row = [
        index + 1,
        formatTimestamp(log.timestamp).replace(/,/g, ' '),
        log.name + ` (@${log.username})`,
        log.role || 'system',
        getActionLabel(log.actionType),
        getModuleLabel(log.module),
        `"${log.description.replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(','));
    });
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    
    link.setAttribute('href', url);
    link.setAttribute('download', `system_audit_logs_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onToastAlert('ส่งออกไฟล์ประวัติ CSV สำเร็จเรียบร้อยแล้ว', 'success');
  };

  // Pagination slice
  const numericSize = pageSize === 'all' ? filteredLogs.length || 1 : pageSize;
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(filteredLogs.length / numericSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageLogs = pageSize === 'all' ? filteredLogs : filteredLogs.slice((safePage - 1) * numericSize, safePage * numericSize);

  return (
    <div className="space-y-5">
      {/* Table Control Panel */}
      <TableControlPanel
        title="ประวัติการบันทึกกิจกรรมและ Log การใช้งาน"
        categoryLabel="ข้อมูลการทำงานระบบ (System Audit Trail)"
        fiscalYear="2569"
        totalCount={filteredLogs.length}
        searchTerm={searchTerm}
        searchPlaceholder="ค้นหาคำอธิบาย, ชื่อผู้ใช้งาน, Username..."
        onSearchChange={term => {
          setSearchTerm(term);
          setCurrentPage(1);
        }}
      />

      {/* Filter Options Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Filter className="w-4 h-4 text-indigo-600" />
          <h4 className="text-xs font-bold text-slate-800">ตัวกรองประวัติระบบ</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Action Type Filter */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-600">ประเภทกิจกรรม (Action Type)</label>
            <div className="flex flex-wrap gap-1.5">
              {actionTypes.map(act => {
                const isSelected = selectedActionType === act.value;
                return (
                  <button
                    key={act.value}
                    type="button"
                    onClick={() => {
                      setSelectedActionType(act.value);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {act.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Module Filter */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-600">ส่วนงานระบบ (Module)</label>
            <div className="flex flex-wrap gap-1.5">
              {modules.map(mod => {
                const isSelected = selectedModule === mod.value;
                return (
                  <button
                    key={mod.value}
                    type="button"
                    onClick={() => {
                      setSelectedModule(mod.value);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {mod.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Logs Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileClock className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">ตารางประวัติกิจกรรมของระบบ</h3>
          </div>
          
          {currentUser.username === 'admin' && logs.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 hover:border-indigo-300 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                ส่งออกประวัติ (CSV)
              </button>
              
              <button
                type="button"
                onClick={handleClearClick}
                className="px-3.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                ล้างประวัติทั้งหมด
              </button>
            </div>
          )}
        </div>

        {pageLogs.length === 0 ? (
          <div className="py-12 border-2 border-dashed border-slate-150 rounded-2xl text-center space-y-2">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Database className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-600">ไม่พบประวัติการใช้งานตามเงื่อนไขที่เลือก</div>
            <p className="text-xs text-slate-400">กรุณาลองปรับเปลี่ยนตัวกรองหรือคำค้นหาของคุณ</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Desktop View Table */}
            <table className="w-full text-left border-collapse hidden md:table">
              <thead className="bg-slate-50 text-slate-600 font-mono text-xs border-b border-slate-200 uppercase">
                <tr>
                  <th className="p-3 w-48 font-bold">เวลา (Timestamp)</th>
                  <th className="p-3 w-48 font-bold">ผู้ทำรายการ (User)</th>
                  <th className="p-3 w-32 font-bold">การปฏิบัติงาน</th>
                  <th className="p-3 w-36 font-bold">ส่วนงาน</th>
                  <th className="p-3 font-bold">รายละเอียด (Description)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {pageLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 text-slate-500 font-medium whitespace-nowrap flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900 flex items-center gap-1">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                        {log.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">@{log.username}</div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getActionBadgeStyle(log.actionType)}`}>
                        {getActionLabel(log.actionType)}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md font-bold text-[10px]">
                        {getModuleLabel(log.module)}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-700 leading-relaxed max-w-md">
                      {log.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile View Cards */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {pageLogs.map(log => (
                <div key={log.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/30 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium text-[10px] flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatTimestamp(log.timestamp)}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${getActionBadgeStyle(log.actionType)}`}>
                      {getActionLabel(log.actionType)}
                    </span>
                  </div>

                  <div className="font-bold text-slate-800 leading-relaxed">
                    {log.description}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500 font-bold">{log.name}</span>
                      <span className="text-slate-400 text-[10px]">(@{log.username})</span>
                    </div>
                    <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 border border-slate-150 rounded text-[9px] font-semibold">
                      {getModuleLabel(log.module)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredLogs.length > 0 && (
          <PaginationBar
            pageSize={pageSize}
            currentPage={currentPage}
            totalItems={filteredLogs.length}
            onPageSizeChange={s => { setPageSize(s); setCurrentPage(1); }}
            onPageChange={p => setCurrentPage(p)}
          />
        )}
      </div>

      {/* Log Security Banner */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-xs flex gap-3">
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 self-start shrink-0">
          <Info className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-slate-800">นโยบายความโปร่งใสและการเก็บรักษา Log</h4>
          <p className="text-slate-500 leading-relaxed">
            ระบบจะบันทึกทุกพฤติกรรมการเพิ่ม แก้ไข ลบข้อมูล สถานะพัสดุและผู้ใช้งานโดยอัตโนมัติ เพื่อตรวจสอบย้อนหลัง (Audit Trail) 
            โดยประวัติต่างๆ ได้รับการคุ้มครองความปลอดภัยสูงสุด และสิทธิ์ในการล้างหรือจัดระเบียบ Log ระบบจะจำกัดเฉพาะบัญชี **Super Admin** เท่านั้น
          </p>
        </div>
      </div>
    </div>
  );
};
