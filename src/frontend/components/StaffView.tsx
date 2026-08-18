import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { CategoryId, RequestItem, User, Department, WorkGroup, DepartmentRevisionPermission, SubmissionSchedule } from '../types';
import { CategoryBadge } from './CategoryBadge';
import { calculateSpike, checkSubmissionOpen } from '../utils/workflowHelper';
import { 
  CATALOG, 
  ALL_ITEMS,
  CATEGORY_LABELS, 
  CATEGORY_ORDER, 
  DEPARTMENTS, 
  deptById, 
  guessUnit, 
  historyFor, 
  STATUS_LABEL,
  getItemCategory,
  getItemGpscCode,
  getItemStockInfo
} from '../data/catalog';
import { MiniBarsChart } from './MiniBarsChart';
import { PaginationBar } from './PaginationBar';
import { TableControlPanel, SortOption } from './TableControlPanel';
import { AuditTrailModal } from './AuditTrailModal';
import { sortItems } from '../utils/sortHelper';
import { Plus, Info, Send, AlertCircle, FileText, ArrowUpDown, Edit3, CheckCircle2, TrendingDown, TrendingUp, Minus, UserCheck, PackageCheck, Crown, ArrowRightLeft, Clock, Filter, Search, ShieldCheck, Sparkles, Unlock, Lock, RefreshCw, XCircle, PlusCircle, Zap, History, SlidersHorizontal } from 'lucide-react';

interface StaffViewProps {
  currentUser: User;
  requests: RequestItem[];
  customItems: Record<string, string[]>;
  fiscalYear: string;
  revisionPermissions?: Record<string, DepartmentRevisionPermission>;
  onSubmitRequests: (deptId: string, items: { itemName: string; qtyRequested: number }[], reason: string) => void;
  onSubmitRevisionPlan?: (deptId: string, items: { itemName: string; qtyRequested: number; revisionType: 'add' | 'modify' | 'cancel'; revisionBaseQty?: number; revisionReason?: string }[], reason: string) => void;
  onAddCustomItem: (category: CategoryId, name: string, unit: string) => void;
  isPlanFrozen: boolean;
  onRequestConfirm: (opts: { title: string; message: string; confirmText?: string; variant?: 'primary' | 'danger' | 'warning'; onConfirm: () => void }) => void;
  onToastAlert: (msg: string, type?: 'success' | 'error' | 'info') => void;
  schedule?: SubmissionSchedule;
  departments: Department[];
  workGroups: WorkGroup[];
}

export const StaffView: React.FC<StaffViewProps> = ({
  currentUser,
  requests,
  customItems,
  fiscalYear,
  revisionPermissions = {},
  schedule,
  onSubmitRequests,
  onSubmitRevisionPlan,
  onAddCustomItem,
  isPlanFrozen,
  onRequestConfirm,
  onToastAlert,
  departments,
  workGroups
}) => {
  const isAdmin = currentUser.role === 'admin';
  const [activeTab, setActiveTab] = useState<'request' | 'rejected' | 'submitted' | 'recent' | 'revision'>('request');
  const [activeSheetCat, setActiveSheetCat] = useState<CategoryId>('office');

  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all');
  const [selectedFiscalYearFilter, setSelectedFiscalYearFilter] = useState<string>('all');
  const [selectedDeptId, setSelectedDeptId] = useState<string>(currentUser.deptId || 'thurakan');
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'adequate' | 'excess'>('all');
  const [selectedAuditItem, setSelectedAuditItem] = useState<RequestItem | null>(null);
  const [sortField, setSortField] = useState<'name' | 'lastYear' | 'requested' | 'diff'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Revision state
  const isDeptUnlockedForRevision = Boolean(revisionPermissions[selectedDeptId]?.isUnlocked);
  const currentDeptPerm = revisionPermissions[selectedDeptId];
  const [revisionInputs, setRevisionInputs] = useState<Record<string, { qty: number; reason: string; type: 'add' | 'modify' | 'cancel' }>>({});
  const [overallRevisionReason, setOverallRevisionReason] = useState(`ขอปรับปรุงแผนงบประมาณรอบ 6 เดือน ประจำปีงบประมาณ ${fiscalYear}`);

  const fiscalYearOptions = useMemo(() => {
    const yearsInRequests = requests.map(r => r.fiscalYear).filter(Boolean) as string[];
    const uniqueYears = Array.from(new Set([fiscalYear, ...yearsInRequests])).sort((a, b) => b.localeCompare(a));
    return ['all', ...uniqueYears];
  }, [fiscalYear, requests]);

  const [newItemName, setNewItemName] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('ชิ้น');
  const [reason, setReason] = useState(`ของเดิมไม่เพียงพอต่อการใช้งานตลอดปีงบประมาณ ${fiscalYear}`);

  const [qtyInputs, setQtyInputs] = useState<Record<string, number>>({});
  const [pageSize, setPageSize] = useState<number | 'all'>(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [rejectedPageSize, setRejectedPageSize] = useState<number | 'all'>(10);
  const [rejectedCurrentPage, setRejectedCurrentPage] = useState(1);
  const [rejectedFilter, setRejectedFilter] = useState<'all' | 'head' | 'proc' | 'prochead' | 'exec'>('all');

  const [submittedPageSize, setSubmittedPageSize] = useState<number | 'all'>(10);
  const [submittedCurrentPage, setSubmittedCurrentPage] = useState(1);
  const [submittedStatusFilter, setSubmittedStatusFilter] = useState<'all' | 'pending_head' | 'pending_proc' | 'pending_exec' | 'approved'>('all');

  // Sorting state for rejected table
  const [rejectedSortField, setRejectedSortField] = useState<'name' | 'category' | 'rejectedBy' | 'origQty' | 'newQty' | 'comment'>('name');
  const [rejectedSortOrder, setRejectedSortOrder] = useState<'asc' | 'desc'>('asc');

  // Sorting state for submitted table
  const [submittedSortField, setSubmittedSortField] = useState<'name' | 'category' | 'lastYear' | 'origQty' | 'newQty' | 'status'>('name');
  const [submittedSortOrder, setSubmittedSortOrder] = useState<'asc' | 'desc'>('asc');

  const currentDept = deptById(selectedDeptId);

  // Available catalog items for category including custom ones
  const rawItems = useMemo(() => {
    if (selectedCategory === 'all') {
      const allCustom = Object.values(customItems).flat();
      return Array.from(new Set([...ALL_ITEMS, ...allCustom]));
    }
    const customForCat = customItems[selectedCategory] || [];
    return Array.from(new Set([...(CATALOG[selectedCategory] || []), ...customForCat]));
  }, [selectedCategory, customItems]);
  
  // Search filter for catalog items (including GPSC & stock status)
  const filteredRaw = useMemo(() => {
    return rawItems.filter(item => {
      const q = searchTerm.toLowerCase().trim();
      const gpsc = getItemGpscCode(item).toLowerCase();
      const matchSearch = q === '' || item.toLowerCase().includes(q) || gpsc.includes(q);
      if (!matchSearch) return false;

      if (stockFilter !== 'all') {
        const { stockStatus } = getItemStockInfo(item);
        if (stockStatus !== stockFilter) return false;
      }
      return true;
    });
  }, [rawItems, searchTerm, stockFilter]);
  
  const handleHeaderSort = (field: 'name' | 'lastYear' | 'requested' | 'diff') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Sort catalog items
  const sortedItems = [...filteredRaw].sort((a, b) => {
    let res = 0;
    if (sortField === 'name') {
      res = a.localeCompare(b, 'th');
    } else if (sortField === 'lastYear') {
      res = (historyFor(a)[2568] || 0) - (historyFor(b)[2568] || 0);
    } else if (sortField === 'requested') {
      res = (qtyInputs[a] || 0) - (qtyInputs[b] || 0);
    } else if (sortField === 'diff') {
      const diffA = (qtyInputs[a] || 0) - (historyFor(a)[2568] || 0);
      const diffB = (qtyInputs[b] || 0) - (historyFor(b)[2568] || 0);
      res = diffA - diffB;
    }
    return sortOrder === 'asc' ? res : -res;
  });

  // Quick fill preset helper
  const handleQuickFill = (mode: 'lastYear100' | 'lastYearPlus5' | 'lastYearPlus10' | 'avg3Years' | 'clear') => {
    if (isPlanFrozen) {
      onToastAlert('ระบบถูกปิดรับคำขอแล้ว ไม่สามารถแก้ไขได้', 'error');
      return;
    }
    const newInputs = { ...qtyInputs };
    if (mode === 'clear') {
      sortedItems.forEach(name => {
        delete newInputs[name];
      });
      setQtyInputs(newInputs);
      onToastAlert('ล้างค่าจำนวนที่กรอกทั้งหมดเรียบร้อยแล้ว', 'info');
      return;
    }

    let count = 0;
    sortedItems.forEach(name => {
      const hist = historyFor(name);
      const last = hist[2568] || 0;
      let val = 0;
      if (mode === 'lastYear100') {
        val = last;
      } else if (mode === 'lastYearPlus5') {
        val = Math.round(last * 1.05);
      } else if (mode === 'lastYearPlus10') {
        val = Math.round(last * 1.10);
      } else if (mode === 'avg3Years') {
        const avg = ((hist[2566] || 0) + (hist[2567] || 0) + (hist[2568] || 0)) / 3;
        val = Math.round(avg);
      }
      if (val > 0) {
        newInputs[name] = val;
        count++;
      }
    });

    setQtyInputs(newInputs);
    const modeLabel = 
      mode === 'lastYear100' ? 'ดึงยอดใช้จริงปี 2568 (100%)' :
      mode === 'lastYearPlus5' ? 'ดึงยอดปี 2568 + 5%' :
      mode === 'lastYearPlus10' ? 'ดึงยอดปี 2568 + 10%' : 'ดึงค่าเฉลี่ย 3 ปีย้อนหลัง';
    onToastAlert(`ปรับปรุงค่าตั้งต้นสำเร็จ (${modeLabel}) จำนวน ${count} รายการ`, 'success');
  };

  // Department requests filter (Filtered by selected category, fiscal year & search term as well)
  const deptRequests = useMemo(() => {
    return requests.filter(r => {
      if (r.deptId !== selectedDeptId) return false;

      // Fiscal Year filter
      if (selectedFiscalYearFilter !== 'all') {
        const reqYear = r.fiscalYear || fiscalYear;
        if (reqYear !== selectedFiscalYearFilter) return false;
      }

      // Category filter
      if (selectedCategory !== 'all') {
        const itemCat = getItemCategory(r.itemName);
        if (itemCat !== selectedCategory) return false;
      }

      // Search term filter
      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase().trim();
        if (!r.itemName.toLowerCase().includes(q)) return false;
      }

      return true;
    });
  }, [requests, selectedDeptId, selectedFiscalYearFilter, fiscalYear, selectedCategory, searchTerm]);

  const rejectedRequests = useMemo(() => deptRequests.filter(r => r.status === 'rejected'), [deptRequests]);
  const submittedRequests = useMemo(() => deptRequests.filter(r => r.status !== 'rejected'), [deptRequests]);

  const reportSubmittedRequests = useMemo(() => {
    return requests.filter(r => {
      if (r.deptId !== selectedDeptId) return false;
      if (r.status === 'rejected') return false;

      if (selectedFiscalYearFilter !== 'all') {
        const reqYear = r.fiscalYear || fiscalYear;
        if (reqYear !== selectedFiscalYearFilter) return false;
      }
      return true;
    });
  }, [requests, selectedDeptId, selectedFiscalYearFilter, fiscalYear]);

  const reportSubmittedCats = useMemo(() => {
    const cats = new Set<CategoryId>();
    reportSubmittedRequests.forEach(r => {
      cats.add(getItemCategory(r.itemName));
    });
    return Array.from(cats).length > 0 ? Array.from(cats) : (['office', 'samnak', 'kitchen', 'electric', 'computer'] as CategoryId[]);
  }, [reportSubmittedRequests]);

  const reportFinalActiveSheetCat = useMemo(() => {
    if (reportSubmittedCats.includes(activeSheetCat)) return activeSheetCat;
    return reportSubmittedCats[0] || 'office';
  }, [reportSubmittedCats, activeSheetCat]);

  const submittedCats = useMemo(() => {
    const cats = new Set<CategoryId>();
    submittedRequests.forEach(r => {
      cats.add(getItemCategory(r.itemName));
    });
    return Array.from(cats).length > 0 ? Array.from(cats) : (['office', 'samnak', 'kitchen', 'electric', 'computer'] as CategoryId[]);
  }, [submittedRequests]);

  const finalActiveSheetCat = useMemo(() => {
    if (submittedCats.includes(activeSheetCat)) return activeSheetCat;
    return submittedCats[0] || 'office';
  }, [submittedCats, activeSheetCat]);

  const handleExportExcel = () => {
    if (reportSubmittedRequests.length === 0) {
      onToastAlert('ไม่มีรายการวัสดุที่ยื่นคำขอเพื่อส่งออก', 'error');
      return;
    }

    onRequestConfirm({
      title: 'ยืนยันการส่งออกข้อมูล Excel',
      message: 'คุณต้องการส่งออกรายงานแบบสำรวจความต้องการวัสดุจำแนกตามประเภทพัสดุนี้เป็นไฟล์ Excel (.xlsx) ใช่หรือไม่?',
      confirmText: 'ส่งออกไฟล์ Excel',
      variant: 'primary',
      onConfirm: () => {
        // Group ALL submitted requests by category for multi-sheet download
        const requestsByCat: Record<CategoryId, RequestItem[]> = {} as any;
        
        reportSubmittedRequests.forEach(r => {
          const cat = getItemCategory(r.itemName);
          if (!requestsByCat[cat]) {
            requestsByCat[cat] = [];
          }
          requestsByCat[cat].push(r);
        });

        const wb = XLSX.utils.book_new();

        Object.entries(requestsByCat).forEach(([catId, items]) => {
          const catLabel = CATEGORY_LABELS[catId as CategoryId] || catId;
          const deptNameStr = currentDept.name;
          const wgNameStr = workGroups.find(wg => wg.id === currentDept.workGroupId)?.name || 'ทั่วไป';
          
          const titleRow = [`แบบสำรวจความต้องการใช้${catLabel} ประจำปีงบประมาณ พ.ศ. ${fiscalYear} (ทั้งปี)`];
          const deptRow = [`กลุ่มงาน. ${wgNameStr}`, ``, `หน่วยงาน. ${deptNameStr}`];
          const sectionRow = [`${catLabel}`];
          const headerRow = ['ลำดับ', 'รายการ', 'หน่วย', 'จำนวน'];
          
          const rows = [
            titleRow,
            deptRow,
            sectionRow,
            headerRow,
            ...items.map((item, idx) => [
              idx + 1,
              item.itemName,
              item.unit || guessUnit(item.itemName),
              item.qtyRequested
            ])
          ];

          const ws = XLSX.utils.aoa_to_sheet(rows);

          // Add column widths
          ws['!cols'] = [
            { wch: 8 },  // ลำดับ
            { wch: 45 }, // รายการ
            { wch: 12 }, // หน่วย
            { wch: 12 }  // จำนวน
          ];

          const sheetName = catLabel.substring(0, 31);
          XLSX.utils.book_append_sheet(wb, ws, sheetName);
        });

        XLSX.writeFile(wb, `แบบสำรวจวัสดุ_${currentDept.name}_ปี_${fiscalYear}.xlsx`);
        onToastAlert('ส่งออกไฟล์ Excel เรียบร้อยแล้ว', 'success');
      }
    });
  };

  const handleExportPDF = () => {
    if (reportSubmittedRequests.length === 0) {
      onToastAlert('ไม่มีรายการวัสดุที่ยื่นคำขอสำหรับพิมพ์ PDF', 'error');
      return;
    }

    const isIframe = (() => {
      try {
        return window.self !== window.top;
      } catch (e) {
        return true;
      }
    })();

    if (isIframe) {
      onRequestConfirm({
        title: 'ไม่สามารถสั่งพิมพ์ในโหมดพรีวิวได้',
        message: 'เนื่องจากระบบรักษาความปลอดภัยในหน้าจอพรีวิว (iFrame) ของ AI Studio บล็อกการทำงานของคำสั่งพิมพ์ กรุณาคลิกปุ่ม "เปิดในหน้าต่างใหม่" (Open in New Tab ↗) ที่แถบเมนูด้านบนขวาของเบราว์เซอร์นี้ เพื่อใช้งานเต็มระบบ จากนั้นจะสามารถกดดาวน์โหลดหรือบันทึก PDF ได้ทันที',
        confirmText: 'รับทราบ',
        variant: 'warning',
        onConfirm: () => {}
      });
      return;
    }

    onRequestConfirm({
      title: 'ยืนยันการพิมพ์รายงาน PDF',
      message: 'ระบบจะเตรียมเอกสารและเปิดหน้าต่างสั่งพิมพ์ของเบราว์เซอร์สำหรับรายงานนี้ คุณต้องการดำเนินการต่อหรือไม่?',
      confirmText: 'พิมพ์ PDF',
      variant: 'primary',
      onConfirm: () => {
        window.print();
        onToastAlert('เปิดหน้าต่างสั่งพิมพ์ PDF เรียบร้อยแล้ว', 'success');
      }
    });
  };

  // Counts for rejected items filters
  const countRejectedHead = useMemo(() => rejectedRequests.filter(r => r.rejectedByRole === 'head' || (!r.rejectedByRole && r.comment.includes('หัวหน้า') && !r.comment.includes('พัสดุ'))).length, [rejectedRequests]);
  const countRejectedProc = useMemo(() => rejectedRequests.filter(r => r.rejectedByRole === 'proc' || (!r.rejectedByRole && (r.comment.includes('เจ้าหน้าที่') || r.comment.includes('ฝ่ายพัสดุ') || r.comment.includes('พัสดุตีกลับ')) && !r.comment.includes('หัวหน้าพัสดุ') && !r.comment.includes('หัวหน้าวัสดุ'))).length, [rejectedRequests]);
  const countRejectedProcHead = useMemo(() => rejectedRequests.filter(r => r.rejectedByRole === 'prochead' || (!r.rejectedByRole && (r.comment.includes('หัวหน้าพัสดุ') || r.comment.includes('หัวหน้าวัสดุ')))).length, [rejectedRequests]);
  const countRejectedExec = useMemo(() => rejectedRequests.filter(r => r.rejectedByRole === 'exec' || (!r.rejectedByRole && (r.comment.includes('ผู้บริหาร') || r.comment.includes('งบประมาณ')))).length, [rejectedRequests]);

  // Filtered rejected requests based on active filter button
  const filteredRejectedRequests = useMemo(() => {
    if (rejectedFilter === 'head') {
      return rejectedRequests.filter(r => r.rejectedByRole === 'head' || (!r.rejectedByRole && r.comment.includes('หัวหน้า') && !r.comment.includes('พัสดุ')));
    }
    if (rejectedFilter === 'proc') {
      return rejectedRequests.filter(r => r.rejectedByRole === 'proc' || (!r.rejectedByRole && (r.comment.includes('เจ้าหน้าที่') || r.comment.includes('ฝ่ายพัสดุ') || r.comment.includes('พัสดุตีกลับ')) && !r.comment.includes('หัวหน้าพัสดุ') && !r.comment.includes('หัวหน้าวัสดุ')));
    }
    if (rejectedFilter === 'prochead') {
      return rejectedRequests.filter(r => r.rejectedByRole === 'prochead' || (!r.rejectedByRole && (r.comment.includes('หัวหน้าพัสดุ') || r.comment.includes('หัวหน้าวัสดุ'))));
    }
    if (rejectedFilter === 'exec') {
      return rejectedRequests.filter(r => r.rejectedByRole === 'exec' || (!r.rejectedByRole && (r.comment.includes('ผู้บริหาร') || r.comment.includes('งบประมาณ'))));
    }
    return rejectedRequests;
  }, [rejectedRequests, rejectedFilter]);

  // Counts for submitted status filters
  const countSubmittedPendingHead = useMemo(() => submittedRequests.filter(r => r.status === 'pending_head').length, [submittedRequests]);
  const countSubmittedPendingProc = useMemo(() => submittedRequests.filter(r => r.status === 'pending_proc' || r.status === 'pending_proc_head').length, [submittedRequests]);
  const countSubmittedPendingExec = useMemo(() => submittedRequests.filter(r => r.status === 'pending_exec').length, [submittedRequests]);
  const countSubmittedApproved = useMemo(() => submittedRequests.filter(r => r.status === 'approved').length, [submittedRequests]);

  // Filtered submitted requests based on active status filter button
  const filteredSubmittedRequests = useMemo(() => {
    if (submittedStatusFilter === 'pending_head') {
      return submittedRequests.filter(r => r.status === 'pending_head');
    }
    if (submittedStatusFilter === 'pending_proc') {
      return submittedRequests.filter(r => r.status === 'pending_proc' || r.status === 'pending_proc_head');
    }
    if (submittedStatusFilter === 'pending_exec') {
      return submittedRequests.filter(r => r.status === 'pending_exec');
    }
    if (submittedStatusFilter === 'approved') {
      return submittedRequests.filter(r => r.status === 'approved');
    }
    return submittedRequests;
  }, [submittedRequests, submittedStatusFilter]);

  const handleRejectedHeaderSort = (field: 'name' | 'category' | 'rejectedBy' | 'origQty' | 'newQty' | 'comment') => {
    if (rejectedSortField === field) {
      setRejectedSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setRejectedSortField(field);
      setRejectedSortOrder('asc');
    }
  };

  const sortedRejectedRequests = useMemo(() => {
    const list = [...filteredRejectedRequests];
    list.sort((a, b) => {
      let comp = 0;
      if (rejectedSortField === 'name') {
        comp = a.itemName.localeCompare(b.itemName, 'th');
      } else if (rejectedSortField === 'category') {
        const catA = getItemCategory(a.itemName);
        const catB = getItemCategory(b.itemName);
        comp = catA.localeCompare(catB, 'th');
      } else if (rejectedSortField === 'rejectedBy') {
        const nameA = a.rejectedByName || a.rejectedByRole || '';
        const nameB = b.rejectedByName || b.rejectedByRole || '';
        comp = nameA.localeCompare(nameB, 'th');
      } else if (rejectedSortField === 'origQty') {
        const qA = a.qtyOriginal ?? a.qtyRequested;
        const qB = b.qtyOriginal ?? b.qtyRequested;
        comp = qA - qB;
      } else if (rejectedSortField === 'newQty') {
        const qA = qtyInputs[a.itemName] ?? a.qtyRequested;
        const qB = qtyInputs[b.itemName] ?? b.qtyRequested;
        comp = qA - qB;
      } else if (rejectedSortField === 'comment') {
        comp = (a.comment || '').localeCompare(b.comment || '', 'th');
      }
      return rejectedSortOrder === 'asc' ? comp : -comp;
    });
    return list;
  }, [filteredRejectedRequests, rejectedSortField, rejectedSortOrder, qtyInputs]);

  const handleSubmittedHeaderSort = (field: 'name' | 'category' | 'lastYear' | 'origQty' | 'newQty' | 'status') => {
    if (submittedSortField === field) {
      setSubmittedSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSubmittedSortField(field);
      setSubmittedSortOrder('asc');
    }
  };

  const sortedSubmittedRequests = useMemo(() => {
    const list = [...filteredSubmittedRequests];
    list.sort((a, b) => {
      let comp = 0;
      if (submittedSortField === 'name') {
        comp = a.itemName.localeCompare(b.itemName, 'th');
      } else if (submittedSortField === 'category') {
        const catA = getItemCategory(a.itemName);
        const catB = getItemCategory(b.itemName);
        comp = catA.localeCompare(catB, 'th');
      } else if (submittedSortField === 'lastYear') {
        comp = (a.qtyLastYear || 0) - (b.qtyLastYear || 0);
      } else if (submittedSortField === 'origQty') {
        const qA = a.qtyOriginal ?? a.qtyRequested;
        const qB = b.qtyOriginal ?? b.qtyRequested;
        comp = qA - qB;
      } else if (submittedSortField === 'newQty') {
        comp = a.qtyRequested - b.qtyRequested;
      } else if (submittedSortField === 'status') {
        comp = (a.status || '').localeCompare(b.status || '', 'th');
      }
      return submittedSortOrder === 'asc' ? comp : -comp;
    });
    return list;
  }, [filteredSubmittedRequests, submittedSortField, submittedSortOrder]);

  const handleQtyChange = (itemName: string, val: string) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setQtyInputs(prev => ({ ...prev, [itemName]: num }));
  };

  const handleAddCustom = () => {
    if (!newItemName.trim()) {
      onToastAlert('กรุณากรอกชื่อรายการวัสดุใหม่ (*)', 'error');
      return;
    }

    const targetCat: CategoryId = selectedCategory === 'all' ? (currentUser.category || 'office') : selectedCategory;

    onRequestConfirm({
      title: 'ยืนยันการเพิ่มรายการวัสดุใหม่',
      message: `คุณต้องการเพิ่มรายการวัสดุ '${newItemName.trim()}' (${newItemUnit}) เข้าสู่หมวด ${CATEGORY_LABELS[targetCat]} หรือไม่?`,
      confirmText: 'เพิ่มรายการ',
      variant: 'primary',
      onConfirm: () => {
        onAddCustomItem(targetCat, newItemName.trim(), newItemUnit);
        onToastAlert(`เพิ่มรายการวัสดุ '${newItemName.trim()}' สำเร็จเรียบร้อยแล้ว`, 'success');
        setNewItemName('');
      }
    });
  };

  const handleSubmit = () => {
    const scheduleCheck = checkSubmissionOpen(schedule);
    if (scheduleCheck.isClosed && !schedule?.allowLateSubmission && !isDeptUnlockedForRevision) {
      onToastAlert(`ระบบปิดรับคำขอประจำปีงบประมาณ ${fiscalYear} แล้ว (${scheduleCheck.statusLabelTh}) กรุณาติดต่อฝ่ายพัสดุหรือผู้ดูแลระบบ`, 'error');
      return;
    }

    const itemsToSubmit = Object.entries(qtyInputs)
      .filter(([_, qty]) => Number(qty) > 0)
      .map(([itemName, qtyRequested]) => ({ itemName, qtyRequested: Number(qtyRequested) }));

    if (itemsToSubmit.length === 0 && rejectedRequests.length === 0) {
      onToastAlert('กรุณากรอกจำนวนวัสดุอย่างน้อย 1 รายการก่อนส่งคำขอ', 'info');
      return;
    }

    const totalQty = itemsToSubmit.reduce((acc, curr) => acc + curr.qtyRequested, 0);

    onRequestConfirm({
      title: 'ยืนยันการส่งคำขอเสนองบพัสดุ',
      message: `คุณต้องการยื่นส่งรายการขอจัดซื้อจำนวน ${itemsToSubmit.length} รายการ (รวม ${totalQty} ชิ้น) สำหรับหน่วยงาน ${currentDept.name} ประจำปีงบประมาณ ${fiscalYear} ให้หัวหน้ากลุ่มงาน/ฝ่ายอนุมัติหรือไม่?`,
      confirmText: 'ยืนยันส่งคำขอ',
      variant: 'primary',
      onConfirm: () => {
        onSubmitRequests(selectedDeptId, itemsToSubmit, reason);
        onToastAlert(`ส่งคำขอจัดซื้อวัสดุของหน่วยงาน ${currentDept.name} สำเร็จเรียบร้อยแล้ว!`, 'success');
        setQtyInputs({});
      }
    });
  };

  // Pagination slice for catalog items
  const numericSize = pageSize === 'all' ? sortedItems.length || 1 : pageSize;
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(sortedItems.length / numericSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageItems = pageSize === 'all' ? sortedItems : sortedItems.slice((safePage - 1) * numericSize, safePage * numericSize);

  // Pagination slice for rejected requests
  const numericRejectedSize = rejectedPageSize === 'all' ? sortedRejectedRequests.length || 1 : rejectedPageSize;
  const totalRejectedPages = rejectedPageSize === 'all' ? 1 : Math.max(1, Math.ceil(sortedRejectedRequests.length / numericRejectedSize));
  const safeRejectedPage = Math.min(rejectedCurrentPage, totalRejectedPages);
  const pageRejectedRequests = rejectedPageSize === 'all'
    ? sortedRejectedRequests
    : sortedRejectedRequests.slice((safeRejectedPage - 1) * numericRejectedSize, safeRejectedPage * numericRejectedSize);

  // Pagination slice for submitted requests
  const numericSubmittedSize = submittedPageSize === 'all' ? sortedSubmittedRequests.length || 1 : submittedPageSize;
  const totalSubmittedPages = submittedPageSize === 'all' ? 1 : Math.max(1, Math.ceil(sortedSubmittedRequests.length / numericSubmittedSize));
  const safeSubmittedPage = Math.min(submittedCurrentPage, totalSubmittedPages);
  const pageSubmittedRequests = submittedPageSize === 'all'
    ? sortedSubmittedRequests
    : sortedSubmittedRequests.slice((safeSubmittedPage - 1) * numericSubmittedSize, safeSubmittedPage * numericSubmittedSize);

  return (
    <div className="space-y-5">
      {/* Navigation Tabs Header */}
      <div className="flex bg-slate-200/80 p-1 rounded-2xl gap-1 text-xs font-semibold w-fit max-w-full overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('request')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'request'
              ? 'bg-white text-slate-900 shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Edit3 className="w-4 h-4 text-indigo-600" />
          <span>แบบสำรวจรายการขอจัดซื้อ ({sortedItems.length.toLocaleString('th-TH')})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('recent')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'recent'
              ? 'bg-white text-slate-900 shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4 text-blue-600" />
          <span>รายการที่ขอครั้งล่าสุด</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('submitted')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'submitted'
              ? 'bg-white text-slate-900 shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>คำขอที่ส่งยื่นเรียบร้อยแล้ว ({submittedRequests.length.toLocaleString('th-TH')})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rejected')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'rejected'
              ? 'bg-white text-slate-900 shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>รายการที่ถูกตีกลับให้แก้ไข ({rejectedRequests.length.toLocaleString('th-TH')})</span>
        </button>

        {/* Tab 5: ปรับปรุงแผนงบประมาณรอบ 6 เดือน */}
        <button
          type="button"
          onClick={() => setActiveTab('revision')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'revision'
              ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
              : isDeptUnlockedForRevision
              ? 'bg-amber-100/70 text-amber-900 hover:bg-amber-100 font-bold animate-pulse'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-700" />
          <span>
            ขอปรับปรุงแผนงบประมาณ (รอบ 6 เดือน)
            {isDeptUnlockedForRevision && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                เปิดสิทธิ์แล้ว
              </span>
            )}
          </span>
        </button>
      </div>

      {/* Notification Banner when department is unlocked */}
      {isDeptUnlockedForRevision && activeTab !== 'revision' && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500 text-white rounded-xl shadow-xs">
              <Unlock className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span>ฝ่ายของท่านได้รับอนุมัติให้ "ปรับปรุงแผนงบประมาณรอบ 6 เดือน" แล้ว</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-200 text-emerald-900 text-[10px] font-bold">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {currentDeptPerm?.note ? `หมายเหตุจากพัสดุ: ${currentDeptPerm.note}` : 'เจ้าหน้าที่พัสดุได้ทำการเปิดสิทธิ์ให้ฝ่ายของท่านปรับ เพิ่ม หรือลดยอดรายการที่เคยอนุมัติแล้ว'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('revision')}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            เข้าสู่หน้าปรับปรุงแผนทันที ↗
          </button>
        </div>
      )}

      {/* TAB 1: แบบสำรวจรายการขอจัดซื้อ (รูปที่ 2 อยู่บน รูปที่ 1) */}
      {activeTab === 'request' && (
        <div className="space-y-5">
          {/* Submission Schedule Status Banner */}
          {schedule && (() => {
            const schedInfo = checkSubmissionOpen(schedule);
            return (
              <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs ${
                schedInfo.isClosed && !schedule.allowLateSubmission && !isDeptUnlockedForRevision
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-indigo-50/70 border-indigo-200 text-indigo-950'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl text-white font-black text-xs shrink-0 ${
                    schedInfo.isClosed && !schedule.allowLateSubmission && !isDeptUnlockedForRevision
                      ? 'bg-rose-600'
                      : 'bg-indigo-600'
                  }`}>
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs sm:text-sm flex items-center gap-2">
                      <span>ปฏิทินรับคำของบประมาณ {fiscalYear}: {schedInfo.statusLabelTh}</span>
                      {schedInfo.daysRemaining !== null && !schedInfo.isClosed && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono text-[11px] font-bold border border-emerald-300">
                          เหลือเวลา {schedInfo.daysRemaining} วัน
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] opacity-80 mt-0.5">
                      กำหนดการ: {schedule.startDate} ถึง {schedule.endDate} 
                      {schedule.announcement ? ` • ${schedule.announcement}` : ''}
                    </p>
                  </div>
                </div>

                {schedInfo.isClosed && !schedule.allowLateSubmission && !isDeptUnlockedForRevision && (
                  <div className="px-3 py-1 bg-rose-200 text-rose-900 rounded-lg text-xs font-bold font-mono">
                    ⛔ ปิดรับคำขอแล้ว
                  </div>
                )}
              </div>
            );
          })()}

          {/* Table Control Panel (รูปที่ 2) */}
          <TableControlPanel
            title="รายการวัสดุ"
            categoryLabel={selectedCategory === 'all' ? 'ทุกหมวดวัสดุ' : CATEGORY_LABELS[selectedCategory]}
            departmentName={currentDept.name}
            fiscalYear={fiscalYear}
            totalCount={sortedItems.length}
            selectedFiscalYear={selectedFiscalYearFilter}
            onFiscalYearChange={yr => {
              setSelectedFiscalYearFilter(yr);
              setCurrentPage(1);
            }}
            showFiscalYearFilter={false}
            fiscalYearOptions={fiscalYearOptions}
            selectedCategory={selectedCategory}
            onCategoryChange={cat => {
              setSelectedCategory(cat);
              setCurrentPage(1);
            }}
            showCategoryFilter={true}
            departments={DEPARTMENTS}
            selectedDeptId={selectedDeptId}
            onDeptChange={deptId => {
              setSelectedDeptId(deptId);
              setCurrentPage(1);
            }}
            showDeptFilter={isAdmin}
            searchTerm={searchTerm}
            onSearchChange={term => {
              setSearchTerm(term);
              setCurrentPage(1);
            }}
            showSearch={false}
          />

          {/* Add Custom Item Card (รูปที่ 1) */}
          {!isPlanFrozen && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                เพิ่มรายการวัสดุใหม่ (กรณีไม่มีในบัญชีกลาง)
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                พิมพ์ชื่อวัสดุที่ต้องการขอเพิ่ม ระบุหน่วยนับ แล้วกดเพิ่ม รายการจะแสดงในตารางเพื่อให้กรอกจำนวน
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  placeholder="ชื่อรายการวัสดุใหม่..."
                  className="flex-1 min-w-[220px] text-xs px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                />
                <select
                  value={newItemUnit}
                  onChange={e => setNewItemUnit(e.target.value)}
                  className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-indigo-600 font-medium"
                >
                  <option value="ชิ้น">ชิ้น</option>
                  <option value="รีม">รีม</option>
                  <option value="ตลับ">ตลับ</option>
                  <option value="ม้วน">ม้วน</option>
                  <option value="ก้อน">ก้อน</option>
                  <option value="ขวด">ขวด</option>
                  <option value="ด้าม">ด้าม</option>
                  <option value="แพ็ค">แพ็ค</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddCustom}
                  className="text-xs font-semibold px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  เพิ่มรายการ
                </button>
              </div>
            </div>
          )}

          {/* Catalog Survey Table (รูปที่ 1) */}
          <div className="bg-[#F0F4F8] border border-white/80 rounded-3xl p-5 shadow-[8px_8px_20px_rgba(163,177,198,0.3),-8px_-8px_20px_rgba(255,255,255,0.8)] space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-indigo-600" />
                  <span>แบบสำรวจรายการวัสดุ ({sortedItems.length} รายการ)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  กรอกจำนวนความต้องการวัสดุประจำปีงบประมาณ {fiscalYear} หรือใช้ปุ่ม Quick Fill ด้านล่างเพื่อดึงยอดอัตโนมัติ
                </p>
              </div>

              {/* Advanced Search & GPSC search */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative shrink-0 w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="ค้นหาชื่อวัสดุ หรือรหัส GPSC..."
                    className="w-full text-xs pl-8.5 pr-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium placeholder-slate-400 shadow-[inset_1.5px_1.5px_3px_rgba(163,177,198,0.3)]"
                  />
                </div>
              </div>
            </div>

            {/* Quick Fill Toolbar & Stock Filters */}
            <div className="bg-white/80 border border-slate-200/80 rounded-2xl p-3 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 shadow-xs">
              {/* Quick Fill Preset Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className="font-extrabold text-indigo-900 flex items-center gap-1 text-[11px] mr-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>กรอกด่วน (Quick Fill):</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleQuickFill('lastYear100')}
                  disabled={isPlanFrozen}
                  className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold transition-all text-xs cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
                  title="ดึงยอดใช้จริงปี 2568 มาใส่ 100% ทุกรายการ"
                >
                  ⚡ ดึงยอดปี 68 (100%)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('lastYearPlus5')}
                  disabled={isPlanFrozen}
                  className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold transition-all text-xs cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
                  title="ดึงยอดใช้จริงปี 2568 + 5%"
                >
                  ⚡ ปี 68 + 5%
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('lastYearPlus10')}
                  disabled={isPlanFrozen}
                  className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold transition-all text-xs cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
                  title="ดึงยอดใช้จริงปี 2568 + 10%"
                >
                  ⚡ ปี 68 + 10%
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('avg3Years')}
                  disabled={isPlanFrozen}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold transition-all text-xs cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
                  title="ดึงยอดเฉลี่ย 3 ปีย้อนหลัง (2566-2568)"
                >
                  ⚡ เฉลี่ย 3 ปีย้อนหลัง
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('clear')}
                  disabled={isPlanFrozen}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 font-semibold transition-all text-xs cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
                >
                  ล้างค่า
                </button>
              </div>

              {/* Stock Status Filter Chips */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className="font-bold text-slate-500 text-[11px] mr-1">สถานะคลัง:</span>
                <button
                  type="button"
                  onClick={() => { setStockFilter('all'); setCurrentPage(1); }}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    stockFilter === 'all'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  ทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={() => { setStockFilter('low'); setCurrentPage(1); }}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    stockFilter === 'low'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  ⚠️ คงคลังต่ำ
                </button>
                <button
                  type="button"
                  onClick={() => { setStockFilter('adequate'); setCurrentPage(1); }}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    stockFilter === 'adequate'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  ✓ คงคลังพอดี
                </button>
                <button
                  type="button"
                  onClick={() => { setStockFilter('excess'); setCurrentPage(1); }}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    stockFilter === 'excess'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                  }`}
                >
                  📦 สต็อกสูง
                </button>
              </div>
            </div>

            <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <table className="w-full text-base text-left">
                <thead className="bg-slate-50/90 text-slate-600 uppercase font-mono text-sm border-b border-slate-200 select-none">
                  <tr>
                    <th 
                      onClick={() => handleHeaderSort('name')}
                      className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>รายการ / รหัส GPSC / สถานะคงคลัง</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="p-3">ประเภทวัสดุ</th>
                    <th 
                      onClick={() => handleHeaderSort('lastYear')}
                      className="p-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>ปี 2568</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th 
                      onClick={() => handleHeaderSort('requested')}
                      className="p-3 text-right w-44 cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>ขอปี {fiscalYear}</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th 
                      onClick={() => handleHeaderSort('diff')}
                      className="p-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>ผลต่าง</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageItems.map(name => {
                    const hist = historyFor(name);
                    const last = hist[2568];
                    const unit = guessUnit(name);
                    const gpsc = getItemGpscCode(name);
                    const { stockQty, stockStatus } = getItemStockInfo(name);

                    const currentVal = qtyInputs[name];
                    let diffText = '—';
                    let diffClass = 'text-slate-400';
                    const spike = calculateSpike(last, currentVal || 0);

                    if (currentVal !== undefined && currentVal > 0) {
                      const diff = currentVal - last;
                      if (diff > 0) {
                        diffText = `+${diff}`;
                        diffClass = 'text-rose-600 font-bold';
                      } else if (diff < 0) {
                        diffText = `${diff}`;
                        diffClass = 'text-teal-600 font-bold';
                      } else {
                        diffText = '0';
                        diffClass = 'text-slate-600 font-bold';
                      }
                    }

                    return (
                      <tr key={name} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3">
                          <div className="font-semibold text-slate-900 text-xs sm:text-sm">{name}</div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px]">
                            <span className="font-mono text-indigo-700 font-bold bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
                              GPSC: {gpsc}
                            </span>
                            {stockStatus === 'low' ? (
                              <span className="text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded font-bold">
                                ⚠️ คงคลังต่ำ: {stockQty} {unit}
                              </span>
                            ) : stockStatus === 'excess' ? (
                              <span className="text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded font-medium">
                                📦 สต็อกสูง: {stockQty} {unit}
                              </span>
                            ) : (
                              <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-medium">
                                ✓ คงคลัง: {stockQty} {unit}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <CategoryBadge itemName={name} customItems={customItems} />
                        </td>
                        <td className="p-3 text-right font-mono text-slate-600">
                          {last} {unit}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setQtyInputs(prev => ({ ...prev, [name]: last }))}
                              disabled={isPlanFrozen}
                              title={`ดึงยอดปี 2568 (${last} ${unit})`}
                              className="px-1.5 py-1 text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap"
                            >
                              ⚡ ดึง {last}
                            </button>
                            <input
                              type="number"
                              min="0"
                              disabled={isPlanFrozen}
                              value={qtyInputs[name] ?? ''}
                              onChange={e => handleQtyChange(name, e.target.value)}
                              placeholder="0"
                              className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-right font-mono font-semibold focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 disabled:bg-slate-100 shadow-[inset_1px_1px_2px_rgba(163,177,198,0.2)]"
                            />
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono">
                          <div className="flex flex-col items-end gap-0.5">
                            <span className={diffClass}>{diffText}</span>
                            {currentVal !== undefined && currentVal > 0 && spike.isSpike && (
                              <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold border ${spike.badgeColor} whitespace-nowrap`}>
                                {spike.labelTh}
                              </span>
                            )}
                          </div>
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
              totalItems={sortedItems.length}
              onPageSizeChange={s => { setPageSize(s); setCurrentPage(1); }}
              onPageChange={p => setCurrentPage(p)}
            />
          </div>

          {/* Reason Textarea (รูปที่ 1) */}
          {!isPlanFrozen && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                เหตุผลความจำเป็นในการขอใช้ปีงบประมาณ {fiscalYear}
              </label>
              <textarea
                rows={2}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder={`เช่น ของเดิมไม่เพียงพอต่อการใช้งาน / รองรับภารกิจใหม่เพิ่มขึ้นในปีงบประมาณ ${fiscalYear}`}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600"
              />
            </div>
          )}

          {/* Submit Button (รูปที่ 1) */}
          {!isPlanFrozen && (
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSubmit}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                ส่งคำขอให้หัวหน้ากลุ่มงาน/ฝ่ายอนุมัติ
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: รายการที่ถูกตีกลับให้แก้ไข (รูปที่ 2 อยู่บน รูปที่ 3) */}
      {activeTab === 'rejected' && (
        <div className="space-y-5">
          {/* Table Control Panel (รูปที่ 2) */}
          <TableControlPanel
            title="รายการที่ถูกตีกลับให้แก้ไข"
            categoryLabel={selectedCategory === 'all' ? 'ทุกหมวดวัสดุ' : CATEGORY_LABELS[selectedCategory]}
            departmentName={currentDept.name}
            fiscalYear={fiscalYear}
            totalCount={sortedRejectedRequests.length}
            selectedFiscalYear={selectedFiscalYearFilter}
            onFiscalYearChange={yr => {
              setSelectedFiscalYearFilter(yr);
              setRejectedCurrentPage(1);
            }}
            showFiscalYearFilter={true}
            fiscalYearOptions={fiscalYearOptions}
            selectedCategory={selectedCategory}
            onCategoryChange={cat => {
              setSelectedCategory(cat);
              setRejectedCurrentPage(1);
            }}
            showCategoryFilter={true}
            departments={DEPARTMENTS}
            selectedDeptId={selectedDeptId}
            onDeptChange={deptId => {
              setSelectedDeptId(deptId);
              setRejectedCurrentPage(1);
            }}
            showDeptFilter={isAdmin}
            searchTerm={searchTerm}
            onSearchChange={term => {
              setSearchTerm(term);
              setRejectedCurrentPage(1);
            }}
            showSearch={false}
          />

          {/* Rejected Items Box (รูปที่ 3) */}
          <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-4 space-y-4 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-rose-200/60 pb-3">
              <div>
                <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
                  <AlertCircle className="w-4.5 h-4.5 text-rose-600" />
                  <span>รายการที่ถูกตีกลับให้แก้ไข ({filteredRejectedRequests.length} / {rejectedRequests.length} รายการ)</span>
                </div>
                <p className="text-xs text-rose-700 mt-0.5">
                  คลิกเลือกปุ่มผู้ตีกลับด้านขวาเพื่อกรองรายการ หรือเลือก <strong className="underline">ทั้งหมด</strong> เพื่อแสดงทุกรายการ
                </p>
              </div>

              {/* Interactive Filter Buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0 text-xs">
                <button
                  type="button"
                  onClick={() => { setRejectedFilter('all'); setRejectedCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                    rejectedFilter === 'all'
                      ? 'bg-rose-700 text-white border-rose-800 shadow-xs ring-2 ring-rose-400'
                      : 'bg-white text-rose-900 border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>ทั้งหมด:</span>
                  <strong className="font-mono">{rejectedRequests.length}</strong>
                </button>

                <button
                  type="button"
                  onClick={() => { setRejectedFilter('head'); setRejectedCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                    rejectedFilter === 'head'
                      ? 'bg-amber-600 text-white border-amber-700 shadow-xs ring-2 ring-amber-400'
                      : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>หัวหน้าฝ่าย/กลุ่มงานตีกลับ:</span>
                  <strong className="font-mono">{countRejectedHead}</strong>
                </button>

                <button
                  type="button"
                  onClick={() => { setRejectedFilter('proc'); setRejectedCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                    rejectedFilter === 'proc'
                      ? 'bg-blue-600 text-white border-blue-700 shadow-xs ring-2 ring-blue-400'
                      : 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  <PackageCheck className="w-3.5 h-3.5" />
                  <span>เจ้าหน้าที่พัสดุตีกลับ:</span>
                  <strong className="font-mono">{countRejectedProc}</strong>
                </button>

                <button
                  type="button"
                  onClick={() => { setRejectedFilter('prochead'); setRejectedCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                    rejectedFilter === 'prochead'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-400'
                      : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>หัวหน้าวัสดุตีกลับ:</span>
                  <strong className="font-mono">{countRejectedProcHead}</strong>
                </button>

                <button
                  type="button"
                  onClick={() => { setRejectedFilter('exec'); setRejectedCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                    rejectedFilter === 'exec'
                      ? 'bg-purple-600 text-white border-purple-700 shadow-xs ring-2 ring-purple-400'
                      : 'bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>ผู้บริหารตีกลับ:</span>
                  <strong className="font-mono">{countRejectedExec}</strong>
                </button>

                {/* Inline Search Box ต่อท้ายรูปที่ 3 */}
                <div className="relative shrink-0 w-full sm:w-48 md:w-52">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => {
                      setSearchTerm(e.target.value);
                      setRejectedCurrentPage(1);
                    }}
                    placeholder="ค้นหารายการ..."
                    className="w-full text-xs pl-8 pr-3 py-1.5 border border-rose-300 rounded-lg bg-white text-rose-950 focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600 font-medium placeholder-slate-400 shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {filteredRejectedRequests.length === 0 ? (
              <div className="p-8 text-center text-rose-400 bg-white rounded-xl border border-rose-200 text-xs">
                {rejectedRequests.length === 0
                  ? 'ไม่พบรายการที่ถูกตีกลับให้แก้ไขสำหรับหมวดหรือคำค้นหาที่เลือก'
                  : 'ไม่พบรายการที่ถูกตีกลับตรงกับประเภทผู้ตีกลับที่เลือก'}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto bg-white rounded-xl border border-rose-200 shadow-2xs">
                  <table className="w-full text-base text-left">
                    <thead className="bg-rose-100/60 text-rose-950 uppercase font-mono text-sm border-b border-rose-200 select-none">
                      <tr>
                        <th 
                          onClick={() => handleRejectedHeaderSort('name')}
                          className="p-3 cursor-pointer hover:bg-rose-200/50 transition-colors"
                        >
                          <div className="flex items-center gap-1">
                            <span>รายการวัสดุ</span>
                            <ArrowUpDown className="w-3 h-3 text-rose-600" />
                          </div>
                        </th>
                        <th 
                          onClick={() => handleRejectedHeaderSort('category')}
                          className="p-3 cursor-pointer hover:bg-rose-200/50 transition-colors"
                        >
                          <div className="flex items-center gap-1">
                            <span>ประเภทวัสดุ</span>
                            <ArrowUpDown className="w-3 h-3 text-rose-600" />
                          </div>
                        </th>
                        <th 
                          onClick={() => handleRejectedHeaderSort('rejectedBy')}
                          className="p-3 text-center cursor-pointer hover:bg-rose-200/50 transition-colors"
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span>ผู้ตีกลับรายการ</span>
                            <ArrowUpDown className="w-3 h-3 text-rose-600" />
                          </div>
                        </th>
                        <th 
                          onClick={() => handleRejectedHeaderSort('origQty')}
                          className="p-3 text-right cursor-pointer hover:bg-rose-200/50 transition-colors"
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>จำนวนเดิมที่ขอ</span>
                            <ArrowUpDown className="w-3 h-3 text-rose-600" />
                          </div>
                        </th>
                        <th 
                          onClick={() => handleRejectedHeaderSort('newQty')}
                          className="p-3 text-right w-32 cursor-pointer hover:bg-rose-200/50 transition-colors"
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>จำนวนขอใหม่ (ปี {fiscalYear})</span>
                            <ArrowUpDown className="w-3 h-3 text-rose-600" />
                          </div>
                        </th>
                        <th className="p-3 text-center">การเพิ่ม/ลดจำนวน & ผู้ปรับ</th>
                        <th 
                          onClick={() => handleRejectedHeaderSort('comment')}
                          className="p-3 cursor-pointer hover:bg-rose-200/50 transition-colors"
                        >
                          <div className="flex items-center gap-1">
                            <span>เหตุผลการตีกลับ</span>
                            <ArrowUpDown className="w-3 h-3 text-rose-600" />
                          </div>
                        </th>
                        <th className="p-3 text-center">ประวัติ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-100/80">
                      {pageRejectedRequests.map(r => {
                        const origQty = r.qtyOriginal ?? r.qtyRequested;
                        const currentVal = qtyInputs[r.itemName] ?? r.qtyRequested;
                        const qtyDiff = currentVal - origQty;

                        // Identify who rejected
                        const rejRole = r.rejectedByRole;
                        const isHeadRej = rejRole === 'head' || (!rejRole && r.comment.includes('หัวหน้า') && !r.comment.includes('พัสดุ'));
                        const isProcRej = rejRole === 'proc' || (!rejRole && (r.comment.includes('เจ้าหน้าที่') || r.comment.includes('ฝ่ายพัสดุ') || r.comment.includes('พัสดุตีกลับ')) && !r.comment.includes('หัวหน้าพัสดุ') && !r.comment.includes('หัวหน้าวัสดุ'));
                        const isProcHeadRej = rejRole === 'prochead' || (!rejRole && (r.comment.includes('หัวหน้าพัสดุ') || r.comment.includes('หัวหน้าวัสดุ')));
                        const isExecRej = rejRole === 'exec' || (!rejRole && (r.comment.includes('ผู้บริหาร') || r.comment.includes('งบประมาณ')));

                        return (
                          <tr key={r.id} className="hover:bg-rose-50/40 transition-colors">
                            <td className="p-3 font-semibold text-slate-900">
                              <div>{r.itemName}</div>
                              <div className="text-[10px] font-mono text-slate-400">รหัส: {r.id}</div>
                            </td>
                            <td className="p-3">
                              <CategoryBadge itemName={r.itemName} customItems={customItems} />
                            </td>
                            
                            {/* ผู้ตีกลับรายการ */}
                            <td className="p-3 text-center">
                              {isHeadRej ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
                                  <UserCheck className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                  <span>{r.rejectedByName || 'หัวหน้าฝ่าย/กลุ่มงาน'}</span>
                                </span>
                              ) : isProcRej ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-900 border border-blue-300 shadow-2xs">
                                  <PackageCheck className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                                  <span>{r.rejectedByName || 'เจ้าหน้าที่พัสดุ'}</span>
                                </span>
                              ) : isProcHeadRej ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-2xs">
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                  <span>{r.rejectedByName || 'หัวหน้าวัสดุ'}</span>
                                </span>
                              ) : isExecRej ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-900 border border-purple-300 shadow-2xs">
                                  <Crown className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                                  <span>{r.rejectedByName || 'ผู้บริหารอนุมัติ'}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-50 text-slate-800 border border-slate-300">
                                  <UserCheck className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                                  <span>{r.rejectedByName || 'ผู้อนุมัติ'}</span>
                                </span>
                              )}
                            </td>

                            {/* จำนวนเดิมที่ขอ */}
                            <td className="p-3 text-right font-mono font-bold text-slate-700 bg-slate-50/50">
                              {origQty} {r.unit}
                            </td>

                            {/* จำนวนขอใหม่ (แก้ไข) */}
                            <td className="p-3 text-right">
                              <input
                                type="number"
                                min="0"
                                value={qtyInputs[r.itemName] ?? r.qtyRequested}
                                onChange={e => handleQtyChange(r.itemName, e.target.value)}
                                className="w-22 px-2.5 py-1 border border-rose-300 rounded-lg text-right font-mono font-bold text-rose-950 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-2xs"
                              />
                            </td>

                            {/* การเพิ่ม/ลดจำนวน & ผู้ปรับ */}
                            <td className="p-3 text-center">
                              <div className="inline-flex flex-col items-center gap-0.5">
                                {qtyDiff < 0 ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                    <TrendingDown className="w-3.5 h-3.5 text-amber-700" />
                                    <span>ลดลง {Math.abs(qtyDiff)} {r.unit}</span>
                                  </span>
                                ) : qtyDiff > 0 ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-300">
                                    <TrendingUp className="w-3.5 h-3.5 text-indigo-700" />
                                    <span>เพิ่มขึ้น {qtyDiff} {r.unit}</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                    <Minus className="w-3 h-3 text-slate-400" />
                                    <span>เท่าเดิม</span>
                                  </span>
                                )}
                                
                                {r.adjustedByName && (
                                  <span className="text-[10px] text-slate-500 font-medium">
                                    (ปรับโดย: {r.adjustedByName})
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* เหตุผลการตีกลับ */}
                            <td className="p-3 text-rose-900 italic bg-rose-50/60 rounded-xl border border-rose-100/80 leading-relaxed text-[11.5px]">
                              "{r.comment || 'ขอให้ทบทวนและปรับปรุงจำนวนใหม่อีกครั้ง'}"
                            </td>

                            {/* ปุ่มดูประวัติ */}
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => setSelectedAuditItem(r)}
                                className="px-2.5 py-1.5 text-xs font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl inline-flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                                title="ดูประวัติการอนุมัติและการแก้ไข"
                              >
                                <History className="w-3.5 h-3.5 text-rose-600" />
                                <span>ประวัติ</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <PaginationBar
                  pageSize={rejectedPageSize}
                  currentPage={rejectedCurrentPage}
                  totalItems={filteredRejectedRequests.length}
                  onPageSizeChange={s => { setRejectedPageSize(s); setRejectedCurrentPage(1); }}
                  onPageChange={p => setRejectedCurrentPage(p)}
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: คำขอที่ส่งยื่นเรียบร้อยแล้ว */}
      {activeTab === 'submitted' && (
        <div className="space-y-5">
          {/* Table Control Panel */}
          <TableControlPanel
            title="คำขอที่ส่งยื่นเรียบร้อยแล้ว"
            categoryLabel={selectedCategory === 'all' ? 'ทุกหมวดวัสดุ' : CATEGORY_LABELS[selectedCategory]}
            departmentName={currentDept.name}
            fiscalYear={fiscalYear}
            totalCount={filteredSubmittedRequests.length}
            selectedFiscalYear={selectedFiscalYearFilter}
            onFiscalYearChange={yr => {
              setSelectedFiscalYearFilter(yr);
              setSubmittedCurrentPage(1);
            }}
            showFiscalYearFilter={true}
            fiscalYearOptions={fiscalYearOptions}
            selectedCategory={selectedCategory}
            onCategoryChange={cat => {
              setSelectedCategory(cat);
              setSubmittedCurrentPage(1);
            }}
            showCategoryFilter={true}
            departments={DEPARTMENTS}
            selectedDeptId={selectedDeptId}
            onDeptChange={deptId => {
              setSelectedDeptId(deptId);
              setSubmittedCurrentPage(1);
            }}
            showDeptFilter={isAdmin}
            searchTerm={searchTerm}
            onSearchChange={term => {
              setSearchTerm(term);
              setSubmittedCurrentPage(1);
            }}
            showSearch={false}
          />

          {/* Submitted Requests Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>คำขอที่ส่งยื่นเรียบร้อยแล้ว ({filteredSubmittedRequests.length} / {submittedRequests.length} รายการ)</span>
              </h3>

              {/* Status Filter Buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0 text-xs">
                <button
                  type="button"
                  onClick={() => { setSubmittedStatusFilter('all'); setSubmittedCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                    submittedStatusFilter === 'all'
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs ring-2 ring-indigo-400'
                      : 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>ทั้งหมด:</span>
                  <strong className="font-mono">{submittedRequests.length}</strong>
                </button>

                <button
                  type="button"
                  onClick={() => { setSubmittedStatusFilter('pending_head'); setSubmittedCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                    submittedStatusFilter === 'pending_head'
                      ? 'bg-amber-600 text-white border-amber-700 shadow-xs ring-2 ring-amber-400'
                      : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>รอหัวหน้ากลุ่มงาน/ฝ่ายอนุมัติ:</span>
                  <strong className="font-mono">{countSubmittedPendingHead}</strong>
                </button>

                <button
                  type="button"
                  onClick={() => { setSubmittedStatusFilter('pending_proc'); setSubmittedCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                    submittedStatusFilter === 'pending_proc'
                      ? 'bg-blue-600 text-white border-blue-700 shadow-xs ring-2 ring-blue-400'
                      : 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  <PackageCheck className="w-3.5 h-3.5" />
                  <span>รอฝ่ายพัสดุรวบรวม:</span>
                  <strong className="font-mono">{countSubmittedPendingProc}</strong>
                </button>

                <button
                  type="button"
                  onClick={() => { setSubmittedStatusFilter('pending_exec'); setSubmittedCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                    submittedStatusFilter === 'pending_exec'
                      ? 'bg-purple-600 text-white border-purple-700 shadow-xs ring-2 ring-purple-400'
                      : 'bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>รอผู้บริหารอนุมัติ:</span>
                  <strong className="font-mono">{countSubmittedPendingExec}</strong>
                </button>

                <button
                  type="button"
                  onClick={() => { setSubmittedStatusFilter('approved'); setSubmittedCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                    submittedStatusFilter === 'approved'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-400'
                      : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>อนุมัติแล้ว:</span>
                  <strong className="font-mono">{countSubmittedApproved}</strong>
                </button>

                {/* Inline Search Box ต่อท้ายรูปที่ 4 */}
                <div className="relative shrink-0 w-full sm:w-48 md:w-52">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => {
                      setSearchTerm(e.target.value);
                      setSubmittedCurrentPage(1);
                    }}
                    placeholder="ค้นหารายการ..."
                    className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-medium placeholder-slate-400 shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {filteredSubmittedRequests.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                {submittedRequests.length === 0
                  ? 'ยังไม่มีรายการคำขอที่ส่งยื่นเรียบร้อยแล้วสำหรับหมวดหรือคำค้นหาที่เลือก'
                  : 'ไม่พบรายการคำขอตรงกับสถานะคำขอที่เลือก'}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-base text-left">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-mono text-sm border-b border-slate-200 select-none">
                      <tr>
                        <th 
                          onClick={() => handleSubmittedHeaderSort('name')}
                          className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-1">
                            <span>รายการวัสดุ</span>
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>
                        <th 
                          onClick={() => handleSubmittedHeaderSort('category')}
                          className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-1">
                            <span>ประเภทวัสดุ</span>
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>
                        <th 
                          onClick={() => handleSubmittedHeaderSort('lastYear')}
                          className="p-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>ปี 2568</span>
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>
                        <th 
                          onClick={() => handleSubmittedHeaderSort('origQty')}
                          className="p-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>จำนวนเดิมที่ขอ</span>
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>
                        <th 
                          onClick={() => handleSubmittedHeaderSort('newQty')}
                          className="p-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>ขอปัจจุบัน (ปี {fiscalYear})</span>
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>
                        <th className="p-3 text-center">การเพิ่ม/ลดจำนวน & ผู้ปรับ</th>
                        <th 
                          onClick={() => handleSubmittedHeaderSort('status')}
                          className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-1">
                            <span>สถานะคำขอ</span>
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>
                        <th className="p-3 text-center">ประวัติ & ความเห็น</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pageSubmittedRequests.map(r => {
                        const statusInfo = STATUS_LABEL[r.status];
                        const origQty = r.qtyOriginal ?? r.qtyRequested;
                        const qtyDiff = r.qtyRequested - origQty;

                        return (
                          <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-3 font-semibold text-slate-800">
                              <div>{r.itemName}</div>
                              <div className="text-[10px] font-mono text-slate-400">รหัส: {r.id}</div>
                              {r.comment && (
                                <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg mt-1 font-semibold max-w-xs">
                                  ⚠️ หมายเหตุ: {r.comment}
                                </div>
                              )}
                            </td>
                            <td className="p-3">
                              <CategoryBadge itemName={r.itemName} customItems={customItems} />
                            </td>
                            <td className="p-3 text-right font-mono text-slate-600">
                              {r.qtyLastYear} {r.unit}
                            </td>
                            <td className="p-3 text-right font-mono text-slate-500 bg-slate-50/50">
                              {origQty} {r.unit}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-indigo-900">
                              {r.qtyRequested} {r.unit}
                            </td>
                            
                            {/* การเพิ่ม/ลดจำนวน & ผู้ปรับ */}
                            <td className="p-3 text-center">
                              <div className="inline-flex flex-col items-center gap-0.5">
                                {qtyDiff < 0 ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                                    <TrendingDown className="w-3.5 h-3.5 text-amber-700" />
                                    <span>ลดลง {Math.abs(qtyDiff)} {r.unit}</span>
                                  </span>
                                ) : qtyDiff > 0 ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-900 border border-indigo-200">
                                    <TrendingUp className="w-3.5 h-3.5 text-indigo-700" />
                                    <span>เพิ่มขึ้น {qtyDiff} {r.unit}</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                    <Minus className="w-3 h-3 text-slate-400" />
                                    <span>เท่าเดิม</span>
                                  </span>
                                )}

                                {r.adjustedByName && (
                                  <span className="text-[10px] text-slate-500 font-medium">
                                    (ปรับโดย: {r.adjustedByName})
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="p-3">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusInfo.cls}`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                {statusInfo.text}
                              </span>
                            </td>

                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => setSelectedAuditItem(r)}
                                className="px-2.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl inline-flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                                title="ดูประวัติการอนุมัติและการแก้ไข"
                              >
                                <History className="w-3.5 h-3.5 text-indigo-600" />
                                <span>ประวัติ</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <PaginationBar
                  pageSize={submittedPageSize}
                  currentPage={submittedCurrentPage}
                  totalItems={filteredSubmittedRequests.length}
                  onPageSizeChange={s => { setSubmittedPageSize(s); setSubmittedCurrentPage(1); }}
                  onPageChange={p => setSubmittedCurrentPage(p)}
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: รายการที่ขอครั้งล่าสุด */}
      {activeTab === 'recent' && (
        <div className="space-y-4">
          {/* Action Bar with Export Buttons */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600 animate-pulse" />
                <span>รายงานแบบสำรวจความต้องการวัสดุจำแนกตามประเภทพัสดุ</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                รายงานความต้องการแยกตามหมวดประเภทวัสดุตามรูปสัญลักษณ์ เพื่อตรวจสอบความครบถ้วนก่อนส่งออกและจัดพิมพ์รายงานทางการ
              </p>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleExportExcel}
                className="bg-[#107C41] hover:bg-[#0A5C30] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-all"
              >
                <FileText className="w-4 h-4 text-emerald-100" />
                <span>Export Excel</span>
              </button>
              
              <button
                type="button"
                onClick={handleExportPDF}
                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-all"
              >
                <FileText className="w-4 h-4 text-rose-100" />
                <span>Export PDF</span>
              </button>
            </div>
          </div>

          {/* Interactive Simulated Excel Interface */}
          <div className="bg-[#E2E8F0] border border-slate-300 rounded-2xl overflow-hidden shadow-lg flex flex-col">
            {/* Simulated Excel Header / Grid Coordinates */}
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 text-slate-600 text-xs font-mono font-bold flex items-center gap-4 select-none">
              <div className="bg-white border border-slate-300 px-2 py-0.5 rounded text-[11px] shadow-2xs">
                A1
              </div>
              <div className="text-[11px] text-slate-400">
                fx = แบบสำรวจความต้องการใช้{CATEGORY_LABELS[reportFinalActiveSheetCat] || reportFinalActiveSheetCat}...
              </div>
            </div>

            {/* Simulated Sheet Canvas */}
            <div className="overflow-x-auto bg-white p-6 min-h-[400px]">
              <div className="min-w-[800px] border border-slate-200 rounded-lg overflow-hidden shadow-2xs font-sans">
                {/* Simulated Column Letters Header Row */}
                <div className="grid grid-cols-12 bg-slate-100 text-center text-[11px] font-mono text-slate-500 font-bold border-b border-slate-200 select-none divide-x divide-slate-200">
                  <div className="col-span-1 py-1"></div>
                  <div className="col-span-1 py-1">A</div>
                  <div className="col-span-6 py-1">B</div>
                  <div className="col-span-2 py-1">C</div>
                  <div className="col-span-2 py-1">D</div>
                </div>

                {/* Simulated Rows */}
                <div className="divide-y divide-slate-100 text-xs">
                  {/* Row 1: Document Main Title */}
                  <div className="grid grid-cols-12 items-stretch min-h-[44px] divide-x divide-slate-200">
                    <div className="col-span-1 bg-slate-100 flex items-center justify-center font-mono text-[10px] text-slate-400 font-bold select-none">1</div>
                    <div className="col-span-11 p-3 text-center font-bold text-base text-slate-900 bg-white leading-relaxed">
                      แบบสำรวจความต้องการใช้{CATEGORY_LABELS[reportFinalActiveSheetCat] || reportFinalActiveSheetCat} ประจำปีงบประมาณ พ.ศ. {fiscalYear} (ทั้งปี)
                    </div>
                  </div>

                  {/* Row 2: Subtitle Details */}
                  <div className="grid grid-cols-12 items-stretch min-h-[38px] divide-x divide-slate-200">
                    <div className="col-span-1 bg-slate-100 flex items-center justify-center font-mono text-[10px] text-slate-400 font-bold select-none">2</div>
                    <div className="col-span-11 p-2.5 text-center font-semibold text-slate-600 bg-white">
                      กลุ่มงาน. {workGroups.find(w => w.id === currentDept.workGroupId)?.name || 'ทั่วไป'} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; หน่วยงาน. {currentDept.name}
                    </div>
                  </div>

                  {/* Row 3: Category Title Row */}
                  <div className="grid grid-cols-12 items-stretch min-h-[36px] divide-x divide-slate-200">
                    <div className="col-span-1 bg-slate-100 flex items-center justify-center font-mono text-[10px] text-slate-400 font-bold select-none">3</div>
                    <div className="col-span-11 p-2 px-4 font-bold text-slate-800 bg-teal-50/20 text-sm">
                      {CATEGORY_LABELS[reportFinalActiveSheetCat] || reportFinalActiveSheetCat}
                    </div>
                  </div>

                  {/* Row 4: Grid Table Column Titles */}
                  <div className="grid grid-cols-12 items-stretch min-h-[36px] bg-slate-50 font-bold text-slate-800 text-center divide-x divide-slate-200">
                    <div className="col-span-1 bg-slate-100 flex items-center justify-center font-mono text-[10px] text-slate-400 font-bold select-none">4</div>
                    <div className="col-span-1 py-2 flex items-center justify-center font-bold">ลำดับ</div>
                    <div className="col-span-6 py-2 px-4 flex items-center justify-start font-bold">รายการ</div>
                    <div className="col-span-2 py-2 flex items-center justify-center font-bold">หน่วย</div>
                    <div className="col-span-2 py-2 flex items-center justify-end pr-4 font-bold">จำนวน</div>
                  </div>

                  {/* Row 5+: Items Rows */}
                  {(() => {
                    const filteredItems = reportSubmittedRequests.filter(r => getItemCategory(r.itemName) === reportFinalActiveSheetCat);
                    const renderedRows: React.ReactNode[] = [];
                    
                    // 1. Render actual data rows if present
                    filteredItems.forEach((r, idx) => {
                      renderedRows.push(
                        <div key={r.id} className="grid grid-cols-12 items-stretch min-h-[34px] divide-x divide-slate-200 hover:bg-slate-50/50 transition-colors bg-white">
                          <div className="col-span-1 bg-slate-100 flex items-center justify-center font-mono text-[10px] text-slate-400 font-bold select-none">{5 + idx}</div>
                          <div className="col-span-1 flex items-center justify-center font-mono text-slate-600">{idx + 1}</div>
                          <div className="col-span-6 flex items-center justify-start px-4 font-semibold text-slate-800">{r.itemName}</div>
                          <div className="col-span-2 flex items-center justify-center text-slate-600">{r.unit || guessUnit(r.itemName)}</div>
                          <div className="col-span-2 flex items-center justify-end pr-4 font-mono font-bold text-slate-900 bg-slate-50/30">{r.qtyRequested}</div>
                        </div>
                      );
                    });

                    // 2. Render warning indicator inside the grid if empty
                    if (filteredItems.length === 0) {
                      renderedRows.push(
                        <div key="empty-alert" className="grid grid-cols-12 items-stretch min-h-[44px] divide-x divide-slate-200 bg-white">
                          <div className="col-span-1 bg-slate-100 flex items-center justify-center font-mono text-[10px] text-slate-400 font-bold select-none">5</div>
                          <div className="col-span-11 p-3 text-center text-slate-400 font-semibold flex items-center justify-center gap-1.5 bg-slate-50/20">
                            <AlertCircle className="w-4 h-4 text-slate-400" />
                            ไม่มีรายการพัสดุในหมวดนี้ที่ส่งยื่นคำขอ
                          </div>
                        </div>
                      );
                    }

                    // 3. Render empty grid rows to make the sheet look "full"
                    const totalGridRowsDesired = 15;
                    const currentRowsCount = filteredItems.length > 0 ? filteredItems.length : 1;
                    const emptyRowsCountNeeded = Math.max(totalGridRowsDesired - currentRowsCount, 10);
                    
                    const startRowIndex = 5 + currentRowsCount;
                    for (let i = 0; i < emptyRowsCountNeeded; i++) {
                      const currentRowIdx = startRowIndex + i;
                      renderedRows.push(
                        <div key={`empty-row-${i}`} className="grid grid-cols-12 items-stretch min-h-[34px] divide-x divide-slate-200 bg-white">
                          <div className="col-span-1 bg-slate-100 flex items-center justify-center font-mono text-[10px] text-slate-400 font-bold select-none">{currentRowIdx}</div>
                          <div className="col-span-1 flex items-center justify-center"></div>
                          <div className="col-span-6 flex items-center justify-start px-4"></div>
                          <div className="col-span-2 flex items-center justify-center"></div>
                          <div className="col-span-2 flex items-center justify-end pr-4 bg-slate-50/5 text-slate-400"></div>
                        </div>
                      );
                    }

                    return renderedRows;
                  })()}
                </div>
              </div>
            </div>

            {/* Simulated Sheet Tabs Bar at bottom (Just like Excel) */}
            <div className="bg-slate-100 border-t border-slate-200 px-3 py-1 flex items-center gap-1 select-none overflow-x-auto no-scrollbar">
              <div className="text-[10px] font-bold text-slate-400 px-2 font-mono border-r border-slate-300 mr-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>SHEETS</span>
              </div>
              
              <div className="flex items-center gap-1">
                {reportSubmittedCats.map(catId => {
                  const label = CATEGORY_LABELS[catId] || catId;
                  const isActive = reportFinalActiveSheetCat === catId;
                  
                  return (
                    <button
                      key={catId}
                      type="button"
                      onClick={() => setActiveSheetCat(catId)}
                      className={`px-3 py-1.5 rounded-t-lg text-xs font-bold border-t border-x transition-colors cursor-pointer flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-white text-green-700 border-slate-300 font-extrabold shadow-sm relative -bottom-[2px] z-10'
                          : 'bg-slate-50 text-slate-600 border-transparent hover:bg-slate-200 hover:text-slate-900'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-600' : 'bg-slate-400'}`} />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
              
              <div className="w-6 h-6 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-sm cursor-pointer ml-1">
                +
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ปรับปรุงแผนงบประมาณรอบ 6 เดือน (MID-YEAR REVISION) */}
      {activeTab === 'revision' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-3xl p-6 text-white shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold backdrop-blur-xs">
                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                  ระบบยื่นคำขอปรับปรุงแผนงบประมาณรอบ 6 เดือน (Mid-Year Budget Revision)
                </div>
                <h2 className="text-xl md:text-2xl font-bold">
                  ปรับปรุงแผนการจัดหาพัสดุ — ฝ่าย{currentDept.name}
                </h2>
                <p className="text-xs md:text-sm text-amber-100 max-w-3xl leading-relaxed">
                  สำหรับรายการที่ผ่านการอนุมัติแล้ว ท่านสามารถ <strong className="text-white">ขอปรับเพิ่มยอด, ขอลดยอด, ขอยกเลิกรายการเดิม</strong> หรือ <strong className="text-white">ขอเพิ่มรายการใหม่</strong> พร้อมระบุเหตุผลความจำเป็นเพื่อให้ฝ่ายพัสดุและผู้บริหารพิจารณา
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/25 rounded-2xl p-4 text-xs space-y-1 self-start md:self-auto min-w-[220px]">
                <div className="text-amber-100 font-medium">สถานะสิทธิ์การปรับแผน:</div>
                {isDeptUnlockedForRevision ? (
                  <div className="flex items-center gap-1.5 font-bold text-emerald-200 text-sm">
                    <Unlock className="w-4 h-4 text-emerald-300" />
                    เปิดให้ปรับแผนได้
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 font-bold text-rose-200 text-sm">
                    <Lock className="w-4 h-4 text-rose-300" />
                    ยังไม่เปิดสิทธิ์ (ติดต่อพัสดุ)
                  </div>
                )}
                {currentDeptPerm?.note && (
                  <div className="text-[11px] text-white/80 pt-1 border-t border-white/10">
                    หมายเหตุ: {currentDeptPerm.note}
                  </div>
                )}
              </div>
            </div>
          </div>

          {!isDeptUnlockedForRevision ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="font-bold text-slate-800 text-lg">ยังไม่เปิดสิทธิ์ปรับปรุงแผนสำหรับฝ่ายนี้</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  ขณะนี้ฝ่ายของท่านยังไม่ได้รับสิทธิ์เปิดแก้ไขแผนรอบ 6 เดือน หากมีความจำเป็นต้องปรับปรุงยอดหรือเพิ่มรายการ กรุณาประสานงานแจ้งเจ้าหน้าที่พัสดุเพื่อทำการเปิดสิทธิ์ในระบบ
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Reason input for full revision package */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  วัตถุประสงค์ / เหตุผลความจำเป็นในการปรับปรุงแผนภาพรวมของฝ่าย:
                </label>
                <input
                  type="text"
                  value={overallRevisionReason}
                  onChange={e => setOverallRevisionReason(e.target.value)}
                  placeholder="ระบุเหตุผล เช่น เนื่องจากมีการจัดตั้งโครงการใหม่ หรือปริมาณงานเพิ่มขึ้นในไตรมาส 3..."
                  className="w-full px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all font-medium text-slate-800"
                />
              </div>

              {/* Table of Approved Items Available for Modification */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm md:text-base flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      1. รายการเดิมที่ได้รับอนุมัติแล้ว (สามารถปรับเปลี่ยนยอด หรือขอยกเลิก)
                    </h3>
                    <p className="text-xs text-slate-500">
                      กรอกจำนวนใหม่ที่ต้องการปรับ หรือเลือกประเภทการปรับแผนของแต่ละรายการ
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                        <th className="p-3 w-10 text-center">ลำดับ</th>
                        <th className="p-3">รายการวัสดุ</th>
                        <th className="p-3 w-28">หมวดหมู่</th>
                        <th className="p-3 text-center w-20">หน่วยนับ</th>
                        <th className="p-3 text-right w-24">ยอดเดิมที่อนุมัติ</th>
                        <th className="p-3 text-center w-36">การดำเนินการ</th>
                        <th className="p-3 text-right w-28">ยอดที่ขอใหม่</th>
                        <th className="p-3 text-center w-24">ผลต่าง (+/-)</th>
                        <th className="p-3">เหตุผลการปรับของรายการนี้</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {requests
                        .filter(r => r.deptId === selectedDeptId && (r.status === 'approved' || r.isApproved || r.isRevisionItem))
                        .map((r, idx) => {
                          const baseQty = r.revisionBaseQty !== undefined ? r.revisionBaseQty : (r.qtyOriginal ?? r.qtyRequested);
                          const inputState = revisionInputs[r.itemName] ?? {
                            qty: r.qtyRequested,
                            type: r.revisionType ?? 'modify',
                            reason: r.revisionReason ?? ''
                          };
                          const newQty = inputState.type === 'cancel' ? 0 : inputState.qty;
                          const diff = newQty - baseQty;

                          return (
                            <tr key={r.id} className="hover:bg-slate-50/70">
                              <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                              <td className="p-3 font-bold text-slate-900">
                                {r.itemName}
                              </td>
                              <td className="p-3 text-slate-500">{CATEGORY_LABELS[getItemCategory(r.itemName)]}</td>
                              <td className="p-3 text-center text-slate-600">{r.unit || guessUnit(r.itemName)}</td>
                              <td className="p-3 text-right font-mono font-bold text-slate-600">
                                {baseQty}
                              </td>
                              <td className="p-3 text-center">
                                <select
                                  value={inputState.type}
                                  onChange={e => {
                                    const val = e.target.value as 'modify' | 'cancel';
                                    setRevisionInputs(prev => ({
                                      ...prev,
                                      [r.itemName]: {
                                        ...inputState,
                                        type: val,
                                        qty: val === 'cancel' ? 0 : inputState.qty
                                      }
                                    }));
                                  }}
                                  className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                                >
                                  <option value="modify">ปรับเปลี่ยนยอด</option>
                                  <option value="cancel">ขอยกเลิกรายการ</option>
                                </select>
                              </td>
                              <td className="p-3 text-right">
                                {inputState.type === 'cancel' ? (
                                  <span className="text-rose-600 font-bold font-mono">0 (ยกเลิก)</span>
                                ) : (
                                  <input
                                    type="number"
                                    min="0"
                                    value={inputState.qty}
                                    onChange={e => {
                                      const num = Math.max(0, parseInt(e.target.value, 10) || 0);
                                      setRevisionInputs(prev => ({
                                        ...prev,
                                        [r.itemName]: {
                                          ...inputState,
                                          qty: num
                                        }
                                      }));
                                    }}
                                    className="w-20 px-2 py-1 bg-white border border-slate-200 rounded-lg text-right font-mono font-bold text-xs focus:ring-1 focus:ring-amber-500"
                                  />
                                )}
                              </td>
                              <td className="p-3 text-center font-mono font-bold">
                                {diff > 0 ? (
                                  <span className="text-emerald-600">+{diff}</span>
                                ) : diff < 0 ? (
                                  <span className="text-rose-600">{diff}</span>
                                ) : (
                                  <span className="text-slate-400">0</span>
                                )}
                              </td>
                              <td className="p-3">
                                <input
                                  type="text"
                                  placeholder="ระบุเหตุผล เช่น ยอดเดิมไม่พอ / งานเพิ่ม..."
                                  value={inputState.reason}
                                  onChange={e => {
                                    setRevisionInputs(prev => ({
                                      ...prev,
                                      [r.itemName]: {
                                        ...inputState,
                                        reason: e.target.value
                                      }
                                    }));
                                  }}
                                  className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                                />
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Submit Revision Plan Button */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const approvedItems = requests.filter(r => r.deptId === selectedDeptId && (r.status === 'approved' || r.isApproved || r.isRevisionItem));
                    const itemsPayload = approvedItems.map(r => {
                      const baseQty = r.revisionBaseQty !== undefined ? r.revisionBaseQty : (r.qtyOriginal ?? r.qtyRequested);
                      const inputState = revisionInputs[r.itemName] ?? {
                        qty: r.qtyRequested,
                        type: r.revisionType ?? 'modify',
                        reason: r.revisionReason ?? ''
                      };
                      return {
                        itemName: r.itemName,
                        qtyRequested: inputState.type === 'cancel' ? 0 : inputState.qty,
                        revisionType: inputState.type,
                        revisionBaseQty: baseQty,
                        revisionReason: inputState.reason
                      };
                    });

                    onRequestConfirm({
                      title: 'ยืนยันการส่งคำขอปรับปรุงแผนงบประมาณรอบ 6 เดือน',
                      message: `คุณต้องการส่งคำขอปรับปรุงแผนของ "${currentDept.name}" จำนวน ${itemsPayload.length} รายการ ไปยังฝ่ายพัสดุเพื่อพิจารณาหรือไม่?`,
                      confirmText: 'ส่งคำขอปรับแผน',
                      variant: 'primary',
                      onConfirm: () => {
                        if (onSubmitRevisionPlan) {
                          onSubmitRevisionPlan(selectedDeptId, itemsPayload, overallRevisionReason);
                          onToastAlert('ส่งคำขอปรับปรุงแผนงบประมาณเรียบร้อยแล้ว!', 'success');
                          setActiveTab('submitted');
                        }
                      }
                    });
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-2xl font-bold text-sm shadow-md flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
                >
                  <Send className="w-4 h-4" />
                  ส่งคำขอปรับปรุงแผนงบประมาณรอบ 6 เดือน
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hidden Printable Area for PDF Export */}
      <div id="printable-excel-area" className="hidden print:block text-slate-950 font-sans bg-white p-8">
        {reportSubmittedCats.map((catId, catIdx) => {
          const catLabel = CATEGORY_LABELS[catId] || catId;
          const items = reportSubmittedRequests.filter(r => getItemCategory(r.itemName) === catId);
          const deptNameStr = currentDept.name;
          const wgNameStr = workGroups.find(wg => wg.id === currentDept.workGroupId)?.name || 'ทั่วไป';

          if (items.length === 0) return null;

          return (
            <div key={catId} className={`space-y-6 ${catIdx > 0 ? 'page-break-before-always' : ''}`}>
              {/* Document Header */}
              <div className="text-center space-y-2">
                <h1 className="text-xl font-bold">
                  แบบสำรวจความต้องการใช้{catLabel} ประจำปีงบประมาณ พ.ศ. {fiscalYear} (ทั้งปี)
                </h1>
                <div className="text-sm font-semibold text-slate-700">
                  กลุ่มงาน. {wgNameStr} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; หน่วยงาน. {deptNameStr}
                </div>
              </div>

              {/* Category Name Block */}
              <div className="text-base font-bold text-slate-950 border-b-2 border-slate-900 pb-1 mt-6">
                {catLabel}
              </div>

              {/* Data Table */}
              <table className="w-full border-collapse border border-slate-900 text-sm mt-4">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-900 px-3 py-2 text-center w-16 font-bold">ลำดับ</th>
                    <th className="border border-slate-900 px-4 py-2 text-left font-bold">รายการ</th>
                    <th className="border border-slate-900 px-3 py-2 text-center w-24 font-bold">หน่วย</th>
                    <th className="border border-slate-900 px-3 py-2 text-right w-24 font-bold">จำนวน</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r, idx) => (
                    <tr key={r.id}>
                      <td className="border border-slate-900 px-3 py-2 text-center font-mono">{idx + 1}</td>
                      <td className="border border-slate-900 px-4 py-2 text-left">{r.itemName}</td>
                      <td className="border border-slate-900 px-3 py-2 text-center">{r.unit || guessUnit(r.itemName)}</td>
                      <td className="border border-slate-900 px-3 py-2 text-right font-mono font-semibold">{r.qtyRequested}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
      {/* Audit Trail Modal */}
      {selectedAuditItem && (
        <AuditTrailModal
          item={selectedAuditItem}
          onClose={() => setSelectedAuditItem(null)}
        />
      )}
    </div>
  );
};

