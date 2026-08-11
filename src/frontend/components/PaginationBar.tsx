import React from 'react';

interface PaginationBarProps {
  pageSize: number | 'all';
  currentPage: number;
  totalItems: number;
  onPageSizeChange: (size: number | 'all') => void;
  onPageChange: (page: number) => void;
}

export const PaginationBar: React.FC<PaginationBarProps> = ({
  pageSize,
  currentPage,
  totalItems,
  onPageSizeChange,
  onPageChange
}) => {
  const numericSize = pageSize === 'all' ? totalItems || 1 : pageSize;
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(totalItems / numericSize));
  const safePage = Math.min(currentPage, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-slate-200 text-xs text-slate-600">
      <div className="flex items-center gap-2">
        <label className="text-[11.5px] text-slate-500 font-semibold">แสดงต่อหน้า:</label>
        {(['10', '30', '50', 'all'] as const).map((s) => {
          const isActive = String(pageSize) === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onPageSizeChange(s === 'all' ? 'all' : Number(s))}
              className={`font-mono text-xs font-semibold px-2.5 py-1 rounded-md border transition-all ${
                isActive
                  ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              {s === 'all' ? 'ทั้งหมด' : s}
            </button>
          );
        })}
        <span className="font-mono text-slate-500 ml-2">
          รวม {totalItems} รายการ
        </span>
      </div>

      {pageSize !== 'all' && totalItems > 0 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => onPageChange(safePage - 1)}
            className="px-2.5 py-1 text-xs font-bold rounded-md border border-slate-200 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            ‹ ก่อนหน้า
          </button>

          <div className="flex items-center gap-1.5 font-mono text-slate-600">
            <span>หน้า</span>
            <select
              value={safePage}
              onChange={(e) => onPageChange(Number(e.target.value))}
              className="bg-white border border-slate-300 rounded-md px-2 py-0.5 font-bold text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-teal-600 cursor-pointer"
            >
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <span>/ {totalPages}</span>
          </div>

          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => onPageChange(safePage + 1)}
            className="px-2.5 py-1 text-xs font-bold rounded-md border border-slate-200 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            ถัดไป ›
          </button>
        </div>
      )}
    </div>
  );
};
