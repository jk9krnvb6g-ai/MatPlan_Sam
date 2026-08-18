import React, { useState, useEffect } from 'react';
import { User, CategoryId, MaterialItem, SubmissionSchedule, RequestItem, Department, WorkGroup } from '../types';
import { CategoryBadge } from './CategoryBadge';
import { 
  CATALOG, 
  CATEGORY_LABELS, 
  CATEGORY_ORDER, 
  fmtBaht, 
  guessPrice, 
  guessUnit, 
  getCustomCategories,
  saveCustomCategory,
  deleteCustomCategory,
  getCategoryLabel,
  getCategoryOrder,
  defaultCategoryOrder
} from '../data/catalog';
import { PaginationBar } from './PaginationBar';
import { TableControlPanel, SortOption, CATEGORY_BUTTON_STYLES } from './TableControlPanel';
import { sortItems } from '../utils/sortHelper';
import { checkSubmissionOpen } from '../utils/workflowHelper';
import { 
  exportMaterialsCatalogExcel, 
  downloadMaterialSampleTemplateExcel, 
  parseMaterialExcel,
  exportFullSystemExcelBackup
} from '../utils/excelHelper';
import { 
  Sliders,
  Settings,
  Package, 
  Calendar,
  Database,
  Download,
  Upload,
  FileSpreadsheet,
  Check, 
  CheckCircle2,
  Clock, 
  Sparkles, 
  AlertTriangle,
  Plus, 
  Edit3, 
  Power, 
  X, 
  ShieldAlert, 
  Trash2, 
  FolderPlus, 
  Tag, 
  ListFilter,
  CheckSquare, 
  Square, 
  MinusSquare, 
  FolderInput, 
  DollarSign,
  Info,
  Layers,
  Building2,
  Users
} from 'lucide-react';

interface AdminSystemSettingsViewProps {
  currentUser: User | null;
  apiBase: string;
  customItems: Record<string, string[]>;
  customCategories?: Record<string, string>;
  itemPrices: Record<string, number>;
  materialActive: Record<string, boolean>;
  fiscalYear: string;
  schedule?: SubmissionSchedule;
  requests?: RequestItem[];
  users?: User[];
  departments?: Department[];
  workGroups?: WorkGroup[];
  onUpdateSchedule?: (schedule: SubmissionSchedule) => void;
  onUpdateFiscalYear: (year: string) => void;
  onAddMaterial: (category: CategoryId, name: string, unit: string, price: number) => void;
  onUpdateMaterial: (oldCategory: CategoryId, oldName: string, newCategory: CategoryId, newName: string, newUnit: string, newPrice: number) => void;
  onToggleActive: (itemKey: string) => void;
  onBulkToggleActive?: (itemKeys: string[], active: boolean) => void;
  onBulkMoveCategory?: (itemKeys: string[], targetCategory: CategoryId) => void;
  onBulkAdjustPrice?: (itemKeys: string[], adjustmentType: 'percent' | 'fixed', value: number) => void;
  onBulkDeleteMaterials?: (itemKeys: string[]) => void;
  onRequestConfirm: (opts: { title: string; message: string; confirmText?: string; variant?: 'primary' | 'danger' | 'warning'; onConfirm: () => void }) => void;
  onToastAlert: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onAddCustomCategory?: (key: string, label: string) => void;
  onDeleteCustomCategory?: (key: string, label: string) => void;
  onBulkImportMaterials?: (items: MaterialItem[]) => void;
  onRefreshState: () => void;
}

export const AdminSystemSettingsView: React.FC<AdminSystemSettingsViewProps> = ({
  currentUser,
  apiBase,
  customItems,
  customCategories,
  itemPrices,
  materialActive,
  fiscalYear,
  schedule,
  requests = [],
  users = [],
  departments = [],
  workGroups = [],
  onUpdateSchedule,
  onUpdateFiscalYear,
  onAddMaterial,
  onUpdateMaterial,
  onToggleActive,
  onBulkToggleActive,
  onBulkMoveCategory,
  onBulkAdjustPrice,
  onBulkDeleteMaterials,
  onRequestConfirm,
  onToastAlert,
  onAddCustomCategory,
  onDeleteCustomCategory,
  onBulkImportMaterials,
  onRefreshState
}) => {
  // Main Sub-Tab in Settings: 'catalog' | 'schedule' | 'backup'
  const [activeSettingsTab, setActiveSettingsTab] = useState<'catalog' | 'schedule' | 'backup'>('catalog');

  // --- CATALOG STATES ---
  const [filterCategory, setFilterCategory] = useState<CategoryId | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'category' | 'name' | 'unit' | 'price' | 'active'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [editingItemKey, setEditingItemKey] = useState<string | null>(null);

  const [selectedItemKeys, setSelectedItemKeys] = useState<string[]>([]);
  const [bulkMoveModalOpen, setBulkMoveModalOpen] = useState(false);
  const [bulkTargetCategory, setBulkTargetCategory] = useState<CategoryId>('office');
  const [bulkPriceModalOpen, setBulkPriceModalOpen] = useState(false);
  const [priceAdjustMode, setPriceAdjustMode] = useState<'percent' | 'fixed'>('percent');
  const [priceAdjustValue, setPriceAdjustValue] = useState<number>(0);

  const [inputFiscalYear, setInputFiscalYear] = useState(fiscalYear);

  // Add Item Form
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<CategoryId>('office');
  const [newUnit, setNewUnit] = useState('ชิ้น');
  const [newPrice, setNewPrice] = useState<number>(0);

  // Edit Item Form
  const [editCategory, setEditCategory] = useState<CategoryId>('office');
  const [editName, setEditName] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editPrice, setEditPrice] = useState<number>(0);

  const [pageSize, setPageSize] = useState<number | 'all'>(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Custom Category States
  const [categoriesVersion, setCategoriesVersion] = useState(0);
  const [customCatKey, setCustomCatKey] = useState('');
  const [customCatLabel, setCustomCatLabel] = useState('');

  useEffect(() => {
    const handleUpdated = () => setCategoriesVersion(v => v + 1);
    window.addEventListener('categories_updated', handleUpdated);
    return () => window.removeEventListener('categories_updated', handleUpdated);
  }, []);

  // Excel Import States
  const [showImportModal, setShowImportModal] = useState(false);
  const [importedPreviewItems, setImportedPreviewItems] = useState<MaterialItem[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isParsingExcel, setIsParsingExcel] = useState(false);

  // --- SCHEDULE STATES ---
  const [tempSchedule, setTempSchedule] = useState<SubmissionSchedule>(() => {
    return schedule || {
      startDate: '2026-01-01',
      endDate: '2026-03-31',
      isOpen: true,
      allowLateSubmission: false,
      announcement: 'เปิดรับแบบสำรวจความต้องการวัสดุและครุภัณฑ์ ประจำปีงบประมาณ 2569'
    };
  });

  useEffect(() => {
    if (schedule) {
      setTempSchedule(schedule);
    }
  }, [schedule]);

  const scheduleInfo = checkSubmissionOpen(schedule || tempSchedule);

  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateSchedule) {
      onUpdateSchedule(tempSchedule);
      onToastAlert('บันทึกการตั้งค่ากำหนดเวลาปฏิทินงบประมาณสำเร็จ', 'success');
    }
  };

  // --- BACKUP & RESTORE STATES ---
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Full Database Backup (.json)
  const handleExportBackup = async () => {
    try {
      setIsExporting(true);
      const res = await fetch(`${apiBase}/admin/danger/backup`);
      const data = await res.json();

      if (data.success) {
        const jsonStr = JSON.stringify(data.data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MatPlan_Database_Backup_${fiscalYear}_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        onToastAlert('ดาวน์โหลดไฟล์สำรองข้อมูล (.json) สำเร็จเรียบร้อย', 'success');
      } else {
        onToastAlert('เกิดข้อผิดพลาดในการสำรองข้อมูล', 'error');
      }
    } catch (err: any) {
      onToastAlert(`การเชื่อมต่อสำรองข้อมูลล้มเหลว: ${err.message || String(err)}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Executive Full System Excel Backup (.xlsx)
  const handleExportFullExcel = () => {
    try {
      setIsExportingExcel(true);
      exportFullSystemExcelBackup(
        requests,
        users,
        departments,
        workGroups,
        itemPrices,
        fiscalYear
      );
      onToastAlert('ส่งออกไฟล์ฐานข้อมูล Excel สำรอง (.xlsx) ครบทุกตารางสำเร็จ', 'success');
    } catch (err: any) {
      onToastAlert(`ส่งออก Excel ไม่สำเร็จ: ${err.message || String(err)}`, 'error');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Restore Database from JSON
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setIsImporting(true);
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        const res = await fetch(`${apiBase}/admin/danger/restore`, {
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

  useEffect(() => {
    const handleUpdate = () => {
      setCategoriesVersion(v => v + 1);
    };
    window.addEventListener('categories_updated', handleUpdate);
    return () => window.removeEventListener('categories_updated', handleUpdate);
  }, []);

  // Compile full dynamic categories and material list
  const activeCustomCategories = {
    ...getCustomCategories(),
    ...(customCategories || {})
  };

  const currentCategoryOrder = Array.from(new Set([
    ...defaultCategoryOrder,
    ...Object.keys(activeCustomCategories),
    ...Object.keys(customItems || {})
  ]));

  const getCategoryDisplay = (catId: string): string => {
    if (activeCustomCategories[catId]) return activeCustomCategories[catId];
    return getCategoryLabel(catId) || catId;
  };

  const allList: MaterialItem[] = [];
  currentCategoryOrder.forEach(cat => {
    const defaultList = CATALOG[cat] || [];
    const customList = customItems[cat] || [];
    const combined = Array.from(new Set([...defaultList, ...customList]));

    combined.forEach(name => {
      const unit = guessUnit(name);
      const price = itemPrices[name] !== undefined ? itemPrices[name] : guessPrice(name, unit);
      const active = materialActive[name] !== false;

      allList.push({
        name,
        category: cat,
        unit,
        price,
        active
      });
    });
  });

  const filteredList = allList.filter(m => {
    const matchesCat = filterCategory === 'all' || m.category === filterCategory;
    const matchesSearch = !searchTerm.trim() || m.name.toLowerCase().includes(searchTerm.toLowerCase().trim());
    return matchesCat && matchesSearch;
  });

  const handleHeaderSort = (field: 'category' | 'name' | 'unit' | 'price' | 'active') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedList = [...filteredList].sort((a, b) => {
    let res = 0;
    if (sortField === 'name') res = a.name.localeCompare(b.name, 'th');
    else if (sortField === 'category') res = a.category.localeCompare(b.category);
    else if (sortField === 'unit') res = a.unit.localeCompare(b.unit, 'th');
    else if (sortField === 'price') res = a.price - b.price;
    else if (sortField === 'active') res = (a.active === b.active) ? 0 : a.active ? -1 : 1;
    return sortOrder === 'asc' ? res : -res;
  });

  const numericSize = pageSize === 'all' ? sortedList.length || 1 : pageSize;
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(sortedList.length / numericSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageItems = pageSize === 'all' ? sortedList : sortedList.slice((safePage - 1) * numericSize, safePage * numericSize);

  const handleToggleSelectItem = (itemKey: string) => {
    setSelectedItemKeys(prev => 
      prev.includes(itemKey) 
        ? prev.filter(k => k !== itemKey) 
        : [...prev, itemKey]
    );
  };

  const isAllPageSelected = pageItems.length > 0 && pageItems.every(m => selectedItemKeys.includes(`${m.category}:::${m.name}`));
  const isSomePageSelected = pageItems.some(m => selectedItemKeys.includes(`${m.category}:::${m.name}`)) && !isAllPageSelected;

  const handleToggleSelectAllPage = () => {
    const pageKeys = pageItems.map(m => `${m.category}:::${m.name}`);
    if (isAllPageSelected) {
      setSelectedItemKeys(prev => prev.filter(k => !pageKeys.includes(k)));
    } else {
      setSelectedItemKeys(prev => Array.from(new Set([...prev, ...pageKeys])));
    }
  };

  const handleSaveFiscalYear = () => {
    if (!inputFiscalYear.trim()) {
      onToastAlert('กรุณาระบุปีงบประมาณ', 'error');
      return;
    }
    onUpdateFiscalYear(inputFiscalYear.trim());
    onToastAlert(`อัปเดตปีงบประมาณเป็น พ.ศ. ${inputFiscalYear} เรียบร้อยแล้ว`, 'success');
  };

  const handleCreateMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newName.trim();
    if (!trimmedName) {
      onToastAlert('กรุณากรอกชื่อรายการวัสดุ', 'error');
      return;
    }
    const catToUse = newCategory || currentCategoryOrder[0] || 'office';
    const catDisplayName = getCategoryDisplay(catToUse);
    const itemUnit = newUnit.trim() || 'ชิ้น';
    const itemPrice = Number(newPrice) || 0;

    onAddMaterial(catToUse, trimmedName, itemUnit, itemPrice);
    onToastAlert(`เพิ่มรายการ "${trimmedName}" ในหมวด "${catDisplayName}" เข้าแค็ตตาล็อกกลางเรียบร้อยแล้ว`, 'success');
    setNewName('');
    setNewPrice(0);
    setNewUnit('ชิ้น');
  };

  const handleStartEdit = (item: MaterialItem) => {
    setEditingItemKey(`${item.category}:::${item.name}`);
    setEditCategory(item.category);
    setEditName(item.name);
    setEditUnit(item.unit);
    setEditPrice(item.price);
  };

  const handleSaveEdit = (oldItem: MaterialItem) => {
    if (!editName.trim()) {
      onToastAlert('ชื่อรายการวัสดุต้องไม่เว้นว่าง', 'error');
      return;
    }
    onUpdateMaterial(
      oldItem.category,
      oldItem.name,
      editCategory,
      editName.trim(),
      editUnit.trim() || 'ชิ้น',
      Number(editPrice) || 0
    );
    setEditingItemKey(null);
  };

  const handleCreateCustomCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const label = customCatLabel.trim();
    let rawKey = customCatKey.trim();

    if (!label) {
      onToastAlert('กรุณากรอกชื่อหมวดหมู่วัสดุภาษาไทย', 'error');
      return;
    }

    // Auto-generate key if not specified
    let key = rawKey
      ? rawKey.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\u0E00-\u0E7F-]/g, '')
      : 'cat_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 5);

    if (!key) {
      key = 'cat_' + Date.now().toString(36);
    }

    if (currentCategoryOrder.includes(key)) {
      onToastAlert(`รหัสหมวดหมู่ '${key}' มีอยู่ในระบบแล้ว กรุณาระบุรหัสอื่น`, 'error');
      return;
    }

    saveCustomCategory(key, label);

    if (onAddCustomCategory) {
      onAddCustomCategory(key, label);
    }

    setCategoriesVersion(v => v + 1);
    setNewCategory(key);
    onToastAlert(`เพิ่มหมวดหมู่ใหม่ "${label}" สำเร็จ พร้อมเลือกให้ในแบบฟอร์มขั้นตอนที่ 2 ด้านล่างแล้ว`, 'success');
    setCustomCatKey('');
    setCustomCatLabel('');
  };

  const handleDeleteCategory = (catKey: string, catLabel: string) => {
    onRequestConfirm({
      title: 'ยืนยันการลบหมวดหมู่วัสดุ',
      message: `คุณต้องการลบหมวดหมู่ "${catLabel}" (${catKey}) หรือไม่? รายการที่สังกัดหมวดหมู่นี้จะยังคงอยู่ในระบบ`,
      confirmText: 'ลบหมวดหมู่',
      variant: 'danger',
      onConfirm: () => {
        if (onDeleteCustomCategory) {
          onDeleteCustomCategory(catKey, catLabel);
        } else {
          deleteCustomCategory(catKey);
        }
        onToastAlert(`ลบหมวดหมู่ "${catLabel}" เรียบร้อยแล้ว`, 'info');
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Settings Top Hero Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 lg:p-7 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-indigo-600/30 border border-indigo-400/40 rounded-2xl text-indigo-300 shadow-inner">
                <Settings className="w-7 h-7 animate-spin-slow" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl lg:text-2xl font-black tracking-tight text-white">
                    ตั้งค่าระบบ (System Settings & Configurations)
                  </h1>
                  <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-indigo-600 text-white shadow-2xs">
                    Admin Workspace
                  </span>
                </div>
                <p className="text-xs text-indigo-200/80 mt-1">
                  ศูนย์กลางควบคุมและตั้งค่าระบบโรงพยาบาลสามชุก: แค็ตตาล็อกวัสดุกลาง, กำหนดการปฏิทินรับคำขอ และการสำรอง/กู้คืนฐานข้อมูล
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono border flex items-center gap-1.5 shadow-2xs ${
                scheduleInfo.isClosed
                  ? 'bg-rose-900/60 text-rose-200 border-rose-700'
                  : 'bg-emerald-900/60 text-emerald-200 border-emerald-700'
              }`}>
                <span className={`w-2 h-2 rounded-full ${scheduleInfo.isClosed ? 'bg-rose-400' : 'bg-emerald-400 animate-ping'}`} />
                <span>สถานะรับคำขอ: {scheduleInfo.statusLabelTh}</span>
              </span>
            </div>
          </div>

          {/* Quick System Metric Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-xs">
              <div className="text-[11px] text-slate-300 font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                ปีงบประมาณ
              </div>
              <div className="text-base font-black text-amber-300 font-mono mt-0.5">พ.ศ. {fiscalYear}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-xs">
              <div className="text-[11px] text-slate-300 font-medium flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-cyan-400" />
                รายการวัสดุกลาง
              </div>
              <div className="text-base font-black text-cyan-300 font-mono mt-0.5">{allList.length} รายการ</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-xs">
              <div className="text-[11px] text-slate-300 font-medium flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                ผู้ใช้ในระบบ
              </div>
              <div className="text-base font-black text-emerald-300 font-mono mt-0.5">{users.length} บัญชี</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-xs">
              <div className="text-[11px] text-slate-300 font-medium flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-purple-400" />
                คำขอที่บันทึก
              </div>
              <div className="text-base font-black text-purple-300 font-mono mt-0.5">{requests.length} รายการ</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-2 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveSettingsTab('catalog')}
            className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl text-xs font-black transition-all cursor-pointer ${
              activeSettingsTab === 'catalog'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 scale-[1.01]'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-indigo-900 border border-slate-200/80'
            }`}
          >
            <Package className="w-4 h-4 shrink-0" />
            <span>1. แค็ตตาล็อกวัสดุและราคากลาง ({allList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSettingsTab('schedule')}
            className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl text-xs font-black transition-all cursor-pointer ${
              activeSettingsTab === 'schedule'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 scale-[1.01]'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-indigo-900 border border-slate-200/80'
            }`}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <span>2. ปฏิทินเปิด-ปิดรับคำขอ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSettingsTab('backup')}
            className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl text-xs font-black transition-all cursor-pointer ${
              activeSettingsTab === 'backup'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 scale-[1.01]'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-indigo-900 border border-slate-200/80'
            }`}
          >
            <Database className="w-4 h-4 shrink-0" />
            <span>3. สำรองและกู้คืนฐานข้อมูล (Backup & Restore)</span>
          </button>
        </div>
      </div>

      {/* --- TAB 1: CATALOG MANAGEMENT --- */}
      {activeSettingsTab === 'catalog' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Header Action / Fiscal Year Banner */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-600" />
                  <span>กำหนดค่าและจัดการแค็ตตาล็อกวัสดุกลาง</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  รายการวัสดุมาตรฐานกลางสำหรับทุกฝ่ายใช้เลือกตอนยื่นแบบสำรวจความต้องการวัสดุ
                </p>
              </div>

              {/* Fiscal Year Setting Input */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-1.5 shadow-2xs">
                <span className="text-xs font-bold text-slate-600 pl-2">ปีงบประมาณ:</span>
                <input
                  type="text"
                  value={inputFiscalYear}
                  onChange={(e) => setInputFiscalYear(e.target.value)}
                  placeholder="เช่น 2569"
                  className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono text-center focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleSaveFiscalYear}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs"
                >
                  บันทึกปี
                </button>
              </div>
            </div>

            {/* Excel Import & Export Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportMaterialsCatalogExcel(customItems, itemPrices, materialActive)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
                  title="ส่งออกแค็ตตาล็อกวัสดุทั้งหมดเป็นไฟล์ Excel"
                >
                  <Download className="w-4 h-4" />
                  <span>ส่งออก Excel (.xlsx)</span>
                </button>

                <button
                  type="button"
                  onClick={downloadMaterialSampleTemplateExcel}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  title="ดาวน์โหลดแบบฟอร์มตัวอย่างสำหรับกรอกข้อมูลนำเข้า"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>โหลดเทมเพลตตัวอย่าง</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setImportedPreviewItems([]);
                    setImportErrors([]);
                    setShowImportModal(true);
                  }}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
                  title="นำเข้ารายการวัสดุจากไฟล์ Excel"
                >
                  <Upload className="w-4 h-4" />
                  <span>นำเข้าข้อมูลจาก Excel</span>
                </button>
              </div>

              <div className="text-xs font-medium text-slate-500">
                รวมทั้งหมด <span className="font-bold text-slate-900 font-mono">{allList.length}</span> รายการ 
                (เปิดใช้งาน <span className="font-bold text-emerald-600 font-mono">{allList.filter(x => x.active).length}</span>, 
                ปิด <span className="font-bold text-rose-500 font-mono">{allList.filter(x => !x.active).length}</span>)
              </div>
            </div>
          </div>

          {/* 1. Add Custom Category Card (Top) */}
          <div className="bg-purple-50/40 border border-purple-200/80 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-purple-600" />
                <span>เพิ่มหมวดหมู่วัสดุใหม่ (Custom Category)</span>
              </h3>
              <span className="text-[11px] text-purple-700 bg-purple-100/80 px-2.5 py-0.5 rounded-full font-medium">
                ขั้นตอนที่ 1: สร้างหมวดหมู่ใหม่ (หากต้องการ)
              </span>
            </div>

            <form onSubmit={handleCreateCustomCategory} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-4 space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  รหัสหมวดหมู่ (เว้นว่างได้ ระบบสร้างให้อัตโนมัติ)
                </label>
                <input
                  type="text"
                  value={customCatKey}
                  onChange={(e) => setCustomCatKey(e.target.value)}
                  placeholder="เช่น nutrition, dental, lab (หรือเว้นว่าง)"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="sm:col-span-5 space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  ชื่อหมวดหมู่วัสดุ (ภาษาไทย) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={customCatLabel}
                  onChange={(e) => setCustomCatLabel(e.target.value)}
                  placeholder="เช่น วัสดุโภชนาการและอาหาร, วัสดุทันตกรรม"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>บันทึกหมวดหมู่</span>
                </button>
              </div>
            </form>

            {/* List of existing custom categories */}
            {Object.keys(activeCustomCategories).length > 0 && (
              <div className="pt-3 border-t border-purple-200/60 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-purple-600" />
                  หมวดหมู่เพิ่มเติมที่บันทึกไว้ในระบบ:
                </span>
                {Object.entries(activeCustomCategories).map(([ckey, clabel]) => {
                  const count = allList.filter(x => x.category === ckey).length;
                  return (
                    <span
                      key={ckey}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white text-purple-900 border border-purple-200 text-xs font-bold shadow-2xs"
                    >
                      <span>{clabel}</span>
                      <span className="text-[10px] font-mono text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">ID: {ckey}</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-purple-100 text-[10px] font-mono text-purple-800 font-bold">
                        {count} รายการ
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(ckey, String(clabel))}
                        className="text-slate-400 hover:text-rose-600 p-0.5 rounded hover:bg-rose-50 cursor-pointer transition-colors"
                        title="ลบหมวดหมู่นี้ออกจากระบบ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Add New Material Item Form Card (Bottom) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                <span>เพิ่มรายการวัสดุใหม่เข้าแค็ตตาล็อกกลาง</span>
              </h3>
              <span className="text-[11px] text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full font-medium">
                ขั้นตอนที่ 2: บันทึกรายการวัสดุเข้าหมวดหมู่
              </span>
            </div>

            <form onSubmit={handleCreateMaterial} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-3 space-y-1">
                <label className="block text-xs font-bold text-slate-700">หมวดหมู่</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                >
                  {currentCategoryOrder.map(cat => (
                    <option key={cat} value={cat}>
                      {getCategoryDisplay(cat)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-4 space-y-1">
                <label className="block text-xs font-bold text-slate-700">ชื่อรายการวัสดุ</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="เช่น กระดาษ A4 80 แกรม"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="block text-xs font-bold text-slate-700">หน่วยนับ</label>
                <input
                  type="text"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  placeholder="เช่น รีม, ด้าม"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="block text-xs font-bold text-slate-700">ราคากลาง (บาท)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newPrice === 0 ? '' : newPrice}
                  onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="md:col-span-1">
                <button
                  type="submit"
                  className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>เพิ่ม</span>
                </button>
              </div>
            </form>
          </div>

          {/* Table & Filtering Section */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            {/* Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilterCategory('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterCategory === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                ทั้งหมด ({allList.length})
              </button>

              {currentCategoryOrder.map(cat => {
                const count = allList.filter(x => x.category === cat).length;
                const isSelected = filterCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFilterCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {getCategoryDisplay(cat)} ({count})
                  </button>
                );
              })}
            </div>

            {/* Search and Batch Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ค้นหาชื่อรายการวัสดุ หรือคำค้น..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
                <ListFilter className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Bulk Actions Menu if Selected */}
              {selectedItemKeys.length > 0 && (
                <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-2xl px-3 py-1.5 animate-in fade-in">
                  <span className="text-xs font-bold text-indigo-900">
                    เลือก <span className="font-mono">{selectedItemKeys.length}</span> รายการ:
                  </span>

                  <button
                    type="button"
                    onClick={() => onBulkToggleActive && onBulkToggleActive(selectedItemKeys, true)}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    เปิดใช้งาน
                  </button>

                  <button
                    type="button"
                    onClick={() => onBulkToggleActive && onBulkToggleActive(selectedItemKeys, false)}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    ปิดใช้งาน
                  </button>

                  <button
                    type="button"
                    onClick={() => setBulkPriceModalOpen(true)}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    ปรับราคา
                  </button>

                  <button
                    type="button"
                    onClick={() => setBulkMoveModalOpen(true)}
                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    ย้ายหมวด
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onRequestConfirm({
                        title: 'ยืนยันการลบรายการวัสดุที่เลือก',
                        message: `คุณต้องการลบรายการที่เลือกทั้งหมด ${selectedItemKeys.length} รายการ หรือไม่?`,
                        confirmText: 'ลบรายการ',
                        variant: 'danger',
                        onConfirm: () => {
                          if (onBulkDeleteMaterials) {
                            onBulkDeleteMaterials(selectedItemKeys);
                            setSelectedItemKeys([]);
                          }
                        }
                      });
                    }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    ลบ
                  </button>
                </div>
              )}
            </div>

            {/* Materials Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="py-3 px-3.5 w-10 text-center">
                      <button
                        type="button"
                        onClick={handleToggleSelectAllPage}
                        className="cursor-pointer text-slate-500 hover:text-indigo-600"
                      >
                        {isAllPageSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600" />
                        ) : isSomePageSelected ? (
                          <MinusSquare className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-3 cursor-pointer select-none" onClick={() => handleHeaderSort('category')}>
                      <div className="flex items-center gap-1">
                        <span>หมวดหมู่</span>
                        {sortField === 'category' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th className="py-3 px-3 cursor-pointer select-none" onClick={() => handleHeaderSort('name')}>
                      <div className="flex items-center gap-1">
                        <span>ชื่อรายการวัสดุ</span>
                        {sortField === 'name' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th className="py-3 px-3 text-center cursor-pointer select-none" onClick={() => handleHeaderSort('unit')}>
                      <div className="flex items-center justify-center gap-1">
                        <span>หน่วยนับ</span>
                        {sortField === 'unit' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th className="py-3 px-3 text-right cursor-pointer select-none" onClick={() => handleHeaderSort('price')}>
                      <div className="flex items-center justify-end gap-1">
                        <span>ราคากลาง (บาท)</span>
                        {sortField === 'price' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th className="py-3 px-3 text-center cursor-pointer select-none" onClick={() => handleHeaderSort('active')}>
                      <div className="flex items-center justify-center gap-1">
                        <span>สถานะ</span>
                        {sortField === 'active' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th className="py-3 px-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        ไม่พบรายการวัสดุที่ค้นหา
                      </td>
                    </tr>
                  ) : (
                    pageItems.map((m) => {
                      const itemKey = `${m.category}:::${m.name}`;
                      const isEditing = editingItemKey === itemKey;
                      const isSelected = selectedItemKeys.includes(itemKey);

                      return (
                        <tr
                          key={itemKey}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            isSelected ? 'bg-indigo-50/40' : ''
                          } ${!m.active ? 'opacity-60 bg-slate-50/30' : ''}`}
                        >
                          <td className="py-2.5 px-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleSelectItem(itemKey)}
                              className="cursor-pointer text-slate-400 hover:text-indigo-600"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-indigo-600" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>

                          <td className="py-2.5 px-3">
                            {isEditing ? (
                              <select
                                value={editCategory}
                                onChange={(e) => setEditCategory(e.target.value)}
                                className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                              >
                                {currentCategoryOrder.map(c => (
                                  <option key={c} value={c}>
                                    {getCategoryLabel(c)}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <CategoryBadge category={m.category} />
                            )}
                          </td>

                          <td className="py-2.5 px-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                              />
                            ) : (
                              <div className="font-bold text-slate-900">{m.name}</div>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editUnit}
                                onChange={(e) => setEditUnit(e.target.value)}
                                className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs text-center font-bold"
                              />
                            ) : (
                              <span className="text-slate-600 font-medium">{m.unit}</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editPrice}
                                onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                                className="w-24 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs text-right font-mono font-bold"
                              />
                            ) : (
                              <span className="text-slate-900">{fmtBaht(m.price)}</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => onToggleActive(itemKey)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                                m.active
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                              }`}
                              title={m.active ? 'คลิกเพื่อปิดใช้งาน' : 'คลิกเพื่อเปิดใช้งาน'}
                            >
                              {m.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                            </button>
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(m)}
                                  className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-2xs"
                                  title="บันทึกการแก้ไข"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingItemKey(null)}
                                  className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors"
                                  title="ยกเลิก"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(m)}
                                  className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors cursor-pointer"
                                  title="แก้ไขรายการนี้"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <PaginationBar
              currentPage={safePage}
              totalPages={totalPages}
              totalItems={sortedList.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      )}

      {/* --- TAB 2: SUBMISSION TIMELINE SCHEDULE --- */}
      {activeSettingsTab === 'schedule' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 lg:p-7 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-600 shadow-2xs">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-slate-800 tracking-tight">
                      ระบบกำหนดปฏิทินเปิด-ปิดรับคำขออัตโนมัติ (Submission Timeline Schedule)
                    </h2>
                    <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                      ปีงบประมาณ {fiscalYear}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    กำหนดช่วงวันที่เปิดให้ฝ่าย/หน่วยงานยื่นแบบสำรวจความต้องการวัสดุ และปิดรับอัตโนมัติตามปฏิทินงบประมาณของโรงพยาบาล
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono border flex items-center gap-1.5 shadow-2xs ${
                  scheduleInfo.isClosed
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${scheduleInfo.isClosed ? 'bg-rose-500' : 'bg-emerald-500 animate-ping'}`} />
                  <span>{scheduleInfo.statusLabelTh}</span>
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700">
                    วันที่เริ่มเปิดรับคำขอ (Start Date) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={tempSchedule.startDate}
                    onChange={(e) => setTempSchedule(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700">
                    วันที่สิ้นสุด/ปิดรับคำขอ (End Date) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={tempSchedule.endDate}
                    onChange={(e) => setTempSchedule(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    required
                  />
                </div>

                <div className="space-y-2 bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3">
                  <label className="flex items-center gap-2.5 font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tempSchedule.isOpen}
                      onChange={(e) => setTempSchedule(prev => ({ ...prev, isOpen: e.target.checked }))}
                      className="w-4 h-4 text-indigo-600 rounded-md cursor-pointer accent-indigo-600"
                    />
                    <span>เปิดระบบรับคำขอ (Master Switch)</span>
                  </label>

                  <label className="flex items-center gap-2.5 font-medium text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tempSchedule.allowLateSubmission}
                      onChange={(e) => setTempSchedule(prev => ({ ...prev, allowLateSubmission: e.target.checked }))}
                      className="w-4 h-4 text-indigo-600 rounded-md cursor-pointer accent-indigo-600"
                    />
                    <span className="text-[11.5px]">อนุญาตส่งล่าช้า (Late Submission)</span>
                  </label>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 hover:shadow-md"
                  >
                    <Check className="w-4 h-4" />
                    <span>บันทึกปฏิทินเวลารับคำขอ</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-slate-700">
                  ข้อความประกาศ / คำชี้แจงสำหรับผู้ยื่นคำขอ (System Announcement Header)
                </label>
                <input
                  type="text"
                  value={tempSchedule.announcement || ''}
                  onChange={(e) => setTempSchedule(prev => ({ ...prev, announcement: e.target.value }))}
                  placeholder="เช่น เปิดรับแบบสำรวจความต้องการวัสดุและครุภัณฑ์ ประจำปีงบประมาณ 2569 ภายในวันที่ 31 มีนาคม"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-sans focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- TAB 3: DATABASE BACKUP & RESTORE --- */}
      {activeSettingsTab === 'backup' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 lg:p-7 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-600 shadow-2xs">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <span>การสำรองและกู้คืนข้อมูลระบบ (Database Snapshot Backup & Restore)</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    ระบบสำรองข้อมูลฐานข้อมูลครบวงจร สามารถส่งออก Snapshot เป็นไฟล์ JSON หรือ Excel หลายชีตเพื่อเก็บเป็นหลักฐาน และกู้คืนได้ทุกเมื่อ
                  </p>
                </div>
              </div>
            </div>

            {/* Action Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1: Excel Backup */}
              <div className="bg-emerald-50/50 border border-emerald-200 rounded-3xl p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-emerald-950">สำรองเป็น Excel ครบทุกตาราง</h3>
                  <p className="text-xs text-emerald-800/80 leading-relaxed">
                    ส่งออกข้อมูลทั้งหมด (คำขอ, แค็ตตาล็อกวัสดุ, บัญชีผู้ใช้, กลุ่มงาน และฝ่าย) แยกชีตในไฟล์เดียว (.xlsx)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleExportFullExcel}
                  disabled={isExportingExcel}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExportingExcel ? 'กำลังส่งออก...' : 'ดาวน์โหลด Excel (.xlsx)'}</span>
                </button>
              </div>

              {/* Card 2: JSON Snapshot Backup */}
              <div className="bg-indigo-50/50 border border-indigo-200 rounded-3xl p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    <Download className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-indigo-950">สำรองฐานข้อมูล Snapshot (.json)</h3>
                  <p className="text-xs text-indigo-800/80 leading-relaxed">
                    ดาวน์โหลดโครงสร้างและข้อมูลของระบบทั้งหมดเป็นไฟล์ JSON เพื่อใช้กู้คืนกลับมาได้อย่างสมบูรณ์ 100%
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleExportBackup}
                  disabled={isExporting}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExporting ? 'กำลังสำรอง...' : 'ดาวน์โหลด Snapshot (.json)'}</span>
                </button>
              </div>

              {/* Card 3: Restore Database from JSON */}
              <div className="bg-slate-50 border border-slate-300 rounded-3xl p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-slate-200 text-slate-800 flex items-center justify-center font-bold">
                    <Upload className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900">กู้คืนระบบจาก Snapshot (.json)</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    อัปโหลดไฟล์สำรองข้อมูล JSON ที่เคยดาวน์โหลดไว้เพื่อเขียนข้อมูลทับและกู้คืนสถานะเดิมของระบบ
                  </p>
                </div>

                <label className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer active:scale-95 text-center">
                  <Upload className="w-4 h-4 text-slate-300" />
                  <span>{isImporting ? 'กำลังกู้คืน...' : 'เลือกไฟล์กู้คืน (.json)'}</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportBackup}
                    disabled={isImporting}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Info Notice Box */}
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 text-xs text-blue-900 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-blue-950">คำแนะนำการดูแลฐานข้อมูล:</div>
                <p className="text-blue-800/90 leading-relaxed">
                  แนะนำให้ผู้ดูแลระบบดาวน์โหลดไฟล์สำรองข้อมูล Snapshot (.json) หรือ Excel (.xlsx) เก็บไว้เป็นประจำทุกสัปดาห์ หรือก่อนการเปลี่ยนแปลงโครงสร้างหน่วยงาน/รายการวัสดุครั้งใหญ่
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Move Category Modal */}
      {bulkMoveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <FolderInput className="w-5 h-5 text-indigo-600" />
              <span>ย้ายหมวดหมู่วัสดุที่เลือก ({selectedItemKeys.length} รายการ)</span>
            </h3>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">เลือกหมวดหมู่ปลายทาง:</label>
              <select
                value={bulkTargetCategory}
                onChange={(e) => setBulkTargetCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
              >
                {currentCategoryOrder.map(cat => (
                  <option key={cat} value={cat}>
                    {getCategoryLabel(cat)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBulkMoveModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onBulkMoveCategory) {
                    onBulkMoveCategory(selectedItemKeys, bulkTargetCategory);
                    setSelectedItemKeys([]);
                  }
                  setBulkMoveModalOpen(false);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs"
              >
                ยืนยันย้ายหมวดหมู่
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Price Adjust Modal */}
      {bulkPriceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <span>ปรับราคากลางแบบกลุ่ม ({selectedItemKeys.length} รายการ)</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">รูปแบบการปรับราคา:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPriceAdjustMode('percent')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all ${
                      priceAdjustMode === 'percent'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-400 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    ปรับตามเปอร์เซ็นต์ (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceAdjustMode('fixed')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all ${
                      priceAdjustMode === 'fixed'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-400 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    ปรับบวก/ลบจำนวนเงิน (บาท)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {priceAdjustMode === 'percent' ? 'อัตราปรับราคา (+ เพิ่ม, - ลด เป็น %)' : 'จำนวนเงินที่ปรับ (+ เพิ่ม, - ลด เป็น บาท)'}:
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={priceAdjustValue}
                  onChange={(e) => setPriceAdjustValue(parseFloat(e.target.value) || 0)}
                  placeholder="เช่น 5 หรือ -5"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBulkPriceModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onBulkAdjustPrice) {
                    onBulkAdjustPrice(selectedItemKeys, priceAdjustMode, priceAdjustValue);
                    setSelectedItemKeys([]);
                  }
                  setBulkPriceModalOpen(false);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs"
              >
                ยืนยันปรับราคา
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-600" />
                <span>นำเข้ารายการวัสดุจาก Excel (.xlsx)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-indigo-400 transition-colors">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsParsingExcel(true);
                    try {
                      const res = await parseMaterialExcel(file);
                      setImportedPreviewItems(res.items);
                      setImportErrors(res.errors);
                      if (res.items.length > 0) {
                        onToastAlert(`อ่านข้อมูลสำเร็จ ${res.items.length} รายการ`, 'success');
                      }
                    } catch (err: any) {
                      onToastAlert(`ไม่สามารถอ่านไฟล์ได้: ${err.message}`, 'error');
                    } finally {
                      setIsParsingExcel(false);
                      e.target.value = '';
                    }
                  }}
                  className="hidden"
                  id="excel-file-input"
                />
                <label htmlFor="excel-file-input" className="cursor-pointer space-y-2 block">
                  <FileSpreadsheet className="w-8 h-8 text-indigo-600 mx-auto" />
                  <div className="font-bold text-slate-800">
                    {isParsingExcel ? 'กำลังอ่านไฟล์ Excel...' : 'คลิกเพื่อเลือกไฟล์ Excel หรือลากไฟล์มาวางที่นี่'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    รองรับไฟล์นามสกุล .xlsx และ .xls
                  </div>
                </label>
              </div>

              {/* Import Errors Alert */}
              {importErrors.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-800 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    พบข้อผิดพลาดบางรายการ:
                  </div>
                  <ul className="list-disc list-inside text-[11px] space-y-0.5 max-h-24 overflow-y-auto">
                    {importErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview Table */}
              {importedPreviewItems.length > 0 && (
                <div className="space-y-2">
                  <div className="font-bold text-slate-800 flex items-center justify-between">
                    <span>ตัวอย่างรายการที่จะนำเข้า ({importedPreviewItems.length} รายการ):</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                        <tr>
                          <th className="py-2 px-3">หมวดหมู่</th>
                          <th className="py-2 px-3">ชื่อรายการ</th>
                          <th className="py-2 px-3 text-center">หน่วย</th>
                          <th className="py-2 px-3 text-right">ราคากลาง</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importedPreviewItems.slice(0, 50).map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-1.5 px-3">{getCategoryLabel(item.category)}</td>
                            <td className="py-1.5 px-3 font-bold">{item.name}</td>
                            <td className="py-1.5 px-3 text-center">{item.unit}</td>
                            <td className="py-1.5 px-3 text-right font-mono">{fmtBaht(item.price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={importedPreviewItems.length === 0}
                onClick={() => {
                  if (onBulkImportMaterials && importedPreviewItems.length > 0) {
                    onBulkImportMaterials(importedPreviewItems);
                    setShowImportModal(false);
                  }
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer"
              >
                ยืนยันนำเข้า {importedPreviewItems.length} รายการ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
