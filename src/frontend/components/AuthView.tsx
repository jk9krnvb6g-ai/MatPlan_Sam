import React, { useState } from 'react';
import { CategoryId, Department, User, UserRole, WorkGroup } from '../types';
import { CATEGORY_LABELS, CATEGORY_ORDER, DEPARTMENTS, INITIAL_WORK_GROUPS } from '../data/catalog';
import { 
  KeyRound, 
  UserPlus, 
  LogIn, 
  ArrowLeft, 
  ShieldAlert, 
  CheckCircle2, 
  User as UserIcon, 
  Lock, 
  Eye, 
  EyeOff, 
  PackageCheck, 
  BarChart3, 
  BellRing, 
  FileSpreadsheet, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  Target, 
  Building2,
  CheckCircle,
  HelpCircle,
  Check
} from 'lucide-react';

interface AuthViewProps {
  users: User[];
  departments?: Department[];
  workGroups?: WorkGroup[];
  onLogin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onRegister: (newUser: Omit<User, 'status'>) => Promise<{ success: boolean; error?: string }>;
  onResetPassword: (username: string, newPw: string) => Promise<{ success: boolean; error?: string }>;
}

export const AuthView: React.FC<AuthViewProps> = ({
  users,
  departments,
  workGroups,
  onLogin,
  onRegister,
  onResetPassword
}) => {
  const departmentsList = departments || DEPARTMENTS;
  const workGroupsList = workGroups || INITIAL_WORK_GROUPS;
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [errorMsg, setErrorMsg] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Login Form State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register Form State
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('staff');
  const [regCategory, setRegCategory] = useState<CategoryId>('office');
  const [regDeptId, setRegDeptId] = useState('thurakan');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');

  // Forgot Form State
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotPassword, setForgotPassword] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setOkMsg('');

    const u = loginUsername.trim();
    const p = loginPassword;

    if (!u || !p) {
      setErrorMsg('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onLogin(u, p);
      if (!res.success) {
        setErrorMsg(res.error || 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch (err: any) {
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (u: User) => {
    setLoginUsername(u.username);
    // Seed users all have password '1234'
    const defaultPw = '1234';
    setLoginPassword(defaultPw);
    setErrorMsg('');
    setOkMsg('');
    setIsSubmitting(true);
    try {
      const res = await onLogin(u.username, defaultPw);
      if (!res.success) {
        setErrorMsg(res.error || 'ไม่สามารถเข้าระบบอัตโนมัติได้');
      }
    } catch (err: any) {
      setErrorMsg('เกิดข้อผิดพลาดในการเข้าสู่ระบบแบบด่วน');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setOkMsg('');

    if (!regName.trim() || !regUsername.trim() || !regPassword) {
      setErrorMsg('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    if (regPassword.length < 4) {
      setErrorMsg('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร');
      return;
    }

    if (regPassword !== regPasswordConfirm) {
      setErrorMsg('ยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onRegister({
        username: regUsername.trim(),
        password: regPassword,
        role: regRole,
        roles: [regRole],
        name: regName.trim(),
        category: regCategory,
        deptId: regDeptId
      });

      if (res.success) {
        setRegName('');
        setRegUsername('');
        setRegPassword('');
        setRegPasswordConfirm('');
        setMode('login');
        setOkMsg(res.error || 'สมัครสมาชิกสำเร็จ บัญชีของคุณอยู่ระหว่างรอผู้ดูแลระบบอนุมัติเปิดใช้งาน');
      } else {
        setErrorMsg(res.error || 'การสมัครสมาชิกล้มเหลว');
      }
    } catch (err: any) {
      setErrorMsg('เกิดข้อผิดพลาดในการลงทะเบียนสำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setOkMsg('');

    const u = forgotUsername.trim();
    if (!u) {
      setErrorMsg('กรุณากรอกชื่อผู้ใช้งาน');
      return;
    }

    if (!forgotPassword || forgotPassword.length < 4) {
      setErrorMsg('รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onResetPassword(u, forgotPassword);
      if (res.success) {
        setMode('login');
        setOkMsg('รีเซ็ตรหัสผ่านใหม่เรียบร้อยแล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่');
      } else {
        setErrorMsg(res.error || 'รีเซ็ตรหัสผ่านล้มเหลว');
      }
    } catch (err: any) {
      setErrorMsg('เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน');
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleLabels: Record<UserRole, string> = {
    staff: 'ผู้ขอ (เจ้าหน้าที่)',
    head: 'หัวหน้ากลุ่มงาน/ฝ่าย',
    proc: 'เจ้าหน้าที่พัสดุ',
    prochead: 'หัวหน้าฝ่ายพัสดุ',
    exec: 'ผู้บริหาร',
    admin: 'ผู้ดูแลระบบ'
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans relative overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* TOP PORTAL COMMAND HEADER (Matches System Main Navbar) */}
      <header className="w-full bg-slate-900 text-white border-b border-slate-800 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-md shrink-0">
            <PackageCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-wide text-white">MatPlan</span>
              <span className="text-[10px] font-mono font-bold text-indigo-300 bg-indigo-950 border border-indigo-800 px-2 py-0.5 rounded-full">
                FY2569
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium">ระบบการวางแผนความต้องการวัสดุ รพ.สามชุก</p>
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="flex items-center gap-2 text-xs">
          <div className="hidden md:flex items-center gap-2 bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-xl text-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[11px] font-bold">สถานะระบบ: เปิดรับคำขอประจำปี 2569</span>
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-800 text-emerald-300 px-3 py-1.5 rounded-xl font-mono text-[11px] font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            SSL Encrypted Gateway
          </div>
        </div>
      </header>

      {/* MAIN PORTAL BODY */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 flex flex-col justify-between gap-6 z-10">
        
        {/* TOP SYSTEM HIGHLIGHT RIBBON (4 Horizontal Metric Cards) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="text-[10px] uppercase font-mono font-bold text-slate-500">รอบแผนงาน</div>
              <div className="text-xs font-bold text-slate-900 truncate">งบประมาณปี พ.ศ. 2569</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-100 flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="text-[10px] uppercase font-mono font-bold text-slate-500">หมวดวัสดุหลัก</div>
              <div className="text-xs font-bold text-slate-900 truncate">9 หมวดมาตรฐาน</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
              <BellRing className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="text-[10px] uppercase font-mono font-bold text-slate-500">ลำดับการอนุมัติ</div>
              <div className="text-xs font-bold text-slate-900 truncate">5 ขั้นตอน (Workflow)</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="text-[10px] uppercase font-mono font-bold text-slate-500">ประวัติสถิติ</div>
              <div className="text-xs font-bold text-slate-900 truncate">ย้อนหลัง 5 ปีการใช้งาน</div>
            </div>
          </div>
        </div>

        {/* CENTER TERMINAL CONTAINER */}
        <div className="my-auto py-2">
          <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl relative">
            
            {/* Terminal Header & Mode Switcher */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-mono font-bold text-slate-400 ml-2">MATPLAN AUTH</span>
              </div>

              {/* Mode Tabs */}
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setErrorMsg(''); setOkMsg(''); }}
                  className={`py-2 rounded-xl transition-all cursor-pointer ${
                    mode === 'login' 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  เข้าสู่ระบบ
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('register'); setErrorMsg(''); setOkMsg(''); }}
                  className={`py-2 rounded-xl transition-all cursor-pointer ${
                    mode === 'register' 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ลงทะเบียน
                </button>
              </div>
            </div>

            {/* Alerts */}
            {errorMsg && (
              <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-xl flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {okMsg && (
              <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{okMsg}</span>
              </div>
            )}

            {/* MODE 1: LOGIN FORM */}
            {mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-indigo-600" />
                    ชื่อผู้ใช้ (Username)
                  </label>
                  <input
                    type="text"
                    required
                    value={loginUsername}
                    onChange={e => setLoginUsername(e.target.value)}
                    placeholder="กรอกชื่อผู้ใช้ของคุณ..."
                    className="w-full text-xs px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-mono transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-indigo-600" />
                    รหัสผ่าน (Password)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-xs pl-3.5 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-mono transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-start text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900 select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 accent-indigo-600 cursor-pointer"
                    />
                    <span>จดจำการเข้าสู่ระบบ 1 วัน</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                >
                  <LogIn className="w-4 h-4" />
                  <span>เข้าสู่ระบบวางแผนความต้องการวัสดุ</span>
                </button>
              </form>
            )}

            {/* MODE 2: REGISTER FORM */}
            {mode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">ชื่อ-นามสกุล ผู้ยื่นคำขอ</label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    placeholder="เช่น นายสมชาย ใจดี"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">ชื่อผู้ใช้ (Username)</label>
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={e => setRegUsername(e.target.value)}
                    placeholder="username"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">บทบาทเริ่มต้น</label>
                  <select
                    value={regRole}
                    onChange={e => setRegRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-600 font-medium"
                  >
                    <option value="staff">ผู้ขอ (เจ้าหน้าที่)</option>
                    <option value="head">หัวหน้ากลุ่มงาน/ฝ่าย</option>
                    <option value="proc">เจ้าหน้าที่พัสดุ</option>
                    <option value="prochead">หัวหน้าฝ่ายพัสดุ</option>
                    <option value="exec">ผู้บริหาร</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">สังกัดฝ่าย / หน่วยงาน</label>
                  <select
                    value={regDeptId}
                    onChange={e => setRegDeptId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-600 font-medium"
                  >
                    {workGroupsList.map(wg => {
                      const wgDepts = departmentsList.filter(d => d.workGroupId === wg.id);
                      if (wgDepts.length === 0) return null;
                      return (
                        <optgroup key={wg.id} label={`กลุ่มงาน: ${wg.name}`}>
                          {wgDepts.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </optgroup>
                      );
                    })}
                    {departmentsList.filter(d => !d.workGroupId).map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">รหัสผ่าน</label>
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">ยืนยันรหัสผ่าน</label>
                    <input
                      type="password"
                      required
                      value={regPasswordConfirm}
                      onChange={e => setRegPasswordConfirm(e.target.value)}
                      placeholder="••••••"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-md transition-all cursor-pointer mt-2"
                >
                  ยืนยันการลงทะเบียน
                </button>

                <button
                  type="button"
                  onClick={() => { setMode('login'); setErrorMsg(''); setOkMsg(''); }}
                  className="w-full text-slate-500 font-bold text-xs py-1.5 flex items-center justify-center gap-1 hover:text-slate-800 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  ย้อนกลับหน้าเข้าสู่ระบบ
                </button>
              </form>
            )}

            {/* MODE 3: FORGOT PASSWORD FORM */}
            {mode === 'forgot' && (
              <form onSubmit={handleForgotSubmit} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">ชื่อผู้ใช้ (Username)</label>
                  <input
                    type="text"
                    required
                    value={forgotUsername}
                    onChange={e => setForgotUsername(e.target.value)}
                    placeholder="กรอกชื่อผู้ใช้ที่ต้องการรีเซ็ต"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">ตั้งรหัสผ่านใหม่</label>
                  <input
                    type="password"
                    required
                    value={forgotPassword}
                    onChange={e => setForgotPassword(e.target.value)}
                    placeholder="อย่างน้อย 4 ตัวอักษร"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  บันทึกรหัสผ่านใหม่
                </button>

                <button
                  type="button"
                  onClick={() => { setMode('login'); setErrorMsg(''); setOkMsg(''); }}
                  className="w-full text-slate-500 font-bold text-xs py-1.5 flex items-center justify-center gap-1 hover:text-slate-800 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  ย้อนกลับหน้าเข้าสู่ระบบ
                </button>
              </form>
            )}

          </div>
        </div>

      </main>

      {/* FOOTER SYSTEM STRIP */}
      <footer className="w-full border-t border-slate-200 bg-white px-4 sm:px-8 py-3 text-center text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2 z-20">
        <div>
          © 2026 MatPlan Operations System. All rights reserved.
        </div>
        <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
          <span>ข้อกำหนดการใช้งาน</span>
          <span>•</span>
          <span>นโยบายความเป็นส่วนตัว</span>
          <span>•</span>
          <span>ศูนย์ช่วยเหลือผู้ใช้</span>
        </div>
      </footer>
    </div>
  );
};

