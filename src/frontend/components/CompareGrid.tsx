import React, { useState } from 'react';
import { historyFor, guessUnit } from '../data/catalog';
import { MiniBarsChart } from './MiniBarsChart';
import { HistoricalDetailModal } from './HistoricalDetailModal';
import { PaginationBar } from './PaginationBar';
import { RequestItem } from '../types';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Filter, 
  Flame, 
  ArrowUpRight, 
  ArrowRight,
  SortDesc,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Inbox
} from 'lucide-react';

interface CompareGridProps {
  itemNames?: string[];
  itemNamesThisYear?: string[];
  allHistoricalItemNames?: string[];
  getQtyRequested: (itemName: string) => number | null;
  requests?: RequestItem[];
  onNavigateToPending?: (itemName: string) => void;
}

export const CompareGrid: React.FC<CompareGridProps> = ({ 
  itemNames = [],
  itemNamesThisYear,
  allHistoricalItemNames,
  getQtyRequested, 
  requests = [],
  onNavigateToPending 
}) => {
  // 7.1 vs 7.2 Scope toggle state
  const [scopeMode, setScopeMode] = useState<'thisYear' | 'all'>('thisYear');

  // Controls
  const [searchTerm, setSearchTerm] = useState('');
  const [thresholdFilter, setThresholdFilter] = useState<'all' | 'over50' | 'over100' | 'increasing' | 'decreasing' | 'flat'>('all');
  const [sortBy, setSortBy] = useState<'pctDesc' | 'pctAsc' | 'qtyDesc' | 'nameAsc'>('pctDesc');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  // Pagination
  const [pageSize, setPageSize] = useState<number | 'all'>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Determine active item names based on scopeMode
  const fallbackThisYearItems = itemNames.filter(name => {
    const q = getQtyRequested(name);
    return q !== null && q > 0;
  });

  const activeThisYearItems = itemNamesThisYear 
    ? itemNamesThisYear 
    : (fallbackThisYearItems.length > 0 ? fallbackThisYearItems : itemNames);

  const activeAllItems = allHistoricalItemNames ? allHistoricalItemNames : itemNames;
  const currentScopeItemNames = scopeMode === 'thisYear' ? activeThisYearItems : activeAllItems;

  // Compute trend and statistics data for each item
  const itemsWithTrend = currentScopeItemNames.map(name => {
    const hist = historyFor(name); // 2564..2568
    const unit = guessUnit(name);
    const current = getQtyRequested(name);
    const lastYear = hist[2568] || 0;
    const currentVal = current !== null ? current : 0;
    const diff = currentVal - lastYear;

    let pctChange = 0;
    if (lastYear > 0) {
      pctChange = Math.round(((currentVal - lastYear) / lastYear) * 100);
    } else if (currentVal > 0) {
      pctChange = 100;
    }

    const isIncreasing = diff > 0;
    const isDecreasing = diff < 0;
    const isFlat = diff === 0;
    const isOver50 = pctChange >= 50;
    const isOver100 = pctChange >= 100;

    return {
      name,
      hist,
      unit,
      current,
      currentVal,
      lastYear,
      diff,
      pctChange,
      isIncreasing,
      isDecreasing,
      isFlat,
      isOver50,
      isOver100
    };
  });

  // Calculate summary counts (Requirement #1)
  const over50Count = itemsWithTrend.filter(i => i.isOver50).length;
  const over100Count = itemsWithTrend.filter(i => i.isOver100).length;
  const normalIncreaseCount = itemsWithTrend.filter(i => i.isIncreasing && !i.isOver50).length;
  const totalIncreasingCount = itemsWithTrend.filter(i => i.isIncreasing).length;
  const decreasingCount = itemsWithTrend.filter(i => i.isDecreasing).length;
  const flatCount = itemsWithTrend.filter(i => i.isFlat).length;

  // Filter items (Requirement #3)
  const filteredItems = itemsWithTrend.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase().trim());
    if (!matchesSearch) return false;

    if (thresholdFilter === 'over50') return item.isOver50;
    if (thresholdFilter === 'over100') return item.isOver100;
    if (thresholdFilter === 'increasing') return item.isIncreasing;
    if (thresholdFilter === 'decreasing') return item.isDecreasing;
    if (thresholdFilter === 'flat') return item.isFlat;
    return true;
  });

  // Sort items (Requirement #2)
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === 'pctDesc') {
      return b.pctChange - a.pctChange || b.diff - a.diff;
    }
    if (sortBy === 'pctAsc') {
      return a.pctChange - b.pctChange || a.diff - b.diff;
    }
    if (sortBy === 'qtyDesc') {
      return b.currentVal - a.currentVal;
    }
    if (sortBy === 'nameAsc') {
      return a.name.localeCompare(b.name, 'th');
    }
    return 0;
  });

  // Pagination calculation (Requirement #6)
  const numericSize = pageSize === 'all' ? sortedItems.length || 1 : pageSize;
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(sortedItems.length / numericSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedItems = pageSize === 'all' 
    ? sortedItems 
    : sortedItems.slice((safePage - 1) * numericSize, safePage * numericSize);

  return (
    <div className="space-y-4">
      {/* 7. Scope Toggle Bar (Requirement #7) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100/80 p-2 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl shadow-2xs border border-slate-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setScopeMode('thisYear');
              setCurrentPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              scopeMode === 'thisYear'
                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>เฉพาะรายการที่ขอปีนี้</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-extrabold ${
              scopeMode === 'thisYear' ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-100 text-slate-700'
            }`}>
              {activeThisYearItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setScopeMode('all');
              setCurrentPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              scopeMode === 'all'
                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>ทั้งหมดที่เคยขอ</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-extrabold ${
              scopeMode === 'all' ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-100 text-slate-700'
            }`}>
              {activeAllItems.length}
            </span>
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium px-2">
          {scopeMode === 'thisYear' ? (
            <span>กำลังแสดงรายการคำขอที่ขอจัดซื้อในปีงบประมาณปัจจุบัน</span>
          ) : (
            <span>กำลังแสดงรายการวัสดุทั้งหมดที่เคยมีประวัติในระบบ</span>
          )}
        </div>
      </div>

      {/* 1. Summary Overview & Controls Bar */}
      <div className="bg-gradient-to-r from-slate-50 via-indigo-50/30 to-slate-50 border border-slate-200 p-3 rounded-2xl space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
          <div className="flex items-center gap-1.5 text-slate-700">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            <span>สรุปแนวโน้มการขอจัดซื้อภาพรวม ({currentScopeItemNames.length} รายการ)</span>
          </div>
          <span className="text-[11px] text-slate-500 font-normal">คลิกปุ่มเพื่อสลับตัวกรองด่วน</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* ช่องค้นหารายการวัสดุ อยู่หน้าปุ่มเพิ่มขึ้น > 50% */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="ค้นหารายการวัสดุ..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-medium shadow-2xs"
            />
          </div>

          {/* ปุ่มเพิ่มขึ้น > 50% */}
          <button
            type="button"
            onClick={() => {
              setThresholdFilter(prev => prev === 'over50' ? 'all' : 'over50');
              setCurrentPage(1);
            }}
            className={`p-2 py-1.5 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer ${
              thresholdFilter === 'over50'
                ? 'bg-amber-600 text-white border-amber-700 ring-2 ring-amber-400 shadow-xs'
                : 'bg-amber-50/80 hover:bg-amber-100/80 border-amber-200 text-amber-950'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Flame className={`w-3.5 h-3.5 ${thresholdFilter === 'over50' ? 'text-amber-200 animate-pulse' : 'text-amber-600'}`} />
              <span className="font-semibold text-[11.5px]">เพิ่มขึ้น &gt; 50%</span>
            </div>
            <span className={`font-mono font-extrabold px-1.5 py-0.5 rounded-lg text-xs ${
              thresholdFilter === 'over50' ? 'bg-amber-800 text-white' : 'bg-amber-200/80 text-amber-950'
            }`}>
              {over50Count}
            </span>
          </button>

          {/* ปุ่มลดลง */}
          <button
            type="button"
            onClick={() => {
              setThresholdFilter(prev => prev === 'decreasing' ? 'all' : 'decreasing');
              setCurrentPage(1);
            }}
            className={`p-2 py-1.5 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer ${
              thresholdFilter === 'decreasing'
                ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-400 shadow-xs'
                : 'bg-emerald-50/80 hover:bg-emerald-100/80 border-emerald-200 text-emerald-950'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <TrendingDown className={`w-3.5 h-3.5 ${thresholdFilter === 'decreasing' ? 'text-emerald-200' : 'text-emerald-600'}`} />
              <span className="font-semibold text-[11.5px]">ลดลง</span>
            </div>
            <span className={`font-mono font-extrabold px-1.5 py-0.5 rounded-lg text-xs ${
              thresholdFilter === 'decreasing' ? 'bg-emerald-800 text-white' : 'bg-emerald-200/80 text-emerald-950'
            }`}>
              {decreasingCount}
            </span>
          </button>

          {/* ปุ่มคงที่ (เท่าเดิม) */}
          <button
            type="button"
            onClick={() => {
              setThresholdFilter(prev => prev === 'flat' ? 'all' : 'flat');
              setCurrentPage(1);
            }}
            className={`p-2 py-1.5 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer ${
              thresholdFilter === 'flat'
                ? 'bg-slate-700 text-white border-slate-800 ring-2 ring-slate-400 shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200/80 border-slate-300 text-slate-800'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Minus className={`w-3.5 h-3.5 ${thresholdFilter === 'flat' ? 'text-slate-300' : 'text-slate-600'}`} />
              <span className="font-semibold text-[11.5px]">คงที่ (เท่าเดิม)</span>
            </div>
            <span className={`font-mono font-extrabold px-1.5 py-0.5 rounded-lg text-xs ${
              thresholdFilter === 'flat' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-800'
            }`}>
              {flatCount}
            </span>
          </button>

          {/* ช่องเรียงตาม อยู่หลังปุ่มคงที่ */}
          <div className="flex items-center gap-1.5 sm:ml-auto">
            <label className="text-xs text-slate-500 font-semibold flex items-center gap-1 shrink-0">
              <SortDesc className="w-3.5 h-3.5 text-slate-400" />
              <span>เรียงตาม:</span>
            </label>
            <select
              value={sortBy}
              onChange={e => {
                setSortBy(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 cursor-pointer shadow-2xs"
            >
              <option value="pctDesc">% เปลี่ยนแปลง (มาก → น้อย)</option>
              <option value="pctAsc">% เปลี่ยนแปลง (น้อย → มาก)</option>
              <option value="qtyDesc">ยอดที่ขอปี 69 (มาก → น้อย)</option>
              <option value="nameAsc">ชื่อรายการ (ก-ฮ)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {paginatedItems.map(item => {
          const { name, hist, unit, current, currentVal, diff, pctChange, isIncreasing, isDecreasing, isOver50, isOver100 } = item;

          // 5-Year History Bars (2564..2568) + Year 2569 current
          const bars = [
            { label: '64', value: hist?.[2564] ?? 0 },
            { label: '65', value: hist?.[2565] ?? 0 },
            { label: '66', value: hist?.[2566] ?? 0 },
            { label: '67', value: hist?.[2567] ?? 0 },
            { label: '68', value: hist?.[2568] ?? 0 },
            { label: '69', value: current !== null && current !== undefined ? current : 0, current: true }
          ];

          // Determine card styling based on percentage change:
          // 1. เพิ่มเกิน 100% -> สีแดง (Red)
          // 2. อยู่ระหว่าง 50-99% -> สีส้ม (Orange/Amber)
          // 3. ลดลง -> สีเขียว (Green)
          let cardStyle = 'border-slate-200 bg-white';
          if (isOver100) {
            cardStyle = 'border-rose-500 ring-2 ring-rose-300/80 bg-rose-50/20';
          } else if (isOver50) {
            cardStyle = 'border-amber-400 ring-2 ring-amber-200/80 bg-amber-50/20';
          } else if (isDecreasing) {
            cardStyle = 'border-emerald-400 ring-2 ring-emerald-200/80 bg-emerald-50/20';
          } else if (isIncreasing) {
            cardStyle = 'border-slate-300 ring-1 ring-slate-200 bg-white';
          }

          return (
            <div
              key={name}
              className={`group border rounded-2xl p-3.5 hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden ${cardStyle}`}
            >
              {/* Top Banner Indicator */}
              {isOver100 ? (
                <div className="absolute top-0 right-0 bg-rose-600 text-white text-[9.5px] font-bold px-2 py-0.5 rounded-bl-lg flex items-center gap-0.5 shadow-2xs">
                  <AlertTriangle className="w-3 h-3 text-rose-200" />
                  เพิ่มเกิน 100% (+{pctChange}%)
                </div>
              ) : isOver50 ? (
                <div className="absolute top-0 right-0 bg-amber-600 text-white text-[9.5px] font-bold px-2 py-0.5 rounded-bl-lg flex items-center gap-0.5 shadow-2xs">
                  <Flame className="w-3 h-3 text-amber-200" />
                  เพิ่มเกิน 50% (+{pctChange}%)
                </div>
              ) : isDecreasing ? (
                <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[9.5px] font-bold px-2 py-0.5 rounded-bl-lg flex items-center gap-0.5 shadow-2xs">
                  <TrendingDown className="w-3 h-3 text-emerald-100" />
                  ลดลง ({pctChange}%)
                </div>
              ) : isIncreasing ? (
                <div className="absolute top-0 right-0 bg-slate-600 text-white text-[9.5px] font-bold px-2 py-0.5 rounded-bl-lg flex items-center gap-0.5 shadow-2xs">
                  <TrendingUp className="w-3 h-3 text-slate-200" />
                  เพิ่มขึ้น (+{pctChange}%)
                </div>
              ) : null}

              <div className="space-y-2">
                <div 
                  onClick={() => setSelectedItem(name)}
                  className="text-xs font-bold text-slate-800 line-clamp-2 pr-12 min-h-[32px] group-hover:text-indigo-700 transition-colors cursor-pointer"
                  title="คลิกเพื่อดูรายละเอียดสถิติสถิติย่อย"
                >
                  {name}
                </div>

                <div onClick={() => setSelectedItem(name)} className="cursor-pointer">
                  <MiniBarsChart bars={bars} />
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono font-semibold text-slate-700">
                    ขอปี 69: {current !== null ? `${current.toLocaleString()} ${unit}` : '—'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {current !== null && (
                      <span className={`font-mono font-bold text-[11px] ${
                        diff > 0 ? 'text-rose-600' : diff < 0 ? 'text-emerald-600' : 'text-slate-500'
                      }`}>
                        {diff > 0 ? `▲ +${diff}` : diff < 0 ? `▼ ${diff}` : '● 0'}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedItem(name)}
                      className="p-1 rounded-md bg-slate-100 text-slate-500 hover:bg-indigo-600 hover:text-white transition-colors cursor-pointer"
                      title="คลิกดูสถิติย้อนหลังย่อย"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 4. Navigate to Pending Request Button (Requirement #4) */}
                {onNavigateToPending && current !== null && current > 0 && (
                  <button
                    type="button"
                    onClick={() => onNavigateToPending(name)}
                    className="w-full mt-1 py-1.5 px-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-bold text-[11px] rounded-xl transition-all border border-indigo-200/80 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs group/btn"
                  >
                    <span>พิจารณาอนุมัติรายการนี้</span>
                    <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {sortedItems.length === 0 && (
        <div className="text-center py-12 bg-slate-50 border border-slate-200 rounded-2xl text-slate-500 text-xs">
          <p className="font-bold text-slate-700 text-sm">ไม่พบรายการวัสดุที่ตรงกับเงื่อนไข</p>
          <p className="text-[11.5px] text-slate-500 mt-1">
            ลองเปลี่ยนคำค้นหา หรือรีเซ็ตตัวกรองเพื่อดูรายการทั้งหมด
          </p>
        </div>
      )}

      {/* 6. Pagination Bar (Requirement #6) */}
      <PaginationBar
        pageSize={pageSize}
        currentPage={safePage}
        totalItems={sortedItems.length}
        onPageSizeChange={s => { setPageSize(s); setCurrentPage(1); }}
        onPageChange={p => setCurrentPage(p)}
      />

      {/* Historical Comparison Detail Popup Modal */}
      {selectedItem && (
        <HistoricalDetailModal
          itemName={selectedItem}
          requests={requests}
          getQtyRequested={getQtyRequested}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
};
