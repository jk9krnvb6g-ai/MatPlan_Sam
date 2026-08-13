import React, { useState, useEffect, useRef } from 'react';
import { CategoryId, Department, RequestItem, User, UserRole, WorkGroup, LogEntry } from './types';
import { CUSTOM_UNITS, SEED_USERS, seedRequests, generate10000Requests, INITIAL_WORK_GROUPS, DEPARTMENTS, saveCustomCategory, deleteCustomCategory } from './data/catalog';

import { Sidebar } from './components/Sidebar';
import { StaffView } from './components/StaffView';
import { HeadView } from './components/HeadView';
import { ProcurementView } from './components/ProcurementView';
import { ProcurementHeadView } from './components/ProcurementHeadView';
import { ExecutiveView } from './components/ExecutiveView';
import { AdminUsersView } from './components/AdminUsersView';
import { AdminMaterialsView } from './components/AdminMaterialsView';
import { AdminOrgView } from './components/AdminOrgView';
import { AdminLogsView } from './components/AdminLogsView';
import { AuthView } from './components/AuthView';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { PrintableReportModal } from './components/PrintableReportModal';
import { ConfirmModal } from './components/ConfirmModal';
import { ToastAlert } from './components/ToastAlert';
import { ChevronDown, Clock, Key, LogOut, Type, Sparkles, CheckCircle2, Sun, Moon, Trash2, RotateCcw } from 'lucide-react';

export default function App() {
  // Dark/Light Mode state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('survey_dark_mode') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('survey_dark_mode', isDarkMode ? 'true' : 'false');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Font scale mode for senior users (age 50+)
  const [fontSizeScale, setFontSizeScale] = useState<'normal' | 'large' | 'xlarge'>(() => {
    const saved = localStorage.getItem('survey_font_scale');
    return (saved as 'normal' | 'large' | 'xlarge') || 'large'; // Default to 'large' (16px) for normal readable scale
  });

  useEffect(() => {
    localStorage.setItem('survey_font_scale', fontSizeScale);
    const root = document.documentElement;
    root.classList.remove('font-normal', 'font-large', 'font-extra-large');
    if (fontSizeScale === 'normal') {
      root.style.fontSize = '14px';
      root.classList.add('font-normal');
    } else if (fontSizeScale === 'large') {
      root.style.fontSize = '16px';
      root.classList.add('font-large');
    } else if (fontSizeScale === 'xlarge') {
      root.style.fontSize = '18px';
      root.classList.add('font-extra-large');
    }
  }, [fontSizeScale]);

  // Fiscal Year state
  const [fiscalYear, setFiscalYear] = useState<string>(() => {
    const saved = localStorage.getItem('survey_fiscal_year');
    return saved || '2569';
  });

  // Persistence state
  const [workGroups, setWorkGroups] = useState<WorkGroup[]>(() => {
    const saved = localStorage.getItem('survey_work_groups');
    return saved ? JSON.parse(saved) : INITIAL_WORK_GROUPS;
  });

  const [departments, setDepartments] = useState<Department[]>(() => {
    const saved = localStorage.getItem('survey_departments');
    return saved ? JSON.parse(saved) : DEPARTMENTS;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('survey_users');
    return saved ? JSON.parse(saved) : SEED_USERS;
  });

  const [requests, setRequests] = useState<RequestItem[]>(() => {
    const saved = localStorage.getItem('survey_requests');
    return saved ? JSON.parse(saved) : seedRequests();
  });

  const [customItems, setCustomItems] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('survey_custom_items');
    return saved ? JSON.parse(saved) : {};
  });

  const [itemPrices, setItemPrices] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('survey_item_prices');
    return saved ? JSON.parse(saved) : {};
  });

  const [materialActive, setMaterialActive] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('survey_material_active');
    return saved ? JSON.parse(saved) : {};
  });

  const [isPlanFrozen, setIsPlanFrozen] = useState<boolean>(() => {
    const saved = localStorage.getItem('survey_plan_frozen');
    return saved ? JSON.parse(saved) : false;
  });

  const [isCatalogCleared, setIsCatalogCleared] = useState<boolean>(() => {
    const saved = localStorage.getItem('survey_catalog_cleared');
    return saved ? JSON.parse(saved) : false;
  });

  // System logs state
  const [logs, setLogs] = useState<LogEntry[]>(() => {
    const saved = localStorage.getItem('survey_logs');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('survey_logs', JSON.stringify(logs));
  }, [logs]);

  const logAction = (
    actionType: LogEntry['actionType'],
    module: LogEntry['module'],
    description: string,
    overrideUser?: User | null
  ) => {
    const userToLog = overrideUser !== undefined ? overrideUser : currentUser;
    const logUser = userToLog ? userToLog.username : 'system';
    const logName = userToLog ? userToLog.name : 'ระบบ';
    
    const newLog: LogEntry = {
      id: 'LOG-' + String(Date.now()) + '-' + String(Math.floor(Math.random() * 1000)),
      timestamp: new Date().toISOString(),
      username: logUser,
      name: logName,
      actionType,
      module,
      description
    };
    
    setLogs(prev => [newLog, ...prev]);
  };

  // Current session state
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    return null; // Start on login page
  });

  const [activeRole, setActiveRole] = useState<UserRole | 'users' | 'materials' | 'org' | 'logs'>('staff');

  // Modals & Alerts
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showPrintReportModal, setShowPrintReportModal] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Global Confirm Dialog State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    variant?: 'primary' | 'danger' | 'warning';
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: ''
  });

  // Global Toast Alert State
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    show: false,
    message: '',
    type: 'success'
  });

  const handleOpenConfirm = (opts: {
    title: string;
    message: string;
    confirmText?: string;
    variant?: 'primary' | 'danger' | 'warning';
    onConfirm: () => void;
  }) => {
    setConfirmConfig({
      isOpen: true,
      title: opts.title,
      message: opts.message,
      confirmText: opts.confirmText,
      variant: opts.variant,
      onConfirm: opts.onConfirm
    });
  };

  const handleToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({
      show: true,
      message,
      type
    });
  };

  const isPollingUpdateRef = useRef<boolean>(false);
  const [isLoadingBackend, setIsLoadingBackend] = useState<boolean>(true);
  const apiBase = window.location.pathname.startsWith('/system-a') 
    ? '/system-a/api' 
    : (window.location.pathname.startsWith('/MatPlan') ? '/MatPlan/api' : '/api');

  // Sync state from server on mount
  useEffect(() => {
    const fetchLatestState = () => {
      fetch(`${apiBase}/state`)
        .then(async res => {
          const contentType = res.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            throw new Error(`Expected JSON but got ${contentType}`);
          }
          return res.json();
        })
        .then(res => {
          if (res.success && res.data) {
            const d = res.data;
            isPollingUpdateRef.current = true;
            if (d.workGroups) setWorkGroups(d.workGroups);
            if (d.departments) setDepartments(d.departments);
            if (d.users) setUsers(d.users);
            if (d.requests) setRequests(d.requests);
            if (d.customItems) setCustomItems(d.customItems);
            if (d.itemPrices) setItemPrices(d.itemPrices);
            if (d.materialActive) setMaterialActive(d.materialActive);
            if (d.isPlanFrozen !== undefined) setIsPlanFrozen(d.isPlanFrozen);
            if (d.fiscalYear) setFiscalYear(d.fiscalYear);
            if (d.isCatalogCleared !== undefined) setIsCatalogCleared(d.isCatalogCleared);
            if (d.logs) setLogs(d.logs);
          }
        })
        .catch(err => {
          console.error('Error fetching backend state, falling back to localStorage:', err);
        })
        .finally(() => {
          setIsLoadingBackend(false);
        });
    };

    fetchLatestState();

    // Auto-refresh state every 5 seconds and when browser tab regains focus
    const interval = setInterval(fetchLatestState, 5000);
    const handleFocus = () => fetchLatestState();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [apiBase]);

  // Sync state to local storage and backend
  useEffect(() => {
    localStorage.setItem('survey_work_groups', JSON.stringify(workGroups));
  }, [workGroups]);

  useEffect(() => {
    localStorage.setItem('survey_departments', JSON.stringify(departments));
  }, [departments]);

  useEffect(() => {
    localStorage.setItem('survey_fiscal_year', fiscalYear);
  }, [fiscalYear]);

  useEffect(() => {
    localStorage.setItem('survey_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('survey_requests', JSON.stringify(requests));
  }, [requests]);

  useEffect(() => {
    localStorage.setItem('survey_custom_items', JSON.stringify(customItems));
  }, [customItems]);

  useEffect(() => {
    localStorage.setItem('survey_item_prices', JSON.stringify(itemPrices));
  }, [itemPrices]);

  useEffect(() => {
    localStorage.setItem('survey_material_active', JSON.stringify(materialActive));
  }, [materialActive]);

  useEffect(() => {
    localStorage.setItem('survey_plan_frozen', JSON.stringify(isPlanFrozen));
  }, [isPlanFrozen]);

  useEffect(() => {
    localStorage.setItem('survey_catalog_cleared', JSON.stringify(isCatalogCleared));
  }, [isCatalogCleared]);

  // Sync state changes to backend
  useEffect(() => {
    if (isLoadingBackend) return;
    if (isPollingUpdateRef.current) {
      isPollingUpdateRef.current = false;
      return;
    }
    fetch(`${apiBase}/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workGroups,
        departments,
        users,
        requests,
        customItems,
        itemPrices,
        materialActive,
        isPlanFrozen,
        fiscalYear,
        isCatalogCleared,
        logs
      })
    })
    .catch(err => {
      console.error('Failed to sync state to backend:', err);
    });
  }, [workGroups, departments, users, requests, customItems, itemPrices, materialActive, isPlanFrozen, fiscalYear, isCatalogCleared, logs, isLoadingBackend, apiBase]);

  // Real-time EventSource listener for Server-Sent Events (SSE)
  useEffect(() => {
    if (isLoadingBackend) return;

    const token = localStorage.getItem('survey_token');
    const sseUrl = `${apiBase}/notifications/stream`;
    
    // Set up standard browser EventSource
    const es = new EventSource(sseUrl);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'connected') {
          console.log('[SSE] Connection active.');
          return;
        }

        // Display beautiful real-time push toast alerts to user
        if (data.payload && data.payload.message) {
          handleToast(data.payload.message, 'info');
        }

        // Instant refresh of local state from server
        fetch(`${apiBase}/state`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        })
          .then(res => res.json())
          .then(res => {
            if (res.success && res.data) {
              const d = res.data;
              isPollingUpdateRef.current = true;
              if (d.workGroups) setWorkGroups(d.workGroups);
              if (d.departments) setDepartments(d.departments);
              if (d.users) setUsers(d.users);
              if (d.requests) setRequests(d.requests);
              if (d.customItems) setCustomItems(d.customItems);
              if (d.itemPrices) setItemPrices(d.itemPrices);
              if (d.materialActive) setMaterialActive(d.materialActive);
              if (d.isPlanFrozen !== undefined) setIsPlanFrozen(d.isPlanFrozen);
              if (d.fiscalYear) setFiscalYear(d.fiscalYear);
              if (d.logs) setLogs(d.logs);
            }
          })
          .catch(err => {
            console.error('[SSE] Error refreshing state:', err);
          });
      } catch (err) {
        console.error('[SSE] Failed to process message event:', err);
      }
    };

    es.onerror = (err) => {
      console.warn('[SSE] EventSource warning or disconnect. Reconnecting automatically...', err);
    };

    return () => {
      es.close();
    };
  }, [apiBase, isLoadingBackend]);

  // Auto-login on mount if token is saved
  useEffect(() => {
    const savedToken = localStorage.getItem('survey_token');
    if (savedToken) {
      fetch(`${apiBase}/auth/me`, {
        headers: { 'Authorization': `Bearer ${savedToken}` }
      })
      .then(res => res.json())
      .then(res => {
        if (res.success && res.user) {
          setCurrentUser(res.user);
          if (res.user.role === 'admin') {
            setActiveRole('staff');
          } else {
            setActiveRole(res.user.role);
          }
        } else {
          localStorage.removeItem('survey_token');
        }
      })
      .catch(err => {
        console.error('Offline or failed auto-login, using local storage backup:', err);
      });
    }
  }, [apiBase]);

  // Login handler
  const handleLogin = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success && data.token) {
        localStorage.setItem('survey_token', data.token);
        setCurrentUser(data.user);
        if (data.user.role === 'admin') {
          setActiveRole('staff');
        } else {
          setActiveRole(data.user.role);
        }
        logAction('auth', 'users', `ผู้ใช้งาน @${data.user.username} เข้าสู่ระบบสำเร็จ (JWT Verified)`, data.user);
        handleToast(`ยินดีต้อนรับคุณ ${data.user.name}`, 'success');
        return { success: true };
      } else {
        return { success: false, error: data.error || 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' };
      }
    } catch (err) {
      return { success: false, error: 'เกิดข้อผิดพลาดในการติดต่อระบบล็อกอินของเซิร์ฟเวอร์' };
    }
  };

  const handleLogout = () => {
    if (currentUser) {
      logAction('auth', 'users', `ผู้ใช้งาน @${currentUser.username} ออกจากระบบสำเร็จ`);
    }
    localStorage.removeItem('survey_token');
    setCurrentUser(null);
  };

  const handleRegisterUser = async (newUser: Omit<User, 'status'>): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${apiBase}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      const data = await res.json();
      if (data.success) {
        return { success: true, error: data.message };
      } else {
        return { success: false, error: data.error || 'การสมัครสมาชิกถูกปฏิเสธโดยเซิร์ฟเวอร์' };
      }
    } catch (err) {
      return { success: false, error: 'เกิดข้อผิดพลาดในการติดต่อระบบสมัครสมาชิก' };
    }
  };

  const handleResetUserPassword = async (username: string, newPw: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${apiBase}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, newPassword: newPw })
      });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.map(u => u.username === username ? { ...u, password: newPw } : u));
        logAction('edit', 'users', `รีเซ็ตรหัสผ่านของบัญชีผู้ใช้งาน @${username} เรียบร้อยแล้ว`);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'รีเซ็ตรหัสผ่านล้มเหลว' };
      }
    } catch (err) {
      return { success: false, error: 'เกิดข้อผิดพลาดในการติดต่อระบบรีเซ็ตรหัสผ่าน' };
    }
  };

  // Staff Handlers
  const handleSubmitStaffRequests = (deptId: string, itemsToSubmit: { itemName: string; qtyRequested: number }[], reason: string) => {
    setRequests(prev => {
      const updated = [...prev];

      itemsToSubmit.forEach(item => {
        const existingIndex = updated.findIndex(r => r.deptId === deptId && r.itemName === item.itemName && r.status === 'rejected');
        if (existingIndex > -1) {
          const oldReq = updated[existingIndex];
          updated[existingIndex] = {
            ...oldReq,
            qtyOriginal: oldReq.qtyOriginal ?? oldReq.qtyRequested,
            qtyRequested: item.qtyRequested,
            status: 'pending_head',
            comment: '',
            reason
          };
        } else {
          updated.push({
            id: 'REQ-' + String(Math.floor(Math.random() * 9000) + 1000),
            deptId,
            itemName: item.itemName,
            unit: CUSTOM_UNITS[item.itemName] || 'ชิ้น',
            qtyLastYear: 10,
            qtyOriginal: item.qtyRequested,
            qtyRequested: item.qtyRequested,
            status: 'pending_head',
            comment: '',
            reason,
            unitPrice: null,
            fiscalYear
          });
        }
      });

      return updated;
    });
    logAction('add', 'requests', `ส่งเสนอแผนความต้องการพัสดุจำนวน ${itemsToSubmit.length} รายการ สำหรับฝ่าย/แผนก ${deptId} (วัตถุประสงค์: ${reason})`);
  };

  const handleAddCustomItem = (category: CategoryId, name: string, unit: string) => {
    setCustomItems(prev => {
      const list = prev[category] || [];
      if (!list.includes(name)) {
        CUSTOM_UNITS[name] = unit;
        return { ...prev, [category]: [...list, name] };
      }
      return prev;
    });
  };

  // Head Handlers
  const handleHeadApproveItem = (id: string, newQty?: number) => {
    const rItem = requests.find(x => x.id === id);
    if (rItem) {
      const isQtyChanged = newQty !== undefined && newQty !== rItem.qtyRequested;
      const targetQty = newQty !== undefined ? newQty : rItem.qtyRequested;
      logAction('status_change', 'requests', `หัวหน้ากลุ่มงานอนุมัติรายการ '${rItem.itemName}' ของฝ่าย ${rItem.deptId}${isQtyChanged ? ` (ปรับจำนวนขอจากเดิม ${rItem.qtyRequested} เป็น ${targetQty} ${rItem.unit})` : ''}`);
    }
    setRequests(prev => prev.map(r => {
      if (r.id === id) {
        const isQtyChanged = newQty !== undefined && newQty !== r.qtyRequested;
        return {
          ...r,
          qtyOriginal: r.qtyOriginal ?? r.qtyRequested,
          qtyRequested: newQty !== undefined ? newQty : r.qtyRequested,
          qtyAdjusted: isQtyChanged ? newQty : r.qtyAdjusted,
          adjustedByRole: isQtyChanged ? 'head' : r.adjustedByRole,
          adjustedByName: isQtyChanged ? 'หัวหน้ากลุ่มงาน/ฝ่าย' : r.adjustedByName,
          status: 'pending_proc'
        };
      }
      return r;
    }));
  };

  const handleHeadRejectItem = (id: string, comment: string) => {
    const rItem = requests.find(x => x.id === id);
    if (rItem) {
      logAction('status_change', 'requests', `หัวหน้ากลุ่มงานปฏิเสธคำขอรายการ '${rItem.itemName}' ของฝ่าย ${rItem.deptId} (เนื่องจาก: ${comment})`);
    }
    setRequests(prev => prev.map(r => r.id === id ? {
      ...r,
      status: 'rejected',
      comment,
      rejectedByRole: 'head',
      rejectedByName: 'หัวหน้ากลุ่มงาน/ฝ่าย'
    } : r));
  };

  const handleHeadApproveAll = (deptId: string, updatedQtys: Record<string, number>) => {
    logAction('status_change', 'requests', `หัวหน้ากลุ่มงานลงนามอนุมัติเห็นชอบและส่งต่อความต้องการวัสดุทั้งหมดในฝ่าย ${deptId} ให้พัสดุพิจารณา`);
    setRequests(prev => prev.map(r => {
      if (r.deptId === deptId && r.status === 'pending_head') {
        const editQty = updatedQtys[r.id];
        const isQtyChanged = editQty !== undefined && editQty !== r.qtyRequested;
        return {
          ...r,
          qtyOriginal: r.qtyOriginal ?? r.qtyRequested,
          qtyRequested: editQty !== undefined ? editQty : r.qtyRequested,
          qtyAdjusted: isQtyChanged ? editQty : r.qtyAdjusted,
          adjustedByRole: isQtyChanged ? 'head' : r.adjustedByRole,
          adjustedByName: isQtyChanged ? 'หัวหน้ากลุ่มงาน/ฝ่าย' : r.adjustedByName,
          status: 'pending_proc'
        };
      }
      return r;
    }));
  };

  // Procurement Handlers
  const handleUpdateUnitPrice = (itemName: string, price: number) => {
    setItemPrices(prev => ({ ...prev, [itemName]: price }));
    logAction('edit', 'materials', `เจ้าหน้าที่พัสดุปรับปรุงราคากลางสำหรับ '${itemName}' เป็น ${price} บาท`);
  };

  const handleUpdateQty = (requestId: string, newQty: number) => {
    const rItem = requests.find(x => x.id === requestId);
    if (rItem) {
      logAction('edit', 'requests', `เจ้าหน้าที่พัสดุปรับแก้จำนวนจัดสรรรายการ '${rItem.itemName}' ของฝ่าย ${rItem.deptId} จากเดิม ${rItem.qtyRequested} เป็น ${newQty} ${rItem.unit}`);
    }
    setRequests(prev => prev.map(r => {
      if (r.id === requestId) {
        const isQtyChanged = newQty !== r.qtyRequested;
        return {
          ...r,
          qtyOriginal: r.qtyOriginal ?? r.qtyRequested,
          qtyRequested: newQty,
          qtyAdjusted: isQtyChanged ? newQty : r.qtyAdjusted,
          adjustedByRole: isQtyChanged ? 'proc' : r.adjustedByRole,
          adjustedByName: isQtyChanged ? 'เจ้าหน้าที่ฝ่ายพัสดุ' : r.adjustedByName
        };
      }
      return r;
    }));
  };

  const handleSubmitToProcHead = (specificIds?: string[]) => {
    const count = specificIds ? specificIds.length : requests.filter(r => r.status === 'pending_proc').length;
    logAction('status_change', 'requests', `เจ้าหน้าที่พัสดุส่งตรวจสอบความเหมาะสมและเสนอราคาพัสดุรวมจำนวน ${count} รายการ ไปยังหัวหน้าฝ่ายพัสดุ`);
    setRequests(prev => prev.map(r => {
      if (r.status === 'pending_proc' && (!specificIds || specificIds.includes(r.id))) {
        return {
          ...r,
          status: 'pending_proc_head',
          unitPrice: itemPrices[r.itemName] ?? r.unitPrice
        };
      }
      return r;
    }));
  };

  const handleProcRejectRequest = (id: string, comment: string, action: 'return' | 'reject') => {
    const rItem = requests.find(x => x.id === id);
    if (rItem) {
      logAction('status_change', 'requests', `เจ้าหน้าที่พัสดุ${action === 'return' ? 'ตีกลับไปทบทวน' : 'ปฏิเสธคำขอ'}สำหรับรายการ '${rItem.itemName}' ของฝ่าย ${rItem.deptId} (ความเห็น: ${comment})`);
    }
    setRequests(prev => prev.map(r => {
      if (r.id === id) {
        const isReturn = action === 'return';
        return {
          ...r,
          status: isReturn ? 'pending_head' : 'rejected',
          comment: `${isReturn ? 'ตีกลับโดยเจ้าหน้าที่พัสดุ' : 'ปฏิเสธโดยเจ้าหน้าที่พัสดุ'}: ${comment}`,
          rejectedByRole: 'proc',
          rejectedByName: 'เจ้าหน้าที่ฝ่ายพัสดุ'
        };
      }
      return r;
    }));
  };

  // Procurement Head Handlers
  const handleProcHeadApproveToExec = (ids: string[]) => {
    logAction('status_change', 'requests', `หัวหน้าฝ่ายพัสดุลงนามเห็นชอบแผนพัสดุรวมจำนวน ${ids.length} รายการ เสนอเสนอผู้บริหารพิจารณาขั้นสุดท้าย`);
    setRequests(prev => prev.map(r => ids.includes(r.id) ? { ...r, status: 'pending_exec' } : r));
  };

  const handleProcHeadRejectToProc = (ids: string[], comment: string, action: 'return' | 'reject' = 'return') => {
    logAction('status_change', 'requests', `หัวหน้าฝ่ายพัสดุ ${action === 'return' ? 'ตีกลับไปทบทวน' : 'ปฏิเสธคำขอ'} แผนพัสดุรวม ${ids.length} รายการ (ความคิดเห็น: ${comment})`);
    setRequests(prev => prev.map(r => {
      if (ids.includes(r.id)) {
        return {
          ...r,
          status: action === 'return' ? 'pending_proc' : 'rejected',
          comment: `${action === 'return' ? 'ตีกลับโดยหัวหน้าพัสดุ' : 'ปฏิเสธโดยหัวหน้าพัสดุ'}: ${comment}`,
          rejectedByRole: 'prochead',
          rejectedByName: 'หัวหน้าฝ่ายพัสดุ'
        };
      }
      return r;
    }));
  };

  const handleProcHeadApproveAllToExec = () => {
    const count = requests.filter(r => r.status === 'pending_proc_head').length;
    logAction('status_change', 'requests', `หัวหน้าฝ่ายพัสดุลงนามเสนอเห็นชอบแผนความต้องการจัดซื้อวัสดุทั้งหมดในระบบ จำนวน ${count} รายการ ให้ผู้บริหารพิจารณาอนุมัติ`);
    setRequests(prev => prev.map(r => r.status === 'pending_proc_head' ? { ...r, status: 'pending_exec' } : r));
  };

  // Executive Handlers
  const handleExecApproveFinal = (ids: string[]) => {
    logAction('status_change', 'requests', `ผู้บริหารลงนามเห็นชอบและอนุมัติจัดสรรงบประมาณโครงการวัสดุจำนวน ${ids.length} รายการ สำเร็จสมบูรณ์`);
    setRequests(prev => prev.map(r => ids.includes(r.id) ? { ...r, status: 'approved' } : r));
  };

  const handleExecRejectBack = (id: string, comment: string) => {
    const rItem = requests.find(x => x.id === id);
    if (rItem) {
      logAction('status_change', 'requests', `ผู้บริหารพิจารณาตีกลับคำขอจัดซื้อ '${rItem.itemName}' ของฝ่าย ${rItem.deptId} กลับไปยังฝ่ายพัสดุเพื่อชี้แจงแก้ไข (ข้อเสนอแนะ: ${comment})`);
    }
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'pending_proc_head', comment } : r));
  };

  const handleExecApproveAllFinal = () => {
    const count = requests.filter(r => r.status === 'pending_exec').length;
    logAction('status_change', 'requests', `ผู้บริหารลงนามมติอนุมัติแผนงบประมาณความต้องการจัดพัสดุทั้งหมดในระบบ จำนวนรวม ${count} รายการ เป็นเอกฉันท์เพื่อเริ่มการจัดซื้อจริง`);
    setRequests(prev => prev.map(r => r.status === 'pending_exec' ? { ...r, status: 'approved' } : r));
  };

  const handleFreezePlan = () => {
    setIsPlanFrozen(prev => {
      const next = !prev;
      logAction('status_change', 'system', `${next ? 'แช่แข็งแผนงบประมาณ (Freeze Plan)' : 'ยกเลิกการแช่แข็งแผนงบประมาณ (Unfreeze Plan)'} ประจำปีงบประมาณ พ.ศ. ${fiscalYear}`);
      return next;
    });
  };

  // Admin User Handlers
  const handleAdminApproveUser = (username: string) => {
    if (currentUser?.username !== 'admin') {
      handleToast('สิทธิ์ในการอนุมัติผู้ใช้งาน จำกัดเฉพาะ Super Admin เท่านั้น', 'error');
      return;
    }
    setUsers(prev => prev.map(u => u.username === username ? { ...u, status: 'approved' } : u));
    logAction('status_change', 'users', `อนุมัติสิทธิ์การเข้าใช้งานระบบให้แก่ผู้ใช้ @${username}`);
  };

  const handleAdminUpdateUser = (username: string, name: string, roles: UserRole[], deptId: string, status?: User['status']) => {
    if (currentUser?.username !== 'admin') {
      handleToast('สิทธิ์ในการแก้ไขผู้ใช้งาน จำกัดเฉพาะ Super Admin เท่านั้น', 'error');
      return;
    }
    if (username === 'admin' && currentUser?.username !== 'admin') {
      handleToast('ไม่สามารถแก้ไขสิทธิ์ของบัญชีผู้ดูแลระบบสูงสุด (Super Admin) ได้', 'error');
      return;
    }
    setUsers(prev => prev.map(u => {
      if (u.username === username) {
        const primaryRole = roles[0] || 'staff';
        const updated: User = { 
          ...u, 
          name, 
          roles, 
          role: primaryRole, 
          deptId, 
          status: status || u.status 
        };
        if (currentUser?.username === username) {
          setCurrentUser(updated);
        }
        return updated;
      }
      return u;
    }));
    logAction('edit', 'users', `ปรับปรุงรายละเอียดสิทธิ์และบัญชีผู้ใช้งาน @${username} (สิทธิ์: ${roles.join(', ')}, แผนก: ${deptId}, สถานะ: ${status || 'ไม่ระบุ'})`);
  };

  // Admin Material Handlers
  const handleAddCustomCategory = (key: string, label: string) => {
    saveCustomCategory(key, label);
    logAction('add', 'custom_category', `เพิ่มหมวดหมู่ประเภทวัสดุใหม่ '${label}' (ID: ${key})`);
  };

  const handleDeleteCustomCategory = (key: string, label: string) => {
    deleteCustomCategory(key);
    logAction('delete', 'custom_category', `ลบหมวดหมู่ประเภทวัสดุ '${label}' (ID: ${key}) ออกจากระบบ`);
  };

  const handleAdminAddMaterial = (category: CategoryId, name: string, unit: string, price: number) => {
    setCustomItems(prev => {
      const list = prev[category] || [];
      if (!list.includes(name)) {
        CUSTOM_UNITS[name] = unit;
        return { ...prev, [category]: [...list, name] };
      }
      return prev;
    });
    if (price > 0) {
      setItemPrices(prev => ({ ...prev, [name]: price }));
    }
    logAction('add', 'materials', `เพิ่มรายการวัสดุกลางใหม่ในหมวด '${category}': '${name}' (หน่วยนับ: ${unit}, ราคากลาง: ${price} บาท)`);
  };

  const handleAdminUpdateMaterial = (
    oldCategory: CategoryId,
    oldName: string,
    newCategory: CategoryId,
    newName: string,
    newUnit: string,
    newPrice: number
  ) => {
    if (newUnit) CUSTOM_UNITS[newName] = newUnit;
    if (newPrice >= 0) {
      setItemPrices(prev => {
        const copy = { ...prev };
        if (oldName !== newName) delete copy[oldName];
        copy[newName] = newPrice;
        return copy;
      });
    }

    setCustomItems(prev => {
      const nextState = { ...prev };
      // Remove old item from old category list if present
      if (nextState[oldCategory]) {
        nextState[oldCategory] = nextState[oldCategory].filter(item => item !== oldName);
      }
      // Add new item name to new category list
      const targetList = nextState[newCategory] || [];
      if (!targetList.includes(newName)) {
        nextState[newCategory] = [...targetList, newName];
      }
      return nextState;
    });

    if (oldName !== newName) {
      setRequests(prev => prev.map(r => r.itemName === oldName ? { ...r, itemName: newName, unit: newUnit || r.unit } : r));
    }
    logAction('edit', 'materials', `แก้ไขข้อมูลวัสดุกลางจากเดิม '${oldName}' เป็น '${newName}' (หน่วยนับ: ${newUnit}, ราคากลาง: ${newPrice} บาท, หมวด: ${newCategory})`);
  };

  const handleAdminToggleActive = (itemKey: string) => {
    setMaterialActive(prev => {
      const current = prev[itemKey] !== false;
      logAction('status_change', 'materials', `${current ? 'ปิดการใช้งาน' : 'เปิดการใช้งาน'} รายการวัสดุกลาง: '${itemKey}'`);
      return { ...prev, [itemKey]: !current };
    });
  };

  // Admin Org / Work Group & Department Handlers
  const handleAdminAddWorkGroup = (name: string, description?: string) => {
    const newWg: WorkGroup = {
      id: 'wg-' + String(Date.now()).slice(-6),
      name,
      description
    };
    setWorkGroups(prev => [...prev, newWg]);
    logAction('add', 'org', `เพิ่มกลุ่มงานใหม่ในระบบ: '${name}' (รายละเอียด: ${description || '-'})`);
  };

  const handleAdminUpdateWorkGroup = (id: string, name: string, description?: string) => {
    setWorkGroups(prev => prev.map(wg => wg.id === id ? { ...wg, name, description } : wg));
    logAction('edit', 'org', `แก้ไขรายละเอียดกลุ่มงานรหัส '${id}' เป็นชื่อ '${name}'`);
  };

  const handleAdminDeleteWorkGroup = (id: string) => {
    setWorkGroups(prev => prev.filter(wg => wg.id !== id));
    logAction('delete', 'org', `ลบกลุ่มงานรหัส '${id}' ออกจากระบบ`);
  };

  const handleAdminAddDepartment = (name: string, category: CategoryId, workGroupId: string) => {
    const newDept: Department = {
      id: 'dept-' + String(Date.now()).slice(-6),
      name,
      category,
      workGroupId
    };
    setDepartments(prev => [...prev, newDept]);
    logAction('add', 'org', `เพิ่มฝ่าย/แผนกใหม่: '${name}' (หมวดวัสดุ: ${category}, กลุ่มงาน: ${workGroupId})`);
  };

  const handleAdminUpdateDepartment = (id: string, name: string, category: CategoryId, workGroupId: string) => {
    setDepartments(prev => prev.map(d => d.id === id ? { ...d, name, category, workGroupId } : d));
    logAction('edit', 'org', `แก้ไขข้อมูลฝ่าย/แผนก '${id}' เป็นชื่อ '${name}' (หมวด: ${category}, กลุ่มงาน: ${workGroupId})`);
  };

  const handleAdminDeleteDepartment = (id: string) => {
    setDepartments(prev => prev.filter(d => d.id !== id));
    logAction('delete', 'org', `ลบฝ่าย/แผนก '${id}' ออกจากระบบ`);
  };

  const handleClearAllData = () => {
    handleOpenConfirm({
      title: '⚠️ ยืนยันการลบข้อมูลทั้งหมด',
      message: 'คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลทั้งหมดในระบบ? การดำเนินการนี้จะลบรายการขอวัสดุทั้งหมด กลุ่มงาน ฝ่าย/แผนก และรายการวัสดุในแค็ตตาล็อกทั้งหมด (แผ่นงานจะว่างเปล่าทั้งหมด) โดยไม่สามารถกู้คืนได้!',
      confirmText: 'ลบข้อมูลทั้งหมด',
      variant: 'danger',
      onConfirm: () => {
        const clearLogEntry: LogEntry = {
          id: 'LOG-' + String(Date.now()) + '-' + String(Math.floor(Math.random() * 1000)),
          timestamp: new Date().toISOString(),
          username: currentUser ? currentUser.username : 'system',
          name: currentUser ? currentUser.name : 'ระบบ',
          actionType: 'delete',
          module: 'system',
          description: 'ล้างข้อมูลระบบทั้งหมด (Clear All Database State) และเริ่มต้นระบบเป็นฐานข้อมูลว่างเปล่า'
        };

        setRequests([]);
        setWorkGroups([]);
        setDepartments([]);
        setCustomItems({});
        setItemPrices({});
        setMaterialActive({});
        setIsCatalogCleared(true);
        setLogs([clearLogEntry]);

        localStorage.setItem('survey_requests', JSON.stringify([]));
        localStorage.setItem('survey_work_groups', JSON.stringify([]));
        localStorage.setItem('survey_departments', JSON.stringify([]));
        localStorage.setItem('survey_custom_items', JSON.stringify({}));
        localStorage.setItem('survey_item_prices', JSON.stringify({}));
        localStorage.setItem('survey_material_active', JSON.stringify({}));
        localStorage.setItem('survey_catalog_cleared', JSON.stringify(true));
        localStorage.setItem('survey_logs', JSON.stringify([clearLogEntry]));

        fetch(`${apiBase}/state`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [],
            workGroups: [],
            departments: [],
            customItems: {},
            itemPrices: {},
            materialActive: {},
            isCatalogCleared: true,
            isPlanFrozen: false,
            logs: [clearLogEntry]
          })
        })
        .then(() => {
          handleToast('ลบข้อมูลระบบทั้งหมดเรียบร้อยแล้ว', 'success');
          setTimeout(() => {
            window.location.reload();
          }, 800);
        })
        .catch(err => {
          console.error(err);
          handleToast('เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
        });
      }
    });
  };

  const handleClearLogs = () => {
    const clearLogEntry: LogEntry = {
      id: 'LOG-' + String(Date.now()) + '-' + String(Math.floor(Math.random() * 1000)),
      timestamp: new Date().toISOString(),
      username: currentUser ? currentUser.username : 'system',
      name: currentUser ? currentUser.name : 'ระบบ',
      actionType: 'delete',
      module: 'system',
      description: 'ล้างประวัติการทำกิจกรรม (Log การใช้งาน) ทั้งหมดออกจากระบบ'
    };
    setLogs([clearLogEntry]);
    localStorage.setItem('survey_logs', JSON.stringify([clearLogEntry]));
  };

  // Pending badge counts for Sidebar
  const pendingCounts: Record<string, number> = {
    staff: currentUser ? requests.filter(r => r.deptId === currentUser.deptId && r.status === 'rejected').length : 0,
    head: requests.filter(r => r.status === 'pending_head').length,
    proc: requests.filter(r => r.status === 'pending_proc').length,
    prochead: requests.filter(r => r.status === 'pending_proc_head').length,
    exec: requests.filter(r => r.status === 'pending_exec').length,
    users: users.filter(u => u.status === 'pending').length
  };

  if (!currentUser) {
    return (
      <AuthView
        users={users}
        departments={departments}
        workGroups={workGroups}
        onLogin={handleLogin}
        onRegister={handleRegisterUser}
        onResetPassword={handleResetUserPassword}
      />
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden antialiased">
      {/* Top Navigation Bar */}
      <header className="h-14 bg-[#0F172A] flex items-center justify-between px-4 lg:px-6 shrink-0 shadow-md z-20 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm font-bold text-sm ring-2 ring-indigo-500/30">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-white text-sm font-bold leading-tight flex items-center gap-2">
                <span>MatPlan ระบบวางแผนความต้องการวัสดุ รพ.สามชุก</span>
              </h1>
              <p className="text-slate-400 text-[10px] uppercase tracking-wider font-mono flex items-center gap-1.5">
                <span>MatPlan System</span>
                <span className="text-slate-600">•</span>
                <span className="text-cyan-400 font-semibold flex items-center gap-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Live Sync v1.5
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Senior Accessibility Font Size Selector */}
        <div className="hidden sm:flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-lg p-1 text-slate-300">
          <span className="text-[11px] font-bold text-slate-300 px-1.5 flex items-center gap-1">
            <Type className="w-3.5 h-3.5 text-indigo-400" />
            ขนาดตัวหนังสือ:
          </span>
          <button
            type="button"
            onClick={() => setFontSizeScale('normal')}
            className={`px-2 py-0.5 rounded-md text-xs font-bold transition-all ${
              fontSizeScale === 'normal'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
            title="ขนาดเล็กลง (14px)"
          >
            เล็กลง
          </button>
          <button
            type="button"
            onClick={() => setFontSizeScale('large')}
            className={`px-2 py-0.5 rounded-md text-xs font-bold transition-all ${
              fontSizeScale === 'large'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
            title="ขนาดปกติ (16px)"
          >
            ปกติ
          </button>
          <button
            type="button"
            onClick={() => setFontSizeScale('xlarge')}
            className={`px-2 py-0.5 rounded-md text-xs font-bold transition-all ${
              fontSizeScale === 'xlarge'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
            title="ขนาดใหญ่ขึ้น (18px)"
          >
            ใหญ่ขึ้น
          </button>
        </div>

        {/* Dark / Light Mode Icon Toggle Button */}
        <button
          type="button"
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer shadow-2xs flex items-center justify-center shrink-0"
          title={isDarkMode ? 'เปลี่ยนเป็นโหมดสว่าง (Light Mode)' : 'เปลี่ยนเป็นโหมดมืด (Dark Mode)'}
        >
          {isDarkMode ? (
            <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-300" />
          ) : (
            <Moon className="w-4 h-4 text-slate-300 hover:text-indigo-300 transition-colors" />
          )}
        </button>

        {/* User Profile Badge with Combined Dropdown Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-800/80 transition-colors text-left focus:outline-none border border-transparent hover:border-slate-700"
          >
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-slate-100 text-xs font-bold leading-tight">{currentUser.name}</span>
              <span className="text-slate-400 text-[10px]">ประจำปีงบประมาณ พ.ศ. {fiscalYear}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#0D9488] flex items-center justify-center border border-teal-400 text-white font-bold text-xs shadow-xs relative shrink-0">
              {currentUser.name.charAt(0)}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-900" />
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180 text-[#0D9488]' : ''}`} />
          </button>

          {/* Interactive User Dropdown Menu */}
          {isUserMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-30" 
                onClick={() => setIsUserMenuOpen(false)} 
              />
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 space-y-3.5 z-40 text-slate-800 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* User Header Details */}
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-[#0D9488] text-white font-bold flex items-center justify-center text-sm shadow-sm shrink-0">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-sm truncate">{currentUser.name}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200">
                        {currentUser.role === 'admin' ? 'ผู้ดูแลระบบ' : currentUser.role === 'staff' ? 'เจ้าหน้าที่ผู้ขอ' : currentUser.role === 'head' ? 'หัวหน้ากลุ่มงาน/ฝ่าย' : currentUser.role === 'proc' ? 'เจ้าหน้าที่พัสดุ' : currentUser.role === 'prochead' ? 'หัวหน้าพัสดุ' : 'ผู้บริหาร'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Survey Deadline Status Box */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1.5 font-bold text-[11px] text-slate-700">
                      <Clock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      กำหนดส่งแบบสำรวจ
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      เปิดรับข้อมูล
                    </span>
                  </div>

                  <div className="font-bold text-slate-900 text-sm pt-0.5">
                    ปีงบประมาณ พ.ศ. {fiscalYear}
                  </div>

                  <div className="space-y-1">
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#0D9488] h-full w-3/4 rounded-full"></div>
                    </div>
                  </div>
                </div>

                {/* Font Size Selector inside Menu for Senior Users (50+) */}
                <div className="bg-teal-50/70 rounded-xl border border-teal-100 p-2.5 text-xs space-y-1.5">
                  <div className="text-[11px] font-bold text-[#0D9488] flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5 text-[#0D9488]" />
                    ขนาดตัวอักษร:
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => setFontSizeScale('normal')}
                      className={`py-1 rounded-lg text-xs font-bold text-center transition-all border ${
                        fontSizeScale === 'normal'
                          ? 'bg-[#0D9488] text-white border-[#0D9488] shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      เล็กลง
                    </button>
                    <button
                      type="button"
                      onClick={() => setFontSizeScale('large')}
                      className={`py-1 rounded-lg text-xs font-bold text-center transition-all border ${
                        fontSizeScale === 'large'
                          ? 'bg-[#0D9488] text-white border-[#0D9488] shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      ปกติ
                    </button>
                    <button
                      type="button"
                      onClick={() => setFontSizeScale('xlarge')}
                      className={`py-1 rounded-lg text-xs font-bold text-center transition-all border ${
                        fontSizeScale === 'xlarge'
                          ? 'bg-[#0D9488] text-white border-[#0D9488] shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      ใหญ่ขึ้น
                    </button>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setShowChangePasswordModal(true);
                    }}
                    className="w-full py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Key className="w-3.5 h-3.5 text-slate-500" />
                    รหัสผ่าน
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full py-2 px-3 bg-white hover:bg-rose-50 text-rose-700 border border-slate-300 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-500" />
                    ออกจากระบบ
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Horizontal Top Navigation Dock Bar */}
      <Sidebar
        currentUser={currentUser}
        activeRole={activeRole}
        pendingCounts={pendingCounts}
        onSelectRole={role => setActiveRole(role)}
        onChangePassword={() => setShowChangePasswordModal(true)}
        onLogout={handleLogout}
      />

      {/* Main Body Area (Full Width Canvas) */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC] overflow-y-auto">
        <main className="flex-1 flex flex-col min-w-0">
          {/* Top Title Banner */}
          <div className="p-3.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0 shadow-2xs px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 hidden sm:block">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 leading-tight">
                    {activeRole === 'staff' && 'แบบสำรวจรายการวัสดุ (เจ้าหน้าที่แผนก)'}
                    {activeRole === 'head' && 'การอนุมัติของหัวหน้าฝ่าย/กลุ่มงาน'}
                    {activeRole === 'proc' && 'เจ้าหน้าที่วัสดุตรวจสอบ'}
                    {activeRole === 'prochead' && 'การอนุมัติของหัวหน้าวัสดุ'}
                    {activeRole === 'exec' && 'ผู้บริหาร'}
                    {activeRole === 'users' && 'ผู้ดูแลระบบ — จัดการบัญชีผู้ใช้งาน'}
                    {activeRole === 'org' && 'ผู้ดูแลระบบ — จัดการกลุ่มงานและฝ่าย/แผนก'}
                    {activeRole === 'materials' && 'ผู้ดูแลระบบ — แค็ตตาล็อกวัสดุ'}
                  </h2>
                  <span className="inline-flex items-center gap-1 bg-cyan-50 text-cyan-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-cyan-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" />
                    ระบบใหม่ {fiscalYear}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  ระบบวางแผนความต้องการวัสดุ โรงพยาบาลสามชุก ประจำปีงบประมาณ พ.ศ. {fiscalYear}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {currentUser.role === 'admin' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="bg-purple-50 border border-purple-200 text-purple-800 text-[11px] px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse" />
                    โหมดผู้ดูแลระบบ (Admin Workspace)
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* View Container */}
          <div className="p-4 lg:p-5 flex-1 space-y-4">
            {activeRole === 'staff' && (
              <StaffView
                currentUser={currentUser}
                requests={requests}
                customItems={customItems}
                fiscalYear={fiscalYear}
                onSubmitRequests={handleSubmitStaffRequests}
                onAddCustomItem={handleAddCustomItem}
                isPlanFrozen={isPlanFrozen}
                onRequestConfirm={handleOpenConfirm}
                onToastAlert={handleToast}
                departments={departments}
                workGroups={workGroups}
              />
            )}

            {activeRole === 'head' && (
              <HeadView
                currentUser={currentUser}
                requests={requests}
                fiscalYear={fiscalYear}
                onApproveItem={handleHeadApproveItem}
                onRejectItem={handleHeadRejectItem}
                onApproveAll={handleHeadApproveAll}
                isPlanFrozen={isPlanFrozen}
                onRequestConfirm={handleOpenConfirm}
                onToastAlert={handleToast}
                workGroups={workGroups}
              />
            )}

            {activeRole === 'proc' && (
              <ProcurementView
                currentUser={currentUser}
                requests={requests}
                itemPrices={itemPrices}
                fiscalYear={fiscalYear}
                onUpdateUnitPrice={handleUpdateUnitPrice}
                onUpdateQty={handleUpdateQty}
                onSubmitToProcHead={handleSubmitToProcHead}
                onRejectRequest={handleProcRejectRequest}
                isPlanFrozen={isPlanFrozen}
                onRequestConfirm={handleOpenConfirm}
                onToastAlert={handleToast}
              />
            )}

            {activeRole === 'prochead' && (
              <ProcurementHeadView
                currentUser={currentUser}
                requests={requests}
                itemPrices={itemPrices}
                fiscalYear={fiscalYear}
                onUpdateUnitPrice={handleUpdateUnitPrice}
                onUpdateQty={handleUpdateQty}
                onApproveToExec={handleProcHeadApproveToExec}
                onRejectToProc={handleProcHeadRejectToProc}
                onApproveAllToExec={handleProcHeadApproveAllToExec}
                isPlanFrozen={isPlanFrozen}
                onRequestConfirm={handleOpenConfirm}
                onToastAlert={handleToast}
              />
            )}

            {activeRole === 'exec' && (
              <ExecutiveView
                currentUser={currentUser}
                requests={requests}
                itemPrices={itemPrices}
                fiscalYear={fiscalYear}
                onApproveFinalBudget={handleExecApproveFinal}
                onRejectBack={handleExecRejectBack}
                onApproveAllFinal={handleExecApproveAllFinal}
                onFreezePlan={handleFreezePlan}
                onOpenReportModal={() => setShowPrintReportModal(true)}
                isPlanFrozen={isPlanFrozen}
                onRequestConfirm={handleOpenConfirm}
                onToastAlert={handleToast}
              />
            )}

            {activeRole === 'users' && currentUser && (
              <AdminUsersView
                users={users}
                departments={departments}
                workGroups={workGroups}
                fiscalYear={fiscalYear}
                onApproveUser={handleAdminApproveUser}
                onUpdateUser={handleAdminUpdateUser}
                onResetPassword={handleResetUserPassword}
                onRequestConfirm={handleOpenConfirm}
                onToastAlert={handleToast}
                currentUser={currentUser}
              />
            )}

            {activeRole === 'org' && (
              <AdminOrgView
                workGroups={workGroups}
                departments={departments}
                users={users}
                fiscalYear={fiscalYear}
                onAddWorkGroup={handleAdminAddWorkGroup}
                onUpdateWorkGroup={handleAdminUpdateWorkGroup}
                onDeleteWorkGroup={handleAdminDeleteWorkGroup}
                onAddDepartment={handleAdminAddDepartment}
                onUpdateDepartment={handleAdminUpdateDepartment}
                onDeleteDepartment={handleAdminDeleteDepartment}
                onRequestConfirm={handleOpenConfirm}
                onToastAlert={handleToast}
              />
            )}

            {activeRole === 'materials' && (
              <AdminMaterialsView
                customItems={customItems}
                itemPrices={itemPrices}
                materialActive={materialActive}
                fiscalYear={fiscalYear}
                onUpdateFiscalYear={setFiscalYear}
                onAddMaterial={handleAdminAddMaterial}
                onUpdateMaterial={handleAdminUpdateMaterial}
                onToggleActive={handleAdminToggleActive}
                onRequestConfirm={handleOpenConfirm}
                onToastAlert={handleToast}
                onAddCustomCategory={handleAddCustomCategory}
                onDeleteCustomCategory={handleDeleteCustomCategory}
              />
            )}

            {activeRole === 'logs' && currentUser && currentUser.username === 'admin' && (
              <AdminLogsView
                logs={logs}
                currentUser={currentUser}
                onRequestConfirm={handleOpenConfirm}
                onClearLogs={handleClearLogs}
                onToastAlert={handleToast}
              />
            )}
          </div>
        </main>
      </div>

      {/* Change Password Modal */}
      {showChangePasswordModal && currentUser && (
        <ChangePasswordModal
          currentUser={currentUser}
          onClose={() => setShowChangePasswordModal(false)}
          onSavePassword={newPw => {
            handleResetUserPassword(currentUser.username, newPw);
            setCurrentUser(prev => prev ? { ...prev, password: newPw } : null);
            setShowChangePasswordModal(false);
            handleToast('เปลี่ยนรหัสผ่านของคุณสำเร็จเรียบร้อยแล้ว', 'success');
          }}
        />
      )}

      {/* Printable Formal Report Modal */}
      {showPrintReportModal && (
        <PrintableReportModal
          requests={requests}
          itemPrices={itemPrices}
          onClose={() => setShowPrintReportModal(false)}
        />
      )}

      {/* Global Confirm Modal */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        variant={confirmConfig.variant}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          if (confirmConfig.onConfirm) confirmConfig.onConfirm();
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        }}
      />

      {/* Global Toast Alert */}
      <ToastAlert
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, show: false }))}
      />
    </div>
  );
}
