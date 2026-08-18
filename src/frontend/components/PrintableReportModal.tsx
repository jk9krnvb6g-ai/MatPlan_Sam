import React from 'react';
import { RequestItem, Department, WorkGroup } from '../types';
import { deptName, fmtBaht, guessPrice } from '../data/catalog';
import { Printer, X, FileSpreadsheet, Download } from 'lucide-react';
import { exportProcurementPlanExcel } from '../utils/excelHelper';

interface PrintableReportModalProps {
  requests: RequestItem[];
  itemPrices: Record<string, number>;
  departments?: Department[];
  workGroups?: WorkGroup[];
  fiscalYear?: string;
  onClose: () => void;
}

export const PrintableReportModal: React.FC<PrintableReportModalProps> = ({
  requests,
  itemPrices,
  departments = [],
  workGroups = [],
  fiscalYear = '2569',
  onClose
}) => {
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const [showSandboxWarning, setShowSandboxWarning] = React.useState(false);

  const isIframe = React.useMemo(() => {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  }, []);

  const calcUnitPrice = (r: RequestItem) => r.unitPrice ?? itemPrices[r.itemName] ?? guessPrice(r.itemName, r.unit);
  const calcBudget = (r: RequestItem) => r.qtyRequested * calcUnitPrice(r);

  const totalApprovedBudget = approvedRequests.reduce((sum, r) => sum + calcBudget(r), 0);

  const handlePrint = () => {
    if (isIframe) {
      setShowSandboxWarning(true);
      return;
    }
    window.print();
  };

  const handleExportExcel = () => {
    exportProcurementPlanExcel(
      requests,
      itemPrices,
      departments,
      workGroups,
      fiscalYear
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-300 rounded-3xl shadow-2xl max-w-4xl w-full p-8 space-y-6 max-h-[90vh] overflow-y-auto text-slate-900">
        {/* Top Control Bar (Hidden on print) */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden flex-wrap gap-2">
          <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-teal-700" />
            ตัวอย่างเอกสารรายงานสรุปทางการ (Official Survey & Budget Report)
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExportExcel}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4" />
              ส่งออก Excel (.xlsx)
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              สั่งพิมพ์ / บันทึกเป็น PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PRINTABLE DOCUMENT AREA */}
        <div className="space-y-6 font-serif print:p-0">
          {/* Header */}
          <div className="text-center space-y-1.5 pb-2 border-b border-slate-200">
            <div className="text-xs font-sans text-indigo-700 font-bold tracking-wide">
              โรงพยาบาลสามชุก สำนักงานสาธารณสุขจังหวัดสุพรรณบุรี
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 font-sans">
              แบบฟอร์มเสนอแผนความต้องการจัดหาวัสดุ ประจำปีงบประมาณ พ.ศ. {fiscalYear}
            </h1>
            <p className="text-xs text-slate-600 font-sans">
              เอกสารประกอบการจัดสรรงบประมาณและการจัดซื้อจัดจ้างตามระเบียบกระทรวงการคลัง
            </p>
          </div>

          {/* Details Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-sans p-3.5 bg-slate-50 border border-slate-200 rounded-2xl shadow-inner">
            <div><strong className="text-slate-500 block text-[10px] uppercase">หน่วยงานรับผิดชอบ</strong> ฝ่ายพัสดุและบริหารทรัพย์สิน</div>
            <div><strong className="text-slate-500 block text-[10px] uppercase">ปีงบประมาณ</strong> พ.ศ. {fiscalYear}</div>
            <div><strong className="text-slate-500 block text-[10px] uppercase">จำนวนรายการอนุมัติ</strong> {approvedRequests.length} รายการ</div>
            <div><strong className="text-slate-500 block text-[10px] uppercase">วงเงินงบประมาณรวม</strong> <span className="font-mono font-bold text-indigo-900">{fmtBaht(totalApprovedBudget)} บาท</span></div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-300 rounded-lg">
            <table className="w-full text-base text-left border-collapse font-sans">
              <thead className="bg-slate-100 font-bold border-b border-slate-300 uppercase text-xs">
                <tr>
                  <th className="p-2 border-r border-slate-200 text-center w-10">ลำดับ</th>
                  <th className="p-2 border-r border-slate-200">รายการวัสดุ</th>
                  <th className="p-2 border-r border-slate-200">หน่วยงานที่ขอ</th>
                  <th className="p-2 border-r border-slate-200 text-right">แผนเดิม</th>
                  <th className="p-2 border-r border-slate-200 text-right">แผนปรับปรุง</th>
                  <th className="p-2 border-r border-slate-200 text-center">ผลต่าง (+/-)</th>
                  <th className="p-2 border-r border-slate-200 text-right">ราคา/หน่วย</th>
                  <th className="p-2 border-r border-slate-200 text-right">รวมเงิน (บาท)</th>
                  <th className="p-2">เหตุผลความจำเป็น</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {approvedRequests.map((r, idx) => {
                  const price = calcUnitPrice(r);
                  const lineBudget = calcBudget(r);
                  const baseQty = r.revisionBaseQty !== undefined ? r.revisionBaseQty : (r.qtyOriginal ?? r.qtyRequested);
                  const diffQty = r.qtyRequested - baseQty;

                  return (
                    <tr key={r.id}>
                      <td className="p-2 border-r border-slate-200 text-center font-mono text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="p-2 border-r border-slate-200 font-bold text-slate-800">
                        {r.itemName}
                        {r.isRevisionItem && (
                          <span className="ml-1.5 inline-block text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-medium">
                            ปรับแผน
                          </span>
                        )}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-slate-600">
                        {deptName(r.deptId)}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-right font-mono text-slate-500">
                        {baseQty} {r.unit}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-right font-mono font-bold text-teal-900">
                        {r.qtyRequested} {r.unit}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-center font-mono font-bold">
                        {diffQty > 0 ? (
                          <span className="text-emerald-600">+{diffQty}</span>
                        ) : diffQty < 0 ? (
                          <span className="text-rose-600">{diffQty}</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-right font-mono text-slate-700">
                        {fmtBaht(price)}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-right font-mono font-bold text-slate-900">
                        {fmtBaht(lineBudget)}
                      </td>
                      <td className="p-2 text-slate-600 text-[11px] max-w-xs truncate">
                        {r.revisionReason || r.reason || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t border-slate-300">
                <tr>
                  <td colSpan={7} className="p-2 text-right pr-4 text-xs">รวมงบประมาณทั้งสิ้น</td>
                  <td className="p-2 text-right font-mono text-sm text-teal-900">
                    {fmtBaht(totalApprovedBudget)}
                  </td>
                  <td className="p-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Official 4-Block Government Signature Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-10 text-xs font-sans border-t border-slate-300">
            
            {/* Block 1: ผู้เสนอขอรับการจัดสรร (เจ้าหน้าที่ผู้ขอ) */}
            <div className="border border-slate-300 rounded-2xl p-4 bg-slate-50/70 text-center flex flex-col justify-between space-y-4">
              <div className="font-bold text-slate-800 border-b border-slate-200 pb-2">
                1. ผู้เสนอขอรับการจัดสรร
              </div>
              <div className="space-y-4 py-2">
                <div className="h-8 border-b border-dashed border-slate-400 w-3/4 mx-auto" />
                <div>ลงชื่อ......................................................</div>
                <div>(......................................................)</div>
                <div>ตำแหน่ง เจ้าหน้าที่ผู้รับผิดชอบ</div>
                <div>วันที่ ......./......./............</div>
              </div>
            </div>

            {/* Block 2: หัวหน้ากลุ่มงาน / หัวหน้าฝ่าย */}
            <div className="border border-slate-300 rounded-2xl p-4 bg-slate-50/70 text-center flex flex-col justify-between space-y-4">
              <div className="font-bold text-slate-800 border-b border-slate-200 pb-2">
                2. หัวหน้าฝ่าย / กลุ่มงาน
              </div>
              <div className="text-[11px] text-slate-700 flex justify-center gap-3">
                <label className="flex items-center gap-1">
                  <span className="w-3.5 h-3.5 border border-slate-400 inline-block rounded-xs"></span>
                  <span>เห็นชอบ</span>
                </label>
                <label className="flex items-center gap-1">
                  <span className="w-3.5 h-3.5 border border-slate-400 inline-block rounded-xs"></span>
                  <span>ปรับลด</span>
                </label>
              </div>
              <div className="space-y-4 py-2">
                <div className="h-8 border-b border-dashed border-slate-400 w-3/4 mx-auto" />
                <div>ลงชื่อ......................................................</div>
                <div>(......................................................)</div>
                <div>ตำแหน่ง หัวหน้าฝ่าย/กลุ่มงาน</div>
                <div>วันที่ ......./......./............</div>
              </div>
            </div>

            {/* Block 3: หัวหน้าฝ่ายพัสดุและบริหารทรัพย์สิน */}
            <div className="border border-slate-300 rounded-2xl p-4 bg-slate-50/70 text-center flex flex-col justify-between space-y-4">
              <div className="font-bold text-slate-800 border-b border-slate-200 pb-2">
                3. หัวหน้าฝ่ายพัสดุฯ
              </div>
              <div className="text-[11px] text-slate-700 flex justify-center gap-3">
                <label className="flex items-center gap-1">
                  <span className="w-3.5 h-3.5 border border-slate-400 inline-block rounded-xs"></span>
                  <span>ตรวจสอบแล้ว</span>
                </label>
                <label className="flex items-center gap-1">
                  <span className="w-3.5 h-3.5 border border-slate-400 inline-block rounded-xs"></span>
                  <span>มีงบประมาณ</span>
                </label>
              </div>
              <div className="space-y-4 py-2">
                <div className="h-8 border-b border-dashed border-slate-400 w-3/4 mx-auto" />
                <div>ลงชื่อ......................................................</div>
                <div>(......................................................)</div>
                <div>ตำแหน่ง หัวหน้าฝ่ายพัสดุและบริหารทรัพย์สิน</div>
                <div>วันที่ ......./......./............</div>
              </div>
            </div>

            {/* Block 4: ผู้อำนวยการโรงพยาบาลสามชุก */}
            <div className="border border-slate-300 rounded-2xl p-4 bg-slate-50/70 text-center flex flex-col justify-between space-y-4">
              <div className="font-bold text-slate-800 border-b border-slate-200 pb-2">
                4. ผู้อนุมัติ (ผอ.รพ.สามชุก)
              </div>
              <div className="text-[11px] text-slate-700 flex justify-center gap-3">
                <label className="flex items-center gap-1">
                  <span className="w-3.5 h-3.5 border border-slate-400 inline-block rounded-xs"></span>
                  <span>อนุมัติ</span>
                </label>
                <label className="flex items-center gap-1">
                  <span className="w-3.5 h-3.5 border border-slate-400 inline-block rounded-xs"></span>
                  <span>ไม่อนุมัติ</span>
                </label>
              </div>
              <div className="space-y-4 py-2">
                <div className="h-8 border-b border-dashed border-slate-400 w-3/4 mx-auto" />
                <div>ลงชื่อ......................................................</div>
                <div>(......................................................)</div>
                <div>ผู้อำนวยการโรงพยาบาลสามชุก</div>
                <div>วันที่ ......./......./............</div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {showSandboxWarning && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-slate-900 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-amber-600 font-bold text-base">
              <Printer className="w-5 h-5" />
              <span>ไม่สามารถพิมพ์ในโหมดพรีวิวได้</span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed font-sans">
              เนื่องจากระบบรักษาความปลอดภัยของเบราว์เซอร์ในหน้าต่างพรีวิว (iFrame) ของ AI Studio มีการบล็อกการทำงานของคำสั่งพิมพ์ภายนอก
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-800 leading-relaxed font-sans">
              <strong>คำแนะนำในการดาวน์โหลดหรือพิมพ์ PDF:</strong><br />
              กรุณาคลิกปุ่ม <strong>"เปิดในหน้าต่างใหม่" (Open in New Tab ↗)</strong> ที่แถบควบคุมมุมบนขวาของหน้าจอพรีวิวนี้ เพื่อเข้าสู่ระบบในโหมดเต็มหน้าจอ จากนั้นจะสามารถกดสั่งพิมพ์หรือบันทึกไฟล์ PDF ได้ทันทีอย่างราบรื่น
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowSandboxWarning(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer font-sans"
              >
                รับทราบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
