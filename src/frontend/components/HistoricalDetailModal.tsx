import React from 'react';
import { historyFor, guessUnit, guessPrice, fmtBaht, deptName } from '../data/catalog';
import { RequestItem } from '../types';
import { X, TrendingUp, TrendingDown, Minus, BarChart3, Package, Calendar, DollarSign, Building2 } from 'lucide-react';

interface HistoricalDetailModalProps {
  itemName: string | null;
  requests?: RequestItem[];
  getQtyRequested: (itemName: string) => number | null;
  onClose: () => void;
}

export const HistoricalDetailModal: React.FC<HistoricalDetailModalProps> = ({
  itemName,
  requests = [],
  getQtyRequested,
  onClose
}) => {
  if (!itemName) return null;

  const hist = historyFor(itemName); // 2564..2568
  const unit = guessUnit(itemName);
  const price = guessPrice(itemName, unit);
  const currentReqQty = getQtyRequested(itemName);

  const years = [2564, 2565, 2566, 2567, 2568];
  const lastYearVal = hist[2568] || 0;
  const currentVal = currentReqQty !== null ? currentReqQty : 0;

  // Calculate 5-year average
  const total5Years = years.reduce((acc, y) => acc + (hist[y] || 0), 0);
  const avg5Years = Math.round(total5Years / (years.length || 1)) || 0;

  // Compare 2569 vs 2568
  const diffFromLastYear = currentVal - lastYearVal;
  const rawPercent = lastYearVal > 0 ? Math.round((diffFromLastYear / lastYearVal) * 100) : (currentVal > 0 ? 100 : 0);
  const percentChange = isNaN(rawPercent) ? 0 : rawPercent;

  const isUp = diffFromLastYear > 0;
  const isDown = diffFromLastYear < 0;

  // Max value for bar heights
  const allVals = [...years.map(y => hist[y] || 0), currentVal];
  const maxVal = Math.max(1, ...allVals);

  // Department breakdown if requested
  const deptBreakdown: Record<string, number> = {};
  requests.forEach(r => {
    if (r.itemName === itemName && r.qtyRequested > 0) {
      deptBreakdown[r.deptId] = (deptBreakdown[r.deptId] || 0) + r.qtyRequested;
    }
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-500/20 rounded-xl border border-teal-400/30 text-teal-300">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-teal-400">
                สถิติเปรียบเทียบย้อนหลัง 5 ปี (พ.ศ. 2564–2568) & ปีงบประมาณ 2569
              </span>
              <h2 className="text-base font-bold text-white line-clamp-1">{itemName}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">
                หน่วยนับ / ราคากลาง
              </span>
              <div className="text-sm font-bold text-slate-900 mt-1 flex items-baseline gap-1">
                {unit} <span className="text-xs font-normal text-slate-500">(@{fmtBaht(price)} บ.)</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">
                เฉลี่ยย้อนหลัง 5 ปี
              </span>
              <div className="text-sm font-bold text-slate-900 font-mono mt-1">
                {avg5Years.toLocaleString()} {unit}
              </div>
            </div>

            <div className="bg-teal-50 border border-teal-200 rounded-xl p-3">
              <span className="text-[10px] font-mono font-bold text-teal-800 uppercase block">
                ยอดขอปี 2569
              </span>
              <div className="text-sm font-bold text-teal-950 font-mono mt-1">
                {currentReqQty !== null ? `${currentVal.toLocaleString()} ${unit}` : '—'}
              </div>
            </div>

            <div className={`border rounded-xl p-3 ${
              isUp ? 'bg-rose-50 border-rose-200 text-rose-900' :
              isDown ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
              'bg-slate-50 border-slate-200 text-slate-900'
            }`}>
              <span className="text-[10px] font-mono font-bold opacity-80 uppercase block">
                แนวโน้มเทียบปี 2568
              </span>
              <div className="text-sm font-bold font-mono mt-1 flex items-center gap-1">
                {isUp && <TrendingUp className="w-4 h-4 text-rose-600" />}
                {isDown && <TrendingDown className="w-4 h-4 text-emerald-600" />}
                {!isUp && !isDown && <Minus className="w-4 h-4 text-slate-500" />}
                <span>{isUp ? `+${diffFromLastYear} (${percentChange}%)` : `${diffFromLastYear} (${percentChange}%)`}</span>
              </div>
            </div>
          </div>

          {/* Bar Visualizer */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span>กราฟแสดงเปรียบเทียบย้อนหลัง 5 ปี (สีเทา) และ ยอดขอปี 2569 (สีเขียว/น้ำเงิน)</span>
              <span className="text-[11px] font-mono text-slate-500">หน่วย: {unit}</span>
            </div>

            <div className="flex items-end justify-between gap-2 h-36 pt-6 px-3 border-b border-slate-200">
              {years.map(y => {
                const val = hist[y] || 0;
                const h = Math.max(Math.round((val / maxVal) * 100), 12);
                return (
                  <div key={y} className="flex-1 flex flex-col items-center justify-end h-full group">
                    <span className="text-[10px] font-mono font-bold text-slate-600 mb-1">
                      {val}
                    </span>
                    <div
                      className="w-full max-w-[36px] bg-slate-300 group-hover:bg-slate-400 rounded-t-md transition-all duration-200"
                      style={{ height: `${h}%` }}
                    />
                    <span className="text-[11px] font-mono font-semibold text-slate-500 mt-1.5">
                      ปี {y % 100}
                    </span>
                  </div>
                );
              })}

              {/* Year 2569 */}
              <div className="flex-1 flex flex-col items-center justify-end h-full group">
                <span className="text-[10px] font-mono font-bold text-teal-700 mb-1">
                  {currentVal}
                </span>
                <div
                  className="w-full max-w-[36px] bg-gradient-to-t from-teal-700 to-cyan-500 rounded-t-md shadow-sm transition-all duration-200"
                  style={{ height: `${Math.max(Math.round((currentVal / maxVal) * 100), 12)}%` }}
                />
                <span className="text-[11px] font-mono font-bold text-teal-800 mt-1.5">
                  ปี 69 (ขอ)
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Year-by-Year Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-base text-left">
              <thead className="bg-slate-100 text-slate-700 uppercase font-mono text-sm">
                <tr>
                  <th className="p-2.5">ปีงบประมาณ</th>
                  <th className="p-2.5 text-right">จำนวนใช้งาน / ขอ</th>
                  <th className="p-2.5 text-right">เปลี่ยนแปลงเทียบปีก่อนหน้า</th>
                  <th className="p-2.5 text-right">ประมาณการงบประมาณ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {years.map((y, idx) => {
                  const val = hist[y] || 0;
                  const prevVal = idx > 0 ? hist[years[idx - 1]] : val;
                  const diff = idx > 0 ? val - prevVal : 0;
                  return (
                    <tr key={y} className="hover:bg-slate-50">
                      <td className="p-2.5 font-medium text-slate-800">พ.ศ. {y} (ย้อนหลัง)</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-800">{val} {unit}</td>
                      <td className="p-2.5 text-right font-mono">
                        {idx === 0 ? '—' : (
                          <span className={diff > 0 ? 'text-rose-600 font-bold' : diff < 0 ? 'text-teal-600 font-bold' : 'text-slate-500'}>
                            {diff > 0 ? `+${diff}` : diff}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-600">
                        {fmtBaht(val * price)} บาท
                      </td>
                    </tr>
                  );
                })}

                {/* 2569 Row */}
                <tr className="bg-teal-50/70 font-bold">
                  <td className="p-2.5 text-teal-950 font-bold">พ.ศ. 2569 (เสนอขอปีนี้)</td>
                  <td className="p-2.5 text-right font-mono text-teal-950 font-bold">{currentVal} {unit}</td>
                  <td className="p-2.5 text-right font-mono">
                    <span className={diffFromLastYear > 0 ? 'text-rose-600 font-bold' : diffFromLastYear < 0 ? 'text-teal-600 font-bold' : 'text-slate-600'}>
                      {diffFromLastYear > 0 ? `+${diffFromLastYear}` : diffFromLastYear} ({percentChange}%)
                    </span>
                  </td>
                  <td className="p-2.5 text-right font-mono text-teal-950 font-bold">
                    {fmtBaht(currentVal * price)} บาท
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Department breakdown if available */}
          {Object.keys(deptBreakdown).length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-teal-600" />
                สัดส่วนจำแนกตามหน่วยงานที่ขอเสนอปี 2569:
              </span>
              <div className="flex flex-wrap gap-2 pt-1">
                {Object.entries(deptBreakdown).map(([dId, q]) => (
                  <span key={dId} className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-800 shadow-2xs">
                    {deptName(dId)}: <strong className="font-mono text-teal-800 font-bold">{q}</strong> {unit}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
