import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface BarItem {
  label: string;
  value: number;
  current?: boolean;
}

interface MiniBarsChartProps {
  bars: BarItem[];
  sm?: boolean;
}

export const MiniBarsChart: React.FC<MiniBarsChartProps> = ({ bars, sm }) => {
  if (!bars || bars.length === 0) return null;

  let maxVal = 1;
  bars.forEach(b => {
    const v = b?.value ?? 0;
    if (v > maxVal) maxVal = v;
  });

  const titleParts = bars.map(b => `ปี ${b?.label ?? ''}: ${(b?.value ?? 0).toLocaleString()} ชิ้น`).join(' · ');

  // Calculate trend direction relative to previous year or overall first year
  const pastBars = bars.filter(b => !b.current);
  const firstVal = pastBars[0]?.value ?? 0;
  const lastPastVal = pastBars[pastBars.length - 1]?.value ?? 0;
  const currentVal = bars.find(b => b.current)?.value ?? lastPastVal;
  
  let trendType: 'up' | 'down' | 'flat' = 'flat';
  let percentChange = 0;

  if (lastPastVal > 0) {
    percentChange = Math.round(((currentVal - lastPastVal) / lastPastVal) * 100);
    if (percentChange > 0) trendType = 'up';
    else if (percentChange < 0) trendType = 'down';
  } else if (currentVal > 0) {
    trendType = 'up';
    percentChange = 100;
  }

  const numYears = pastBars.length || 5;

  if (sm) {
    return (
      <div className="flex items-center gap-1.5" title={titleParts}>
        <div className="flex gap-[2px] items-end h-6 w-14">
          {bars.map((b, i) => {
            const val = b?.value ?? 0;
            const h = Math.max(Math.round((val / maxVal) * 100), 12);
            return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                <div 
                  className={`w-full rounded-t ${
                    b.current 
                      ? 'bg-gradient-to-t from-teal-700 to-cyan-400' 
                      : 'bg-slate-300'
                  } transition-all duration-200`} 
                  style={{ height: `${h}%` }}
                />
              </div>
            );
          })}
        </div>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
          trendType === 'up' ? 'bg-rose-100 text-rose-800' :
          trendType === 'down' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
        }`}>
          {trendType === 'up' && `+${percentChange}%`}
          {trendType === 'down' && `${percentChange}%`}
          {trendType === 'flat' && '0%'}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 bg-slate-50/90 hover:bg-slate-100/90 p-2 rounded-xl border border-slate-200/80 transition-all" title={titleParts}>
      {/* Visual Bar Chart */}
      <div className="flex gap-1 items-end h-10 flex-1 px-0.5">
        {bars.map((b, i) => {
          const val = b?.value ?? 0;
          const h = Math.max(Math.round((val / maxVal) * 100), 15);
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full relative group">
              {/* Value Badge Above Bar */}
              <span className={`text-[8.5px] font-mono font-bold mb-0.5 leading-none ${b.current ? 'text-teal-800' : 'text-slate-600'}`}>
                {val > 999 ? `${(val/1000).toFixed(1)}k` : val}
              </span>

              {/* Bar */}
              <div 
                className={`w-full rounded-t-md ${
                  b.current 
                    ? 'bg-gradient-to-t from-teal-700 via-teal-600 to-cyan-400 shadow-2xs' 
                    : 'bg-slate-300 group-hover:bg-slate-400'
                } transition-all duration-200`} 
                style={{ height: `${h}%` }}
              />

              {/* Year Label */}
              <span className={`text-[8.5px] font-mono mt-0.5 font-bold ${b.current ? 'text-teal-800' : 'text-slate-500'}`}>
                {b.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Instant Trend Analysis Badge */}
      <div className="flex flex-col justify-center border-l border-slate-200 pl-2 shrink-0">
        <span className="text-[8.5px] font-mono font-bold text-slate-400 uppercase tracking-tight">
          แนวโน้ม {numYears} ปี
        </span>
        <div className={`mt-0.5 inline-flex items-center gap-1 text-[10.5px] font-bold px-1.5 py-0.5 rounded-md border ${
          trendType === 'up' 
            ? 'bg-rose-50 text-rose-700 border-rose-200' 
            : trendType === 'down' 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
              : 'bg-slate-100 text-slate-700 border-slate-200'
        }`}>
          {trendType === 'up' && (
            <>
              <TrendingUp className="w-3 h-3 text-rose-600 shrink-0" />
              <span>+{percentChange}% (เพิ่มขึ้น)</span>
            </>
          )}
          {trendType === 'down' && (
            <>
              <TrendingDown className="w-3 h-3 text-emerald-600 shrink-0" />
              <span>{percentChange}% (ลดลง)</span>
            </>
          )}
          {trendType === 'flat' && (
            <>
              <Minus className="w-3 h-3 text-slate-500 shrink-0" />
              <span>0% (คงที่)</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
