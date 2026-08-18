import React, { useState, useEffect } from 'react';
import { CategoryId } from '../types';
import { CATEGORY_LABELS, CATEGORY_ORDER, getCategoryOrder, getCategoryLabel } from '../data/catalog';
import { Search, Sparkles, Calendar } from 'lucide-react';

export type SortOption = 
  | 'name-asc' 
  | 'qty-desc' 
  | 'qty-asc' 
  | 'price-desc' 
  | 'price-asc'
  | 'total-desc'
  | 'total-asc';

interface TableControlPanelProps {
  title: string;
  categoryLabel?: string;
  departmentName?: string;
  fiscalYear: string;
  totalCount: number;

  // Fiscal Year filter
  selectedFiscalYear?: string;
  onFiscalYearChange?: (year: string) => void;
  showFiscalYearFilter?: boolean;
  fiscalYearOptions?: string[];
  
  // Category filter
  selectedCategory?: CategoryId | 'all';
  onCategoryChange?: (cat: CategoryId | 'all') => void;
  showCategoryFilter?: boolean;

  // Department filter
  departments?: { id: string; name: string }[];
  selectedDeptId?: string;
  onDeptChange?: (deptId: string) => void;
  showDeptFilter?: boolean;

  // Search
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  showSearch?: boolean;
  searchPlaceholder?: string;

  // Optional Sort
  sortOption?: SortOption;
  onSortChange?: (sort: SortOption) => void;

  // Custom action buttons
  actions?: React.ReactNode;
}

const customColors = [
  { active: 'bg-teal-600 text-white border-teal-600 shadow-xs font-bold', inactive: 'bg-teal-50/90 text-teal-800 border-teal-200 hover:bg-teal-100 font-semibold', dot: 'bg-teal-500' },
  { active: 'bg-pink-600 text-white border-pink-600 shadow-xs font-bold', inactive: 'bg-pink-50/90 text-pink-800 border-pink-200 hover:bg-pink-100 font-semibold', dot: 'bg-pink-500' },
  { active: 'bg-cyan-600 text-white border-cyan-600 shadow-xs font-bold', inactive: 'bg-cyan-50/90 text-cyan-800 border-cyan-200 hover:bg-cyan-100 font-semibold', dot: 'bg-cyan-500' },
  { active: 'bg-rose-600 text-white border-rose-600 shadow-xs font-bold', inactive: 'bg-rose-50/90 text-rose-800 border-rose-200 hover:bg-rose-100 font-semibold', dot: 'bg-rose-500' },
  { active: 'bg-fuchsia-600 text-white border-fuchsia-600 shadow-xs font-bold', inactive: 'bg-fuchsia-50/90 text-fuchsia-800 border-fuchsia-200 hover:bg-fuchsia-100 font-semibold', dot: 'bg-fuchsia-500' }
];

export const CATEGORY_BUTTON_STYLES: Record<string, { active: string; inactive: string; dot: string }> = new Proxy({
  all: {
    active: 'bg-slate-900 text-white border-slate-900 shadow-xs font-bold',
    inactive: 'bg-slate-100 text-slate-700 border-slate-200/90 hover:bg-slate-200 font-semibold',
    dot: 'bg-slate-400'
  },
  office: {
    active: 'bg-blue-600 text-white border-blue-600 shadow-xs font-bold',
    inactive: 'bg-blue-50/90 text-blue-800 border-blue-200 hover:bg-blue-100 font-semibold',
    dot: 'bg-blue-500'
  },
  samnak: {
    active: 'bg-indigo-600 text-white border-indigo-600 shadow-xs font-bold',
    inactive: 'bg-indigo-50/90 text-indigo-800 border-indigo-200 hover:bg-indigo-100 font-semibold',
    dot: 'bg-indigo-500'
  },
  kitchen: {
    active: 'bg-emerald-600 text-white border-emerald-600 shadow-xs font-bold',
    inactive: 'bg-emerald-50/90 text-emerald-900 border-emerald-200 hover:bg-emerald-100 font-semibold',
    dot: 'bg-emerald-500'
  },
  electric: {
    active: 'bg-amber-600 text-white border-amber-600 shadow-xs font-bold',
    inactive: 'bg-amber-50/90 text-amber-900 border-amber-200 hover:bg-amber-100 font-semibold',
    dot: 'bg-amber-500'
  },
  computer: {
    active: 'bg-purple-600 text-white border-purple-600 shadow-xs font-bold',
    inactive: 'bg-purple-50/90 text-purple-900 border-purple-200 hover:bg-purple-100 font-semibold',
    dot: 'bg-purple-500'
  }
} as any, {
  get(target, prop) {
    if (typeof prop !== 'string') return undefined;
    if (target[prop]) return target[prop];
    let h = 0;
    for (let i = 0; i < prop.length; i++) {
      h = (h * 31 + prop.charCodeAt(i)) >>> 0;
    }
    return customColors[h % customColors.length];
  }
});

export const TableControlPanel: React.FC<TableControlPanelProps> = ({
  title,
  categoryLabel,
  departmentName,
  fiscalYear,
  totalCount,
  selectedFiscalYear,
  onFiscalYearChange,
  showFiscalYearFilter = false,
  fiscalYearOptions,
  selectedCategory = 'office',
  onCategoryChange,
  showCategoryFilter = true,
  departments,
  selectedDeptId,
  onDeptChange,
  showDeptFilter = false,
  searchTerm = '',
  onSearchChange,
  showSearch = true,
  searchPlaceholder,
  actions
}) => {
  const [, setCatVersion] = useState(0);
  useEffect(() => {
    const handleUpdate = () => setCatVersion(v => v + 1);
    window.addEventListener('categories_updated', handleUpdate);
    return () => window.removeEventListener('categories_updated', handleUpdate);
  }, []);

  const hasBottomRow = (showDeptFilter && departments && onDeptChange) || (showSearch && onSearchChange);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3.5">
      {/* Top Banner Row (Merged Image 2) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>{title}</span>
            {categoryLabel && <span className="text-indigo-600 font-extrabold">— {categoryLabel}</span>}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5">
            <span>แสดง <strong className="text-slate-800 font-bold">{totalCount}</strong> รายการ</span>
            {departmentName && (
              <>
                <span className="text-slate-300">•</span>
                <span>หน่วยงานที่ขอ: <strong className="text-slate-800 font-semibold">{departmentName}</strong></span>
              </>
            )}
          </p>
        </div>

        {/* Status & Fiscal Year Badges */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-xl border border-indigo-100">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            ปีงบประมาณ พ.ศ. {selectedFiscalYear && selectedFiscalYear !== 'all' ? selectedFiscalYear : fiscalYear}
          </span>
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-xl border border-emerald-200">
            พบ {totalCount} รายการ
          </span>
          {actions}
        </div>
      </div>

      {/* Bottom Filter & Search Controls Row */}
      <div className="flex flex-col gap-3 pt-0.5">
        {/* Fiscal Year Filter Buttons (ปุ่มปีงบที่เคยขอ - อยู่บนประเภทวัสดุ) */}
        {showFiscalYearFilter && onFiscalYearChange && (
          <div className="flex flex-wrap items-center gap-2 text-xs pb-2 border-b border-slate-100/80">
            <span className="font-bold text-slate-700 flex items-center gap-1.5 whitespace-nowrap mr-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              ปีงบประมาณที่เคยขอ:
            </span>

            {(fiscalYearOptions || ['all', fiscalYear]).map(yr => {
              const isSelected = (selectedFiscalYear || 'all') === yr;
              return (
                <button
                  key={yr}
                  type="button"
                  onClick={() => onFiscalYearChange(yr)}
                  className={`px-3 py-1.5 rounded-xl text-xs transition-all border flex items-center gap-1.5 cursor-pointer font-medium ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs font-bold'
                      : 'bg-slate-50 text-slate-700 border-slate-200/90 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  {yr === 'all' ? 'ทั้งหมดทุกปี' : `ปี พ.ศ. ${yr}`}
                </button>
              );
            })}
          </div>
        )}

        {/* Category Buttons Row */}
        {showCategoryFilter && onCategoryChange && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5 whitespace-nowrap mr-1">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              ประเภทวัสดุ:
            </span>

            {/* Render "ทั้งหมด" button if selectedCategory can be 'all' */}
            <button
              type="button"
              onClick={() => onCategoryChange('all')}
              className={`px-3 py-1.5 rounded-xl text-xs transition-all border flex items-center gap-1.5 cursor-pointer ${
                selectedCategory === 'all' 
                  ? CATEGORY_BUTTON_STYLES.all.active 
                  : CATEGORY_BUTTON_STYLES.all.inactive
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${CATEGORY_BUTTON_STYLES.all.dot}`} />
              ทั้งหมดทุกหมวด
            </button>

            {getCategoryOrder().map(c => {
              const style = CATEGORY_BUTTON_STYLES[c] || CATEGORY_BUTTON_STYLES.office;
              const isSelected = selectedCategory === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => onCategoryChange(c)}
                  className={`px-3 py-1.5 rounded-xl text-xs transition-all border flex items-center gap-1.5 cursor-pointer ${
                    isSelected ? style.active : style.inactive
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : style.dot}`} />
                  {getCategoryLabel(c)}
                </button>
              );
            })}
          </div>
        )}

        {hasBottomRow && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Department Selector */}
            {showDeptFilter && departments && onDeptChange ? (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-slate-700 whitespace-nowrap mr-1">
                  หน่วยงาน:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {departments.map(d => {
                    const isSelected = selectedDeptId === d.id;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => onDeptChange(d.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs transition-all border flex items-center gap-1.5 cursor-pointer font-medium ${
                          isSelected
                            ? 'bg-teal-600 text-white border-teal-600 shadow-xs font-bold'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        {d.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : <div />}

            {/* Search Input Box */}
            {showSearch && onSearchChange && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => onSearchChange(e.target.value)}
                    placeholder={searchPlaceholder || "ค้นหารายการวัสดุ..."}
                    className="w-full bg-slate-50 border border-slate-300 pl-8 pr-3 py-1.5 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
