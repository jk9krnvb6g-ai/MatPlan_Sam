import React, { useState } from 'react';
import { 
  AlertOctagon, 
  Trash2, 
  Download, 
  Upload, 
  RefreshCw, 
  ShieldAlert, 
  Lock, 
  FileSpreadsheet, 
  CheckCircle2, 
  Database,
  Info,
  Clock,
  Layers
} from 'lucide-react';
import { User, RequestItem } from '../types';

interface AdminDangerZoneProps {
  currentUser: User | null;
  apiBase: string;
  totalRequests: number;
  totalUsers: number;
  totalDepartments: number;
  fiscalYear: string;
  onRefreshState: () => void;
  onToastAlert: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminDangerZone: React.FC<AdminDangerZoneProps> = ({
  currentUser,
  apiBase,
  totalRequests,
  totalUsers,
  totalDepartments,
  fiscalYear,
  onRefreshState,
  onToastAlert
}) => {
  const [selectedWipeMode, setSelectedWipeMode] = useState<
    'requests' | 'custom_catalog' | 'users_departments' | 'logs' | 'factory_reset' | null
  >(null);

  const [confirmText, setConfirmText] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [autoDownloadBackup, setAutoDownloadBackup] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Trigger JSON Backup Download
  const handleExportBackup = async () => {
    try {
      setIsExporting(true);
      const res = await fetch(`${apiBase}/admin/backup/export`);
      if (!res.ok) throw new Error('ไม่สามารถดาวน์โหลดไฟล์สำรองข้อมูลได้');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MatPlan_System_Backup_${fiscalYear}_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      onToastAlert('ดาวน์โหลดไฟล์สำรองข้อมูล (JSON Backup) สำเร็จ', 'success');
    } catch (err: any) {
      onToastAlert(err.message || 'เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์สำรอง', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Restore Backup from File
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setIsImporting(true);
        const parsed = JSON.parse(event.target?.result as string);
        
        const res = await fetch(`${apiBase}/admin/backup/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            backupData: parsed,
            username: currentUser?.username || 'admin'
          })
        });

        const data = await res.json();
        if (data.success) {
          onToastAlert('กู้คืนข้อมูลระบบจากไฟล์สำรองข้อมูลสำเร็จเรียบร้อย', 'success');
          onRefreshState();
        } else {
          onToastAlert(data.error || 'กู้คืนข้อมูลล้มเหลว', 'error');
        }
      } catch (err: any) {
        onToastAlert(`ไฟล์สำรองไม่ถูกต้อง: ${err.message}`, 'error');
      } finally {
        setIsImporting(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Execute Wipe Data
  const handleExecuteWipe = async () => {
    if (!selectedWipeMode) return;

    if (confirmText.trim() !== 'CONFIRM DELETE') {
      onToastAlert('กรุณาพิมพ์ข้อความ "CONFIRM DELETE" ให้ถูกต้องเพื่อยืนยัน', 'error');
      return;
    }

    try {
      setIsProcessing(true);

      // Auto backup first if enabled
      if (autoDownloadBackup) {
        try {
          await handleExportBackup();
        } catch (e) {}
      }

      const res = await fetch(`${apiBase}/admin/danger/wipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: selectedWipeMode,
          password: adminPassword,
          confirmationCode: confirmText.trim(),
          username: currentUser?.username || 'admin'
        })
      });

      const data = await res.json();

      if (data.success) {
        onToastAlert(data.message || 'ดำเนินการล้างข้อมูลเรียบร้อยแล้ว', 'success');
        setSelectedWipeMode(null);
        setConfirmText('');
        setAdminPassword('');
        onRefreshState();
      } else {
        onToastAlert(data.error || 'การดำเนินการล้างข้อมูลล้มเหลว', 'error');
      }
    } catch (err: any) {
      onToastAlert(`เกิดข้อผิดพลาด: ${err.message || String(err)}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const wipeOptions = [
    {
      id: 'requests' as const,
      title: '1. ล้างเฉพาะรายการคำขอทั้งหมด (Clear All Requests)',
      badge: `${totalRequests} รายการคำขอปัจจุบัน`,
      desc: 'ลบรายการเสนอขอวัสดุ/ครุภัณฑ์ทุกรายการในระบบออกทั้งหมด โดยที่ข้อมูลผู้ใช้งาน หน่วยงาน และแคตตาล็อกวัสดุยังคงอยู่ครบถ้วน เหมาะสำหรับเริ่มต้นรอบการสำรวจรอบใหม่',
      severity: 'high'
    },
    {
      id: 'custom_catalog' as const,
      title: '2. รีเซ็ตแคตตาล็อกวัสดุและราคา (Reset Catalog & Custom Prices)',
      badge: 'คืนค่ารายการกลาง',
      desc: 'ล้างรายการวัสดุที่เพิ่มเองและราคากลางที่กำหนดเองทั้งหมด คืนค่ากลับสู่รายการมาตรฐานของโรงพยาบาล',
      severity: 'medium'
    },
    {
      id: 'users_departments' as const,
      title: '3. รีเซ็ตบัญชีผู้ใช้และฝ่าย (Reset Users & Departments)',
      badge: `${totalUsers} ผู้ใช้ / ${totalDepartments} ฝ่าย`,
      desc: 'คืนค่าเริ่มต้นบัญชีผู้ใช้งานระบบ (11 บัญชีหลัก) และโครงสร้าง 13 ฝ่าย 4 กลุ่มงาน',
      severity: 'high'
    },
    {
      id: 'logs' as const,
      title: '4. ล้างประวัติบันทึกการใช้งาน (Clear Audit Logs)',
      badge: 'บันทึกประวัติการกระทำ',
      desc: 'ล้างประวัติการเข้าใช้งาน การอนุมัติ และการแก้ไขข้อมูลในหน้าระบบ Log ทั้งหมด',
      severity: 'low'
    },
    {
      id: 'factory_reset' as const,
      title: '5. ล้างระบบทั้งหมดและคืนค่าโรงงานเริ่มต้น (Full Factory Reset)',
      badge: 'ล้างทั้งระบบ 100%',
      desc: 'คำสั่งสูงสุด: ล้างข้อมูลคำขอทั้งหมด, รีเซ็ตผู้ใช้, หน่วยงาน, แคตตาล็อก และตั้งค่าทั้งหมดกลับสู่สถานะตั้งต้นของระบบ',
      severity: 'critical'
    }
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-red-950 via-slate-900 to-red-950 border-2 border-red-800/80 rounded-3xl p-6 lg:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 opacity-10 pointer-events-none">
          <AlertOctagon className="w-80 h-80 text-red-500" />
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-red-600/30 border border-red-500/50 rounded-2xl text-red-400">
              <ShieldAlert className="w-7 h-7" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl lg:text-2xl font-black tracking-tight text-red-100">
                  Superadmin Danger Zone (ศูนย์ควบคุมการจัดการข้อมูลขั้นสูง)
                </h1>
                <span className="px-2.5 py-0.5 text-[11px] font-black rounded-full bg-red-600 text-white uppercase tracking-wider">
                  Unrestricted
                </span>
              </div>
              <p className="text-xs lg:text-sm text-red-200/80 mt-1">
                เครื่องมือพิเศษสำหรับผู้ดูแลระบบสูงสุด (Superadmin) ในการจัดการและล้างข้อมูลแบบไร้ข้อจำกัด พร้อมระบบความปลอดภัยและการสำรองข้อมูลอัตโนมัติ
              </p>
            </div>
          </div>

          {/* Quick System Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-xs">
              <div className="text-[11px] text-slate-400 font-medium">ปีงบประมาณ</div>
              <div className="text-lg font-black text-amber-400 font-mono">พ.ศ. {fiscalYear}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-xs">
              <div className="text-[11px] text-slate-400 font-medium">รายการคำขอในระบบ</div>
              <div className="text-lg font-black text-cyan-400 font-mono">{totalRequests} รายการ</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-xs">
              <div className="text-[11px] text-slate-400 font-medium">บัญชีผู้ใช้งาน</div>
              <div className="text-lg font-black text-emerald-400 font-mono">{totalUsers} บัญชี</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-xs">
              <div className="text-[11px] text-slate-400 font-medium">หน่วยงาน / ฝ่าย</div>
              <div className="text-lg font-black text-purple-400 font-mono">{totalDepartments} หน่วยงาน</div>
            </div>
          </div>
        </div>
      </div>

      {/* Backup & Restore Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" />
              การสำรองและกู้คืนข้อมูลระบบ (Database Snapshot Backup & Restore)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              แนะนำให้ดาวน์โหลดสำรองข้อมูลเป็นไฟล์ JSON เก็บไว้ก่อนสั่งการล้างข้อมูลใดๆ เพื่อความปลอดภัย
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleExportBackup}
              disabled={isExporting}
              className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'กำลังดาวน์โหลด...' : 'ดาวน์โหลด Backup (.json)'}</span>
            </button>

            <label className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer active:scale-95">
              <Upload className="w-4 h-4" />
              <span>{isImporting ? 'กำลังกู้คืน...' : 'กู้คืนจาก Backup (.json)'}</span>
              <input 
                type="file" 
                accept=".json" 
                onChange={handleImportBackup} 
                className="hidden" 
              />
            </label>
          </div>
        </div>
      </div>

      {/* Granular Wipe Options Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-600" />
            ตัวเลือกระดับการลบข้อมูล (Data Wipe Operations)
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            คลิกเลือกรายการที่ต้องการล้าง
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {wipeOptions.map(opt => {
            const isSelected = selectedWipeMode === opt.id;
            const isCritical = opt.severity === 'critical';

            return (
              <div
                key={opt.id}
                onClick={() => setSelectedWipeMode(opt.id)}
                className={`p-5 rounded-3xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  isSelected
                    ? isCritical
                      ? 'bg-red-50/80 border-red-600 shadow-md ring-2 ring-red-500/20'
                      : 'bg-amber-50/80 border-amber-600 shadow-md ring-2 ring-amber-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className={`text-sm font-black ${isSelected ? 'text-slate-900' : 'text-slate-800'}`}>
                      {opt.title}
                    </h3>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                      isCritical 
                        ? 'bg-red-100 text-red-800 border border-red-300' 
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {opt.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    {opt.desc}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                  <span className={`font-bold flex items-center gap-1.5 ${
                    isCritical ? 'text-red-700' : 'text-slate-600'
                  }`}>
                    <AlertOctagon className="w-3.5 h-3.5" />
                    ระดับความเสี่ยง: {opt.severity === 'critical' ? 'วิกฤตสูงสุด' : (opt.severity === 'high' ? 'สูง' : 'ปานกลาง')}
                  </span>
                  <button
                    type="button"
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors ${
                      isSelected
                        ? isCritical ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {isSelected ? 'เลือกแล้ว (พร้อมดำเนินการ)' : 'เลือกล้างรายการนี้'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation & Execution Section */}
      {selectedWipeMode && (
        <div className="bg-gradient-to-b from-red-50 to-white border-2 border-red-500 rounded-3xl p-6 lg:p-8 shadow-xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3 border-b border-red-200 pb-4">
            <span className="p-2 bg-red-600 text-white rounded-2xl">
              <Lock className="w-6 h-6" />
            </span>
            <div>
              <h3 className="text-base lg:text-lg font-black text-red-950">
                ยืนยันการดำเนินการล้างข้อมูล: {wipeOptions.find(o => o.id === selectedWipeMode)?.title}
              </h3>
              <p className="text-xs text-red-700 font-medium">
                คำสั่งนี้จะมีผลต่อฐานข้อมูลทันที โปรดตรวจสอบและยืนยันความถูกต้อง
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-700">
                1. พิมพ์ข้อความยืนยัน <span className="text-red-600 font-mono font-black">"CONFIRM DELETE"</span>:
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="พิมพ์คำว่า CONFIRM DELETE"
                  className="mt-1.5 w-full px-4 py-2.5 bg-white border-2 border-red-300 rounded-2xl text-xs font-mono font-bold text-red-900 focus:outline-hidden focus:ring-2 focus:ring-red-500"
                />
              </label>

              <label className="block text-xs font-bold text-slate-700">
                2. กรอกรหัสผ่านผู้ดูแลระบบ (Superadmin Password):
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="รหัสผ่านผู้ดูแลระบบ (เริ่มต้น: 1234)"
                  className="mt-1.5 w-full px-4 py-2.5 bg-white border border-slate-300 rounded-2xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500"
                />
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={autoDownloadBackup}
                  onChange={(e) => setAutoDownloadBackup(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded-md border-slate-300 focus:ring-red-500"
                />
                <span>ดาวน์โหลดไฟล์สำรองข้อมูล (Auto Backup) ลงเครื่องโดยอัตโนมัติก่อนเริ่มลบ</span>
              </label>
            </div>

            <div className="bg-red-100/60 border border-red-200 rounded-2xl p-4 flex flex-col justify-between text-xs space-y-4">
              <div className="space-y-2">
                <div className="font-bold text-red-900 flex items-center gap-1.5">
                  <Info className="w-4 h-4" />
                  มาตรการความปลอดภัยของระบบ:
                </div>
                <ul className="list-disc list-inside text-red-800 space-y-1 pl-1">
                  <li>ระบบจะบันทึก Log การลบของ Superadmin ไว้เสมอ</li>
                  <li>คำสั่งจะทำการ Truncate และ Sync ตาราง MySQL / db.json ให้ตรงกันทันที</li>
                  <li>หากมีข้อผิดพลาด สามารถกู้คืนผ่านปุ่ม "กู้คืนจาก Backup (.json)" ได้ตลอดเวลา</li>
                </ul>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleExecuteWipe}
                  disabled={isProcessing || confirmText.trim() !== 'CONFIRM DELETE'}
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-black text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isProcessing ? 'กำลังดำเนินการล้างข้อมูล...' : 'ยืนยันและสั่งล้างข้อมูลทันที'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedWipeMode(null);
                    setConfirmText('');
                    setAdminPassword('');
                  }}
                  className="py-3 px-4 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs rounded-2xl transition-colors"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
