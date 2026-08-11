import React, { useState, useEffect } from 'react';
import { CategoryId, MaterialItem } from '../types';
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
  deleteCustomCategory
} from '../data/catalog';
import { PaginationBar } from './PaginationBar';
import { TableControlPanel, SortOption, CATEGORY_BUTTON_STYLES } from './TableControlPanel';
import { sortItems } from '../utils/sortHelper';
import { Package, Plus, Edit3, Power, Check, X, ShieldAlert, ArrowUpDown, FolderPlus, Trash2, Tag, ListFilter } from 'lucide-react';

interface AdminMaterialsViewProps {
  customItems: Record<string, string[]>;
  itemPrices: Record<string, number>;
  materialActive: Record<string, boolean>;
  fiscalYear: string;
  onUpdateFiscalYear: (year: string) => void;
  onAddMaterial: (category: CategoryId, name: string, unit: string, price: number) => void;
  onUpdateMaterial: (oldCategory: CategoryId, oldName: string, newCategory: CategoryId, newName: string, newUnit: string, newPrice: number) => void;
  onToggleActive: (itemKey: string) => void;
  onRequestConfirm: (opts: { title: string; message: string; confirmText?: string; variant?: 'primary' | 'danger' | 'warning'; onConfirm: () => void }) => void;
  onToastAlert: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onAddCustomCategory?: (key: string, label: string) => void;
  onDeleteCustomCategory?: (key: string, label: string) => void;
}

export const AdminMaterialsView: React.FC<AdminMaterialsViewProps> = ({
  customItems,
  itemPrices,
  materialActive,
  fiscalYear,
  onUpdateFiscalYear,
  onAddMaterial,
  onUpdateMaterial,
  onToggleActive,
  onRequestConfirm,
  onToastAlert,
  onAddCustomCategory,
  onDeleteCustomCategory
}) => {
  const [filterCategory, setFilterCategory] = useState<CategoryId | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'category' | 'name' | 'unit' | 'price' | 'active'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Unique Editing key: `${category}:::${name}`
  const [editingItemKey, setEditingItemKey] = useState<string | null>(null);

  // Fiscal Year Edit State
  const [inputFiscalYear, setInputFiscalYear] = useState(fiscalYear);

  // Add Form
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<CategoryId>('office');
  const [newUnit, setNewUnit] = useState('ชิ้น');
  const [newPrice, setNewPrice] = useState<number>(0);

  // Edit Form (All columns)
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
    const handleUpdate = () => {
      setCategoriesVersion(v => v + 1);
    };
    window.addEventListener('categories_updated', handleUpdate);
    return () => window.removeEventListener('categories_updated', handleUpdate);
  }, []);

  // Compile full material list
  const allList: MaterialItem[] = [];
  CATEGORY_ORDER.forEach(cat => {
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

  const handleSetFiscalYear = () => {
    if (!inputFiscalYear.toString().trim()) {
      onToastAlert('กรุณากรอกปีงบประมาณ (*)', 'error');
      return;
    }
    if (inputFiscalYear.toString().trim() === fiscalYear) return;

    onRequestConfirm({
      title: 'ยืนยันการตั้งค่าปีงบประมาณหลัก',
      message: `คุณต้องการเปลี่ยนปีงบประมาณหลักของระบบจาก พ.ศ. ${fiscalYear} เป็น พ.ศ. ${inputFiscalYear} หรือไม่?`,
      confirmText: 'ตั้งค่าปีงบประมาณ',
      variant: 'primary',
      onConfirm: () => {
        onUpdateFiscalYear(inputFiscalYear);
        onToastAlert(`เปลี่ยนปีงบประมาณของระบบเป็น พ.ศ. ${inputFiscalYear} เรียบร้อยแล้ว`, 'success');
      }
    });
  };

  const handleAdd = () => {
    if (!newName.trim() || !newUnit.trim()) {
      onToastAlert('กรุณากรอกข้อมูลที่จำเป็น (*) เช่น ชื่อรายการวัสดุ และหน่วยนับ ให้ครบถ้วน', 'error');
      return;
    }

    onRequestConfirm({
      title: 'ยืนยันการเพิ่มรายการวัสดุในแค็ตตาล็อก',
      message: `คุณต้องการเพิ่มวัสดุใหม่ '${newName.trim()}' (${newUnit}, ${fmtBaht(newPrice)} บาท) เข้าสู่หมวด ${CATEGORY_LABELS[newCategory]} หรือไม่?`,
      confirmText: 'เพิ่มวัสดุใหม่',
      variant: 'primary',
      onConfirm: () => {
        onAddMaterial(newCategory, newName.trim(), newUnit.trim(), newPrice);
        onToastAlert(`เพิ่มรายการวัสดุ '${newName.trim()}' เข้าสู่แค็ตตาล็อกกลางสำเร็จ`, 'success');
        setNewName('');
        setNewPrice(0);
      }
    });
  };

  const startEdit = (m: MaterialItem) => {
    const key = `${m.category}:::${m.name}`;
    setEditingItemKey(key);
    setEditCategory(m.category);
    setEditName(m.name);
    setEditUnit(m.unit);
    setEditPrice(m.price);
  };

  const saveEdit = (oldCategory: CategoryId, oldName: string) => {
    if (!editName.trim() || !editUnit.trim()) {
      onToastAlert('กรุณากรอกชื่อวัสดุและหน่วยนับ (*) ให้ครบถ้วน', 'error');
      return;
    }

    onRequestConfirm({
      title: 'ยืนยันการบันทึกการแก้ไขวัสดุ',
      message: `คุณต้องการบันทึกการแก้ไขรายการวัสดุเป็น:\n• ชื่อ: ${editName.trim()}\n• หมวด: ${CATEGORY_LABELS[editCategory]}\n• หน่วยนับ: ${editUnit.trim()}\n• ราคากลาง: ${fmtBaht(editPrice)} บาท หรือไม่?`,
      confirmText: 'บันทึกการแก้ไข',
      variant: 'primary',
      onConfirm: () => {
        onUpdateMaterial(oldCategory, oldName, editCategory, editName.trim(), editUnit.trim(), editPrice);
        onToastAlert(`บันทึกการแก้ไขรายการ '${editName.trim()}' สำเร็จเรียบร้อยแล้ว`, 'success');
        setEditingItemKey(null);
      }
    });
  };

  const handleToggleActiveStatus = (m: MaterialItem) => {
    const itemKey = `${m.category}:::${m.name}`;
    const actionText = m.active ? 'ปิดการใช้งาน (ซ่อน)' : 'เปิดการใช้งาน';
    
    onRequestConfirm({
      title: `ยืนยันการ${actionText}รายการวัสดุ`,
      message: `คุณต้องการ${actionText} รายการ '${m.name}' ในแค็ตตาล็อกกลางหรือไม่?`,
      confirmText: actionText,
      variant: m.active ? 'danger' : 'primary',
      onConfirm: () => {
        onToggleActive(itemKey);
        onToastAlert(`${actionText} รายการ '${m.name}' เรียบร้อยแล้ว`, 'info');
      }
    });
  };

  const handleAddCustomCategory = () => {
    const slug = customCatKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!slug) {
      onToastAlert('กรุณากรอกรหัสหมวดหมู่ภาษาอังกฤษ (ตัวอย่าง: dental, medical)', 'error');
      return;
    }
    if (['all', 'office', 'samnak', 'kitchen', 'electric', 'computer'].includes(slug)) {
      onToastAlert('รหัสหมวดหมู่นี้ถูกใช้งานโดยระบบแล้ว ไม่สามารถซ้ำกันได้', 'error');
      return;
    }
    const label = customCatLabel.trim();
    if (!label) {
      onToastAlert('กรุณากรอกชื่อหมวดหมู่ที่ต้องการแสดงผล', 'error');
      return;
    }

    onRequestConfirm({
      title: 'ยืนยันการเพิ่มหมวดหมู่พัสดุใหม่',
      message: `คุณต้องการเพิ่มหมวดหมู่ประเภทวัสดุใหม่ในระบบหรือไม่?\n• รหัสหมวดหมู่: ${slug}\n• ชื่อภาษาไทย: ${label}`,
      confirmText: 'เพิ่มหมวดหมู่ใหม่',
      variant: 'primary',
      onConfirm: () => {
        if (onAddCustomCategory) {
          onAddCustomCategory(slug, label);
        } else {
          saveCustomCategory(slug, label);
        }
        onToastAlert(`เพิ่มหมวดหมู่ '${label}' เข้าสู่ระบบสำเร็จแล้ว`, 'success');
        setCustomCatKey('');
        setCustomCatLabel('');
      }
    });
  };

  const handleDeleteCustomCategory = (key: string, label: string) => {
    onRequestConfirm({
      title: '⚠️ ยืนยันการลบหมวดหมู่พัสดุ',
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่ '${label}'? การลบนี้จะไม่ลบพัสดุในระบบ แต่พัสดุในหมวดนี้อาจแสดงผลผิดพลาดหากหมวดหมู่ถูกนำออก!`,
      confirmText: 'ยืนยันลบหมวดหมู่',
      variant: 'danger',
      onConfirm: () => {
        if (onDeleteCustomCategory) {
          onDeleteCustomCategory(key, label);
        } else {
          deleteCustomCategory(key);
        }
        onToastAlert(`ลบหมวดหมู่ '${label}' เรียบร้อยแล้ว`, 'info');
      }
    });
  };

  // Pagination slice
  const numericSize = pageSize === 'all' ? sortedList.length || 1 : pageSize;
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(sortedList.length / numericSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageItems = pageSize === 'all' ? sortedList : sortedList.slice((safePage - 1) * numericSize, safePage * numericSize);

  return (
    <div className="space-y-5">
      {/* Fiscal Year Setting Card */}
      <div className="bg-white border border-indigo-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">การตั้งค่าปีงบประมาณของระบบ (Fiscal Year Setting)</h3>
            <p className="text-xs text-slate-500">
              ปีงบประมาณปัจจุบัน: <strong className="text-indigo-600 font-bold">พ.ศ. {fiscalYear}</strong> — สามารถกำหนดปีงบประมาณสำหรับการยื่นเสนอพัสดุได้ที่นี่
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-700">พ.ศ.</label>
          <input
            type="number"
            value={inputFiscalYear}
            onChange={e => setInputFiscalYear(e.target.value)}
            className="w-24 px-3 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-600"
          />
          <button
            type="button"
            onClick={handleSetFiscalYear}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-xs transition-all"
          >
            อัปเดตปีงบประมาณ
          </button>
        </div>
      </div>

      {/* Category Management Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl border border-sky-100">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">จัดการหมวดหมู่ประเภทวัสดุ (Material Category Management)</h3>
            <p className="text-xs text-slate-500">
              ผู้ดูแลระบบสามารถจัดการหมวดหมู่สำหรับการจำแนกพัสดุได้เอง (หมวดหมู่พัสดุเริ่มต้นของระบบจะไม่สามารถลบได้)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs">
          {/* Current Categories List (Left Column) */}
          <div className="lg:col-span-7 space-y-2 border-r border-slate-100 pr-0 lg:pr-5">
            <h4 className="font-bold text-slate-700 flex items-center gap-1.5 mb-2">
              <ListFilter className="w-4 h-4 text-slate-500" />
              หมวดหมู่พัสดุในระบบขณะนี้ ({CATEGORY_ORDER.length} หมวดหมู่)
            </h4>
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
              {CATEGORY_ORDER.map(c => {
                const style = CATEGORY_BUTTON_STYLES[c] || CATEGORY_BUTTON_STYLES.office;
                const isDefault = ['office', 'samnak', 'kitchen', 'electric', 'computer'].includes(c);
                return (
                  <div key={c} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
                      <div>
                        <span className="font-bold text-slate-800">{CATEGORY_LABELS[c]}</span>
                        <span className="ml-2 font-mono text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-medium">
                          ID: {c}
                        </span>
                      </div>
                    </div>
                    {isDefault ? (
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg font-semibold">
                        หมวดหมู่เริ่มต้นของระบบ
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomCategory(c, CATEGORY_LABELS[c])}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all"
                        title="ลบหมวดหมู่พัสดุ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Category Form (Right Column) */}
          <div className="lg:col-span-5 space-y-3">
            <h4 className="font-bold text-slate-700 flex items-center gap-1.5">
              <FolderPlus className="w-4 h-4 text-indigo-500" />
              เพิ่มหมวดหมู่พัสดุใหม่
            </h4>
            <div className="space-y-2.5">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  รหัสหมวดหมู่ภาษาอังกฤษ (ID ภาษาอังกฤษ) <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  value={customCatKey}
                  onChange={e => setCustomCatKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="เช่น dental, medical, office_custom"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 font-mono text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  อนุญาตเฉพาะภาษาอังกฤษ ตัวเลข และเครื่องหมาย _ เท่านั้น (ห้ามมีช่องว่าง)
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  ชื่อหมวดหมู่ที่ต้องการแสดงผล (ภาษาไทย) <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  value={customCatLabel}
                  onChange={e => setCustomCatLabel(e.target.value)}
                  placeholder="เช่น วัสดุทันตกรรม, วัสดุการแพทย์"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 text-xs"
                />
              </div>

              <button
                type="button"
                onClick={handleAddCustomCategory}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-all mt-1"
              >
                <Plus className="w-4 h-4" />
                เพิ่มหมวดหมู่พัสดุใหม่
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add New Catalog Material Form */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Package className="w-4 h-4 text-indigo-600" />
          เพิ่มรายการวัสดุใหม่ในแค็ตตาล็อกกลาง
        </h3>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">หมวดหมู่ประเภทวัสดุ</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_ORDER.map(c => {
                const style = CATEGORY_BUTTON_STYLES[c] || CATEGORY_BUTTON_STYLES.office;
                const isSelected = newCategory === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewCategory(c)}
                    className={`px-3 py-1.5 rounded-xl transition-all border flex items-center gap-1.5 cursor-pointer ${
                      isSelected ? style.active : style.inactive
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : style.dot}`} />
                    {CATEGORY_LABELS[c]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">

          <div className="md:col-span-2">
            <label className="block font-bold text-slate-700 mb-1">
              ชื่อรายการวัสดุ <span className="text-rose-500 font-bold">*</span>
            </label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="ระบุชื่อวัสดุใหม่..."
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              หน่วยนับ <span className="text-rose-500 font-bold">*</span>
            </label>
            <input
              type="text"
              value={newUnit}
              onChange={e => setNewUnit(e.target.value)}
              placeholder="เช่น ชิ้น, รีม"
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">ราคากลาง (บาท)</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="0.5"
                value={newPrice || ''}
                onChange={e => setNewPrice(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono text-right font-bold focus:outline-none focus:border-indigo-600"
              />
              <button
                type="button"
                onClick={handleAdd}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors shrink-0 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                เพิ่ม
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Merged Header Control Panel */}
      <TableControlPanel
        title="จัดการรายการวัสดุในระบบ"
        categoryLabel={filterCategory === 'all' ? 'ทุกหมวด' : CATEGORY_LABELS[filterCategory]}
        fiscalYear={fiscalYear}
        totalCount={sortedList.length}
        selectedCategory={filterCategory}
        onCategoryChange={cat => {
          setFilterCategory(cat);
          setCurrentPage(1);
        }}
        showCategoryFilter={true}
        searchTerm={searchTerm}
        onSearchChange={term => {
          setSearchTerm(term);
          setCurrentPage(1);
        }}
      />

      {/* Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-base text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase font-mono text-xs md:text-sm border-b border-slate-200 select-none">
              <tr>
                <th 
                  onClick={() => handleHeaderSort('name')}
                  className="p-2.5 w-1/3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>รายการ (ชื่อวัสดุ)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleHeaderSort('category')}
                  className="p-2.5 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>ประเภทวัสดุ</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleHeaderSort('unit')}
                  className="p-2.5 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>หน่วยนับ</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleHeaderSort('price')}
                  className="p-2.5 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>ราคากลาง (บาท)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleHeaderSort('active')}
                  className="p-2.5 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>สถานะ</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-2.5 text-right w-28">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageItems.map(m => {
                const itemKey = `${m.category}:::${m.name}`;
                const isEditing = editingItemKey === itemKey;

                return (
                  <tr key={itemKey} className={`hover:bg-slate-50/80 transition-colors ${!m.active ? 'opacity-50 bg-slate-50/50' : ''}`}>
                    <td className="p-2.5 font-bold text-slate-900">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="w-full px-2 py-1 border border-indigo-300 rounded text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          placeholder="ชื่อรายการ..."
                        />
                      ) : (
                        m.name
                      )}
                    </td>
                    <td className="p-2.5">
                      {isEditing ? (
                        <select
                          value={editCategory}
                          onChange={e => setEditCategory(e.target.value as CategoryId)}
                          className="px-2 py-1 border border-indigo-300 rounded text-sm bg-white text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {CATEGORY_ORDER.map(c => (
                            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                          ))}
                        </select>
                      ) : (
                        <CategoryBadge category={m.category} />
                      )}
                    </td>
                    
                    <td className="p-2.5 text-center">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editUnit}
                          onChange={e => setEditUnit(e.target.value)}
                          className="w-20 px-2 py-1 border border-indigo-300 rounded text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                      ) : (
                        <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                          {m.unit}
                        </span>
                      )}
                    </td>

                    <td className="p-2.5 text-right font-mono">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.5"
                          value={editPrice}
                          onChange={e => setEditPrice(parseFloat(e.target.value) || 0)}
                          className="w-24 px-2 py-1 border border-indigo-300 rounded text-right text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                      ) : (
                        <span className="font-bold text-slate-900">
                          {fmtBaht(m.price)}
                        </span>
                      )}
                    </td>

                    <td className="p-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleActiveStatus(m)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border transition-colors cursor-pointer ${
                          m.active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        <Power className="w-3 h-3" />
                        {m.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                      </button>
                    </td>

                    <td className="p-2.5 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => saveEdit(m.category, m.name)}
                            className="px-2.5 py-1 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 shadow-xs flex items-center gap-1 text-xs cursor-pointer"
                            title="บันทึกการแก้ไข"
                          >
                            <Check className="w-3.5 h-3.5" />
                            บันทึก
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingItemKey(null)}
                            className="px-2.5 py-1 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 flex items-center gap-1 text-xs cursor-pointer"
                            title="ยกเลิก"
                          >
                            <X className="w-3.5 h-3.5" />
                            ยกเลิก
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(m)}
                          className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-lg transition-colors flex items-center justify-end gap-1 ml-auto cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          แก้ไข
                        </button>
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
          totalItems={sortedList.length}
          onPageSizeChange={s => { setPageSize(s); setCurrentPage(1); }}
          onPageChange={p => setCurrentPage(p)}
        />
      </div>
    </div>
  );
};
