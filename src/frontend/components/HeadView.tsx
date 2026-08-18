import React, { useState, useMemo } from 'react';
import { CategoryId, RequestItem, User, WorkGroup } from '../types';
import { CategoryBadge } from './CategoryBadge';
import { ALL_ITEMS, CATALOG, CATEGORY_LABELS, CATEGORY_ORDER, DEPARTMENTS, deptById, getItemCategory, guessUnit } from '../data/catalog';
import { CompareGrid } from './CompareGrid';
import { PaginationBar } from './PaginationBar';
import { TableControlPanel, SortOption } from './TableControlPanel';
import { AuditTrailModal } from './AuditTrailModal';
import { sortItems } from '../utils/sortHelper';
import * as XLSX from 'xlsx';
import { 
  Check, 
  X, 
  CheckCheck, 
  Info, 
  BarChart3, 
  Inbox, 
  ArrowUpDown, 
  RotateCcw, 
  AlertTriangle, 
  User as UserIcon, 
  Building2, 
  CheckSquare, 
  Flame, 
  Filter,
  CheckCircle2,
  Search,
  AlertCircle,
  Clock,
  FileText,
  Download,
  UserCheck,
  PackageCheck,
  Crown,
  TrendingDown,
  TrendingUp,
  Minus,
  ShieldCheck,
  History
} from 'lucide-react';

interface HeadViewProps {
  currentUser: User;
  requests: RequestItem[];
  fiscalYear: string;
  onApproveItem: (id: string, newQty?: number) => void;
  onRejectItem: (id: string, comment: string) => void;
  onApproveAll: (deptId: string, updatedQtys: Record<string, number>) => void;
  isPlanFrozen: boolean;
  onRequestConfirm: (opts: { title: string; message: string; confirmText?: string; variant?: 'primary' | 'danger' | 'warning'; onConfirm: () => void }) => void;
  onToastAlert: (msg: string, type?: 'success' | 'error' | 'info') => void;
  workGroups?: WorkGroup[];
}

export const HeadView: React.FC<HeadViewProps> = ({
  currentUser,
  requests,
  fiscalYear,
  onApproveItem,
  onRejectItem,
  onApproveAll,
  isPlanFrozen,
  onRequestConfirm,
  onToastAlert,
  workGroups = []
}) => {
  const isAdmin = currentUser.role === 'admin';
  const [selectedDeptId, setSelectedDeptId] = useState<string>(currentUser.deptId || 'thurakan');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'itemName' | 'requester' | 'lastYear' | 'requested' | 'increase'>('itemName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [activeTab, setActiveTab] = useState<'pending' | 'rejected' | 'submitted' | 'recent' | 'compare'>('pending');
  const [selectedAuditItem, setSelectedAuditItem] = useState<RequestItem | null>(null);

  // Additional states for rejected & submitted tabs
  const [rejectedCurrentPage, setRejectedCurrentPage] = useState(1);
  const [rejectedPageSize, setRejectedPageSize] = useState<number>(10);
  const [rejectedFilter, setRejectedFilter] = useState<'all' | 'head' | 'proc' | 'prochead' | 'exec'>('all');

  const [submittedCurrentPage, setSubmittedCurrentPage] = useState(1);
  const [submittedPageSize, setSubmittedPageSize] = useState<number>(10);

  const [activeSheetCat, setActiveSheetCat] = useState<CategoryId>('office');

  // Quick Filter & Selection States
  const [quickFilterMode, setQuickFilterMode] = useState<'all' | 'over50' | 'normal'>('all');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  const [qtyEdits, setQtyEdits] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});

  const [pageSize, setPageSize] = useState<number | 'all'>(10);
  const [currentPage, setCurrentPage] = useState(1);

  const currentDept = deptById(selectedDeptId);

  // Calculate percentage increase and anomaly status
  const getIncreaseInfo = (r: RequestItem) => {
    const qtyLast = r.qtyLastYear || 0;
    const qtyReq = qtyEdits[r.id] !== undefined ? qtyEdits[r.id] : r.qtyRequested;
    let pct = 0;
    if (qtyLast > 0) {
      pct = Math.round(((qtyReq - qtyLast) / qtyLast) * 100);
    } else if (qtyReq > 0) {
      pct = 100;
    }
    return {
      qtyLast,
      qtyReq,
      pct,
      isOver50: pct > 50,
      isOver100: pct > 100
    };
  };

  const allDeptPending = requests.filter(r => r.deptId === selectedDeptId && r.status === 'pending_head');

  // 1. All department requests unfiltered (except by selectedDeptId):
  const rawDeptRequests = useMemo(() => {
    return requests.filter(r => r.deptId === selectedDeptId);
  }, [requests, selectedDeptId]);

  // For Rejected Tab:
  const rejectedRequests = useMemo(() => {
    return rawDeptRequests.filter(r => r.status === 'rejected');
  }, [rawDeptRequests]);

  const countRejectedHead = useMemo(() => rejectedRequests.filter(r => r.rejectedByRole === 'head' || (!r.rejectedByRole && r.comment.includes('หัวหน้า') && !r.comment.includes('พัสดุ'))).length, [rejectedRequests]);
  const countRejectedProc = useMemo(() => rejectedRequests.filter(r => r.rejectedByRole === 'proc' || (!r.rejectedByRole && (r.comment.includes('เจ้าหน้าที่') || r.comment.includes('ฝ่ายพัสดุ') || r.comment.includes('พัสดุตีกลับ')) && !r.comment.includes('หัวหน้าพัสดุ') && !r.comment.includes('หัวหน้าวัสดุ'))).length, [rejectedRequests]);
  const countRejectedProcHead = useMemo(() => rejectedRequests.filter(r => r.rejectedByRole === 'prochead' || (!r.rejectedByRole && (r.comment.includes('หัวหน้าพัสดุ') || r.comment.includes('หัวหน้าวัสดุ')))).length, [rejectedRequests]);
  const countRejectedExec = useMemo(() => rejectedRequests.filter(r => r.rejectedByRole === 'exec' || (!r.rejectedByRole && (r.comment.includes('ผู้บริหาร') || r.comment.includes('งบประมาณ')))).length, [rejectedRequests]);

  const filteredRejectedRequests = useMemo(() => {
    return rejectedRequests.filter(r => {
      // Filter by category
      const matchesCat = selectedCategory === 'all' || getItemCategory(r.itemName) === selectedCategory;
      // Filter by search term
      const matchesSearch = !searchTerm.trim() || r.itemName.toLowerCase().includes(searchTerm.toLowerCase().trim());
      // Filter by rejection type
      let matchesFilter = true;
      if (rejectedFilter === 'head') {
        matchesFilter = r.rejectedByRole === 'head' || (!r.rejectedByRole && r.comment.includes('หัวหน้า') && !r.comment.includes('พัสดุ'));
      } else if (rejectedFilter === 'proc') {
        matchesFilter = r.rejectedByRole === 'proc' || (!r.rejectedByRole && (r.comment.includes('เจ้าหน้าที่') || r.comment.includes('ฝ่ายพัสดุ') || r.comment.includes('พัสดุตีกลับ')) && !r.comment.includes('หัวหน้าพัสดุ') && !r.comment.includes('หัวหน้าวัสดุ'));
      } else if (rejectedFilter === 'prochead') {
        matchesFilter = r.rejectedByRole === 'prochead' || (!r.rejectedByRole && (r.comment.includes('หัวหน้าพัสดุ') || r.comment.includes('หัวหน้าวัสดุ')));
      } else if (rejectedFilter === 'exec') {
        matchesFilter = r.rejectedByRole === 'exec' || (!r.rejectedByRole && (r.comment.includes('ผู้บริหาร') || r.comment.includes('งบประมาณ')));
      }
      return matchesCat && matchesSearch && matchesFilter;
    });
  }, [rejectedRequests, selectedCategory, searchTerm, rejectedFilter]);

  // For Submitted Tab:
  const submittedRequests = useMemo(() => {
    // submitted = not rejected, and not pending_head
    return rawDeptRequests.filter(r => r.status !== 'rejected' && r.status !== 'pending_head');
  }, [rawDeptRequests]);

  const filteredSubmittedRequests = useMemo(() => {
    return submittedRequests.filter(r => {
      const matchesCat = selectedCategory === 'all' || getItemCategory(r.itemName) === selectedCategory;
      const matchesSearch = !searchTerm.trim() || r.itemName.toLowerCase().includes(searchTerm.toLowerCase().trim());
      return matchesCat && matchesSearch;
    });
  }, [submittedRequests, selectedCategory, searchTerm]);

  // For Recent Tab (Simulated Excel Sheet):
  // Unfiltered requests for the comprehensive survey report tab (includes pending_head so they can see/print the whole survey report)
  const reportRequests = useMemo(() => {
    return rawDeptRequests.filter(r => r.status !== 'rejected');
  }, [rawDeptRequests]);

  const reportCats = useMemo(() => {
    const cats = new Set<CategoryId>();
    reportRequests.forEach(r => {
      cats.add(getItemCategory(r.itemName));
    });
    return Array.from(cats).length > 0 ? Array.from(cats) : (['office', 'samnak', 'kitchen', 'electric', 'computer'] as CategoryId[]);
  }, [reportRequests]);

  const reportFinalActiveSheetCat = useMemo(() => {
    if (reportCats.includes(activeSheetCat)) return activeSheetCat;
    return reportCats[0] || 'office';
  }, [reportCats, activeSheetCat]);

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

  const totalOver50Count = allDeptPending.filter(r => getIncreaseInfo(r).isOver50).length;
  const totalNormalCount = allDeptPending.filter(r => !getIncreaseInfo(r).isOver50).length;

  const pendingFiltered = allDeptPending.filter(r => {
    const matchesCat = selectedCategory === 'all' || getItemCategory(r.itemName) === selectedCategory;
    const matchesSearch = !searchTerm.trim() || 
      r.itemName.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
      (r.requesterName && r.requesterName.toLowerCase().includes(searchTerm.toLowerCase().trim())) ||
      (r.requesterSubDept && r.requesterSubDept.toLowerCase().includes(searchTerm.toLowerCase().trim()));
    
    const incInfo = getIncreaseInfo(r);
    let matchesQuickFilter = true;
    if (quickFilterMode === 'over50') {
      matchesQuickFilter = incInfo.isOver50;
    } else if (quickFilterMode === 'normal') {
      matchesQuickFilter = !incInfo.isOver50;
    }

    return matchesCat && matchesSearch && matchesQuickFilter;
  });

  const handleExportExcel = () => {
    if (reportRequests.length === 0) {
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
        
        reportRequests.forEach(r => {
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
    if (reportRequests.length === 0) {
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

  const handleHeaderSort = (field: 'itemName' | 'requester' | 'lastYear' | 'requested' | 'increase') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedPending = [...pendingFiltered].sort((a, b) => {
    let res = 0;
    if (sortField === 'itemName') {
      res = a.itemName.localeCompare(b.itemName, 'th');
    } else if (sortField === 'requester') {
      const nameA = `${a.requesterName || ''} - ${a.requesterSubDept || ''}`;
      const nameB = `${b.requesterName || ''} - ${b.requesterSubDept || ''}`;
      res = nameA.localeCompare(nameB, 'th');
    } else if (sortField === 'lastYear') {
      res = a.qtyLastYear - b.qtyLastYear;
    } else if (sortField === 'requested') {
      const qtyA = qtyEdits[a.id] ?? a.qtyRequested;
      const qtyB = qtyEdits[b.id] ?? b.qtyRequested;
      res = qtyA - qtyB;
    } else if (sortField === 'increase') {
      res = getIncreaseInfo(a).pct - getIncreaseInfo(b).pct;
    }
    return sortOrder === 'asc' ? res : -res;
  });

  const handleQtyChange = (id: string, val: string) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setQtyEdits(prev => ({ ...prev, [id]: num }));
  };

  const handleCommentChange = (id: string, val: string) => {
    setComments(prev => ({ ...prev, [id]: val }));
  };

  // Toggle Over 50% Filter & Auto-Select
  const handleToggleOver50 = () => {
    if (quickFilterMode === 'over50') {
      setQuickFilterMode('all');
      setSelectedItemIds(new Set());
      onToastAlert('ยกเลิกการกรองและการเลือกรายการเรียบร้อยแล้ว', 'info');
    } else {
      setQuickFilterMode('over50');
      setCurrentPage(1);

      const targetOver50 = allDeptPending.filter(r => {
        const matchesCat = selectedCategory === 'all' || getItemCategory(r.itemName) === selectedCategory;
        const matchesSearch = !searchTerm.trim() || 
          r.itemName.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
          (r.requesterName && r.requesterName.toLowerCase().includes(searchTerm.toLowerCase().trim())) ||
          (r.requesterSubDept && r.requesterSubDept.toLowerCase().includes(searchTerm.toLowerCase().trim()));
        return matchesCat && matchesSearch && getIncreaseInfo(r).isOver50;
      });

      setSelectedItemIds(new Set(targetOver50.map(r => r.id)));
      if (targetOver50.length > 0) {
        onToastAlert(`แสดงและเลือกเฉพาะรายการพุ่งเกิน 50% ทั้งหมด (${targetOver50.length} รายการ)`, 'success');
      } else {
        onToastAlert('ไม่พบรายการพุ่งเกิน 50% ในเงื่อนไขการค้นหานี้', 'info');
      }
    }
  };

  // Toggle Normal Items Filter (<=50%) & Auto-Select
  const handleToggleNormal = () => {
    if (quickFilterMode === 'normal') {
      setQuickFilterMode('all');
      setSelectedItemIds(new Set());
      onToastAlert('ยกเลิกการกรองและการเลือกรายการเรียบร้อยแล้ว', 'info');
    } else {
      setQuickFilterMode('normal');
      setCurrentPage(1);

      const targetNormal = allDeptPending.filter(r => {
        const matchesCat = selectedCategory === 'all' || getItemCategory(r.itemName) === selectedCategory;
        const matchesSearch = !searchTerm.trim() || 
          r.itemName.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
          (r.requesterName && r.requesterName.toLowerCase().includes(searchTerm.toLowerCase().trim())) ||
          (r.requesterSubDept && r.requesterSubDept.toLowerCase().includes(searchTerm.toLowerCase().trim()));
        return matchesCat && matchesSearch && !getIncreaseInfo(r).isOver50;
      });

      setSelectedItemIds(new Set(targetNormal.map(r => r.id)));
      if (targetNormal.length > 0) {
        onToastAlert(`แสดงและเลือกเฉพาะรายการปกติทั้งหมด (${targetNormal.length} รายการ)`, 'success');
      } else {
        onToastAlert('ไม่พบรายการปกติในเงื่อนไขการค้นหานี้', 'info');
      }
    }
  };

  const handleApproveSelected = () => {
    const selectedList = pendingFiltered.filter(r => selectedItemIds.has(r.id));
    if (selectedList.length === 0) return;

    onRequestConfirm({
      title: 'ยืนยันการอนุมัติรายการที่เลือก',
      message: `คุณต้องการอนุมัติรายการพัสดุที่เลือกจำนวน ${selectedList.length} รายการ ของแผนก ${currentDept.name} หรือไม่?`,
      confirmText: `อนุมัติ ${selectedList.length} รายการ`,
      variant: 'primary',
      onConfirm: () => {
        selectedList.forEach(r => {
          const editQty = qtyEdits[r.id] !== undefined ? qtyEdits[r.id] : r.qtyRequested;
          onApproveItem(r.id, editQty);
        });
        setSelectedItemIds(new Set());
        onToastAlert(`อนุมัติรายการที่เลือกจำนวน ${selectedList.length} รายการ เรียบร้อยแล้ว`, 'success');
      }
    });
  };

  const handleRejectSelected = () => {
    const selectedList = pendingFiltered.filter(r => selectedItemIds.has(r.id));
    if (selectedList.length === 0) return;

    onRequestConfirm({
      title: 'ยืนยันการตีกลับรายการที่เลือก',
      message: `คุณต้องการตีกลับรายการพัสดุที่เลือกจำนวน ${selectedList.length} รายการ ของแผนก ${currentDept.name} ให้ผู้ขอปรับปรุงแก้ไขหรือไม่?`,
      confirmText: `ตีกลับ ${selectedList.length} รายการ`,
      variant: 'danger',
      onConfirm: () => {
        selectedList.forEach(r => {
          const comment = comments[r.id] || 'หัวหน้ากลุ่มงาน/ฝ่ายขอให้ตรวจสอบและปรับลดจำนวนที่ขอเสนอพุ่งผิดปกติ';
          onRejectItem(r.id, comment);
        });
        setSelectedItemIds(new Set());
        onToastAlert(`ตีกลับรายการที่เลือกจำนวน ${selectedList.length} รายการ เรียบร้อยแล้ว`, 'info');
      }
    });
  };

  const handleApproveSingle = (r: RequestItem) => {
    const editQty = qtyEdits[r.id] !== undefined ? qtyEdits[r.id] : r.qtyRequested;
    
    onRequestConfirm({
      title: 'ยืนยันการอนุมัติรายการพัสดุ',
      message: `คุณต้องการอนุมัติรายการ '${r.itemName}' จำนวน ${editQty} ${r.unit} สำหรับแผนก ${currentDept.name} เพื่อส่งต่อให้ฝ่ายพัสดุหรือไม่?`,
      confirmText: 'อนุมัติรายการ',
      variant: 'primary',
      onConfirm: () => {
        onApproveItem(r.id, editQty);
        onToastAlert(`อนุมัติรายการ '${r.itemName}' (${editQty} ${r.unit}) เรียบร้อยแล้ว`, 'success');
      }
    });
  };

  const handleRejectSingle = (r: RequestItem) => {
    const comment = comments[r.id] || 'หัวหน้ากลุ่มงาน/ฝ่ายขอให้ตรวจสอบจำนวนใหม่อีกครั้ง';
    
    onRequestConfirm({
      title: 'ยืนยันการตีกลับรายการพัสดุ',
      message: `คุณต้องการตีกลับรายการ '${r.itemName}' ให้ผู้ขอปรับปรุงแก้ไขโดยระบุหมายเหตุ: "${comment}" หรือไม่?`,
      confirmText: 'ยืนยันตีกลับ',
      variant: 'danger',
      onConfirm: () => {
        onRejectItem(r.id, comment);
        onToastAlert(`ตีกลับรายการ '${r.itemName}' เรียบร้อยแล้ว`, 'info');
      }
    });
  };

  const handleApproveAllBatch = () => {
    if (pendingFiltered.length === 0) return;

    onRequestConfirm({
      title: 'ยืนยันการอนุมัติคำขอทั้งหมด',
      message: `คุณต้องการอนุมัติรายการคำขอค้างอนุมัติทั้งหมดจำนวน ${pendingFiltered.length} รายการ ของแผนก ${currentDept.name} เพื่อส่งต่อฝ่ายพัสดุหรือไม่?`,
      confirmText: 'อนุมัติทั้งหมด',
      variant: 'primary',
      onConfirm: () => {
        onApproveAll(selectedDeptId, qtyEdits);
        onToastAlert(`อนุมัติรายการคำขอทั้งหมดของ ${currentDept.name} (${pendingFiltered.length} รายการ) สำเร็จ!`, 'success');
      }
    });
  };

  // Helper for CompareGrid looking up department requests
  const getDeptQtyRequested = (itemName: string): number | null => {
    const r = requests.find(req => req.deptId === selectedDeptId && req.itemName === itemName);
    return r ? r.qtyRequested : null;
  };

  // Pagination slice
  const numericSize = pageSize === 'all' ? sortedPending.length || 1 : pageSize;
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(sortedPending.length / numericSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageRequests = pageSize === 'all' ? sortedPending : sortedPending.slice((safePage - 1) * numericSize, safePage * numericSize);

  return (
    <div className="space-y-5">
      {/* Tabs Row */}
      <div className="flex bg-slate-200/80 p-1 rounded-2xl gap-1 text-xs font-semibold w-fit max-w-full overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'pending'
              ? 'bg-white text-slate-900 shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Inbox className="w-4 h-4 text-indigo-600" />
          <span>คำขอรออนุมัติ ({pendingFiltered.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('recent')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
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
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'submitted'
              ? 'bg-white text-slate-900 shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>คำขอที่ส่งยื่นเรียบร้อยแล้ว ({submittedRequests.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('rejected')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'rejected'
              ? 'bg-white text-slate-900 shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>รายการที่ถูกตีกลับให้แก้ไข ({rejectedRequests.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('compare')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'compare'
              ? 'bg-white text-slate-900 shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-amber-600" />
          <span>เปรียบเทียบย้อนหลัง 5 ปี</span>
        </button>
      </div>

      {/* Table Control Panel */}
      <TableControlPanel
        title={
          activeTab === 'pending'
            ? "คำขอพัสดุรอพิจารณาอนุมัติ"
            : activeTab === 'rejected'
            ? "รายการที่ถูกตีกลับของแผนก"
            : activeTab === 'submitted'
            ? "คำขอที่อนุมัติส่งยื่นเรียบร้อยแล้ว"
            : activeTab === 'recent'
            ? "รายงานแบบสำรวจความต้องการวัสดุจำแนกตามประเภทพัสดุ"
            : "เปรียบเทียบแผนพัสดุสะสมย้อนหลัง 5 ปี"
        }
        categoryLabel={selectedCategory === 'all' ? 'ทุกประเภท' : CATEGORY_LABELS[selectedCategory]}
        departmentName={currentDept.name}
        fiscalYear={fiscalYear}
        totalCount={
          activeTab === 'pending'
            ? pendingFiltered.length
            : activeTab === 'rejected'
            ? filteredRejectedRequests.length
            : activeTab === 'submitted'
            ? filteredSubmittedRequests.length
            : 0
        }
        selectedCategory={selectedCategory}
        onCategoryChange={cat => {
          setSelectedCategory(cat);
          setCurrentPage(1);
          setRejectedCurrentPage(1);
          setSubmittedCurrentPage(1);
        }}
        showCategoryFilter={activeTab !== 'recent' && activeTab !== 'compare'}
        departments={DEPARTMENTS}
        selectedDeptId={selectedDeptId}
        onDeptChange={deptId => {
          setSelectedDeptId(deptId);
          setSelectedItemIds(new Set());
          setCurrentPage(1);
          setRejectedCurrentPage(1);
          setSubmittedCurrentPage(1);
        }}
        showDeptFilter={isAdmin}
        showSearch={false}
      />

      {/* Pending Tab Content */}
      {activeTab === 'pending' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
          {/* Combined Quick Filter & Batch Actions Toolbar */}
          <div className={`border rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs transition-all duration-200 ${
            selectedItemIds.size > 0 
              ? 'bg-indigo-50/90 border-indigo-200 ring-1 ring-indigo-300/60' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            {/* Left Controls: Search Box + Filter Buttons + Status Info */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* ช่องค้นหารายการวัสดุ */}
              <div className="relative w-full sm:w-60">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="ค้นหารายการวัสดุ..."
                  className="w-full bg-white border border-slate-300 pl-8 pr-3 py-1.5 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 shadow-2xs"
                />
              </div>

              {/* ปุ่มตัวกรองด่วน "🔥 เพิ่มเกิน 50%" */}
              <button
                type="button"
                onClick={handleToggleOver50}
                className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                  quickFilterMode === 'over50'
                    ? 'bg-amber-600 text-white border-amber-700 ring-2 ring-amber-400 shadow-xs'
                    : 'bg-white text-amber-900 border-amber-200 hover:bg-amber-100'
                }`}
                title="กดสลับแสดงและเลือกเฉพาะรายการที่เสนอขอสูงกว่ายอดใช้จริงปีที่แล้วเกิน 50%"
              >
                <Flame className={`w-3.5 h-3.5 ${quickFilterMode === 'over50' ? 'text-amber-200 animate-pulse' : 'text-amber-600'}`} />
                <span>🔥 เพิ่มเกิน 50%</span>
                <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-mono font-extrabold ${
                  quickFilterMode === 'over50' ? 'bg-amber-800 text-white' : 'bg-amber-100 text-amber-900 border border-amber-200'
                }`}>
                  {totalOver50Count}
                </span>
              </button>

              {/* ปุ่มตัวกรองด่วน "รายการปกติ" */}
              <button
                type="button"
                onClick={handleToggleNormal}
                className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                  quickFilterMode === 'normal'
                    ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-400 shadow-xs'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}
                title="กดสลับแสดงและเลือกเฉพาะรายการปกติ (ขอเพิ่มไม่เกิน 50%)"
              >
                <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${quickFilterMode === 'normal' ? 'text-white animate-pulse' : 'text-emerald-600'}`} />
                <span>รายการปกติ</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10.5px] font-mono font-extrabold ${
                  quickFilterMode === 'normal' ? 'bg-emerald-800 text-white' : 'bg-emerald-200 text-emerald-950'
                }`}>
                  {totalNormalCount}
                </span>
              </button>

              {/* Display Selection Info Badge when items are selected */}
              {selectedItemIds.size > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-indigo-950 font-bold bg-indigo-100 border border-indigo-300/80 px-3 py-1 rounded-xl shadow-2xs animate-in fade-in duration-150">
                  <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>เลือกไว้ <strong className="text-indigo-700 font-extrabold text-sm">{selectedItemIds.size}</strong> รายการ</span>
                </div>
              )}
            </div>

            {/* Right Controls: Batch Action Buttons or Total Count */}
            {selectedItemIds.size > 0 ? (
              <div className="flex items-center gap-2 flex-wrap animate-in fade-in duration-150">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedItemIds(new Set());
                    setQuickFilterMode('all');
                  }}
                  className="px-2.5 py-1.5 text-slate-600 hover:text-slate-900 font-medium hover:underline cursor-pointer text-xs"
                >
                  ล้างการเลือก
                </button>
                <button
                  type="button"
                  disabled={isPlanFrozen}
                  onClick={handleRejectSelected}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  ตีกลับรายการที่เลือก ({selectedItemIds.size})
                </button>
                <button
                  type="button"
                  disabled={isPlanFrozen}
                  onClick={handleApproveSelected}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  อนุมัติรายการที่เลือก ({selectedItemIds.size})
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>รายการค้างอนุมัติ: <strong className="text-slate-800 font-bold font-mono">{allDeptPending.length}</strong> รายการ</span>
              </div>
            )}
          </div>

          {sortedPending.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              <Inbox className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              {quickFilterMode === 'over50' 
                ? 'ไม่พบรายการที่เสนอยอดขอเพิ่มขึ้นเกิน 50% ในขณะนี้'
                : quickFilterMode === 'normal'
                ? 'ไม่พบรายการปกติ (ขอเพิ่มไม่เกิน 50%) ในขณะนี้'
                : 'ไม่มีรายการคำขอค้างอนุมัติสำหรับแผนกนี้ในขณะนี้'}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-base text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-mono text-sm border-b border-slate-200 select-none">
                    <tr>
                      <th className="p-2.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={pageRequests.length > 0 && pageRequests.every(r => selectedItemIds.has(r.id))}
                          onChange={e => {
                            const next = new Set(selectedItemIds);
                            if (e.target.checked) {
                              pageRequests.forEach(r => next.add(r.id));
                            } else {
                              pageRequests.forEach(r => next.delete(r.id));
                            }
                            setSelectedItemIds(next);
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          title="เลือก / ยกเลิก ทั้งหมดในหน้านี้"
                        />
                      </th>
                      <th 
                        onClick={() => handleHeaderSort('itemName')}
                        className="p-2.5 w-1/4 cursor-pointer hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          <span>รายการ / คำขอ</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      {/* คอลัมน์ระบุตัวตนผู้ขอ (Requirement #1) */}
                      <th 
                        onClick={() => handleHeaderSort('requester')}
                        className="p-2.5 cursor-pointer hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          <span>ผู้เสนอขอ / หน่วยงานย่อย</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="p-2.5">ประเภทวัสดุ</th>
                      <th 
                        onClick={() => handleHeaderSort('lastYear')}
                        className="p-2.5 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>ปี 2568</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th 
                        onClick={() => handleHeaderSort('requested')}
                        className="p-2.5 text-right w-32 cursor-pointer hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>ขอ / ปรับจำนวน</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th 
                        onClick={() => handleHeaderSort('increase')}
                        className="p-2.5 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>การขอเพิ่ม</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="p-2.5">เหตุผลการตีกลับ (ถ้ามี)</th>
                      <th className="p-2.5 text-right w-40">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pageRequests.map(r => {
                      const incInfo = getIncreaseInfo(r);
                      const isSelected = selectedItemIds.has(r.id);

                      return (
                        <tr 
                          key={r.id} 
                          className={`transition-colors ${
                            isSelected ? 'bg-indigo-50/70 hover:bg-indigo-50' : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={e => {
                                const next = new Set(selectedItemIds);
                                if (e.target.checked) {
                                  next.add(r.id);
                                } else {
                                  next.delete(r.id);
                                }
                                setSelectedItemIds(next);
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>

                          {/* ชื่อรายการ & แสดงป้ายเตือนความผิดปกติ ⚠ ผิดปกติ (+X%) (Requirement #4) */}
                          <td className="p-2.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 text-xs">{r.itemName}</span>
                              
                              {incInfo.isOver50 && (
                                <span
                                  className={`inline-flex items-center gap-1 text-[10.5px] font-extrabold px-2 py-0.5 rounded-md border shadow-2xs ${
                                    incInfo.isOver100
                                      ? 'bg-rose-950 text-rose-100 border-rose-800 ring-1 ring-rose-500 animate-pulse'
                                      : 'bg-amber-100 text-amber-900 border-amber-300'
                                  }`}
                                  title={`ยอดขอนี้สูงกว่ายอดใช้จริงปีที่แล้วเกิน ${incInfo.isOver100 ? '100%' : '50%'}`}
                                >
                                  <span>⚠</span>
                                  <span>ผิดปกติ (+{incInfo.pct}%)</span>
                                </span>
                              )}
                            </div>

                            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                              <span className="text-slate-400">เหตุผลผู้ขอ:</span>
                              <span className="italic text-slate-600">{r.reason || '—'}</span>
                            </div>

                            {r.comment && (
                              <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg mt-1.5 flex items-start gap-1 font-semibold max-w-md">
                                <span className="text-amber-600 shrink-0">⚠️ หมายเหตุตีกลับ:</span>
                                <span className="italic">{r.comment}</span>
                              </div>
                            )}
                          </td>

                          {/* คอลัมน์ระบุตัวตนผู้ขอ: ชื่อ-นามสกุลพนักงาน และ หน่วยงานย่อย (Requirement #1) */}
                          <td className="p-2.5 whitespace-nowrap">
                            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                              <UserIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span>{r.requesterName || 'สมชาย ใจดี'}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium pl-5 mt-0.5 flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{r.requesterSubDept || 'งานสารบรรณ'}</span>
                            </div>
                          </td>

                          {/* ประเภทวัสดุ */}
                          <td className="p-2.5">
                            <CategoryBadge itemName={r.itemName} />
                          </td>

                          {/* ยอดใช้จริงปี 2568 */}
                          <td className="p-2.5 text-right font-mono text-slate-600 font-medium">
                            {r.qtyLastYear} {r.unit}
                          </td>

                          {/* ขอปีนี้ / ปรับจำนวน */}
                          <td className="p-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number"
                                min="0"
                                disabled={isPlanFrozen}
                                value={qtyEdits[r.id] ?? r.qtyRequested}
                                onChange={e => handleQtyChange(r.id, e.target.value)}
                                className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-right font-mono font-bold text-indigo-900 focus:outline-none focus:border-indigo-600 disabled:bg-slate-100"
                              />
                              <span className="font-mono text-slate-500 text-[11px]">{r.unit}</span>
                            </div>
                          </td>

                          {/* เปอร์เซ็นต์ขอเพิ่ม */}
                          <td className="p-2.5 text-right font-mono">
                            <span className={`font-extrabold text-[11px] px-2 py-0.5 rounded-md ${
                              incInfo.isOver100
                                ? 'bg-rose-100 text-rose-950 font-black border border-rose-300'
                                : incInfo.isOver50
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : incInfo.pct > 0
                                ? 'text-teal-700'
                                : 'text-slate-500'
                            }`}>
                              {incInfo.pct > 0 ? `+${incInfo.pct}%` : `${incInfo.pct}%`}
                            </span>
                          </td>

                          {/* เหตุผลการตีกลับ */}
                          <td className="p-2.5">
                            <input
                              type="text"
                              disabled={isPlanFrozen}
                              value={comments[r.id] || ''}
                              onChange={e => handleCommentChange(r.id, e.target.value)}
                              placeholder="ระบุเหตุผลหากต้องการตีกลับ..."
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all placeholder:text-slate-400"
                            />
                          </td>

                          {/* ปุ่มจัดการ */}
                          <td className="p-2.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5 whitespace-nowrap flex-nowrap shrink-0">
                              <button
                                type="button"
                                onClick={() => setSelectedAuditItem(r)}
                                className="px-2.5 py-1.5 border border-slate-200 bg-white hover:bg-indigo-50 text-indigo-700 font-bold rounded-xl transition-all shadow-2xs flex items-center justify-center gap-1 text-[11.5px] cursor-pointer hover:scale-105 active:scale-95 whitespace-nowrap shrink-0"
                                title="ดูประวัติการอนุมัติและคำชี้แจง"
                              >
                                <History className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                <span className="whitespace-nowrap">ประวัติ</span>
                              </button>
                              <button
                                type="button"
                                disabled={isPlanFrozen}
                                onClick={() => handleRejectSingle(r)}
                                className="px-3 py-1.5 border border-rose-200/90 bg-rose-50/80 hover:bg-rose-100 text-rose-700 font-bold rounded-xl transition-all shadow-2xs hover:shadow-xs flex items-center justify-center gap-1.5 text-[11.5px] cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 group whitespace-nowrap shrink-0"
                                title="ตีกลับคำขอให้ผู้ขอแก้ไข"
                              >
                                <RotateCcw className="w-3.5 h-3.5 text-rose-600 transition-transform group-hover:-rotate-90 shrink-0" />
                                <span className="whitespace-nowrap">ตีกลับ</span>
                              </button>
                              <button
                                type="button"
                                disabled={isPlanFrozen}
                                onClick={() => handleApproveSingle(r)}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-1.5 text-[11.5px] cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 whitespace-nowrap shrink-0"
                              >
                                <Check className="w-3.5 h-3.5 shrink-0" />
                                <span className="whitespace-nowrap">อนุมัติ</span>
                              </button>
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
                totalItems={sortedPending.length}
                onPageSizeChange={s => { setPageSize(s); setCurrentPage(1); }}
                onPageChange={p => setCurrentPage(p)}
              />
            </>
          )}
        </div>
      )}

      {/* Rejected Tab Content */}
      {activeTab === 'rejected' && (
        <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-rose-200/60 pb-3">
            <div>
              <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
                <AlertCircle className="w-4.5 h-4.5 text-rose-600" />
                <span>รายการที่ถูกตีกลับให้แก้ไข ({filteredRejectedRequests.length} / {rejectedRequests.length} รายการ)</span>
              </div>
              <p className="text-xs text-rose-700 mt-0.5">
                คลิกเลือกปุ่มผู้ตีกลับเพื่อกรองรายการ หรือเลือก <strong>ทั้งหมด</strong> เพื่อแสดงทุกรายการ
              </p>
            </div>
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
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-rose-100/60 shadow-xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-rose-50/50 text-rose-950 uppercase font-mono font-bold border-b border-rose-100">
                  <th className="p-3">รายการพัสดุ</th>
                  <th className="p-3">ประเภท</th>
                  <th className="p-3 text-center">ผู้ตีกลับรายการ</th>
                  <th className="p-3 text-right">จำนวนที่ขอ</th>
                  <th className="p-3 text-right">หน่วย</th>
                  <th className="p-3">เหตุผลการตีกลับ / หมายเหตุ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-100/40">
                {filteredRejectedRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-semibold bg-rose-50/10">
                      <AlertCircle className="w-5 h-5 text-rose-300 mx-auto mb-1.5 animate-bounce" />
                      ไม่พบรายการที่ถูกตีกลับตามเงื่อนไขนี้
                    </td>
                  </tr>
                ) : (
                  (() => {
                    const pageStart = (rejectedCurrentPage - 1) * rejectedPageSize;
                    const pageSlice = filteredRejectedRequests.slice(pageStart, pageStart + rejectedPageSize);
                    return pageSlice.map(r => {
                      const rejRole = r.rejectedByRole;
                      const isHeadRej = rejRole === 'head' || (!rejRole && r.comment.includes('หัวหน้า') && !r.comment.includes('พัสดุ'));
                      const isProcRej = rejRole === 'proc' || (!rejRole && (r.comment.includes('เจ้าหน้าที่') || r.comment.includes('ฝ่ายพัสดุ') || r.comment.includes('พัสดุตีกลับ')) && !r.comment.includes('หัวหน้าพัสดุ') && !r.comment.includes('หัวหน้าวัสดุ'));
                      const isProcHeadRej = rejRole === 'prochead' || (!rejRole && (r.comment.includes('หัวหน้าพัสดุ') || r.comment.includes('หัวหน้าวัสดุ')));
                      const isExecRej = rejRole === 'exec' || (!rejRole && (r.comment.includes('ผู้บริหาร') || r.comment.includes('งบประมาณ')));

                      return (
                        <tr key={r.id} className="hover:bg-rose-50/30 transition-colors">
                          <td className="p-3 font-semibold text-slate-950">
                            <div>{r.itemName}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {r.id}</div>
                          </td>
                          <td className="p-3">
                            <CategoryBadge itemName={r.itemName} />
                          </td>
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
                          <td className="p-3 text-right font-mono font-bold text-slate-700 bg-slate-50/50">
                            {r.qtyOriginal ?? r.qtyRequested}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-600">
                            {r.unit || guessUnit(r.itemName)}
                          </td>
                          <td className="p-3 text-rose-950 bg-rose-50/40 rounded-lg italic text-[11.5px] leading-relaxed max-w-xs">
                            "{r.comment || 'ขอให้ทบทวนความจำเป็นและปรับปรุงใหม่อีกครั้ง'}"
                          </td>
                        </tr>
                      );
                    });
                  })()
                )}
              </tbody>
            </table>
          </div>

          {filteredRejectedRequests.length > 0 && (
            <PaginationBar
              pageSize={rejectedPageSize}
              currentPage={rejectedCurrentPage}
              totalItems={filteredRejectedRequests.length}
              onPageSizeChange={s => { setRejectedPageSize(s); setRejectedCurrentPage(1); }}
              onPageChange={p => setRejectedCurrentPage(p)}
            />
          )}
        </div>
      )}

      {/* Submitted Tab Content */}
      {activeTab === 'submitted' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 uppercase font-mono font-bold border-b border-slate-200">
                  <th className="p-3">รายการพัสดุ</th>
                  <th className="p-3">ประเภท</th>
                  <th className="p-3">ผู้ขอยื่น</th>
                  <th className="p-3 text-right">จำนวนส่งยื่น</th>
                  <th className="p-3 text-right">หน่วย</th>
                  <th className="p-3 text-center">สถานะปัจจุบัน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubmittedRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-semibold">
                      <CheckCircle2 className="w-5 h-5 text-slate-300 mx-auto mb-1.5" />
                      ยังไม่มีรายการที่ส่งยื่นเรียบร้อยแล้ว
                    </td>
                  </tr>
                ) : (
                  (() => {
                    const pageStart = (submittedCurrentPage - 1) * submittedPageSize;
                    const pageSlice = filteredSubmittedRequests.slice(pageStart, pageStart + submittedPageSize);
                    return pageSlice.map(r => {
                      const isApproved = r.status === 'approved';
                      const isPendingProc = r.status === 'pending_proc';
                      const isPendingProcHead = r.status === 'pending_proc_head';
                      const isPendingExec = r.status === 'pending_exec';

                      return (
                        <tr key={r.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="p-3 font-semibold text-slate-950">
                            <div>{r.itemName}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {r.id}</div>
                          </td>
                          <td className="p-3">
                            <CategoryBadge itemName={r.itemName} />
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-800">{r.requesterName || 'พนักงาน'}</div>
                            <div className="text-[10px] text-slate-500">{r.requesterSubDept || 'กลุ่มงานย่อย'}</div>
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            {r.qtyRequested}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-600">
                            {r.unit || guessUnit(r.itemName)}
                          </td>
                          <td className="p-3 text-center">
                            {isApproved ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-md px-2 py-0.5 text-[10px] font-bold shadow-2xs">
                                <CheckCheck className="w-3.5 h-3.5 text-emerald-700" />
                                <span>ผู้บริหารอนุมัติสำเร็จ</span>
                              </span>
                            ) : isPendingExec ? (
                              <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-900 border border-purple-200 rounded-md px-2 py-0.5 text-[10px] font-bold shadow-2xs">
                                <Crown className="w-3.5 h-3.5 text-purple-600" />
                                <span>รอผู้บริหารอนุมัติ</span>
                              </span>
                            ) : isPendingProcHead ? (
                              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-200 rounded-md px-2 py-0.5 text-[10px] font-bold shadow-2xs">
                                <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                                <span>รอหัวหน้าพัสดุอนุมัติ</span>
                              </span>
                            ) : isPendingProc ? (
                              <span className="inline-flex items-center gap-1 bg-sky-100 text-sky-900 border border-sky-200 rounded-md px-2 py-0.5 text-[10px] font-bold shadow-2xs">
                                <Clock className="w-3.5 h-3.5 text-sky-600 animate-pulse" />
                                <span>รอพัสดุตรวจสอบ</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 border border-slate-300 rounded-md px-2 py-0.5 text-[10px] font-bold shadow-2xs">
                                <span>อยู่ระหว่างดำเนินการ</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })()
                )}
              </tbody>
            </table>
          </div>

          {filteredSubmittedRequests.length > 0 && (
            <PaginationBar
              pageSize={submittedPageSize}
              currentPage={submittedCurrentPage}
              totalItems={filteredSubmittedRequests.length}
              onPageSizeChange={s => { setSubmittedPageSize(s); setSubmittedCurrentPage(1); }}
              onPageChange={p => setSubmittedCurrentPage(p)}
            />
          )}
        </div>
      )}

      {/* Recent Tab Content */}
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
                  const filteredItems = reportRequests.filter(r => getItemCategory(r.itemName) === reportFinalActiveSheetCat);
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
              {reportCats.map(catId => {
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

    {/* Hidden Printable Area for PDF Export */}
    <div id="printable-excel-area-head" className="hidden print:block text-slate-950 font-sans bg-white p-8">
      {reportCats.map((catId, catIdx) => {
        const catLabel = CATEGORY_LABELS[catId] || catId;
        const items = reportRequests.filter(r => getItemCategory(r.itemName) === catId);
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

      {/* Compare Tab Content */}
      {activeTab === 'compare' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              เปรียบเทียบสถิติย้อนหลัง 5 ปี — {currentDept.name}
            </h3>
            <p className="text-xs text-slate-500">
              แท่งสีเทา = ยอดใช้จริงย้อนหลัง 5 ปี (พ.ศ. 2564–2568) · แท่งสีเขียว/น้ำเงิน = ยอดที่ขอในปีงบประมาณ {fiscalYear} (แสดงเฉพาะรายการที่กลุ่มงานนี้เคยขอจัดซื้อเท่านั้น)
            </p>
          </div>

          {(() => {
            // 1. Items requested THIS YEAR for selected department (FY 2569 / pending requests):
            const pendingThisYear = requests.filter(r => 
              r.deptId === selectedDeptId && 
              (r.status === 'pending_head' || r.fiscalYear === fiscalYear) &&
              r.qtyRequested > 0
            );

            let itemNamesThisYear = Array.from(new Set(
              pendingThisYear.map(r => r.itemName)
            )).filter((name: string) => {
              if (selectedCategory === 'all') return true;
              const catList = CATALOG[selectedCategory] || [];
              return catList.includes(name);
            });

            // If pendingThisYear has no specific fiscalYear match, fallback to allDeptPending
            if (itemNamesThisYear.length === 0) {
              itemNamesThisYear = Array.from(new Set(allDeptPending.map(r => r.itemName))).filter((name: string) => {
                if (selectedCategory === 'all') return true;
                const catList = CATALOG[selectedCategory] || [];
                return catList.includes(name);
              });
            }

            // 2. ALL historical catalog items (169 items total across catalog):
            const currentDeptObj = DEPARTMENTS.find(d => d.id === selectedDeptId);
            const deptCat = currentDeptObj?.category || 'office';

            const allHistoricalItemNames = ALL_ITEMS.filter((name: string) => {
              if (selectedCategory === 'all') return true;
              const catList = CATALOG[selectedCategory] || [];
              return catList.includes(name);
            });

            return (
              <CompareGrid
                itemNamesThisYear={itemNamesThisYear}
                allHistoricalItemNames={allHistoricalItemNames}
                getQtyRequested={getDeptQtyRequested}
                requests={requests}
                onNavigateToPending={(itemName) => {
                  setActiveTab('pending');
                  setSearchTerm(itemName);
                  setQuickFilterMode('all');
                  if (onToastAlert) {
                    onToastAlert(`นำคุณไปยังคำขออนุมัติรายการ "${itemName}" เรียบร้อยแล้ว`, 'info');
                  }
                }}
              />
            );
          })()}
        </div>
      )}

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
