import React, { useState } from 'react';
import { Database, HardDrive, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Info, Wifi, WifiOff, Server } from 'lucide-react';

export interface DbStatusData {
  mysql: {
    configured: boolean;
    connected: boolean;
    host: string;
    database: string;
    error: string | null;
  };
  dbJson: {
    exists: boolean;
    readable: boolean;
    writable: boolean;
    path: string;
    error: string | null;
  };
  activeStorage: 'mysql' | 'db.json' | 'none';
  lastChecked?: string;
}

interface DbStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: DbStatusData | null;
  onRefresh: () => void;
  apiBase: string;
}

export const DbStatusModal: React.FC<DbStatusModalProps> = ({
  isOpen,
  onClose,
  status,
  onRefresh,
  apiBase
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryResult, setRetryResult] = useState<{ 
    success?: boolean; 
    message?: string; 
    error?: string;
    database?: string;
    totalTables?: number;
    tables?: { table: string; rows: number }[];
  } | null>(null);

  if (!isOpen) return null;

  const handleRetryInit = async () => {
    setIsRetrying(true);
    setRetryResult(null);
    try {
      const res = await fetch(`${apiBase}/db/init`);
      const data = await res.json();
      setRetryResult(data);
      onRefresh();
    } catch (err: any) {
      setRetryResult({
        success: false,
        error: err.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์เพื่อทดสอบการเชื่อมต่อได้'
      });
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${status?.mysql.connected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                สถานะการเชื่อมต่อฐานข้อมูล
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  MatPlan DB
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                ตรวจสอบความสมบูรณ์ของการเชื่อมต่อ MySQL และไฟล์สำรอง db.json
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Active Storage Alert Banner */}
          {status?.activeStorage === 'mysql' && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-3 text-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-sm text-emerald-900">เชื่อมต่อฐานข้อมูลหลัก MySQL สำเร็จ</span>
                ข้อมูลกำลังถูกบันทึกลงในตาราง MySQL (`requests`, `users`, `system_state`) และสำรองลงไฟล์ db.json ควบคู่กัน
              </div>
            </div>
          )}

          {status?.activeStorage === 'db.json' && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 text-xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-sm text-amber-950">กำลังใช้ระบบสำรอง db.json ชั่วคราว</span>
                เนื่องจากไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ MySQL ได้ ระบบจึงเปลี่ยนมาใช้อ่าน-บันทึกผ่านไฟล์ Local `db.json` โดยอัตโนมัติ ข้อมูลจะไม่สูญหาย
              </div>
            </div>
          )}

          {status?.activeStorage === 'none' && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 text-xs">
              <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-sm text-rose-900">ข้อผิดพลาด: ไม่สามารถใช้งานตัวเก็บข้อมูลใดๆ ได้</span>
                กรุณาตรวจสอบสิทธิ์การเข้าถึงไฟล์ในระบบ หรือตรวจสอบการเปิดใช้งานดิสก์บนเซิร์ฟเวอร์
              </div>
            </div>
          )}

          {/* 1. MySQL Status Box */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-slate-700" />
                <span className="font-bold text-sm text-slate-800">1. ฐานข้อมูลหลัก MySQL</span>
              </div>
              {status?.mysql.connected ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  เชื่อมต่อสำเร็จ
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                  <WifiOff className="w-3.5 h-3.5 text-rose-600" />
                  เชื่อมต่อไม่ได้
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Server Host & Port</span>
                <span className="font-mono font-bold text-slate-800">{status?.mysql.host || '-'}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Database Name</span>
                <span className="font-mono font-bold text-slate-800">{status?.mysql.database || '-'}</span>
              </div>
            </div>

            {status?.mysql.error && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono break-all">
                <span className="font-bold text-rose-800 block not-mono mb-0.5 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> สาเหตุข้อผิดพลาด:
                </span>
                {status.mysql.error}
              </div>
            )}
          </div>

          {/* 2. Local db.json Status Box */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-slate-700" />
                <span className="font-bold text-sm text-slate-800">2. ไฟล์สำรองข้อมูล Local db.json</span>
              </div>
              {status?.dbJson.readable && status?.dbJson.writable ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  พร้อมใช้งาน (Read/Write OK)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  ขัดข้อง
                </span>
              )}
            </div>

            <div className="text-xs bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-slate-600 break-all">
              <span className="text-slate-500 block font-sans text-[11px] mb-0.5">ตำแหน่งไฟล์บันทึก:</span>
              {status?.dbJson.path || 'src/backend/db.json'}
            </div>

            {status?.dbJson.error && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono break-all">
                <span className="font-bold text-rose-800 block not-mono mb-0.5">สาเหตุข้อผิดพลาด:</span>
                {status.dbJson.error}
              </div>
            )}
          </div>

          {/* Test connection result if retried */}
          {retryResult && (
            <div className={`p-3.5 rounded-xl text-xs border ${retryResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
              <span className="font-bold block text-sm mb-1">
                {retryResult.success ? '✓ ทดสอบเชื่อมต่อและตรวจสอบตารางสำเร็จ!' : '✕ ทดสอบเชื่อมต่อล้มเหลว'}
              </span>
              <p className="mb-2">{retryResult.message || retryResult.error}</p>

              {retryResult.success && retryResult.tables && retryResult.tables.length > 0 && (
                <div className="mt-2 bg-white rounded-lg border border-emerald-200 p-2.5 space-y-1.5">
                  <span className="font-bold text-[11px] text-emerald-900 block border-b border-emerald-100 pb-1">
                    รายชื่อตารางในฐานข้อมูล `{retryResult.database}` (รวม {retryResult.totalTables} ตาราง):
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                    {retryResult.tables.map(t => (
                      <div key={t.table} className="flex items-center justify-between bg-emerald-50/50 px-2 py-1 rounded border border-emerald-100/60">
                        <span className="text-emerald-950 font-semibold">{t.table}</span>
                        <span className="text-emerald-700 text-[10px] bg-emerald-100 px-1.5 py-0.2 rounded font-sans font-bold">
                          {t.rows} แถว
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            ตรวจสอบล่าสุด: {status?.lastChecked ? new Date(status.lastChecked).toLocaleTimeString('th-TH') : 'เมื่อสักครู่'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRetryInit}
              disabled={isRetrying}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'กำลังทดสอบการเชื่อมต่อ...' : 'ทดสอบการเชื่อมต่อใหม่'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs transition-colors"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
