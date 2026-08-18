import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Building2,
  Briefcase,
  Shield,
  ChevronRight,
  RefreshCw,
  Phone,
  HelpCircle,
  X,
  Headphones,
  UserCog
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
  const [isSignUp, setIsSignUp] = useState(false);
  const [showAdminContactModal, setShowAdminContactModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Login Form State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register Form State
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('staff');
  const [regDeptId, setRegDeptId] = useState('thurakan');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');

  const clearMessages = () => {
    setErrorMsg('');
    setOkMsg('');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    const u = loginUsername.trim();
    const p = loginPassword;

    if (!u || !p) {
      setErrorMsg('กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน');
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

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    const fullName = `${regFirstName.trim()} ${regLastName.trim()}`.trim();

    if (!fullName || !regUsername.trim() || !regPassword) {
      setErrorMsg('กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง');
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

    if (!agreeTerms) {
      setErrorMsg('กรุณายอมรับข้อกำหนดและเงื่อนไขการใช้งาน');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onRegister({
        username: regUsername.trim(),
        password: regPassword,
        role: regRole,
        roles: [regRole],
        name: fullName,
        category: 'office',
        deptId: regDeptId
      });

      if (res.success) {
        setRegFirstName('');
        setRegLastName('');
        setRegUsername('');
        setRegPassword('');
        setRegPasswordConfirm('');
        setIsSignUp(false);
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

  return (
    <div className="min-h-screen bg-[#F0F4F8] text-slate-800 flex flex-col font-sans relative overflow-x-hidden selection:bg-indigo-600 selection:text-white">
      {/* Background Soft Neumorphic Glows */}
      <div className="absolute top-[-120px] left-[-120px] w-[550px] h-[550px] bg-blue-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-120px] right-[-120px] w-[550px] h-[550px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* TOP PORTAL COMMAND HEADER */}
      <header className="w-full bg-slate-900 text-white border-b border-slate-800 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center font-black shadow-[0_4px_12px_rgba(79,70,229,0.3)] shrink-0">
            <PackageCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-wide text-white">MatPlan</span>
              <span className="text-[10px] font-mono font-bold text-indigo-300 bg-indigo-950/90 border border-indigo-800/80 px-2 py-0.5 rounded-full shadow-inner">
                FY2569
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium">ระบบการวางแผนความต้องการวัสดุ รพ.สามชุก</p>
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="flex items-center gap-2 text-xs">
          <div className="hidden md:flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 px-3 py-1.5 rounded-xl text-slate-200 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[11px] font-bold">สถานะระบบ: เปิดรับคำขอประจำปีงบประมาณ 2569</span>
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-800 text-emerald-300 px-3 py-1.5 rounded-xl font-mono text-[11px] font-bold shadow-inner">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            SSL Encrypted
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 flex flex-col justify-center items-center gap-6 z-10">

        {/* TOP SYSTEM HIGHLIGHT RIBBON (4 Metric Chips) */}
        <div className="w-full max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#F0F4F8] border border-white/80 rounded-2xl p-3.5 flex items-center gap-3 shadow-[5px_5px_12px_rgba(163,177,198,0.3),-5px_-5px_12px_rgba(255,255,255,0.9)]">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 border border-indigo-200/50 flex items-center justify-center shrink-0 shadow-inner">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="text-[10px] uppercase font-mono font-bold text-slate-500">รอบแผนงาน</div>
              <div className="text-xs font-bold text-slate-900 truncate">ปีงบประมาณ 2569</div>
            </div>
          </div>

          <div className="bg-[#F0F4F8] border border-white/80 rounded-2xl p-3.5 flex items-center gap-3 shadow-[5px_5px_12px_rgba(163,177,198,0.3),-5px_-5px_12px_rgba(255,255,255,0.9)]">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-200/50 flex items-center justify-center shrink-0 shadow-inner">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="text-[10px] uppercase font-mono font-bold text-slate-500">หมวดวัสดุหลัก</div>
              <div className="text-xs font-bold text-slate-900 truncate">9 หมวดมาตรฐาน</div>
            </div>
          </div>

          <div className="bg-[#F0F4F8] border border-white/80 rounded-2xl p-3.5 flex items-center gap-3 shadow-[5px_5px_12px_rgba(163,177,198,0.3),-5px_-5px_12px_rgba(255,255,255,0.9)]">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-200/50 flex items-center justify-center shrink-0 shadow-inner">
              <BellRing className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="text-[10px] uppercase font-mono font-bold text-slate-500">ลำดับการอนุมัติ</div>
              <div className="text-xs font-bold text-slate-900 truncate">5 ขั้นตอน (Workflow)</div>
            </div>
          </div>

          <div className="bg-[#F0F4F8] border border-white/80 rounded-2xl p-3.5 flex items-center gap-3 shadow-[5px_5px_12px_rgba(163,177,198,0.3),-5px_-5px_12px_rgba(255,255,255,0.9)]">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 border border-teal-200/50 flex items-center justify-center shrink-0 shadow-inner">
              <Clock className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="text-[10px] uppercase font-mono font-bold text-slate-500">ประวัติสถิติ</div>
              <div className="text-xs font-bold text-slate-900 truncate">ย้อนหลัง 5 ปีการใช้งาน</div>
            </div>
          </div>
        </div>

        {/* EMBOSSED SLIDER CARD CONTAINER */}
        <div className="w-full max-w-4xl relative">
          
          {/* Main Neumorphic Card Outer Frame */}
          <div className="w-full bg-[#F0F4F8] border border-white/80 rounded-[32px] sm:rounded-[38px] p-4 sm:p-6 shadow-[14px_14px_35px_#c7d2e0,-14px_-14px_35px_#ffffff] relative overflow-hidden">
            
            {/* Desktop 2-Column Grid / Mobile Stack */}
            <div className="relative min-h-[520px] grid grid-cols-1 lg:grid-cols-2 items-center">

              {/* ---------------- LEFT PANEL: SIGN IN FORM ---------------- */}
              <div className={`p-4 sm:p-8 flex flex-col justify-center transition-all duration-500 ${isSignUp ? 'lg:opacity-0 lg:pointer-events-none' : 'opacity-100'}`}>
                {/* Standard Sign In Form */}
                <div className="space-y-5">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                      เข้าสู่ระบบ
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                      กรุณากรอกชื่อผู้ใช้งานและรหัสผ่านเพื่อเข้าสู่ระบบงาน
                    </p>
                  </div>

                  {errorMsg && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-2xl flex items-center gap-2 shadow-sm">
                      <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {okMsg && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs p-3 rounded-2xl flex items-center gap-2 shadow-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{okMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    {/* Email/Username Input (Embossed Inset) */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-indigo-600" />
                        ชื่อผู้ใช้งาน (Username)
                      </label>
                      <div className="shadow-[inset_2.5px_2.5px_5px_rgba(163,177,198,0.35),inset_-2.5px_-2.5px_5px_rgba(255,255,255,0.9)] bg-[#E9EFF6] border border-slate-200/60 rounded-2xl px-4 py-3 text-slate-800 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all flex items-center gap-2">
                        <input
                          type="text"
                          required
                          value={loginUsername}
                          onChange={e => setLoginUsername(e.target.value)}
                          placeholder="กรอกชื่อผู้ใช้งานของคุณ..."
                          className="bg-transparent w-full text-slate-900 placeholder:text-slate-400 focus:outline-none text-xs sm:text-sm font-medium"
                        />
                      </div>
                    </div>

                    {/* Password Input (Embossed Inset) */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-indigo-600" />
                        รหัสผ่าน (Password)
                      </label>
                      <div className="shadow-[inset_2.5px_2.5px_5px_rgba(163,177,198,0.35),inset_-2.5px_-2.5px_5px_rgba(255,255,255,0.9)] bg-[#E9EFF6] border border-slate-200/60 rounded-2xl px-4 py-3 text-slate-800 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all flex items-center gap-2 relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={loginPassword}
                          onChange={e => setLoginPassword(e.target.value)}
                          placeholder="กรอกรหัสผ่านของคุณ..."
                          className="bg-transparent w-full text-slate-900 placeholder:text-slate-400 focus:outline-none text-xs sm:text-sm pr-8 font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Options: Remember Me & Forgot Password */}
                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <label className="flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900 select-none">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={e => setRememberMe(e.target.checked)}
                          className="w-4 h-4 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer shadow-xs"
                        />
                        <span className="font-medium">จดจำการเข้าสู่ระบบ</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => setShowAdminContactModal(true)}
                        className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>ลืมรหัสผ่าน? (ติดต่อ Admin)</span>
                      </button>
                    </div>

                    {/* Submit Button (Embossed Blue Gradient) */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold py-3.5 px-6 rounded-2xl shadow-[0_10px_25px_-5px_rgba(79,70,229,0.5),inset_0_1px_1px_rgba(255,255,255,0.4)] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
                    >
                      {isSubmitting ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <LogIn className="w-4 h-4" />
                      )}
                      <span>เข้าสู่ระบบ (Sign In)</span>
                    </button>

                    {/* Mobile Toggle to Sign Up */}
                    <div className="lg:hidden text-center pt-3 border-t border-slate-200/80">
                      <button
                        type="button"
                        onClick={() => { setIsSignUp(true); clearMessages(); }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-bold"
                      >
                        ยังไม่มีบัญชีผู้ใช้? คลิกที่นี่เพื่อลงทะเบียน (Register)
                      </button>
                    </div>

                  </form>
                </div>
              </div>

              {/* ---------------- RIGHT PANEL: CREATE ACCOUNT FORM ---------------- */}
              <div className={`p-4 sm:p-8 flex flex-col justify-center transition-all duration-500 ${!isSignUp ? 'lg:opacity-0 lg:pointer-events-none' : 'opacity-100'}`}>
                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                      ลงทะเบียนผู้ใช้งาน
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                      กรอกข้อมูลเพื่อสร้างบัญชีสำหรับขอรับการจัดสรรวัสดุ
                    </p>
                  </div>

                  {errorMsg && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-2xl flex items-center gap-2 shadow-sm">
                      <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {okMsg && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs p-3 rounded-2xl flex items-center gap-2 shadow-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{okMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs sm:text-sm">
                    {/* First Name & Last Name (Embossed Insets) */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="shadow-[inset_2.5px_2.5px_5px_rgba(163,177,198,0.35),inset_-2.5px_-2.5px_5px_rgba(255,255,255,0.9)] bg-[#E9EFF6] border border-slate-200/60 rounded-2xl px-3.5 py-2.5 text-slate-800 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                        <input
                          type="text"
                          required
                          value={regFirstName}
                          onChange={e => setRegFirstName(e.target.value)}
                          placeholder="ชื่อจริง"
                          className="bg-transparent w-full text-slate-900 placeholder:text-slate-400 focus:outline-none text-xs font-medium"
                        />
                      </div>
                      <div className="shadow-[inset_2.5px_2.5px_5px_rgba(163,177,198,0.35),inset_-2.5px_-2.5px_5px_rgba(255,255,255,0.9)] bg-[#E9EFF6] border border-slate-200/60 rounded-2xl px-3.5 py-2.5 text-slate-800 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                        <input
                          type="text"
                          required
                          value={regLastName}
                          onChange={e => setRegLastName(e.target.value)}
                          placeholder="นามสกุล"
                          className="bg-transparent w-full text-slate-900 placeholder:text-slate-400 focus:outline-none text-xs font-medium"
                        />
                      </div>
                    </div>

                    {/* Email / Username Input (Embossed Inset) */}
                    <div className="shadow-[inset_2.5px_2.5px_5px_rgba(163,177,198,0.35),inset_-2.5px_-2.5px_5px_rgba(255,255,255,0.9)] bg-[#E9EFF6] border border-slate-200/60 rounded-2xl px-3.5 py-2.5 text-slate-800 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                      <input
                        type="text"
                        required
                        value={regUsername}
                        onChange={e => setRegUsername(e.target.value)}
                        placeholder="ชื่อผู้ใช้งาน (Username สำหรับเข้าสู่ระบบ)"
                        className="bg-transparent w-full text-slate-900 placeholder:text-slate-400 focus:outline-none text-xs font-medium"
                      />
                    </div>

                    {/* Role & Department Selectors */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="shadow-[inset_2.5px_2.5px_5px_rgba(163,177,198,0.35),inset_-2.5px_-2.5px_5px_rgba(255,255,255,0.9)] bg-[#E9EFF6] border border-slate-200/60 rounded-2xl px-3 py-2 text-slate-800 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                        <select
                          value={regRole}
                          onChange={e => setRegRole(e.target.value as UserRole)}
                          className="bg-transparent w-full text-slate-800 text-xs focus:outline-none font-medium cursor-pointer"
                        >
                          <option value="staff">บทบาท: ผู้ขอ (เจ้าหน้าที่)</option>
                          <option value="head">บทบาท: หัวหน้ากลุ่มงาน/ฝ่าย</option>
                          <option value="proc">บทบาท: เจ้าหน้าที่พัสดุ</option>
                          <option value="prochead">บทบาท: หัวหน้าฝ่ายพัสดุ</option>
                          <option value="exec">บทบาท: ผู้บริหาร</option>
                        </select>
                      </div>

                      <div className="shadow-[inset_2.5px_2.5px_5px_rgba(163,177,198,0.35),inset_-2.5px_-2.5px_5px_rgba(255,255,255,0.9)] bg-[#E9EFF6] border border-slate-200/60 rounded-2xl px-3 py-2 text-slate-800 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                        <select
                          value={regDeptId}
                          onChange={e => setRegDeptId(e.target.value)}
                          className="bg-transparent w-full text-slate-800 text-xs focus:outline-none font-medium cursor-pointer"
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
                    </div>

                    {/* Create Password Input */}
                    <div className="shadow-[inset_2.5px_2.5px_5px_rgba(163,177,198,0.35),inset_-2.5px_-2.5px_5px_rgba(255,255,255,0.9)] bg-[#E9EFF6] border border-slate-200/60 rounded-2xl px-3.5 py-2.5 text-slate-800 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                      <input
                        type="password"
                        required
                        value={regPassword}
                        onChange={e => setRegPassword(e.target.value)}
                        placeholder="ตั้งรหัสผ่าน (อย่างน้อย 4 ตัวอักษร)"
                        className="bg-transparent w-full text-slate-900 placeholder:text-slate-400 focus:outline-none text-xs font-medium"
                      />
                    </div>

                    {/* Confirm Password Input */}
                    <div className="shadow-[inset_2.5px_2.5px_5px_rgba(163,177,198,0.35),inset_-2.5px_-2.5px_5px_rgba(255,255,255,0.9)] bg-[#E9EFF6] border border-slate-200/60 rounded-2xl px-3.5 py-2.5 text-slate-800 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                      <input
                        type="password"
                        required
                        value={regPasswordConfirm}
                        onChange={e => setRegPasswordConfirm(e.target.value)}
                        placeholder="ยืนยันรหัสผ่านอีกครั้ง"
                        className="bg-transparent w-full text-slate-900 placeholder:text-slate-400 focus:outline-none text-xs font-medium"
                      />
                    </div>

                    {/* Terms Agreement Checkbox */}
                    <div className="flex items-center gap-2 pt-1 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900 select-none">
                        <input
                          type="checkbox"
                          checked={agreeTerms}
                          onChange={e => setAgreeTerms(e.target.checked)}
                          className="w-4 h-4 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer shadow-xs"
                        />
                        <span>ฉันยอมรับข้อกำหนดและเงื่อนไขการใช้งานของโรงพยาบาล</span>
                      </label>
                    </div>

                    {/* Create Account Action Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold py-3.5 px-6 rounded-2xl shadow-[0_10px_25px_-5px_rgba(79,70,229,0.5),inset_0_1px_1px_rgba(255,255,255,0.4)] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 mt-1"
                    >
                      {isSubmitting ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <UserPlus className="w-4 h-4" />
                      )}
                      <span>ลงทะเบียนบัญชีใหม่</span>
                    </button>

                    {/* Mobile Toggle to Sign In */}
                    <div className="lg:hidden text-center pt-3 border-t border-slate-200/80">
                      <button
                        type="button"
                        onClick={() => { setIsSignUp(false); clearMessages(); }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-bold"
                      >
                        มีบัญชีอยู่แล้ว? เข้าสู่ระบบ (Sign In)
                      </button>
                    </div>

                  </form>
                </div>
              </div>

              {/* ---------------- SLIDING BLUE OVERLAY PANEL (DESKTOP) ---------------- */}
              <motion.div
                initial={false}
                animate={{
                  x: isSignUp ? '0%' : '100%',
                }}
                transition={{
                  type: 'spring',
                  stiffness: 280,
                  damping: 30,
                }}
                className="hidden lg:flex absolute top-0 left-0 w-1/2 h-full p-4 z-20 pointer-events-none"
              >
                <div className="w-full h-full rounded-[26px] bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-700 text-white p-8 flex flex-col justify-between items-center text-center shadow-[0_20px_50px_rgba(79,70,229,0.4),inset_0_1px_1px_rgba(255,255,255,0.4)] pointer-events-auto relative overflow-hidden">
                  
                  {/* Decorative Subtle Circles */}
                  <div className="absolute top-[-50px] right-[-50px] w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                  <div className="absolute bottom-[-50px] left-[-50px] w-48 h-48 rounded-full bg-blue-400/20 blur-2xl pointer-events-none" />

                  {/* Top Glass Pill Badge */}
                  <div className="pt-2">
                    <span className="px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-white text-[11px] font-bold border border-white/20 shadow-[0_2px_8px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.3)]">
                      {isSignUp ? 'ยินดีต้อนรับกลับ' : 'เริ่มต้นใช้งานระบบ'}
                    </span>
                  </div>

                  {/* Dynamic Content */}
                  <div className="space-y-4 max-w-xs my-auto">
                    <AnimatePresence mode="wait">
                      {isSignUp ? (
                        <motion.div
                          key="welcome-back"
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -15 }}
                          transition={{ duration: 0.25 }}
                          className="space-y-3"
                        >
                          <h3 className="text-3xl font-extrabold tracking-tight text-white">
                            มีบัญชีอยู่แล้ว?
                          </h3>
                          <p className="text-xs sm:text-sm text-indigo-100 font-medium leading-relaxed">
                            เข้าสู่ระบบเพื่อจัดทำแผนความต้องการวัสดุ ตรวจสอบสถานะคำขอ และติดตามงบประมาณประจำปี
                          </p>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="already-have"
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -15 }}
                          transition={{ duration: 0.25 }}
                          className="space-y-3"
                        >
                          <h3 className="text-3xl font-extrabold tracking-tight text-white">
                            ยังไม่มีบัญชีผู้ใช้?
                          </h3>
                          <p className="text-xs sm:text-sm text-indigo-100 font-medium leading-relaxed">
                            ลงทะเบียนเพื่อร่วมจัดทำคำขอและวางแผนความต้องการวัสดุประจำปีงบประมาณ 2569 ได้อย่างสะดวกรวดเร็ว
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Embossed Glass Switch Button */}
                    <div className="pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setIsSignUp(!isSignUp);
                          clearMessages();
                        }}
                        className="px-8 py-3 rounded-full bg-white/20 hover:bg-white/30 text-white font-extrabold text-xs tracking-wide backdrop-blur-md border border-white/40 shadow-[0_6px_20px_rgba(0,0,0,0.15),inset_0_1px_2px_rgba(255,255,255,0.6)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.2),inset_0_1px_2px_rgba(255,255,255,0.8)] active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2"
                      >
                        <span>{isSignUp ? 'เข้าสู่ระบบ (Sign In)' : 'ลงทะเบียน (Create Account)'}</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Bottom Footer Note inside Blue Card */}
                  <div className="pb-2 text-[10px] text-indigo-200/80 font-mono">
                    MatPlan Hospital System • v1.7
                  </div>

                </div>
              </motion.div>

            </div>

          </div>

        </div>

      </main>

      {/* ADMIN CONTACT POPUP / MODAL (ลืมรหัสผ่าน -> ติดต่อ Admin) */}
      <AnimatePresence>
        {showAdminContactModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-[#F0F4F8] border border-white/80 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-[14px_14px_35px_rgba(0,0,0,0.3),-14px_-14px_35px_rgba(255,255,255,0.8)] relative"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowAdminContactModal(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center cursor-pointer transition-colors shadow-sm"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Modal Icon & Header */}
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-[0_4px_12px_rgba(79,70,229,0.3)] shrink-0">
                  <UserCog className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
                    ติดต่อผู้ดูแลระบบ (Admin)
                  </h3>
                  <p className="text-xs text-indigo-600 font-semibold">
                    ฝ่ายบริหารงานพัสดุและระบบเทคโนโลยีสารสนเทศ
                  </p>
                </div>
              </div>

              {/* Info Body */}
              <div className="space-y-3.5 text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 text-amber-900 flex items-start gap-2.5 shadow-xs">
                  <HelpCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs leading-relaxed font-medium">
                    กรณีที่ท่าน<strong>ลืมรหัสผ่าน</strong> หรือต้องการรีเซ็ตรหัสผ่านเข้าสู่ระบบใหม่ กรุณาติดต่อเจ้าหน้าที่ผู้ดูแลระบบ (Admin) เพื่อยืนยันตัวตนและดำเนินการตั้งรหัสผ่านใหม่
                  </p>
                </div>

                {/* Contact Channels List */}
                <div className="bg-white/80 border border-slate-200/70 rounded-2xl p-4 space-y-3 shadow-inner">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 uppercase">เบอร์โทรศัพท์ภายใน</div>
                      <div className="text-xs sm:text-sm font-extrabold text-slate-900">
                        โทร 115 (งานพัสดุ) / 149 (ศูนย์คอมพิวเตอร์)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 uppercase">สถานที่ติดต่อ</div>
                      <div className="text-xs sm:text-sm font-extrabold text-slate-900">
                        อาคารอำนวยการและบริหารงาน ชั้น 2 โรงพยาบาลสามชุก
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 uppercase">เวลาทำการ</div>
                      <div className="text-xs sm:text-sm font-extrabold text-slate-900">
                        วันจันทร์ - วันศุกร์ เวลา 08:00 - 16:00 น. (เว้นวันหยุดราชการ)
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Acknowledge Button */}
              <button
                type="button"
                onClick={() => setShowAdminContactModal(false)}
                className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold py-3 px-6 rounded-2xl shadow-[0_10px_25px_-5px_rgba(79,70,229,0.5),inset_0_1px_1px_rgba(255,255,255,0.4)] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 text-xs sm:text-sm"
              >
                <span>รับทราบ / ปิดหน้าต่าง</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FOOTER SYSTEM STRIP */}
      <footer className="w-full border-t border-slate-200/70 bg-[#F0F4F8] px-4 sm:px-8 py-3 text-center text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2 z-20">
        <div>
          © 2026 ระบบการวางแผนความต้องการวัสดุ โรงพยาบาลสามชุก (MatPlan). All rights reserved.
        </div>
        <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
          <span>ข้อกำหนดการใช้งาน</span>
          <span>•</span>
          <span>นโยบายความปลอดภัย</span>
          <span>•</span>
          <span>ศูนย์ช่วยเหลือ</span>
        </div>
      </footer>
    </div>
  );
};
