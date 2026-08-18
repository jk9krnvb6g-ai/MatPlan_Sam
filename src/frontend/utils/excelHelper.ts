import * as XLSX from 'xlsx';
import { RequestItem, Department, WorkGroup, CategoryId, MaterialItem } from '../types';
import { CATALOG, CATEGORY_LABELS, CATEGORY_ORDER, deptName, getCategoryLabel, guessPrice, guessUnit } from '../data/catalog';

// Helper to calculate unit price
const calcUnitPrice = (r: RequestItem, itemPrices: Record<string, number>) => {
  return r.unitPrice ?? itemPrices[r.itemName] ?? guessPrice(r.itemName, r.unit);
};

// Helper for status label in Thai
const getStatusThai = (status: string) => {
  switch (status) {
    case 'approved': return 'อนุมัติแล้ว (ผ่านการอนุมัติ)';
    case 'pending_head': return 'รอหัวหน้าฝ่ายอนุมัติ';
    case 'pending_proc': return 'ส่งฝ่ายพัสดุตรวจสอบ';
    case 'pending_proc_head': return 'รอหัวหน้าพัสดุอนุมัติ';
    case 'pending_exec': return 'รอผู้บริหารลงนามอนุมัติ';
    case 'rejected': return 'ตีกลับแก้ไข';
    default: return status;
  }
};

/**
 * 1. Export Full Procurement & Budget Plan to Multi-sheet Excel
 */
export function exportProcurementPlanExcel(
  requests: RequestItem[],
  itemPrices: Record<string, number>,
  departments: Department[],
  workGroups: WorkGroup[],
  fiscalYear: string
) {
  const wb = XLSX.utils.book_new();

  const deptMap = new Map<string, Department>();
  departments.forEach(d => deptMap.set(d.id, d));

  const wgMap = new Map<string, WorkGroup>();
  workGroups.forEach(w => wgMap.set(w.id, w));

  // --- SHEET 1: Work Group Summary ---
  const wgSummary = workGroups.map((wg, idx) => {
    const deptsInGroup = departments.filter(d => d.workGroupId === wg.id);
    const deptIds = new Set(deptsInGroup.map(d => d.id));
    
    const reqsInGroup = requests.filter(r => deptIds.has(r.deptId));
    const approvedInGroup = reqsInGroup.filter(r => r.status === 'approved');

    const totalBudgetRequested = reqsInGroup.reduce((sum, r) => sum + (r.qtyRequested * calcUnitPrice(r, itemPrices)), 0);
    const totalBudgetApproved = approvedInGroup.reduce((sum, r) => sum + (r.qtyRequested * calcUnitPrice(r, itemPrices)), 0);

    return {
      'ลำดับ': idx + 1,
      'รหัสกลุ่มงาน': wg.code || wg.id,
      'ชื่อกลุ่มงาน': wg.name,
      'จำนวนฝ่าย/แผนก': deptsInGroup.length,
      'จำนวนรายการที่ขอ': reqsInGroup.length,
      'จำนวนรายการอนุมัติ': approvedInGroup.length,
      'วงเงินรวมที่ขอ (บาท)': totalBudgetRequested,
      'วงเงินอนุมัติแล้ว (บาท)': totalBudgetApproved
    };
  });

  const totalReqAll = requests.reduce((sum, r) => sum + (r.qtyRequested * calcUnitPrice(r, itemPrices)), 0);
  const totalAppAll = requests.filter(r => r.status === 'approved').reduce((sum, r) => sum + (r.qtyRequested * calcUnitPrice(r, itemPrices)), 0);

  wgSummary.push({
    'ลำดับ': 'รวมทั้งหมด' as any,
    'รหัสกลุ่มงาน': '-',
    'ชื่อกลุ่มงาน': 'ทุกกลุ่มงานภาพรวมโรงพยาบาล',
    'จำนวนฝ่าย/แผนก': departments.length,
    'จำนวนรายการที่ขอ': requests.length,
    'จำนวนรายการอนุมัติ': requests.filter(r => r.status === 'approved').length,
    'วงเงินรวมที่ขอ (บาท)': totalReqAll,
    'วงเงินอนุมัติแล้ว (บาท)': totalAppAll
  });

  const wsWg = XLSX.utils.json_to_sheet(wgSummary);
  wsWg['!cols'] = [
    { wch: 8 },
    { wch: 15 },
    { wch: 35 },
    { wch: 16 },
    { wch: 18 },
    { wch: 20 },
    { wch: 24 },
    { wch: 24 }
  ];
  XLSX.utils.book_append_sheet(wb, wsWg, 'สรุปแยกตามกลุ่มงาน');

  // --- SHEET 2: Department Summary ---
  const deptSummary = departments.map((d, idx) => {
    const wg = d.workGroupId ? wgMap.get(d.workGroupId) : null;
    const reqsInDept = requests.filter(r => r.deptId === d.id);
    const approvedInDept = reqsInDept.filter(r => r.status === 'approved');

    const totalBudgetRequested = reqsInDept.reduce((sum, r) => sum + (r.qtyRequested * calcUnitPrice(r, itemPrices)), 0);
    const totalBudgetApproved = approvedInDept.reduce((sum, r) => sum + (r.qtyRequested * calcUnitPrice(r, itemPrices)), 0);

    return {
      'ลำดับ': idx + 1,
      'รหัสฝ่าย': d.id,
      'ชื่อฝ่าย/แผนก': d.name,
      'กลุ่มงานที่สังกัด': wg ? wg.name : 'ส่วนกลาง/ไม่ระบุ',
      'หมวดหมู่หลัก': getCategoryLabel(d.category),
      'จำนวนรายการที่ขอ': reqsInDept.length,
      'จำนวนรายการอนุมัติ': approvedInDept.length,
      'วงเงินรวมที่ขอ (บาท)': totalBudgetRequested,
      'วงเงินอนุมัติแล้ว (บาท)': totalBudgetApproved
    };
  });

  const wsDept = XLSX.utils.json_to_sheet(deptSummary);
  wsDept['!cols'] = [
    { wch: 8 },
    { wch: 15 },
    { wch: 35 },
    { wch: 30 },
    { wch: 20 },
    { wch: 18 },
    { wch: 20 },
    { wch: 24 },
    { wch: 24 }
  ];
  XLSX.utils.book_append_sheet(wb, wsDept, 'สรุปแยกตามฝ่าย');

  // --- SHEET 3: Itemized Requests ---
  const requestDetails = requests.map((r, idx) => {
    const dept = deptMap.get(r.deptId);
    const wg = dept?.workGroupId ? wgMap.get(dept.workGroupId) : null;
    const unitPrice = calcUnitPrice(r, itemPrices);
    const totalReqPrice = r.qtyRequested * unitPrice;
    const baseQty = r.revisionBaseQty !== undefined ? r.revisionBaseQty : (r.qtyOriginal ?? r.qtyRequested);
    const diffQty = r.qtyRequested - baseQty;
    const diffBudget = diffQty * unitPrice;

    return {
      'ลำดับ': idx + 1,
      'รหัสคำขอ': r.id,
      'ปีงบประมาณ': r.fiscalYear || fiscalYear,
      'ฝ่าย/แผนก': dept?.name || r.deptId,
      'กลุ่มงาน': wg?.name || '-',
      'ชื่อรายการวัสดุ/ครุภัณฑ์': r.itemName,
      'จำนวนปีที่แล้ว': r.qtyLastYear,
      'แผนเดิม/ยอดเดิม': baseQty,
      'จำนวนที่ปรับปรุง/ขอใหม่': r.qtyRequested,
      'ผลต่าง (+/-)': diffQty > 0 ? `+${diffQty}` : `${diffQty}`,
      'หน่วยนับ': r.unit,
      'ราคาต่อหน่วย (บาท)': unitPrice,
      'มูลค่ารวมที่ขอ (บาท)': totalReqPrice,
      'มูลค่าผลต่าง (+/- บาท)': diffBudget,
      'สถานะการพิจารณา': getStatusThai(r.status),
      'ประเภทการปรับแผน': r.isRevisionItem ? (r.revisionType === 'add' ? 'เพิ่มรายการใหม่' : r.revisionType === 'modify' ? 'ปรับเปลี่ยนยอด' : r.revisionType === 'cancel' ? 'ขอยกเลิกรายการ' : 'ปรับแผนกลางปี') : 'แผนต้นปีปกติ',
      'วัตถุประสงค์/เหตุผลความจำเป็น': r.revisionReason || r.reason || '-',
      'ผู้เสนอขอ': r.requesterName || '-',
      'หน่วยงานย่อย': r.requesterSubDept || '-',
      'ข้อคิดเห็น/หมายเหตุ': r.comment || '-'
    };
  });

  const wsReqs = XLSX.utils.json_to_sheet(requestDetails);
  wsReqs['!cols'] = [
    { wch: 8 },
    { wch: 14 },
    { wch: 12 },
    { wch: 30 },
    { wch: 28 },
    { wch: 35 },
    { wch: 15 },
    { wch: 16 },
    { wch: 22 },
    { wch: 15 },
    { wch: 10 },
    { wch: 18 },
    { wch: 20 },
    { wch: 20 },
    { wch: 26 },
    { wch: 20 },
    { wch: 35 },
    { wch: 22 },
    { wch: 20 },
    { wch: 25 }
  ];
  XLSX.utils.book_append_sheet(wb, wsReqs, 'รายการคำขอทั้งหมด');

  // Generate and Download
  XLSX.writeFile(wb, `รายงานแผนจัดหาวัสดุครุภัณฑ์_ปี${fiscalYear}_${Date.now().toString().slice(-6)}.xlsx`);
}

/**
 * 2. Export Central Material Catalog to Excel
 */
export function exportMaterialsCatalogExcel(
  customItems: Record<string, string[]>,
  itemPrices: Record<string, number>,
  materialActive: Record<string, boolean>
) {
  const wb = XLSX.utils.book_new();

  const allItems: {
    'ลำดับ': number;
    'หมวดหมู่': string;
    'รหัสหมวดหมู่': string;
    'ชื่อรายการวัสดุ/ครุภัณฑ์': string;
    'หน่วยนับ': string;
    'ราคาต่อหน่วย (บาท)': number;
    'สถานะการใช้งาน': string;
  }[] = [];

  let count = 1;
  CATEGORY_ORDER.forEach(cat => {
    const defaultList = CATALOG[cat] || [];
    const customList = customItems[cat] || [];
    const combined = Array.from(new Set([...defaultList, ...customList]));

    combined.forEach(name => {
      const unit = guessUnit(name);
      const price = itemPrices[name] !== undefined ? itemPrices[name] : guessPrice(name, unit);
      const active = materialActive[name] !== false;

      allItems.push({
        'ลำดับ': count++,
        'หมวดหมู่': CATEGORY_LABELS[cat] || cat,
        'รหัสหมวดหมู่': cat,
        'ชื่อรายการวัสดุ/ครุภัณฑ์': name,
        'หน่วยนับ': unit,
        'ราคาต่อหน่วย (บาท)': price,
        'สถานะการใช้งาน': active ? 'ใช้งาน' : 'ปิดใช้งาน'
      });
    });
  });

  const ws = XLSX.utils.json_to_sheet(allItems);
  ws['!cols'] = [
    { wch: 8 },
    { wch: 22 },
    { wch: 15 },
    { wch: 40 },
    { wch: 12 },
    { wch: 18 },
    { wch: 15 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'แคตตาล็อกรายการวัสดุ');
  XLSX.writeFile(wb, `แคตตาล็อกรายการวัสดุกลาง_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * 3. Download Sample Template for Material Excel Import
 */
export function downloadMaterialSampleTemplateExcel() {
  const wb = XLSX.utils.book_new();

  const templateData = [
    {
      'หมวดหมู่': 'วัสดุสำนักงาน',
      'รหัสหมวดหมู่ (office/med/comp/house/vehicle/other)': 'office',
      'ชื่อรายการวัสดุ/ครุภัณฑ์': 'กระดาษถ่ายเอกสาร A4 80 แกรม (ตัวอย่าง)',
      'หน่วยนับ': 'รีม',
      'ราคาต่อหน่วย (บาท)': 135,
      'สถานะการใช้งาน (ใช้งาน/ปิดใช้งาน)': 'ใช้งาน'
    },
    {
      'หมวดหมู่': 'วัสดุการแพทย์',
      'รหัสหมวดหมู่ (office/med/comp/house/vehicle/other)': 'med',
      'ชื่อรายการวัสดุ/ครุภัณฑ์': 'ถุงมือตรวจโรค ชนิดไม่มีแป้ง ไซส์ M (ตัวอย่าง)',
      'หน่วยนับ': 'กล่อง',
      'ราคาต่อหน่วย (บาท)': 180,
      'สถานะการใช้งาน (ใช้งาน/ปิดใช้งาน)': 'ใช้งาน'
    },
    {
      'หมวดหมู่': 'วัสดุคอมพิวเตอร์',
      'รหัสหมวดหมู่ (office/med/comp/house/vehicle/other)': 'comp',
      'ชื่อรายการวัสดุ/ครุภัณฑ์': 'ตลับหมึกพิมพ์เลเซอร์ HP 85A (ตัวอย่าง)',
      'หน่วยนับ': 'ตลับ',
      'ราคาต่อหน่วย (บาท)': 2150,
      'สถานะการใช้งาน (ใช้งาน/ปิดใช้งาน)': 'ใช้งาน'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);
  ws['!cols'] = [
    { wch: 20 },
    { wch: 30 },
    { wch: 45 },
    { wch: 12 },
    { wch: 20 },
    { wch: 22 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'แบบฟอร์มนำเข้าวัสดุ');
  XLSX.writeFile(wb, 'แบบฟอร์มตัวอย่างนำเข้าแคตตาล็อกวัสดุ.xlsx');
}

/**
 * 4. Parse Uploaded Excel file for Material Catalog
 */
export async function parseMaterialExcel(file: File): Promise<{
  success: boolean;
  items: MaterialItem[];
  errors: string[];
}> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          return resolve({
            success: false,
            items: [],
            errors: ['ไฟล์ว่างเปล่า ไม่พบรายการข้อมูลในตาราง Excel']
          });
        }

        const items: MaterialItem[] = [];
        const errors: string[] = [];

        rawJson.forEach((row, idx) => {
          const rowNum = idx + 2; // header is row 1

          // Extract fields flexibly
          const rawName = row['ชื่อรายการวัสดุ/ครุภัณฑ์'] || row['ชื่อรายการ'] || row['รายการ'] || row['name'] || row['Item Name'];
          const rawCategory = row['รหัสหมวดหมู่ (office/med/comp/house/vehicle/other)'] || row['รหัสหมวดหมู่'] || row['หมวดหมู่'] || row['category'] || row['Category'];
          const rawUnit = row['หน่วยนับ'] || row['หน่วย'] || row['unit'] || row['Unit'] || 'ชิ้น';
          const rawPrice = row['ราคาต่อหน่วย (บาท)'] || row['ราคาต่อหน่วย'] || row['ราคา'] || row['price'] || row['Price'] || 0;
          const rawActive = row['สถานะการใช้งาน (ใช้งาน/ปิดใช้งาน)'] || row['สถานะการใช้งาน'] || row['สถานะ'] || row['active'];

          if (!rawName || String(rawName).trim() === '') {
            errors.push(`แถวที่ ${rowNum}: ไม่มีชื่อรายการวัสดุ`);
            return;
          }

          const cleanName = String(rawName).trim();
          
          // Map category code
          let catKey: CategoryId = 'office';
          const catStr = String(rawCategory).toLowerCase().trim();
          if (catStr === 'med' || catStr.includes('แพทย์')) catKey = 'med';
          else if (catStr === 'comp' || catStr.includes('คอม')) catKey = 'comp';
          else if (catStr === 'house' || catStr.includes('บ้าน')) catKey = 'house';
          else if (catStr === 'vehicle' || catStr.includes('ยาน')) catKey = 'vehicle';
          else if (catStr === 'office' || catStr.includes('สำนัก')) catKey = 'office';
          else catKey = 'other';

          const priceNum = parseFloat(String(rawPrice).replace(/[^0-9.]/g, '')) || 0;
          const isActive = String(rawActive).includes('ปิด') ? false : true;

          items.push({
            name: cleanName,
            category: catKey,
            unit: String(rawUnit).trim() || 'ชิ้น',
            price: priceNum,
            active: isActive,
            isCustom: true
          });
        });

        if (items.length === 0) {
          return resolve({
            success: false,
            items: [],
            errors: errors.length > 0 ? errors : ['ไม่สามารถอ่านข้อมูลรายการวัสดุจากไฟล์ได้ กรุณาตรวจสอบหัวคอลัมน์']
          });
        }

        resolve({
          success: true,
          items,
          errors
        });
      } catch (err: any) {
        resolve({
          success: false,
          items: [],
          errors: [`เกิดข้อผิดพลาดในการประมวลผลไฟล์ Excel: ${err.message || String(err)}`]
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        items: [],
        errors: ['ไม่สามารถอ่านไฟล์ได้']
      });
    };

    reader.readAsArrayBuffer(file);
  });
}
