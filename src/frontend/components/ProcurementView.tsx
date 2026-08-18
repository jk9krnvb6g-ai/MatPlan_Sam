import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { CategoryId, RequestItem, User, Department, WorkGroup, DepartmentRevisionPermission } from '../types';
import { CategoryBadge } from './CategoryBadge';
import { ALL_ITEMS, CATALOG, CATEGORY_LABELS, CATEGORY_ORDER, deptName, fmtBaht, getItemCategory, guessPrice, getItemPriceForYear, guessUnit, DEPARTMENTS } from '../data/catalog';
import { CompareGrid } from './CompareGrid';
import { PaginationBar } from './PaginationBar';
import { TableControlPanel, SortOption } from './TableControlPanel';
import { AuditTrailModal } from './AuditTrailModal';
import { sortItems } from '../utils/sortHelper';
import { Info, Send, Layers, BarChart3, Calculator, ArrowUpDown, Calendar, TrendingUp, XCircle, RotateCcw, Download, Search, AlertCircle, CheckCircle2, CheckCheck, Crown, Clock, Filter, UserCheck, PackageCheck, ShieldCheck, Database, FileEdit, Unlock, Lock, Sparkles, History, PlusCircle } from 'lucide-react';

interface ProcurementViewProps {
  currentUser: User;
  requests: RequestItem[];
  itemPrices: Record<string, number>;
  fiscalYear: string;
  departments?: Department[];
  workGroups?: WorkGroup[];
  revisionPermissions?: Record<string, DepartmentRevisionPermission>;
  onUnlockRevision?: (deptId: string, isUnlocked: boolean, note?: string, expiresAt?: string) => void;
  onUpdateUnitPrice: (itemName: string, price: number) => void;
  onUpdateQty: (requestId: string, newQty: number) => void;
  onSubmitToProcHead: (specificIds?: string[]) => void;
  onRejectRequest: (id: string, comment: string, action: 'return' | 'reject') => void;
  isPlanFrozen: boolean;
  onRequestConfirm: (opts: { title: string; message: string; confirmText?: string; variant?: 'primary' | 'danger' | 'warning'; onConfirm: () => void }) => void;
  onToastAlert: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ProcurementView: React.FC<ProcurementViewProps> = ({
  currentUser,
  requests,
  itemPrices,
  fiscalYear,
  departments = DEPARTMENTS,
  workGroups = [],
  revisionPermissions = {},
  onUnlockRevision,
  onUpdateUnitPrice,
  onUpdateQty,
  onSubmitToProcHead,
  onRejectRequest,
  isPlanFrozen,
  onRequestConfirm,
  onToastAlert
}) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'compare' | 'price-history' | 'approved-summary' | 'rejected' | 'revisions' | 'sql-pagination'>('pending');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAuditItem, setSelectedAuditItem] = useState<RequestItem | null>(null);
  const [sortField, setSortField] = useState<'itemName' | 'totalQty' | 'price' | 'lineBudget'>('itemName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Revision tab specific states
  const [revisionDeptSearch, setRevisionDeptSearch] = useState('');
  const [revisionNoteInputs, setRevisionNoteInputs] = useState<Record<string, string>>({});
  const [revisionExpiryInputs, setRevisionExpiryInputs] = useState<Record<string, string>>({});

  const [pageSize, setPageSize] = useState<number | 'all'>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [approvedPage, setApprovedPage] = useState(1);

  // SQL Paginated Explorer States
  const [sqlRequests, setSqlRequests] = useState<RequestItem[]>([]);
  const [sqlTotal, setSqlTotal] = useState(0);
  const [sqlPages, setSqlPages] = useState(0);
  const [sqlBudget, setSqlBudget] = useState(0);
  const [sqlPage, setSqlPage] = useState(1);
  const [sqlLimit, setSqlLimit] = useState(10);
  const [sqlDept, setSqlDept] = useState('all');
  const [sqlStatus, setSqlStatus] = useState('all');
  const [sqlSearch, setSqlSearch] = useState('');
  const [sqlCategory, setSqlCategory] = useState('all');
  const [isSqlLoading, setIsSqlLoading] = useState(false);

  const fetchSqlData = React.useCallback(() => {
    setIsSqlLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(sqlPage));
    params.set('limit', String(sqlLimit));
    if (sqlDept !== 'all') params.set('deptId', sqlDept);
    if (sqlStatus !== 'all') params.set('status', sqlStatus);
    if (sqlSearch.trim()) params.set('search', sqlSearch.trim());
    if (sqlCategory !== 'all') params.set('category', sqlCategory);

    const token = localStorage.getItem('survey_token');
    fetch(`/api/requests?${params.toString()}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setSqlRequests(res.requests || []);
          setSqlTotal(res.total || 0);
          setSqlPages(res.pages || 0);
          setSqlBudget(res.totalBudget || 0);
        }
      })
      .catch(err => {
        console.error('Error fetching paginated SQL requests:', err);
      })
      .finally(() => {
        setIsSqlLoading(false);
      });
  }, [sqlPage, sqlLimit, sqlDept, sqlStatus, sqlSearch, sqlCategory]);

  React.useEffect(() => {
    if (activeTab === 'sql-pagination') {
      fetchSqlData();
    }
  }, [activeTab, fetchSqlData]);

  // Rejected tab states
  const [rejectedFilter, setRejectedFilter] = useState<'all' | 'proc' | 'prochead' | 'exec'>('all');
  const [rejectedCurrentPage, setRejectedCurrentPage] = useState(1);
  const [rejectedPageSize, setRejectedPageSize] = useState(10);

  // Rejection input states
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [bulkComment, setBulkComment] = useState('');

  // Selected year for approved items tab
  const [selectedSummaryYear, setSelectedSummaryYear] = useState<string>('all');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [summarySearchTerm, setSummarySearchTerm] = useState('');

  const rejectedRequests = React.useMemo(() => {
    return requests.filter(r => r.status === 'rejected' && (r.rejectedByRole === 'proc' || r.rejectedByRole === 'prochead' || r.rejectedByRole === 'exec' || (!r.rejectedByRole && (r.comment.includes('พัสดุ') || r.comment.includes('งบประมาณ')))));
  }, [requests]);

  const countRejectedProc = React.useMemo(() => {
    return rejectedRequests.filter(r => r.rejectedByRole === 'proc' || (!r.rejectedByRole && (r.comment.includes('เจ้าหน้าที่') || r.comment.includes('ฝ่ายพัสดุ') || r.comment.includes('พัสดุตีกลับ')) && !r.comment.includes('หัวหน้าพัสดุ') && !r.comment.includes('หัวหน้าวัสดุ'))).length;
  }, [rejectedRequests]);

  const countRejectedProcHead = React.useMemo(() => {
    return rejectedRequests.filter(r => r.rejectedByRole === 'prochead' || (!r.rejectedByRole && (r.comment.includes('หัวหน้าพัสดุ') || r.comment.includes('หัวหน้าวัสดุ')))).length;
  }, [rejectedRequests]);

  const countRejectedExec = React.useMemo(() => {
    return rejectedRequests.filter(r => r.rejectedByRole === 'exec' || (!r.rejectedByRole && (r.comment.includes('ผู้บริหาร') || r.comment.includes('งบประมาณ')))).length;
  }, [rejectedRequests]);

  const filteredRejectedRequests = React.useMemo(() => {
    return rejectedRequests.filter(r => {
      // Apply category filter
      const matchesCat = selectedCategory === 'all' || getItemCategory(r.itemName) === selectedCategory;
      if (!matchesCat) return false;

      if (rejectedFilter === 'all') return true;
      const rejRole = r.rejectedByRole;
      if (rejectedFilter === 'proc') {
        return rejRole === 'proc' || (!rejRole && (r.comment.includes('เจ้าหน้าที่') || r.comment.includes('ฝ่ายพัสดุ') || r.comment.includes('พัสดุตีกลับ')) && !r.comment.includes('หัวหน้าพัสดุ') && !r.comment.includes('หัวหน้าวัสดุ'));
      }
      if (rejectedFilter === 'prochead') {
        return rejRole === 'prochead' || (!rejRole && (r.comment.includes('หัวหน้าพัสดุ') || r.comment.includes('หัวหน้าวัสดุ')));
      }
      if (rejectedFilter === 'exec') {
        return rejRole === 'exec' || (!rejRole && (r.comment.includes('ผู้บริหาร') || r.comment.includes('งบประมาณ')));
      }
      return true;
    });
  }, [rejectedRequests, selectedCategory, rejectedFilter]);

  // Memoized approved items list for summary reports
  const approvedRequestsForSummary = React.useMemo(() => {
    return requests.filter(r => {
      const isApproved = r.status === 'approved';
      const matchesYear = selectedSummaryYear === 'all' || r.fiscalYear === selectedSummaryYear;
      const matchesCat = selectedCategory === 'all' || getItemCategory(r.itemName) === selectedCategory;
      const matchesSearch = !summarySearchTerm.trim() || r.itemName.toLowerCase().includes(summarySearchTerm.toLowerCase().trim());
      return isApproved && matchesYear && matchesCat && matchesSearch;
    });
  }, [requests, selectedSummaryYear, selectedCategory, summarySearchTerm]);

  const approvedGroupedList = React.useMemo(() => {
    const approvedGroupedMap: Record<string, { itemName: string; categoryLabel: string; unit: string; totalQty: number; price: number; totalBudget: number; depts: { name: string; qty: number }[]; fiscalYear: string }> = {};

    approvedRequestsForSummary.forEach(r => {
      const price = r.unitPrice !== null && r.unitPrice !== undefined ? r.unitPrice : (itemPrices[r.itemName] !== undefined ? itemPrices[r.itemName] : guessPrice(r.itemName, r.unit));
      if (!approvedGroupedMap[r.itemName]) {
        approvedGroupedMap[r.itemName] = {
          itemName: r.itemName,
          categoryLabel: CATEGORY_LABELS[getItemCategory(r.itemName)] || 'อื่นๆ',
          unit: r.unit,
          totalQty: 0,
          price,
          totalBudget: 0,
          depts: [],
          fiscalYear: r.fiscalYear || '2569'
        };
      }
      const entry = approvedGroupedMap[r.itemName];
      entry.totalQty += r.qtyRequested;
      entry.totalBudget += r.qtyRequested * price;
      const existingDept = entry.depts.find(d => d.name === deptName(r.deptId));
      if (existingDept) {
        existingDept.qty += r.qtyRequested;
      } else {
        entry.depts.push({ name: deptName(r.deptId), qty: r.qtyRequested });
      }
    });

    return Object.values(approvedGroupedMap);
  }, [approvedRequestsForSummary, itemPrices]);

  React.useEffect(() => {
    setSelectedRequestIds([]);
    setBulkComment('');
  }, [activeTab, selectedCategory, searchTerm, selectedDeptFilter]);

  // Filter requests pending procurement aggregation
  const rawPendingRequests = requests.filter(r => r.status === 'pending_proc');
  const pendingRequests = rawPendingRequests.filter(r => {
    const matchesCat = selectedCategory === 'all' || getItemCategory(r.itemName) === selectedCategory;
    const matchesSearch = !searchTerm.trim() || r.itemName.toLowerCase().includes(searchTerm.toLowerCase().trim());
    const matchesDept = selectedDeptFilter === 'all' || r.deptId === selectedDeptFilter;
    return matchesCat && matchesSearch && matchesDept;
  });

  // Group requests by item name
  const grouped: Record<string, { itemName: string; unit: string; totalQty: number; depts: { id: string; dept: string; qty: number }[] }> = {};
  pendingRequests.forEach(r => {
    if (!grouped[r.itemName]) {
      grouped[r.itemName] = { itemName: r.itemName, unit: r.unit, totalQty: 0, depts: [] };
    }
    grouped[r.itemName].totalQty += r.qtyRequested;
    grouped[r.itemName].depts.push({ id: r.id, dept: deptName(r.deptId), qty: r.qtyRequested });
  });

  const rawGroupList = Object.values(grouped);
  
  const handleHeaderSort = (field: 'itemName' | 'totalQty' | 'price' | 'lineBudget') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const groupList = rawGroupList.map(g => {
    const price = itemPrices[g.itemName] !== undefined ? itemPrices[g.itemName] : guessPrice(g.itemName, g.unit);
    return {
      ...g,
      qtyRequested: g.totalQty,
      price,
      lineBudget: price * g.totalQty
    };
  }).sort((a, b) => {
    let res = 0;
    if (sortField === 'itemName') res = a.itemName.localeCompare(b.itemName, 'th');
    else if (sortField === 'totalQty') res = a.totalQty - b.totalQty;
    else if (sortField === 'price') res = a.price - b.price;
    else if (sortField === 'lineBudget') res = a.lineBudget - b.lineBudget;
    return sortOrder === 'asc' ? res : -res;
  });

  // Calculate total budget
  let totalBudget = 0;
  groupList.forEach(g => {
    const price = itemPrices[g.itemName] !== undefined ? itemPrices[g.itemName] : guessPrice(g.itemName, g.unit);
    totalBudget += price * g.totalQty;
  });

  // Unique departments count
  const deptsSet = new Set(pendingRequests.map(r => r.deptId));

  const handleSubmitBatch = () => {
    if (pendingRequests.length === 0) return;

    onRequestConfirm({
      title: 'ยืนยันการส่งแผนจัดซื้อพัสดุรวม',
      message: `คุณต้องการส่งรายงานประมาณการจัดซื้อพัสดุรวมทุกหน่วยงานสำหรับปีงบประมาณ ${fiscalYear} (รวมงบประมาณ ${fmtBaht(totalBudget)} บาท) ให้หัวหน้าฝ่ายพัสดุกลั่นกรองหรือไม่?`,
      confirmText: 'ส่งเสนอหัวหน้าฝ่ายพัสดุ',
      variant: 'primary',
      onConfirm: () => {
        onSubmitToProcHead();
        onToastAlert(`ส่งแผนงบประมาณจัดซื้อวัสดุให้หัวหน้าฝ่ายพัสดุสำเร็จเรียบร้อยแล้ว`, 'success');
      }
    });
  };

  // Helper for CompareGrid organization-wide lookup
  const getAllQtyRequested = (itemName: string): number | null => {
    let sum = 0;
    let found = false;
    requests.forEach(r => {
      if (r.itemName === itemName) {
        sum += r.qtyRequested;
        found = true;
      }
    });
    return found ? sum : null;
  };

  // Pagination slice
  const numericSize = pageSize === 'all' ? groupList.length || 1 : pageSize;
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(groupList.length / numericSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageGroups = pageSize === 'all' ? groupList : groupList.slice((safePage - 1) * numericSize, safePage * numericSize);

  return (
    <div className="space-y-5">
      {/* Tabs Row */}
      <div className="flex bg-slate-200/80 p-1 rounded-2xl gap-1 text-[11px] md:text-xs font-semibold w-fit flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'pending'
              ? 'bg-white text-slate-900 shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4 text-indigo-600" />
          คำขอรอรวบรวม ({pendingRequests.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('compare')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'compare'
              ? 'bg-white text-slate-900 shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-indigo-600" />
          เปรียบเทียบย้อนหลังทั้งองค์กร
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('approved-summary');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'approved-summary'
              ? 'bg-white text-slate-900 shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4 text-amber-600" />
          สรุปรายการอนุมัติ & ส่งออกข้อมูล
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('rejected');
            setRejectedCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'rejected'
              ? 'bg-white text-slate-900 shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <AlertCircle className="w-4 h-4 text-rose-600" />
          รายการที่ถูกตีกลับ ({rejectedRequests.length})
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('price-history');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'price-history'
              ? 'bg-white text-slate-900 shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          สืบค้นราคาย้อนหลัง 5 ปี
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('revisions');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'revisions'
              ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileEdit className="w-4 h-4 text-amber-950" />
          จัดการคำขอปรับปรุงแผน (Revision Requests)
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('sql-pagination');
            setSqlPage(1);
          }}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'sql-pagination'
              ? 'bg-slate-900 text-white shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Database className="w-4 h-4 text-cyan-400" />
          ⚡ Live MySQL Explorer (Server-side Pagination)
        </button>
      </div>

      {/* Merged Header Control Panel */}
      {activeTab !== 'sql-pagination' && (
        <TableControlPanel
          title={
            activeTab === 'pending'
              ? "สรุปรายการพัสดุรวบรวมรายชนิด"
              : activeTab === 'compare'
              ? "เปรียบเทียบสถิติพัสดุทั้งองค์กร"
              : activeTab === 'price-history'
              ? "สืบค้นข้อมูลและเปรียบเทียบราคาพัสดุย้อนหลัง 5 ปี"
              : activeTab === 'rejected'
              ? "รายการพัสดุที่ถูกตีกลับให้แก้ไข (ดูอย่างเดียว)"
              : "รายงานแบบสำรวจความต้องการพัสดุแยกตามหมวดหมู่"
          }
          categoryLabel={selectedCategory === 'all' ? 'ทุกประเภท' : CATEGORY_LABELS[selectedCategory]}
          fiscalYear={fiscalYear}
          totalCount={
            activeTab === 'pending'
              ? groupList.length
              : activeTab === 'rejected'
              ? filteredRejectedRequests.length
              : 0
          }
          selectedCategory={selectedCategory}
          onCategoryChange={cat => {
            setSelectedCategory(cat);
            setCurrentPage(1);
            setRejectedCurrentPage(1);
          }}
          showCategoryFilter={true}
          searchTerm={searchTerm}
          onSearchChange={term => {
            setSearchTerm(term);
            setCurrentPage(1);
          }}
          showSearch={activeTab !== 'pending' && activeTab !== 'compare'}
          showDeptFilter={activeTab === 'pending'}
          departments={[{ id: 'all', name: 'ทั้งหมดทุกหน่วยงาน' }, ...DEPARTMENTS.map(d => ({ id: d.id, name: d.name }))]}
          selectedDeptId={selectedDeptFilter}
          onDeptChange={deptId => {
            setSelectedDeptFilter(deptId);
            setCurrentPage(1);
          }}
        />
      )}

      {activeTab === 'pending' && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="text-[10.5px] font-mono uppercase text-slate-500 font-semibold">
                คำขอย่อยทั้งหมด
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                {pendingRequests.length}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="text-[10.5px] font-mono uppercase text-slate-500 font-semibold">
                รายการวัสดุไม่ซ้ำ
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                {groupList.length}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="text-[10.5px] font-mono uppercase text-slate-500 font-semibold">
                หน่วยงานที่ขอ
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                {deptsSet.size}
              </div>
            </div>

            <div className="bg-white border border-cyan-200 bg-cyan-50/50 rounded-2xl p-4 shadow-sm">
              <div className="text-[10.5px] font-mono uppercase text-cyan-800 font-semibold">
                งบประมาณรวมประมาณการ
              </div>
              <div className="text-xl font-bold font-mono text-cyan-950 mt-1">
                {fmtBaht(totalBudget)} <span className="text-xs font-sans text-cyan-800">บาท</span>
              </div>
            </div>
          </div>

          {/* Combined Control Bar (รูปที่ 1 + รูปที่ 3) */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 shadow-xs space-y-3 mb-4">
            {/* Layer 1: Search & Selection */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="text-slate-600 font-semibold flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                <span>ติ๊กเลือกกล่องหน้ารายชื่อเพื่อตีกลับ/ปฏิเสธ/อนุมัติแบบกลุ่ม หรือค้นหาด้านขวา:</span>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                {/* Search Input (Figure 1: Before Select All) */}
                <div className="relative w-44 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="ค้นหารายการพัสดุรวบรวม..."
                    className="w-full bg-white border border-slate-300 pl-8 pr-3 py-1.5 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const allIds = pendingRequests.map(r => r.id);
                    const isAllSelected = allIds.length > 0 && allIds.every(id => selectedRequestIds.includes(id));
                    if (isAllSelected) {
                      setSelectedRequestIds([]);
                      setBulkComment('');
                    } else {
                      setSelectedRequestIds(allIds);
                    }
                  }}
                  className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border cursor-pointer transition-all ${
                    pendingRequests.length > 0 && pendingRequests.map(r => r.id).every(id => selectedRequestIds.includes(id))
                      ? 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100 hover:text-indigo-900'
                  }`}
                >
                  {pendingRequests.length > 0 && pendingRequests.map(r => r.id).every(id => selectedRequestIds.includes(id))
                    ? `ยกเลิกการเลือกทั้งหมด (${pendingRequests.length})`
                    : `เลือกทั้งหมด (${pendingRequests.length} รายการ)`}
                </button>

                {selectedRequestIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRequestIds([]);
                      setBulkComment('');
                    }}
                    className="text-[11px] text-slate-600 hover:text-slate-800 font-bold bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 cursor-pointer transition-all"
                  >
                    ยกเลิกการเลือก
                  </button>
                )}
              </div>
            </div>

            {/* Layer 2: Bulk Actions (Only shown when selectedRequestIds.length > 0) */}
            {selectedRequestIds.length > 0 && (
              <div className="border-t border-slate-200/80 pt-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 bg-amber-50/40 p-2.5 rounded-xl border border-amber-100">
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-600 text-white font-mono font-bold text-xs px-2.5 py-1 rounded-lg shadow-sm">
                    เลือกแล้ว {selectedRequestIds.length} รายการ
                  </div>
                  <div className="text-[11px] font-bold text-amber-900">
                    การจัดการแบบกลุ่ม
                  </div>
                </div>

                <div className="flex flex-wrap flex-1 items-center gap-2 max-w-2xl justify-end">
                  <input
                    type="text"
                    placeholder="ระบุเหตุผลเพื่อตีกลับ/ปฏิเสธ... (จำเป็นสำหรับการตีกลับ/ปฏิเสธ)"
                    value={bulkComment}
                    onChange={e => setBulkComment(e.target.value)}
                    className="flex-1 min-w-[200px] max-w-sm px-3 py-1.5 text-xs border border-amber-300 rounded-xl focus:outline-none focus:border-indigo-500 bg-white text-slate-800 font-semibold shadow-xs"
                  />

                  {/* 3. รูปที่ 3 เพิ่ม ปุ่มอนุมัติที่เลือก */}
                  <button
                    type="button"
                    onClick={() => {
                      // Calculate budget for the selected subset
                      let subsetBudget = 0;
                      selectedRequestIds.forEach(id => {
                        const req = pendingRequests.find(r => r.id === id);
                        if (req) {
                          const price = itemPrices[req.itemName] !== undefined ? itemPrices[req.itemName] : guessPrice(req.itemName, req.unit);
                          subsetBudget += price * req.qtyRequested;
                        }
                      });

                      onRequestConfirm({
                        title: 'ยืนยันอนุมัติคำขอที่เลือก',
                        message: `คุณต้องการส่งรายงานประมาณการจัดซื้อพัสดุเฉพาะรายการที่เลือกจำนวน ${selectedRequestIds.length} รายการ (รวมงบประมาณ ${fmtBaht(subsetBudget)} บาท) ให้หัวหน้าฝ่ายพัสดุกลั่นกรองหรือไม่?`,
                        confirmText: 'ส่งเสนอหัวหน้าฝ่ายพัสดุ',
                        variant: 'primary',
                        onConfirm: () => {
                          onSubmitToProcHead(selectedRequestIds);
                          onToastAlert(`ส่งแผนงบประมาณจัดซื้อที่เลือกจำนวน ${selectedRequestIds.length} รายการให้หัวหน้าฝ่ายพัสดุสำเร็จเรียบร้อยแล้ว`, 'success');
                          setSelectedRequestIds([]);
                          setBulkComment('');
                        }
                      });
                    }}
                    className="px-3.5 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold whitespace-nowrap cursor-pointer transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    อนุมัติที่เลือก
                  </button>

                  <button
                    type="button"
                    disabled={!bulkComment.trim()}
                    onClick={() => {
                      selectedRequestIds.forEach(id => {
                        onRejectRequest(id, bulkComment.trim(), 'return');
                      });
                      onToastAlert(`ตีกลับคำขอที่เลือก ${selectedRequestIds.length} รายการแล้ว`, 'success');
                      setSelectedRequestIds([]);
                      setBulkComment('');
                    }}
                    className="px-3.5 py-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold whitespace-nowrap disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer transition-all shadow-xs"
                    title={!bulkComment.trim() ? 'กรุณาระบุเหตุผลในการตีกลับ' : ''}
                  >
                    ตีกลับที่เลือก
                  </button>

                  <button
                    type="button"
                    disabled={!bulkComment.trim()}
                    onClick={() => {
                      selectedRequestIds.forEach(id => {
                        onRejectRequest(id, bulkComment.trim(), 'reject');
                      });
                      onToastAlert(`ปฏิเสธคำขอที่เลือก ${selectedRequestIds.length} รายการแล้ว`, 'error');
                      setSelectedRequestIds([]);
                      setBulkComment('');
                    }}
                    className="px-3.5 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold whitespace-nowrap disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer transition-all shadow-xs"
                    title={!bulkComment.trim() ? 'กรุณาระบุเหตุผลในการปฏิเสธ' : ''}
                  >
                    ปฏิเสธที่เลือก
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRequestIds([]);
                      setBulkComment('');
                    }}
                    className="px-3.5 py-1.5 text-xs bg-white hover:bg-slate-50 text-slate-600 rounded-xl font-bold whitespace-nowrap cursor-pointer transition-all border border-slate-300"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Grouped Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
            {groupList.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                ยังไม่มีรายการคำขอที่ผ่านการอนุมัติจากหัวหน้ากลุ่มงาน/ฝ่ายรอการรวบรวม
              </div>
            ) : (
              <>

                <div className="overflow-x-auto">
                  <table className="w-full text-base text-left">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-mono text-sm border-b border-slate-200 select-none">
                      <tr>
                        <th 
                          onClick={() => handleHeaderSort('itemName')}
                          className="p-2.5 w-1/4 cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-1">
                            <span>รายการ</span>
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>
                        <th className="p-2.5">ประเภทวัสดุ</th>
                        <th 
                          onClick={() => handleHeaderSort('totalQty')}
                          className="p-2.5 text-right font-bold text-indigo-900 cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>รวมทุกแผนก</span>
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>
                        <th className="p-2.5">แยกตามหน่วยงาน (ปรับจำนวนได้)</th>
                        <th 
                          onClick={() => handleHeaderSort('price')}
                          className="p-2.5 text-right w-32 cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>ราคา/หน่วย (บาท)</span>
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>
                        <th 
                          onClick={() => handleHeaderSort('lineBudget')}
                          className="p-2.5 text-right font-bold cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>งบรวม (บาท)</span>
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pageGroups.map(g => {
                        const price = itemPrices[g.itemName] !== undefined ? itemPrices[g.itemName] : guessPrice(g.itemName, g.unit);
                        const lineBudget = price * g.totalQty;

                        return (
                          <tr key={g.itemName} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-2.5 font-bold text-slate-800">{g.itemName}</td>
                            <td className="p-2.5">
                              <CategoryBadge itemName={g.itemName} />
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-indigo-900">
                              {g.totalQty} {g.unit}
                            </td>
                             <td className="p-2.5">
                               <div className="flex flex-col gap-2">
                                 <div className="flex flex-wrap gap-1.5">
                                   {g.depts.map(d => {
                                     const isTarget = rejectTargetId === d.id;
                                     return (
                                       <div key={d.id} className="relative flex flex-col">
                                         <div className={`inline-flex items-center gap-1.5 bg-slate-100 border text-slate-800 px-2 py-1 rounded-xl text-[11px] transition-all ${isTarget ? 'border-amber-400 bg-amber-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                                           {!isPlanFrozen && (
                                             <input
                                               type="checkbox"
                                               checked={selectedRequestIds.includes(d.id)}
                                               onChange={e => {
                                                 if (e.target.checked) {
                                                   setSelectedRequestIds(prev => [...prev, d.id]);
                                                 } else {
                                                    setSelectedRequestIds(prev => prev.filter(id => id !== d.id));
                                                 }
                                               }}
                                               className="w-3.5 h-3.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer mr-0.5"
                                             />
                                           )}
                                           <span className="font-medium">{d.dept}:</span>
                                           <input
                                             type="number"
                                             min="0"
                                             disabled={isPlanFrozen}
                                             value={d.qty}
                                             onChange={e => onUpdateQty(d.id, Math.max(0, parseInt(e.target.value, 10) || 0))}
                                             className="w-12 px-1 text-center font-mono font-bold border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-indigo-600"
                                           />
                                           {!isPlanFrozen && (
                                             <button
                                               type="button"
                                               onClick={() => {
                                                 if (rejectTargetId === d.id) {
                                                   setRejectTargetId(null);
                                                 } else {
                                                   setRejectTargetId(d.id);
                                                   setRejectComment('');
                                                 }
                                               }}
                                               title="ตีกลับหรือปฏิเสธคำขอนี้"
                                               className="p-0.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-white transition-all cursor-pointer"
                                             >
                                               <XCircle className="w-3.5 h-3.5" />
                                             </button>
                                           )}
                                         </div>

                                         {isTarget && (
                                           <div className="absolute top-full left-0 mt-1 p-2.5 bg-white border border-amber-300 rounded-xl shadow-lg z-20 min-w-[220px] space-y-1.5 text-left">
                                             <div className="text-[10px] font-bold text-amber-800 flex items-center gap-1">
                                               <RotateCcw className="w-3 h-3" />
                                               <span>จัดการคำขอ {d.dept}</span>
                                             </div>
                                             <input
                                               type="text"
                                               placeholder="ระบุเหตุผลการตีกลับ/ปฏิเสธ... (จำเป็น)"
                                               value={rejectComment}
                                               onChange={e => setRejectComment(e.target.value)}
                                               className="w-full px-2 py-1 text-[11px] border border-amber-200 rounded-lg focus:outline-none focus:border-amber-500 bg-amber-50/20 text-slate-800 font-medium"
                                             />
                                             {!rejectComment.trim() && (
                                               <div className="text-[9px] text-rose-600 font-bold">
                                                 * กรุณาระบุเหตุผลในการจัดการ
                                               </div>
                                             )}
                                             <div className="flex gap-1 justify-end">
                                               <button
                                                 type="button"
                                                 onClick={() => setRejectTargetId(null)}
                                                 className="px-1.5 py-0.5 text-[9px] bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 font-bold"
                                               >
                                                 ปิด
                                               </button>
                                               <button
                                                 type="button"
                                                 disabled={!rejectComment.trim()}
                                                 onClick={() => {
                                                   const comment = rejectComment.trim();
                                                   onRejectRequest(d.id, comment, 'return');
                                                   setRejectTargetId(null);
                                                   setRejectComment('');
                                                   onToastAlert(`ตีกลับคำขอของ ${d.dept} ไปยังหัวหน้ากลุ่มงาน/ฝ่ายเรียบร้อยแล้ว`, 'success');
                                                 }}
                                                 className="px-2 py-0.5 text-[9px] bg-amber-500 hover:bg-amber-600 text-white rounded-md font-bold whitespace-nowrap disabled:opacity-45 disabled:cursor-not-allowed"
                                               >
                                                 ตีกลับแผนก
                                               </button>
                                               <button
                                                 type="button"
                                                 disabled={!rejectComment.trim()}
                                                 onClick={() => {
                                                   const comment = rejectComment.trim();
                                                   onRejectRequest(d.id, comment, 'reject');
                                                   setRejectTargetId(null);
                                                   setRejectComment('');
                                                   onToastAlert(`ปฏิเสธคำขอของ ${d.dept} เรียบร้อยแล้ว`, 'error');
                                                 }}
                                                 className="px-2 py-0.5 text-[9px] bg-rose-600 hover:bg-rose-700 text-white rounded-md font-bold whitespace-nowrap disabled:opacity-45 disabled:cursor-not-allowed"
                                               >
                                                 ปฏิเสธ
                                               </button>
                                             </div>
                                           </div>
                                         )}
                                       </div>
                                     );
                                   })}
                                 </div>
                               </div>
                             </td>
                            <td className="p-2.5 text-right">
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                disabled={isPlanFrozen}
                                value={price}
                                onChange={e => onUpdateUnitPrice(g.itemName, Math.max(0, parseFloat(e.target.value) || 0))}
                                className="w-24 px-2 py-1 text-right font-mono font-semibold border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-600"
                              />
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                              {fmtBaht(lineBudget)}
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
                  totalItems={groupList.length}
                  onPageSizeChange={s => { setPageSize(s); setCurrentPage(1); }}
                  onPageChange={p => setCurrentPage(p)}
                />
              </>
            )}
          </div>


        </>
      )}

      {activeTab === 'compare' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              เปรียบเทียบสถิติย้อนหลัง 5 ปี — ทุกหน่วยงานทั้งองค์กร
            </h3>
            <p className="text-xs text-slate-500">
              แท่งสีเทา = ยอดใช้จริงย้อนหลัง 5 ปี (พ.ศ. 2564–2568) · แท่งสีเขียว/น้ำเงิน = ยอดขอปีงบประมาณ {fiscalYear} (รวมทุกแผนก)
            </p>
          </div>

          <CompareGrid
            itemNames={selectedCategory === 'all' ? ALL_ITEMS : (CATALOG[selectedCategory] || [])}
            getQtyRequested={getAllQtyRequested}
            requests={requests}
          />
        </div>
      )}

      {activeTab === 'price-history' && (() => {
        const allMaterialNames = Array.from(new Set([
          ...ALL_ITEMS,
          ...Object.keys(itemPrices)
        ])).filter(name => {
          const cat = getItemCategory(name);
          const matchesCat = selectedCategory === 'all' || cat === selectedCategory;
          const matchesSearch = !searchTerm.trim() || name.toLowerCase().includes(searchTerm.toLowerCase().trim());
          return matchesCat && matchesSearch;
        });

        const totalHistoryPages = Math.max(1, Math.ceil(allMaterialNames.length / 10));
        const safeHistoryPage = Math.min(historyPage, totalHistoryPages);
        const paginatedMaterialNames = allMaterialNames.slice((safeHistoryPage - 1) * 10, safeHistoryPage * 10);
        const yearsToShow = [2565, 2566, 2567, 2568, 2569, 2570];

        return (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  สืบค้นและวิเคราะห์แนวโน้มราคาพัสดุย้อนหลัง 5 ปี (พ.ศ. 2565 - 2570)
                </h3>
                <p className="text-xs text-slate-500">
                  สืบค้นและติดตามราคามาตรฐานของพัสดุแต่ละชนิด ย้อนหลังเพื่อประกอบการตัดสินใจกำหนดราคากลาง
                </p>
              </div>
              <div className="bg-emerald-50 text-emerald-800 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-emerald-200">
                พบพัสดุทั้งหมด {allMaterialNames.length} รายการ
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-base text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 uppercase font-mono text-sm border-b border-slate-200">
                    <th className="p-3">รายการวัสดุ</th>
                    <th className="p-3 w-40">ประเภทวัสดุ</th>
                    <th className="p-3 w-20 text-center">หน่วยนับ</th>
                    {yearsToShow.map(yr => (
                      <th key={yr} className={`p-3 text-right font-bold ${yr === 2570 ? 'text-indigo-900 bg-indigo-50/40' : 'text-slate-700'}`}>
                        ปี {yr}
                      </th>
                    ))}
                    <th className="p-3 text-center">แนวโน้มราคา</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allMaterialNames.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400">
                        ไม่พบข้อมูลราคาพัสดุที่ตรงกับตัวกรอง
                      </td>
                    </tr>
                  ) : (
                    paginatedMaterialNames.map(name => {
                      const unit = guessUnit(name);
                      const prices = yearsToShow.map(yr => getItemPriceForYear(name, unit, yr));
                      const price2565 = prices[0];
                      const price2570 = prices[5];
                      const isIncreased = price2570 > price2565;
                      const pctChange = Math.round(((price2570 - price2565) / price2565) * 100);

                      return (
                        <tr key={name} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 font-bold text-slate-800">{name}</td>
                          <td className="p-3">
                            <CategoryBadge itemName={name} />
                          </td>
                          <td className="p-3 text-center text-slate-600">{unit}</td>
                          {prices.map((p, i) => (
                            <td key={yearsToShow[i]} className={`p-3 text-right font-mono font-semibold ${yearsToShow[i] === 2570 ? 'bg-indigo-50/20 text-indigo-950 font-bold' : 'text-slate-800'}`}>
                              {p.toLocaleString('th-TH')} <span className="text-[10px] font-sans text-slate-400 font-normal">บ.</span>
                            </td>
                          ))}
                          <td className="p-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isIncreased
                                ? 'bg-rose-50 text-rose-700 border border-rose-150'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-150'
                            }`}>
                              {isIncreased ? `↗ +${pctChange}%` : `→ ${pctChange}%`}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <PaginationBar
              pageSize={10}
              currentPage={safeHistoryPage}
              totalItems={allMaterialNames.length}
              onPageSizeChange={() => {}}
              onPageChange={p => setHistoryPage(p)}
              showPageSizeSelector={false}
            />
          </div>
        );
      })()}

      {activeTab === 'approved-summary' && (() => {
        const totalApprovedSumBudget = approvedGroupedList.reduce((acc, curr) => acc + curr.totalBudget, 0);

        const totalApprovedPages = Math.max(1, Math.ceil(approvedGroupedList.length / 10));
        const safeApprovedPage = Math.min(approvedPage, totalApprovedPages);
        const paginatedApprovedList = approvedGroupedList.slice((safeApprovedPage - 1) * 10, safeApprovedPage * 10);

        const yearsInRequests = requests.map(r => r.fiscalYear).filter(Boolean) as string[];
        const uniqueYears = Array.from(new Set([fiscalYear, ...yearsInRequests])).sort((a, b) => b.localeCompare(a));
        const yearsList = ['all', ...uniqueYears];

        const handleExportCSV = () => {
          if (approvedGroupedList.length === 0) {
            onToastAlert('ไม่มีข้อมูลพัสดุที่อนุมัติสำหรับส่งออก', 'info');
            return;
          }
          const headers = ['ลำดับ', 'รายการพัสดุ', 'ประเภทวัสดุ', 'หน่วยนับ', 'จำนวนที่ได้รับอนุมัติ', 'ราคาต่อหน่วย (บาท)', 'งบประมาณที่ได้รับอนุมัติ (บาท)', 'ปีงบประมาณ', 'หน่วยงานที่ได้รับอนุมัติ'];
          const csvRows = [headers.join(',')];
          
          let rowNum = 1;
          approvedGroupedList.forEach((row) => {
            row.depts.forEach((d) => {
              const lineBudget = d.qty * row.price;
              const line = [
                rowNum++,
                `"${row.itemName.replace(/"/g, '""')}"`,
                `"${row.categoryLabel}"`,
                `"${row.unit}"`,
                d.qty,
                row.price,
                lineBudget,
                `"${row.fiscalYear}"`,
                `"${d.name.replace(/"/g, '""')}"`
              ];
              csvRows.push(line.join(','));
            });
          });
          
          const csvContent = "\uFEFF" + csvRows.join('\n'); // Thai BOM for Excel
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.setAttribute('href', url);
          link.setAttribute('download', `รายการพัสดุอนุมัติเรียบร้อย_${selectedSummaryYear === 'all' ? 'ทุกปี' : `ปี_${selectedSummaryYear}`}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          onToastAlert('ส่งออกไฟล์พัสดุอนุมัติ CSV สำเร็จเรียบร้อยแล้ว!', 'success');
        };

        const handleExportExcel = () => {
          if (approvedGroupedList.length === 0) {
            onToastAlert('ไม่มีข้อมูลพัสดุที่อนุมัติสำหรับส่งออก', 'info');
            return;
          }

          onRequestConfirm({
            title: 'ยืนยันการส่งออกข้อมูล Excel',
            message: 'คุณต้องการส่งออกรายงานสรุปความต้องการจัดหาแยกตามประเภทพัสดุนี้เป็นไฟล์ Excel (.xlsx) ใช่หรือไม่?',
            confirmText: 'ส่งออกไฟล์ Excel',
            variant: 'primary',
            onConfirm: () => {
              const wb = XLSX.utils.book_new();

              // Group by category label
              const requestsByCat: Record<string, typeof approvedGroupedList> = {};
              approvedGroupedList.forEach(item => {
                const cat = item.categoryLabel;
                if (!requestsByCat[cat]) {
                  requestsByCat[cat] = [];
                }
                requestsByCat[cat].push(item);
              });

              Object.entries(requestsByCat).forEach(([catLabel, items]) => {
                const titleRow = [`รายงานสรุปความต้องการจัดหา${catLabel} ประจำปีงบประมาณ พ.ศ. ${selectedSummaryYear === 'all' ? 'ทุกปี' : selectedSummaryYear}`];
                const headerRow = ['ลำดับ', 'รายการพัสดุ', 'หน่วยนับ', 'จำนวนรวมที่อนุมัติ', 'ราคาต่อหน่วย (บาท)', 'งบประมาณรวม (บาท)', 'หน่วยงานที่ได้รับอนุมัติ [จำนวน]'];
                
                const rows = [
                  titleRow,
                  [],
                  headerRow,
                  ...items.map((row, idx) => [
                    idx + 1,
                    row.itemName,
                    row.unit,
                    row.totalQty,
                    row.price,
                    row.totalBudget,
                    row.depts.map(d => `${d.name} [${d.qty}]`).join(', ')
                  ])
                ];

                const ws = XLSX.utils.aoa_to_sheet(rows);

                ws['!cols'] = [
                  { wch: 8 },  // ลำดับ
                  { wch: 45 }, // รายการพัสดุ
                  { wch: 12 }, // หน่วยนับ
                  { wch: 18 }, // จำนวนรวมที่อนุมัติ
                  { wch: 18 }, // ราคาต่อหน่วย
                  { wch: 18 }, // งบประมาณรวม
                  { wch: 45 }  // หน่วยงานที่ได้รับอนุมัติ
                ];

                const sheetName = catLabel.substring(0, 31);
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
              });

              XLSX.writeFile(wb, `รายงานพัสดุอนุมัติแยกหมวดหมู่_${selectedSummaryYear === 'all' ? 'ทุกปี' : `ปี_${selectedSummaryYear}`}.xlsx`);
              onToastAlert('ส่งออกไฟล์ Excel สำเร็จเรียบร้อยแล้ว!', 'success');
            }
          });
        };

        const handleExportPDF = () => {
          if (approvedGroupedList.length === 0) {
            onToastAlert('ไม่มีข้อมูลพัสดุที่อนุมัติสำหรับพิมพ์ PDF', 'info');
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
            message: 'ระบบจะเตรียมเอกสารและเปิดหน้าต่างสั่งพิมพ์ของเบราว์เซอร์สำหรับรายงานแยกหมวดหมู่พัสดุนี้ คุณต้องการดำเนินการต่อหรือไม่?',
            confirmText: 'พิมพ์ PDF',
            variant: 'primary',
            onConfirm: () => {
              window.print();
              onToastAlert('เปิดหน้าต่างสั่งพิมพ์ PDF เรียบร้อยแล้ว', 'success');
            }
          });
        };

        return (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  สรุปผลพัสดุที่ผ่านการอนุมัติขั้นสุดท้ายโดยผู้บริหาร (Approved Inventory Plan)
                </h3>
                <p className="text-xs text-slate-500">
                  รวบรวมแผนจัดซื้อพัสดุที่ได้รับอนุมัติในภาพรวม สามารถกรองแยกปีงบประมาณและส่งออกข้อมูล
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
                <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1">
                  <span className="text-[11px] font-bold text-slate-500">เลือกปีงบประมาณ:</span>
                  <select
                    value={selectedSummaryYear}
                    onChange={e => {
                      setSelectedSummaryYear(e.target.value);
                      setApprovedPage(1);
                    }}
                    className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer outline-none"
                  >
                    {yearsList.map(yr => (
                      <option key={yr} value={yr}>
                        {yr === 'all' ? 'ทุกปีงบประมาณ' : `ปีงบประมาณ ${yr}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Search Input Box */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={summarySearchTerm}
                    onChange={e => {
                      setSummarySearchTerm(e.target.value);
                      setApprovedPage(1);
                    }}
                    placeholder="ค้นหารายการพัสดุอนุมัติ..."
                    className="w-full bg-slate-50 border border-slate-300 pl-8 pr-3 py-1.5 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                {/* Export Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    disabled={approvedGroupedList.length === 0}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportExcel}
                    disabled={approvedGroupedList.length === 0}
                    className="bg-[#107C41] hover:bg-[#0A5C30] text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Excel</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportPDF}
                    disabled={approvedGroupedList.length === 0}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>PDF</span>
                  </button>
                </div>
              </div>
            </div>

            {/* KPI Cards for Approved Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-amber-50/40 border border-amber-200 rounded-xl p-3">
                <div className="text-[10px] font-bold text-amber-800 uppercase">
                  จำนวนรายการวัสดุที่อนุมัติแล้ว
                </div>
                <div className="text-lg font-bold font-mono text-amber-950 mt-0.5">
                  {approvedGroupedList.length.toLocaleString('th-TH')} <span className="text-xs font-sans text-amber-800">รายการ</span>
                </div>
              </div>
              <div className="bg-indigo-50/40 border border-indigo-200 rounded-xl p-3">
                <div className="text-[10px] font-bold text-indigo-800 uppercase">
                  จำนวนชิ้น/ชุดรวมที่อนุมัติ
                </div>
                <div className="text-lg font-bold font-mono text-indigo-950 mt-0.5">
                  {approvedRequestsForSummary.reduce((sum, curr) => sum + curr.qtyRequested, 0).toLocaleString('th-TH')} <span className="text-xs font-sans text-indigo-800">ชิ้น/รีม/ตลับ</span>
                </div>
              </div>
              <div className="bg-emerald-50/40 border border-emerald-200 rounded-xl p-3">
                <div className="text-[10px] font-bold text-emerald-800 uppercase">
                  รวมงบประมาณพัสดุที่อนุมัติแล้ว
                </div>
                <div className="text-lg font-bold font-mono text-emerald-950 mt-0.5">
                  {fmtBaht(totalApprovedSumBudget)} <span className="text-xs font-sans text-emerald-800">บาท</span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-base text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 uppercase font-mono text-sm border-b border-slate-200">
                    <th className="p-3 w-12 text-center">ลำดับ</th>
                    <th className="p-3">รายการพัสดุ</th>
                    <th className="p-3 w-32">ประเภท</th>
                    <th className="p-3 text-right w-24">จำนวนอนุมัติ</th>
                    <th className="p-3 text-right w-24">ราคาต่อหน่วย</th>
                    <th className="p-3 text-right w-32">งบประมาณรวม</th>
                    <th className="p-3 w-20 text-center">ปีงบ</th>
                    <th className="p-3">สัดส่วนหน่วยงานผู้ใช้พัสดุ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {approvedGroupedList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-400">
                        ยังไม่มีรายการพัสดุที่ผู้บริหารอนุมัติในเงื่อนไขการค้นหานี้
                      </td>
                    </tr>
                  ) : (
                    paginatedApprovedList.map((row, idx) => {
                      const itemIndex = (safeApprovedPage - 1) * 10 + idx + 1;
                      return (
                        <tr key={row.itemName} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 text-center font-mono text-slate-400">{itemIndex}</td>
                          <td className="p-3 font-bold text-slate-900">{row.itemName}</td>
                          <td className="p-3">
                            <span className="inline-flex items-center bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10.5px]">
                              {row.categoryLabel}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-semibold text-slate-800">
                            {row.totalQty.toLocaleString('th-TH')} {row.unit}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-600">
                            {fmtBaht(row.price)}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-700">
                            {fmtBaht(row.totalBudget)}
                          </td>
                          <td className="p-3 text-center font-mono text-slate-500">{row.fiscalYear}</td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {row.depts.map(d => (
                                <span key={d.name} className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-100 rounded-md px-1.5 py-0.5 text-[10px]">
                                  <span className="font-semibold">{d.name}:</span>
                                  <span>{d.qty}</span>
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <PaginationBar
              pageSize={10}
              currentPage={safeApprovedPage}
              totalItems={approvedGroupedList.length}
              onPageSizeChange={() => {}}
              onPageChange={p => setApprovedPage(p)}
              showPageSizeSelector={false}
            />
          </div>
        );
      })()}

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
                  <th className="p-3">หน่วยงาน</th>
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
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-semibold bg-rose-50/10">
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
                          <td className="p-3 font-semibold text-slate-900">
                            {deptName(r.deptId)}
                          </td>
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

      {activeTab === 'sql-pagination' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-cyan-600 animate-pulse" />
                Live MySQL Explorer (Server-side Pagination)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                สืบค้นและจัดการข้อมูลคำขอโดยดึงข้อมูลแบบ Real-time จากระบบฐานข้อมูล MySQL โดยตรงด้วยคำสั่ง SQL LIMIT / OFFSET
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5 items-center w-full lg:w-auto">
              <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl">
                <span className="text-[11px] font-bold text-indigo-700">ปีงบประมาณ:</span>
                <span className="text-xs font-extrabold text-indigo-800">{fiscalYear}</span>
              </div>
            </div>
          </div>

          {/* Filtering controls bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-200/60">
            {/* Search Input */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">ค้นหารายการ</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={sqlSearch}
                  onChange={e => { setSqlSearch(e.target.value); setSqlPage(1); }}
                  placeholder="พิมพ์คำค้นหา..."
                  className="w-full bg-white border border-slate-300 pl-8 pr-3 py-1.5 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600"
                />
              </div>
            </div>

            {/* Department Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">กรองตามหน่วยงาน</label>
              <select
                value={sqlDept}
                onChange={e => { setSqlDept(e.target.value); setSqlPage(1); }}
                className="w-full bg-white border border-slate-300 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-cyan-600 cursor-pointer"
              >
                <option value="all">ทั้งหมดทุกแผนก</option>
                {DEPARTMENTS.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">กรองตามประเภทพัสดุ</label>
              <select
                value={sqlCategory}
                onChange={e => { setSqlCategory(e.target.value); setSqlPage(1); }}
                className="w-full bg-white border border-slate-300 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-cyan-600 cursor-pointer"
              >
                <option value="all">ทั้งหมดทุกประเภท</option>
                {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">กรองตามสถานะ</label>
              <select
                value={sqlStatus}
                onChange={e => { setSqlStatus(e.target.value); setSqlPage(1); }}
                className="w-full bg-white border border-slate-300 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-cyan-600 cursor-pointer"
              >
                <option value="all">ทั้งหมดทุกสถานะ</option>
                <option value="pending_head">รอหัวหน้ากลุ่มงานอนุมัติ</option>
                <option value="pending_proc">รอพัสดุตรวจสอบ</option>
                <option value="pending_prochead">รอหัวหน้าพัสดุอนุมัติ</option>
                <option value="pending_exec">รอผู้บริหารอนุมัติ</option>
                <option value="approved">อนุมัติเรียบร้อย</option>
                <option value="rejected">ตีกลับแก้ไข</option>
              </select>
            </div>
          </div>

          {/* MySQL Real-time Stats KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-cyan-50/30 border border-cyan-100 rounded-2xl p-3">
              <div className="text-[10px] font-mono uppercase text-slate-500 font-bold">
                จำนวนรายการที่ตรงเงื่อนไข (MySQL Count)
              </div>
              <div className="text-xl font-black font-mono text-cyan-800 mt-0.5">
                {sqlTotal.toLocaleString('th-TH')}
              </div>
            </div>
            <div className="bg-emerald-50/30 border border-emerald-100 rounded-2xl p-3">
              <div className="text-[10px] font-mono uppercase text-slate-500 font-bold">
                งบประมาณรวมทั้งสิ้น (MySQL SUM)
              </div>
              <div className="text-xl font-black font-mono text-emerald-800 mt-0.5">
                {fmtBaht(sqlBudget)}
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1 bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-end">
              <button
                type="button"
                onClick={fetchSqlData}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                รีเฟรช SQL
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-3xs">
            {isSqlLoading ? (
              <div className="p-16 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin" />
                <span className="text-xs font-bold text-slate-500">กำลังรันคำสั่ง SQL Query บนเครื่องแม่ข่าย...</span>
              </div>
            ) : sqlRequests.length === 0 ? (
              <div className="p-16 text-center text-slate-400 font-semibold text-xs">
                ไม่พบข้อมูลรายการคำขอพัสดุที่ตรงกับตัวกรองที่เลือก
              </div>
            ) : (
              <table className="w-full text-xs text-left border-collapse font-sans">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[10px] font-mono uppercase">
                    <th className="p-3 font-bold w-12 text-center">ID</th>
                    <th className="p-3 font-bold w-44">แผนก / กลุ่มงาน</th>
                    <th className="p-3 font-bold">รายการพัสดุ / หมวดหมู่</th>
                    <th className="p-3 font-bold text-center w-28">สถานะพัสดุ</th>
                    <th className="p-3 font-bold text-right w-24">จำนวนเสนอขอ</th>
                    <th className="p-3 font-bold text-right w-28">ราคาต่อหน่วย</th>
                    <th className="p-3 font-bold text-right w-32">งบประมาณรวม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sqlRequests.map(r => {
                    const price = r.unitPrice !== null && r.unitPrice !== undefined ? r.unitPrice : (itemPrices[r.itemName] !== undefined ? itemPrices[r.itemName] : guessPrice(r.itemName, r.unit));
                    const totalCost = r.qtyRequested * price;

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/50 transition-all">
                        <td className="p-3 text-center font-mono font-bold text-slate-500 bg-slate-50/30">
                          {r.id.replace('REQ-', '')}
                        </td>
                        <td className="p-3 font-semibold text-slate-800">
                          {deptName(r.deptId)}
                        </td>
                        <td className="p-3 font-semibold text-slate-900">
                          <div>{r.itemName}</div>
                          <div className="mt-1">
                            <CategoryBadge itemName={r.itemName} />
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          {r.status === 'pending_head' && (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">รอหัวหน้าอนุมัติ</span>
                          )}
                          {r.status === 'pending_proc' && (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">รอพัสดุตรวจ</span>
                          )}
                          {r.status === 'pending_prochead' && (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">รอหัวหน้าพัสดุ</span>
                          )}
                          {r.status === 'pending_exec' && (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">รอผู้บริหาร</span>
                          )}
                          {r.status === 'approved' && (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">อนุมัติเรียบร้อย</span>
                          )}
                          {r.status === 'rejected' && (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">ตีกลับแก้ไข</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <input
                            type="number"
                            min="1"
                            value={r.qtyRequested}
                            onChange={e => {
                              const val = parseInt(e.target.value) || 1;
                              onUpdateQty(r.id, val);
                              setSqlRequests(prev => prev.map(item => item.id === r.id ? { ...item, qtyRequested: val } : item));
                            }}
                            className="w-16 bg-white border border-slate-300 text-right px-1.5 py-1 rounded-lg font-mono font-bold text-slate-800"
                          />
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <span className="text-[10px] text-slate-400 font-bold">฿</span>
                            <input
                              type="number"
                              min="0"
                              value={price}
                              onChange={e => {
                                const val = parseFloat(e.target.value) || 0;
                                onUpdateUnitPrice(r.itemName, val);
                                setSqlRequests(prev => prev.map(item => item.id === r.id ? { ...item, unitPrice: val } : item));
                              }}
                              className="w-20 bg-white border border-slate-300 text-right px-1.5 py-1 rounded-lg font-mono font-bold text-slate-800"
                            />
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono font-black text-slate-800 bg-slate-50/40">
                          {fmtBaht(totalCost)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination controls bar */}
          {!isSqlLoading && sqlTotal > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">จำนวนแถวต่อหน้า:</span>
                <select
                  value={sqlLimit}
                  onChange={e => { setSqlLimit(parseInt(e.target.value)); setSqlPage(1); }}
                  className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-700"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-xs text-slate-500">
                  แสดง {((sqlPage - 1) * sqlLimit) + 1} - {Math.min(sqlPage * sqlLimit, sqlTotal)} จากทั้งหมด {sqlTotal} รายการ
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={sqlPage === 1}
                  onClick={() => setSqlPage(prev => Math.max(1, prev - 1))}
                  className="px-3 py-1.5 bg-white border border-slate-300 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ย้อนกลับ
                </button>
                <div className="text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg px-3 py-1.5">
                  หน้า {sqlPage} / {sqlPages}
                </div>
                <button
                  type="button"
                  disabled={sqlPage === sqlPages}
                  onClick={() => setSqlPage(prev => Math.min(sqlPages, prev + 1))}
                  className="px-3 py-1.5 bg-white border border-slate-300 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ถัดไป
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* REVISION REQUESTS TAB (จัดการคำขอปรับปรุงแผนระหว่างปี) */}
      {activeTab === 'revisions' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100/80 text-amber-900 text-xs font-bold border border-amber-200">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  ระบบเปิดสิทธิ์ปรับปรุงแผนงบประมาณรอบ 6 เดือน (Mid-Year Budget Revision)
                </div>
                <h2 className="text-lg md:text-xl font-bold text-slate-900">
                  จัดการสิทธิ์และตรวจสอบรายการขอปรับปรุงแผนงบประมาณ
                </h2>
                <p className="text-xs md:text-sm text-slate-600 max-w-3xl leading-relaxed">
                  เจ้าหน้าที่พัสดุสามารถ <strong className="text-amber-800">"เปิดสิทธิ์ให้แต่ละฝ่าย/แผนก"</strong> เพื่อให้สามารถปรับปรุง เพิ่ม ลด หรือขอยกเลิกรายการที่เคยได้รับอนุมัติไปแล้ว พร้อมกำหนดระยะเวลาและบันทึกเหตุผล
                </p>
              </div>

              <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-2xl border border-amber-200 shadow-xs">
                <Unlock className="w-5 h-5 text-emerald-600" />
                <div className="text-xs">
                  <div className="text-slate-500 font-medium">ฝ่ายที่เปิดสิทธิ์ปรับแผนขณะนี้</div>
                  <div className="text-base font-bold text-emerald-700">
                    {departments.filter(d => revisionPermissions[d.id]?.isUnlocked).length} / {departments.length} ฝ่าย
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: Department Revision Permission Controller */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                  <Unlock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm md:text-base">
                    1. ควบคุมการเปิด-ปิดสิทธิ์การปรับปรุงแผนรายฝ่าย (Department Unlock Control)
                  </h3>
                  <p className="text-xs text-slate-500">
                    เมื่อเปิดสิทธิ์ ฝ่ายดังกล่าวจะสามารถกดปุ่ม "ขอปรับปรุงแผนงบประมาณ" ในหน้าจอของตนเองได้
                  </p>
                </div>
              </div>

              <div className="w-full sm:w-64">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={revisionDeptSearch}
                    onChange={e => setRevisionDeptSearch(e.target.value)}
                    placeholder="ค้นหาชื่อฝ่าย/กลุ่มงาน..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-3 w-12 text-center">ลำดับ</th>
                    <th className="p-3">ชื่อฝ่าย / แผนก</th>
                    <th className="p-3">กลุ่มงานที่สังกัด</th>
                    <th className="p-3 text-center">สถานะสิทธิ์ปัจจุบัน</th>
                    <th className="p-3">หมายเหตุ / กำหนดระยะเวลา</th>
                    <th className="p-3 text-right w-44">การดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {departments
                    .filter(d => {
                      if (!revisionDeptSearch.trim()) return true;
                      const q = revisionDeptSearch.toLowerCase().trim();
                      const wg = workGroups.find(w => w.id === d.workGroupId);
                      return d.name.toLowerCase().includes(q) || d.id.toLowerCase().includes(q) || (wg && wg.name.toLowerCase().includes(q));
                    })
                    .map((dept, idx) => {
                      const perm = revisionPermissions[dept.id] || { deptId: dept.id, isUnlocked: false };
                      const isUnlocked = perm.isUnlocked;
                      const wg = workGroups.find(w => w.id === dept.workGroupId);
                      const currentNote = revisionNoteInputs[dept.id] ?? perm.note ?? '';

                      return (
                        <tr key={dept.id} className={isUnlocked ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-slate-50/60'}>
                          <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="p-3 font-bold text-slate-900">
                            <div>{dept.name}</div>
                            <span className="text-[10px] text-slate-400 font-mono font-normal">รหัส: {dept.id}</span>
                          </td>
                          <td className="p-3 text-slate-600">
                            {wg ? wg.name : 'ส่วนกลาง'}
                          </td>
                          <td className="p-3 text-center">
                            {isUnlocked ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                                <Unlock className="w-3 h-3 text-emerald-700" />
                                เปิดสิทธิ์ปรับแผน
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium border border-slate-200">
                                <Lock className="w-3 h-3 text-slate-400" />
                                ล็อค (ไม่อนุญาต)
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {isUnlocked ? (
                              <div className="space-y-1">
                                <div className="text-slate-800 font-medium text-xs">{perm.note || 'ไม่มีหมายเหตุระบุ'}</div>
                                {perm.unlockedAt && (
                                  <div className="text-[10px] text-slate-400">
                                    เปิดเมื่อ: {new Date(perm.unlockedAt).toLocaleString('th-TH')} โดย {perm.unlockedBy || 'เจ้าหน้าที่พัสดุ'}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 max-w-sm">
                                <input
                                  type="text"
                                  placeholder="ระบุเหตุผล/หมายเหตุเปิดสิทธิ์ เช่น ปรับรอบ 6 เดือน..."
                                  value={currentNote}
                                  onChange={e => setRevisionNoteInputs(prev => ({ ...prev, [dept.id]: e.target.value }))}
                                  className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                                />
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            {isUnlocked ? (
                              <button
                                type="button"
                                onClick={() => {
                                  onRequestConfirm({
                                    title: `ยืนยันการปิดสิทธิ์ปรับแผนของ ${dept.name}`,
                                    message: `คุณต้องการปิดสิทธิ์การแก้ไข/ปรับปรุงแผนงบประมาณของ "${dept.name}" ใช่หรือไม่?`,
                                    confirmText: 'ปิดสิทธิ์ทันที',
                                    variant: 'warning',
                                    onConfirm: () => {
                                      if (onUnlockRevision) {
                                        onUnlockRevision(dept.id, false);
                                        onToastAlert(`ปิดสิทธิ์การปรับแผนของฝ่าย ${dept.name} เรียบร้อยแล้ว`, 'info');
                                      }
                                    }
                                  });
                                }}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                              >
                                <Lock className="w-3.5 h-3.5" />
                                ปิดสิทธิ์
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  onRequestConfirm({
                                    title: `ยืนยันการเปิดสิทธิ์ปรับแผนให้ ${dept.name}`,
                                    message: `คุณต้องการเปิดสิทธิ์ให้ "${dept.name}" สามารถส่งคำขอปรับปรุง/เพิ่ม/ลดยอดงบประมาณรอบ 6 เดือนได้ ใช่หรือไม่?`,
                                    confirmText: 'เปิดสิทธิ์ทันที',
                                    variant: 'primary',
                                    onConfirm: () => {
                                      if (onUnlockRevision) {
                                        onUnlockRevision(dept.id, true, currentNote);
                                        onToastAlert(`เปิดสิทธิ์ให้ฝ่าย ${dept.name} ปรับปรุงแผนเรียบร้อยแล้ว`, 'success');
                                      }
                                    }
                                  });
                                }}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                              >
                                <Unlock className="w-3.5 h-3.5" />
                                เปิดสิทธิ์ให้ฝ่ายนี้
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Submitted Mid-Year Revision Requests Review */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
                  <FileEdit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm md:text-base">
                    2. รายการคำขอปรับปรุงแผนงบประมาณที่ส่งเข้ามา (Submitted Revision Items)
                  </h3>
                  <p className="text-xs text-slate-500">
                    รายการที่หน่วยงานขอปรับเปลี่ยนยอด ขอยกเลิก หรือขอเพิ่มรายการใหม่กลางปี เพื่อเสนอให้พัสดุและผู้บริหารพิจารณา
                  </p>
                </div>
              </div>
            </div>

            {requests.filter(r => r.isRevisionItem).length === 0 ? (
              <div className="p-12 text-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-500 space-y-2">
                <FileEdit className="w-8 h-8 mx-auto text-slate-300" />
                <div className="font-bold text-sm text-slate-700">ยังไม่มีรายการขอปรับปรุงแผนระหว่างปี</div>
                <div className="text-xs text-slate-400">เมื่อฝ่ายที่ได้รับสิทธิ์ส่งคำขอปรับปรุงแผน รายการเปรียบเทียบจะปรากฏที่นี่</div>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3 w-10 text-center">ลำดับ</th>
                      <th className="p-3">รายการวัสดุ/ครุภัณฑ์</th>
                      <th className="p-3">ฝ่าย/แผนก</th>
                      <th className="p-3 text-center">ประเภทการปรับแผน</th>
                      <th className="p-3 text-right">ยอดเดิม</th>
                      <th className="p-3 text-right">ยอดใหม่ที่ขอ</th>
                      <th className="p-3 text-center">ผลต่าง (+/-)</th>
                      <th className="p-3 text-right">ราคา/หน่วย</th>
                      <th className="p-3 text-right">งบประมาณรวม</th>
                      <th className="p-3">เหตุผลความจำเป็น</th>
                      <th className="p-3 text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {requests
                      .filter(r => r.isRevisionItem)
                      .map((r, idx) => {
                        const price = r.unitPrice ?? itemPrices[r.itemName] ?? guessPrice(r.itemName, r.unit);
                        const baseQty = r.revisionBaseQty !== undefined ? r.revisionBaseQty : (r.qtyOriginal ?? r.qtyRequested);
                        const diff = r.qtyRequested - baseQty;
                        const totalMoney = r.qtyRequested * price;

                        return (
                          <tr key={r.id} className="hover:bg-slate-50/70">
                            <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                            <td className="p-3 font-bold text-slate-900">
                              {r.itemName}
                              <div className="text-[10px] font-normal text-slate-400 font-mono">รหัส: {r.id}</div>
                            </td>
                            <td className="p-3 text-slate-700">{deptName(r.deptId)}</td>
                            <td className="p-3 text-center">
                              {r.revisionType === 'add' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                  <PlusCircle className="w-3 h-3 text-emerald-600" />
                                  เพิ่มรายการใหม่
                                </span>
                              ) : r.revisionType === 'cancel' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                                  <XCircle className="w-3 h-3 text-rose-600" />
                                  ขอยกเลิกรายการ
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                                  <FileEdit className="w-3 h-3 text-amber-600" />
                                  ปรับเปลี่ยนยอด
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right font-mono text-slate-500">
                              {baseQty} {r.unit}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-indigo-900">
                              {r.qtyRequested} {r.unit}
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
                            <td className="p-3 text-right font-mono text-slate-700">
                              {fmtBaht(price)}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-slate-900">
                              {fmtBaht(totalMoney)}
                            </td>
                            <td className="p-3 text-slate-600 max-w-xs text-xs">
                              {r.revisionReason || r.reason || '-'}
                            </td>
                            <td className="p-3 text-center">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden Printable Area for PDF Export */}
      <div id="printable-excel-area-proc" className="hidden print:block text-slate-950 font-sans bg-white p-8">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-xl font-bold">
            รายงานสรุปผลการพิจารณาจัดซื้อพัสดุผ่านการอนุมัติขั้นสุดท้าย (Approved Inventory Plan)
          </h1>
          <div className="text-sm font-semibold text-slate-700">
            ปีงบประมาณ พ.ศ. {selectedSummaryYear === 'all' ? 'ทุกปี' : selectedSummaryYear}
          </div>
        </div>

        <table className="w-full border-collapse border border-slate-900 text-xs">
          <thead>
            <tr className="bg-slate-100 animate-none">
              <th className="border border-slate-900 px-2 py-1.5 text-center w-12 font-bold">ลำดับ</th>
              <th className="border border-slate-900 px-3 py-1.5 text-left font-bold">รายการพัสดุ</th>
              <th className="border border-slate-900 px-2 py-1.5 text-left font-bold w-32">ประเภท</th>
              <th className="border border-slate-900 px-2 py-1.5 text-center w-16 font-bold">หน่วยนับ</th>
              <th className="border border-slate-900 px-2 py-1.5 text-right w-20 font-bold">จำนวนรวม</th>
              <th className="border border-slate-900 px-2 py-1.5 text-right w-24 font-bold">งบประมาณรวม</th>
              <th className="border border-slate-900 px-3 py-1.5 text-left font-bold">หน่วยงาน [จำนวน]</th>
            </tr>
          </thead>
          <tbody>
            {approvedGroupedList.map((row, idx) => (
              <tr key={row.itemName}>
                <td className="border border-slate-900 px-2 py-1 text-center font-mono">{idx + 1}</td>
                <td className="border border-slate-900 px-3 py-1 text-left font-semibold">{row.itemName}</td>
                <td className="border border-slate-900 px-2 py-1 text-left">{row.categoryLabel}</td>
                <td className="border border-slate-900 px-2 py-1 text-center">{row.unit}</td>
                <td className="border border-slate-900 px-2 py-1 text-right font-mono font-bold">{row.totalQty.toLocaleString('th-TH')}</td>
                <td className="border border-slate-900 px-2 py-1 text-right font-mono font-bold">{row.totalBudget.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="border border-slate-900 px-3 py-1 text-left text-[10px] text-slate-800">
                  {row.depts.map(d => `${d.name} [${d.qty}]`).join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

