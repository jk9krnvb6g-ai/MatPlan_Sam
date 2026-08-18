import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { RequestItem, User, CategoryId, Department, WorkGroup } from '../types';
import { CategoryBadge } from './CategoryBadge';
import { PieChart as RechartsPie, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { 
  ALL_ITEMS, 
  DEPARTMENTS, 
  deptName, 
  fmtBaht, 
  guessPrice, 
  STATUS_LABEL,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  getItemCategory,
  guessUnit,
  INITIAL_WORK_GROUPS
} from '../data/catalog';
import { CompareGrid } from './CompareGrid';
import { PaginationBar } from './PaginationBar';
import { TableControlPanel, SortOption, CATEGORY_BUTTON_STYLES } from './TableControlPanel';
import { sortItems } from '../utils/sortHelper';
import { exportProcurementPlanExcel } from '../utils/excelHelper';
import { 
  Info, 
  Briefcase, 
  BarChart3, 
  CheckCheck, 
  Printer, 
  Lock, 
  TrendingUp, 
  PieChart, 
  X, 
  Sparkles,
  ArrowUpDown,
  Building2,
  Layers,
  ChevronDown,
  ChevronUp,
  Award,
  DollarSign,
  PackageCheck,
  Filter,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  RotateCcw,
  AlertCircle,
  Calendar,
  Download,
  Search,
  UserCheck,
  Crown,
  ShieldCheck,
  Unlock
} from 'lucide-react';

interface ExecutiveViewProps {
  currentUser: User | null;
  requests: RequestItem[];
  itemPrices: Record<string, number>;
  fiscalYear: string;
  departments?: Department[];
  workGroups?: WorkGroup[];
  onApproveFinalBudget: (ids: string[]) => void;
  onRejectBack: (id: string, comment: string) => void;
  onApproveAllFinal: () => void;
  onFreezePlan: () => void;
  onOpenReportModal: () => void;
  isPlanFrozen: boolean;
  onRequestConfirm: (opts: { title: string; message: string; confirmText?: string; variant?: 'primary' | 'danger' | 'warning'; onConfirm: () => void }) => void;
  onToastAlert: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ExecutiveView: React.FC<ExecutiveViewProps> = ({
  currentUser,
  requests,
  itemPrices,
  fiscalYear,
  departments = DEPARTMENTS,
  workGroups = INITIAL_WORK_GROUPS,
  onApproveFinalBudget,
  onRejectBack,
  onApproveAllFinal,
  onFreezePlan,
  onOpenReportModal,
  isPlanFrozen,
  onRequestConfirm,
  onToastAlert
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pending' | 'approved' | 'compare' | 'approved-summary' | 'rejected' | 'revision-review'>('dashboard');
  const [comments, setComments] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'itemName' | 'deptId' | 'qtyRequested' | 'price' | 'lineBudget'>('itemName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [pageSize, setPageSize] = useState<number | 'all'>(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Approved summary and rejected tab states
  const [approvedPage, setApprovedPage] = useState(1);
  const [rejectedFilter, setRejectedFilter] = useState<'all' | 'head' | 'proc' | 'prochead' | 'exec'>('all');
  const [rejectedCurrentPage, setRejectedCurrentPage] = useState(1);
  const [rejectedPageSize, setRejectedPageSize] = useState(10);
  const [selectedSummaryYear, setSelectedSummaryYear] = useState<string>('all');
  const [summarySearchTerm, setSummarySearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all');

  const rejectedRequests = React.useMemo(() => {
    return requests.filter(r => r.status === 'rejected');
  }, [requests]);

  const countRejectedHead = React.useMemo(() => {
    return rejectedRequests.filter(r => r.rejectedByRole === 'head' || (!r.rejectedByRole && r.comment.includes('หัวหน้า') && !r.comment.includes('พัสดุ'))).length;
  }, [rejectedRequests]);

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

      // Filter by search term on itemName or deptName
      const matchesSearch = !searchTerm.trim() || r.itemName.toLowerCase().includes(searchTerm.toLowerCase().trim()) || deptName(r.deptId).toLowerCase().includes(searchTerm.toLowerCase().trim());
      if (!matchesSearch) return false;

      // Filter by rejection type
      if (rejectedFilter === 'all') return true;
      const rejRole = r.rejectedByRole;
      if (rejectedFilter === 'head') {
        return rejRole === 'head' || (!rejRole && r.comment.includes('หัวหน้า') && !r.comment.includes('พัสดุ'));
      }
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
  }, [rejectedRequests, selectedCategory, rejectedFilter, searchTerm]);

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

  const [approvedPageSize, setApprovedPageSize] = useState<number | 'all'>(10);
  const [approvedCurrentPage, setApprovedCurrentPage] = useState(1);

  // Modal Popup State for Interactive Donut Charts & Matrix Details
  const [modalDetail, setModalDetail] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    items: RequestItem[];
  } | null>(null);
  const [modalSearchTerm, setModalSearchTerm] = useState('');

  // Status counts
  const statusCounts: Record<string, number> = {
    pending_head: 0,
    pending_proc: 0,
    pending_proc_head: 0,
    pending_exec: 0,
    approved: 0,
    rejected: 0
  };
  requests.forEach(r => {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
  });

  const rawPendingExecRequests = requests.filter(r => r.status === 'pending_exec');
  const filteredPending = rawPendingExecRequests.filter(r =>
    !searchTerm.trim() || r.itemName.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const calcUnitPrice = (r: RequestItem) => r.unitPrice ?? itemPrices[r.itemName] ?? guessPrice(r.itemName, r.unit);
  const calcBudget = (r: RequestItem) => r.qtyRequested * calcUnitPrice(r);

  const handleHeaderSort = (field: 'itemName' | 'deptId' | 'qtyRequested' | 'price' | 'lineBudget') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedPending = [...filteredPending].sort((a, b) => {
    let res = 0;
    if (sortField === 'itemName') res = a.itemName.localeCompare(b.itemName, 'th');
    else if (sortField === 'deptId') res = a.deptId.localeCompare(b.deptId);
    else if (sortField === 'qtyRequested') res = a.qtyRequested - b.qtyRequested;
    else if (sortField === 'price') res = calcUnitPrice(a) - calcUnitPrice(b);
    else if (sortField === 'lineBudget') res = calcBudget(a) - calcBudget(b);
    return sortOrder === 'asc' ? res : -res;
  });

  const approvedRequests = requests.filter(r => r.status === 'approved');

  const numericApprovedSize = approvedPageSize === 'all' ? approvedRequests.length || 1 : approvedPageSize;
  const totalApprovedPages = approvedPageSize === 'all' ? 1 : Math.max(1, Math.ceil(approvedRequests.length / numericApprovedSize));
  const safeApprovedPage = Math.min(approvedCurrentPage, totalApprovedPages);
  const pageApprovedRequests = approvedPageSize === 'all'
    ? approvedRequests
    : approvedRequests.slice((safeApprovedPage - 1) * numericApprovedSize, safeApprovedPage * numericApprovedSize);

  const approvedBudget = approvedRequests.reduce((s, r) => s + calcBudget(r), 0);
  const pendingBudget = filteredPending.reduce((s, r) => s + calcBudget(r), 0);

  // Quantities by dept
  const qtyByDept: Record<string, number> = {};
  requests.forEach(r => {
    qtyByDept[r.deptId] = (qtyByDept[r.deptId] || 0) + r.qtyRequested;
  });
  const deptList = DEPARTMENTS.map(d => ({ name: d.name, qty: qtyByDept[d.id] || 0 })).sort((a, b) => b.qty - a.qty);
  const maxDeptQty = Math.max(1, ...deptList.map(d => d.qty));

  const stillPendingInSystem = requests.some(r => r.status !== 'approved' && r.status !== 'rejected');

  // Modern Executive Dashboard State & Calculations
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [dashFilterCategory, setDashFilterCategory] = useState<CategoryId | 'all'>('all');

  const totalSystemBudget = requests.reduce((s, r) => s + calcBudget(r), 0);
  const totalSystemQty = requests.reduce((s, r) => s + r.qtyRequested, 0);

  // 1. Group / Category Breakdown
  const categoryStats = CATEGORY_ORDER.map(catKey => {
    const catRequests = requests.filter(r => getItemCategory(r.itemName) === catKey);
    const catTotalBudget = catRequests.reduce((s, r) => s + calcBudget(r), 0);
    const catTotalQty = catRequests.reduce((s, r) => s + r.qtyRequested, 0);
    const catItemsCount = catRequests.length;
    const catBudgetShare = totalSystemBudget > 0 ? (catTotalBudget / totalSystemBudget) * 100 : 0;

    const deptIdsInCat = Array.from(new Set(catRequests.map(r => r.deptId)));

    // Aggregate by item name
    const itemSummaryMap: Record<string, { itemName: string; unit: string; totalQty: number; unitPrice: number; totalBudget: number; depts: Set<string> }> = {};
    catRequests.forEach(r => {
      const price = calcUnitPrice(r);
      const budget = calcBudget(r);
      if (!itemSummaryMap[r.itemName]) {
        itemSummaryMap[r.itemName] = {
          itemName: r.itemName,
          unit: r.unit,
          totalQty: 0,
          unitPrice: price,
          totalBudget: 0,
          depts: new Set()
        };
      }
      itemSummaryMap[r.itemName].totalQty += r.qtyRequested;
      itemSummaryMap[r.itemName].totalBudget += budget;
      itemSummaryMap[r.itemName].depts.add(deptName(r.deptId));
    });

    const topItems = Object.values(itemSummaryMap).sort((a, b) => b.totalBudget - a.totalBudget);

    return {
      catKey,
      label: CATEGORY_LABELS[catKey],
      requests: catRequests,
      totalBudget: catTotalBudget,
      totalQty: catTotalQty,
      itemsCount: catItemsCount,
      budgetShare: catBudgetShare,
      deptIds: deptIdsInCat,
      topItems
    };
  }).sort((a, b) => b.totalBudget - a.totalBudget);

  const maxCatBudget = Math.max(1, ...categoryStats.map(c => c.totalBudget));

  // 2. Department Breakdown
  const departmentStats = DEPARTMENTS.map(dept => {
    const deptRequests = requests.filter(r => r.deptId === dept.id);
    const deptTotalBudget = deptRequests.reduce((s, r) => s + calcBudget(r), 0);
    const deptTotalQty = deptRequests.reduce((s, r) => s + r.qtyRequested, 0);
    const deptItemsCount = deptRequests.length;
    const deptBudgetShare = totalSystemBudget > 0 ? (deptTotalBudget / totalSystemBudget) * 100 : 0;

    const catBreakdownMap: Record<string, { budget: number; qty: number; count: number }> = {};
    deptRequests.forEach(r => {
      const cat = getItemCategory(r.itemName);
      if (!catBreakdownMap[cat]) {
        catBreakdownMap[cat] = { budget: 0, qty: 0, count: 0 };
      }
      catBreakdownMap[cat].budget += calcBudget(r);
      catBreakdownMap[cat].qty += r.qtyRequested;
      catBreakdownMap[cat].count += 1;
    });

    return {
      deptId: dept.id,
      deptName: dept.name,
      requests: deptRequests,
      totalBudget: deptTotalBudget,
      totalQty: deptTotalQty,
      itemsCount: deptItemsCount,
      budgetShare: deptBudgetShare,
      catBreakdownMap
    };
  }).sort((a, b) => b.totalBudget - a.totalBudget);

  const maxDeptBudget = Math.max(1, ...departmentStats.map(d => d.totalBudget));

  // 3. Donut Charts Data Calculations for Executive Dashboard
  // Chart 1: Budget Status Comparison (ยอดงบประมาณรวมทั้งหมด vs อนุมัติขั้นสุดท้ายแล้ว vs อยู่ระหว่างพิจารณา)
  const rejectedBudget = requests.filter(r => r.status === 'rejected').reduce((s, r) => s + calcBudget(r), 0);
  const pendingConsiderationBudget = requests
    .filter(r => r.status !== 'approved' && r.status !== 'rejected')
    .reduce((s, r) => s + calcBudget(r), 0);

  const budgetStatusDonutData = [
    { 
      name: 'อนุมัติขั้นสุดท้ายแล้ว', 
      value: approvedBudget, 
      color: '#10B981', 
      count: statusCounts.approved, 
      pct: totalSystemBudget > 0 ? (approvedBudget / totalSystemBudget) * 100 : 0 
    },
    { 
      name: 'อยู่ระหว่างขั้นตอนพิจารณา', 
      value: pendingConsiderationBudget, 
      color: '#F59E0B', 
      count: requests.length - statusCounts.approved - statusCounts.rejected,
      pct: totalSystemBudget > 0 ? (pendingConsiderationBudget / totalSystemBudget) * 100 : 0 
    },
    ...(rejectedBudget > 0 ? [{ 
      name: 'ตีกลับให้ทบทวน', 
      value: rejectedBudget, 
      color: '#EF4444', 
      count: statusCounts.rejected,
      pct: totalSystemBudget > 0 ? (rejectedBudget / totalSystemBudget) * 100 : 0 
    }] : [])
  ].filter(d => d.value > 0);

  // Chart 2: Material Group / Category Donut Data
  const categoryDonutData = categoryStats
    .filter(c => c.totalBudget > 0)
    .map(c => {
      const categoryColors: Record<string, string> = {
        office: '#4F46E5',
        computer: '#06B6D4',
        medical: '#10B981',
        advertising: '#8B5CF6',
        cleaning: '#F59E0B',
        construction: '#EF4444',
        kitchen: '#EC4899',
        vehicle: '#3B82F6',
        other: '#64748B'
      };
      return {
        name: c.label,
        value: c.totalBudget,
        color: categoryColors[c.catKey] || '#6366F1',
        catKey: c.catKey,
        itemsCount: c.itemsCount,
        pct: c.budgetShare
      };
    });

  // Chart 3: Department Donut Data
  const deptPalette = ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#06B6D4', '#6366F1', '#14B8A6'];
  const deptDonutData = departmentStats
    .filter(d => d.totalBudget > 0)
    .map((d, i) => ({
      name: d.deptName,
      value: d.totalBudget,
      color: deptPalette[i % deptPalette.length],
      deptId: d.deptId,
      itemsCount: d.itemsCount,
      pct: d.budgetShare
    }));

  // Chart 4: Material Items Donut Data (Top Material Items)
  const itemAggMap: Record<string, { totalBudget: number; totalQty: number; unit: string }> = {};
  requests.forEach(r => {
    if (!itemAggMap[r.itemName]) {
      itemAggMap[r.itemName] = { totalBudget: 0, totalQty: 0, unit: r.unit };
    }
    itemAggMap[r.itemName].totalBudget += calcBudget(r);
    itemAggMap[r.itemName].totalQty += r.qtyRequested;
  });
  const sortedItemAgg = Object.entries(itemAggMap)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.totalBudget - a.totalBudget);

  const top5Items = sortedItemAgg.slice(0, 5);
  const otherItemsBudget = sortedItemAgg.slice(5).reduce((s, x) => s + x.totalBudget, 0);

  const itemPalette = ['#4F46E5', '#06B6D4', '#10B981', '#8B5CF6', '#F59E0B', '#94A3B8'];
  const itemDonutData = [
    ...top5Items.map((item, idx) => ({
      name: item.name,
      value: item.totalBudget,
      color: itemPalette[idx % itemPalette.length],
      pct: totalSystemBudget > 0 ? (item.totalBudget / totalSystemBudget) * 100 : 0
    })),
    ...(otherItemsBudget > 0 ? [{
      name: 'รายการวัสดุอื่น ๆ',
      value: otherItemsBudget,
      color: '#94A3B8',
      pct: totalSystemBudget > 0 ? (otherItemsBudget / totalSystemBudget) * 100 : 0
    }] : [])
  ];

  // Helper popup modal openers for chart & matrix click interactions
  const openStatusModal = (statusName: string) => {
    let filtered: RequestItem[] = [];
    if (statusName === 'อนุมัติขั้นสุดท้ายแล้ว') {
      filtered = requests.filter(r => r.status === 'approved');
    } else if (statusName === 'อยู่ระหว่างขั้นตอนพิจารณา') {
      filtered = requests.filter(r => r.status !== 'approved' && r.status !== 'rejected');
    } else if (statusName === 'ตีกลับให้ทบทวน') {
      filtered = requests.filter(r => r.status === 'rejected');
    } else {
      filtered = [...requests];
    }

    const budgetSum = filtered.reduce((s, r) => s + calcBudget(r), 0);
    setModalSearchTerm('');
    setModalDetail({
      isOpen: true,
      title: `รายละเอียดข้อมูลรายการ: ${statusName}`,
      subtitle: `แสดงข้อมูลรายการคำขอล่าสุดตามสถานะ (${filtered.length} รายการคำขอ | งบประมาณรวม ${fmtBaht(budgetSum)} บาท)`,
      items: filtered
    });
  };

  const openCategoryModal = (catKey: CategoryId) => {
    const catLabel = CATEGORY_LABELS[catKey] || catKey;
    const filtered = requests.filter(r => getItemCategory(r.itemName) === catKey);
    const budgetSum = filtered.reduce((s, r) => s + calcBudget(r), 0);

    setModalSearchTerm('');
    setModalDetail({
      isOpen: true,
      title: `รายละเอียดกลุ่มงาน / ประเภทวัสดุ: ${catLabel}`,
      subtitle: `รายการคำขอพัสดุในหมวด ${catLabel} (${filtered.length} รายการ | งบรวม ${fmtBaht(budgetSum)} บาท)`,
      items: filtered
    });
  };

  const openDeptModal = (departmentId: string) => {
    const dName = deptName(departmentId);
    const filtered = requests.filter(r => r.deptId === departmentId);
    const budgetSum = filtered.reduce((s, r) => s + calcBudget(r), 0);

    setModalSearchTerm('');
    setModalDetail({
      isOpen: true,
      title: `รายละเอียดคำขอจัดซื้อพัสดุ — ${dName}`,
      subtitle: `รายการคำขอนำเสนอโดยสังกัด ${dName} (${filtered.length} รายการ | งบรวม ${fmtBaht(budgetSum)} บาท)`,
      items: filtered
    });
  };

  const openItemModal = (itemNameStr: string) => {
    let filtered: RequestItem[] = [];
    if (itemNameStr === 'รายการวัสดุอื่น ๆ') {
      const top5Names = top5Items.map(i => i.name);
      filtered = requests.filter(r => !top5Names.includes(r.itemName));
    } else {
      filtered = requests.filter(r => r.itemName === itemNameStr);
    }
    const budgetSum = filtered.reduce((s, r) => s + calcBudget(r), 0);

    setModalSearchTerm('');
    setModalDetail({
      isOpen: true,
      title: `รายละเอียดรายการวัสดุ: ${itemNameStr}`,
      subtitle: `รายการคำขอจัดซื้อวัสดุ '${itemNameStr}' ทั้งหมดในระบบ (${filtered.length} รายการ | งบรวม ${fmtBaht(budgetSum)} บาท)`,
      items: filtered
    });
  };

  const handleApproveSingle = (r: RequestItem) => {
    const budget = calcBudget(r);

    onRequestConfirm({
      title: 'ยืนยันการอนุมัติงบประมาณพัสดุขั้นสุดท้าย',
      message: `คุณต้องการอนุมัติงบประมาณรายการ '${r.itemName}' (${r.qtyRequested} ${r.unit}, รวม ${fmtBaht(budget)} บาท) ของหน่วยงาน ${deptName(r.deptId)} หรือไม่?`,
      confirmText: 'อนุมัติงบประมาณ',
      variant: 'primary',
      onConfirm: () => {
        onApproveFinalBudget([r.id]);
        onToastAlert(`อนุมัติงบประมาณรายการ '${r.itemName}' (${fmtBaht(budget)} บาท) เรียบร้อยแล้ว`, 'success');
      }
    });
  };

  const handleRejectSingle = (r: RequestItem) => {
    const comment = comments[r.id] || 'ผู้บริหารขอให้หัวหน้าฝ่ายพัสดุทบทวนงบประมาณใหม่อีกครั้ง';

    onRequestConfirm({
      title: 'ยืนยันการตีกลับรายการพัสดุ',
      message: `คุณต้องการตีกลับรายการ '${r.itemName}' ให้หัวหน้าฝ่ายพัสดุทบทวนใหม่หรือไม่?`,
      confirmText: 'ยืนยันตีกลับ',
      variant: 'danger',
      onConfirm: () => {
        onRejectBack(r.id, comment);
        onToastAlert(`ตีกลับรายการ '${r.itemName}' เรียบร้อยแล้ว`, 'info');
      }
    });
  };

  const handleApproveAllBatch = () => {
    if (filteredPending.length === 0) return;

    onRequestConfirm({
      title: 'ยืนยันการอนุมัติงบประมาณพัสดุทั้งหมด',
      message: `คุณต้องการอนุมัติรายการคำขอนำเสนอทั้งหมดจำนวน ${filteredPending.length} รายการ (งบประมาณรวม ${fmtBaht(pendingBudget)} บาท) ขั้นสุดท้ายหรือไม่?`,
      confirmText: 'อนุมัติงบประมาณทั้งหมด',
      variant: 'primary',
      onConfirm: () => {
        onApproveAllFinal();
        onToastAlert(`อนุมัติงบประมาณจัดซื้อพัสดุทั้งหมด (${filteredPending.length} รายการ) เรียบร้อยแล้ว!`, 'success');
      }
    });
  };

  const handleFreeze = () => {
    onRequestConfirm({
      title: 'ยืนยันการสั่งล็อกแผนงบประมาณ (Freeze Plan)',
      message: `คุณต้องการสั่งล็อกแผนงบประมาณจัดซื้อประจำปีงบประมาณ พ.ศ. ${fiscalYear} ใช่หรือไม่? เมื่อล็อกแล้ว ระบบจะปิดรับการปรับแก้ไขข้อมูลคำขอทั้งหมดเพื่อนำแผนไปปฏิบัติจริง`,
      confirmText: 'สั่งล็อกแผนงบประมาณ',
      variant: 'warning',
      onConfirm: () => {
        onFreezePlan();
        onToastAlert(`สั่งล็อกแผนงบประมาณ พ.ศ. ${fiscalYear} (Freeze Plan) เรียบร้อยแล้ว`, 'success');
      }
    });
  };

  const handleUnfreeze = () => {
    onRequestConfirm({
      title: 'ยืนยันการปลดล็อกแผนงบประมาณ (Unfreeze Plan)',
      message: `คุณต้องการปลดล็อกแผนงบประมาณจัดซื้อประจำปีงบประมาณ พ.ศ. ${fiscalYear} ใช่หรือไม่? เมื่อปลดล็อกแล้ว ระบบจะเปิดให้มีการส่งคำขอและปรับแก้รายการแผนตามปกติ`,
      confirmText: 'ปลดล็อกแผนงบประมาณ',
      variant: 'danger',
      onConfirm: () => {
        onFreezePlan();
        onToastAlert(`ปลดล็อกแผนงบประมาณ พ.ศ. ${fiscalYear} สำเร็จเรียบร้อยแล้ว`, 'success');
      }
    });
  };

  // Helper for CompareGrid
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

  // Pagination slice for pending
  const numericSize = pageSize === 'all' ? sortedPending.length || 1 : pageSize;
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(sortedPending.length / numericSize));
  const safePage = Math.min(currentPage, totalPages);
  const pagePending = pageSize === 'all' ? sortedPending : sortedPending.slice((safePage - 1) * numericSize, safePage * numericSize);

  return (
    <div className="space-y-5">
      {/* Top Controls & Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Tabs */}
        <div className="flex bg-slate-200/80 p-1 rounded-xl gap-1 text-xs font-semibold w-fit flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'dashboard'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PieChart className="w-4 h-4 text-indigo-600" />
            แดชบอร์ดภาพรวมผู้บริหาร
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Briefcase className="w-4 h-4 text-indigo-600" />
            รออนุมัติงบประมาณ ({filteredPending.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('approved')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'approved'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCheck className="w-4 h-4 text-emerald-600" />
            รายการที่ผู้บริหารอนุมัติเรียบร้อยแล้ว ({approvedRequests.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('approved-summary');
              setApprovedPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'approved-summary'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
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
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'rejected'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertCircle className="w-4 h-4 text-rose-600" />
            รายการที่ถูกตีกลับ ({rejectedRequests.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('compare')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'compare'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            เปรียบเทียบย้อนหลัง 5 ปี
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('revision-review')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'revision-review'
                ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                : requests.some(r => r.isRevisionItem)
                ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 font-bold animate-pulse'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-700" />
            <span>พิจารณาปรับปรุงแผนรอบ 6 เดือน ({requests.filter(r => r.isRevisionItem).length})</span>
          </button>
        </div>

        {/* Global Export Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => exportProcurementPlanExcel(requests, itemPrices, departments, workGroups, fiscalYear)}
            className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
            title="ส่งออกแผนจัดหาพัสดุและงบประมาณเป็นไฟล์ Excel"
          >
            <Download className="w-4 h-4 text-emerald-700" />
            <span>ส่งออกแผนจัดหา (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={onOpenReportModal}
            className="px-3.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
          >
            <Printer className="w-4 h-4 text-teal-700" />
            <span>พิมพ์รายงานสรุปทางการ</span>
          </button>
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Top Key Metrics Cards */}
          {/* Top Key Metrics Cards - Clickable for details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div 
              onClick={() => openStatusModal('ทั้งหมด')}
              className="bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
            >
              <div className="flex items-center justify-between text-slate-500 text-[10.5px] font-mono uppercase font-bold">
                <span>ยอดงบประมาณจัดซื้อรวมทั้งหมด</span>
                <DollarSign className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 mt-2 flex items-baseline gap-1">
                {fmtBaht(totalSystemBudget)} <span className="text-xs font-sans text-slate-500 font-normal">บาท</span>
              </div>
              <div className="mt-2 text-[10px] text-slate-500 font-medium flex items-center gap-1">
                <span>จากรวมทั้งสิ้น {requests.length} รายการคำขอ</span>
                <ChevronRight className="w-3 h-3 text-indigo-500 ml-auto" />
              </div>
            </div>

            <div 
              onClick={() => openStatusModal('อนุมัติขั้นสุดท้ายแล้ว')}
              className="bg-white border border-emerald-200 hover:border-emerald-400 bg-emerald-50/20 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
            >
              <div className="flex items-center justify-between text-emerald-800 text-[10.5px] font-mono uppercase font-bold">
                <span>อนุมัติขั้นสุดท้ายแล้ว</span>
                <CheckCheck className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-950 mt-2 flex items-baseline gap-1">
                {fmtBaht(approvedBudget)} <span className="text-xs font-sans text-emerald-700 font-normal">บาท</span>
              </div>
              <div className="mt-2 text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                <span>{statusCounts.approved} รายการได้รับการอนุมัติ</span>
                <ChevronRight className="w-3 h-3 text-emerald-600 ml-auto" />
              </div>
            </div>

            <div 
              onClick={() => openStatusModal('อยู่ระหว่างขั้นตอนพิจารณา')}
              className="bg-white border border-amber-200 hover:border-amber-400 bg-amber-50/20 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
            >
              <div className="flex items-center justify-between text-amber-800 text-[10.5px] font-mono uppercase font-bold">
                <span>อยู่ระหว่างขั้นตอนพิจารณา</span>
                <Briefcase className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-amber-950 mt-2 flex items-baseline gap-1">
                {fmtBaht(pendingConsiderationBudget)} <span className="text-xs font-sans text-amber-700 font-normal">บาท</span>
              </div>
              <div className="mt-2 text-[10px] text-amber-700 font-bold flex items-center gap-1">
                <span>{requests.length - statusCounts.approved - statusCounts.rejected} รายการรอพิจารณา</span>
                <ChevronRight className="w-3 h-3 text-amber-600 ml-auto" />
              </div>
            </div>

            <div 
              onClick={() => categoryStats[0] && openCategoryModal(categoryStats[0].catKey)}
              className="bg-white border border-cyan-200 hover:border-cyan-400 bg-cyan-50/30 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
            >
              <div className="flex items-center justify-between text-cyan-900 text-[10.5px] font-mono uppercase font-bold">
                <span>กลุ่มที่มีคำขอสูงสุด</span>
                <Award className="w-4 h-4 text-cyan-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-base sm:text-lg font-bold font-sans text-cyan-950 mt-2 truncate">
                {categoryStats[0]?.label || '-'}
              </div>
              <div className="mt-1 text-[11px] font-mono text-cyan-700 font-bold flex items-center justify-between">
                <span>{fmtBaht(categoryStats[0]?.totalBudget || 0)} บาท</span>
                <ChevronRight className="w-3 h-3 text-cyan-600" />
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* CHART 1: DONUT CHART - BUDGET STATUS COMPARISON (รวมทั้งหมด vs อนุมัติแล้ว vs รอพิจารณา) */}
          {/* ========================================================================= */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="pb-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-indigo-600" />
                  1. กราฟเปรียบเทียบ ยอดงบประมาณจัดซื้อรวมทั้งหมด, อนุมัติขั้นสุดท้ายแล้ว และ อยู่ระหว่างขั้นตอนพิจารณา
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  วิเคราะห์สัดส่วนความคืบหน้าการอนุมัติงบประมาณจัดซื้อพัสดุครุภัณฑ์ภาพรวมองค์กร (คลิกข้อมูลเพื่อเปิด Popup แสดงรายการ)
                </p>
              </div>

              <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-xl text-xs font-bold text-slate-700">
                <span>รวมงบระบบ:</span>
                <span className="font-mono text-indigo-700">{fmtBaht(totalSystemBudget)} บาท</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Donut Canvas */}
              <div 
                onClick={() => openStatusModal('ทั้งหมด')}
                className="lg:col-span-5 bg-slate-50/70 hover:bg-indigo-50/30 border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center relative min-h-[280px] cursor-pointer group transition-all"
              >
                <div className="w-full h-64 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={budgetStatusDonutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={105}
                        paddingAngle={4}
                        dataKey="value"
                        cursor="pointer"
                        onClick={(entry: any) => entry && entry.name && openStatusModal(String(entry.name))}
                      >
                        {budgetStatusDonutData.map((entry, idx) => (
                          <Cell key={`status-cell-${idx}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(val: number) => [`${fmtBaht(val)} บาท`, 'งบประมาณ']}
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderColor: '#334155',
                          borderRadius: '12px',
                          color: '#FFFFFF',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}
                      />
                    </RechartsPie>
                  </ResponsiveContainer>

                  {/* Centered Donut Label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">งบรวมจัดซื้อทั้งหมด</span>
                    <span className="text-base font-black text-slate-900 font-mono mt-0.5">
                      {fmtBaht(totalSystemBudget)}
                    </span>
                    <span className="text-[10px] font-sans text-indigo-600 font-bold">บาท ({requests.length} คำขอ)</span>
                    <span className="text-[9px] text-indigo-500 underline font-semibold mt-1">คลิกเพื่อดูรายละเอียด</span>
                  </div>
                </div>
              </div>

              {/* Status Breakdown Legend & Detail Cards */}
              <div className="lg:col-span-7 space-y-3">
                <div className="text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>รายละเอียดยอดงบประมาณและสัดส่วนตามสถานะ:</span>
                  <span className="text-[10.5px] text-indigo-600 font-medium">คลิกการ์ดเพื่อดูรายการ</span>
                </div>
                {budgetStatusDonutData.map((item) => (
                  <div 
                    key={item.name} 
                    onClick={() => openStatusModal(item.name)}
                    className="p-3.5 border border-slate-200 hover:border-indigo-400 rounded-2xl bg-white hover:bg-indigo-50/20 transition-all flex items-center justify-between gap-3 shadow-2xs cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs group-hover:scale-125 transition-transform" style={{ backgroundColor: item.color }} />
                      <div>
                        <div className="text-xs font-extrabold text-slate-900 group-hover:text-indigo-900 flex items-center gap-1.5">
                          <span>{item.name}</span>
                          <Eye className="w-3.5 h-3.5 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          จำนวน <strong className="text-slate-800">{item.count}</strong> รายการคำขอ
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-extrabold font-mono text-slate-900">
                        {fmtBaht(item.value)} <span className="text-[10px] font-sans text-slate-500 font-normal">บาท</span>
                      </div>
                      <div className="text-[11px] font-mono font-extrabold text-indigo-600">
                        {(item.pct || 0).toFixed(1)}% ของงบรวม
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* CHART 2: 3-DONUT GRID - GROUP / DEPARTMENT / MATERIAL ITEMS COMPARISON */}
          {/* ========================================================================= */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
            <div className="pb-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  2. กราฟเปรียบเทียบกลุ่มงานที่ขอ, ฝ่ายที่ขอ และวัสดุ (Donut Charts 3 มิติ)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  เปรียบเทียบสัดส่วนงบประมาณ 3 มิติ (คลิกข้อมูลบนกราฟหรือรายการเพื่อเปิด Popup แสดงรายละเอียด)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">กรองหมวด:</span>
                <select
                  value={dashFilterCategory}
                  onChange={e => setDashFilterCategory(e.target.value as CategoryId | 'all')}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
                >
                  <option value="all">แสดงทุกหมวดหมู่ ({categoryStats.length})</option>
                  {CATEGORY_ORDER.map(c => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 3 DONUT CHARTS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* DONUT A: GROUP / CATEGORY */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3 flex flex-col justify-between shadow-2xs">
                <div className="border-b border-slate-200/80 pb-2">
                  <h4 className="text-xs font-extrabold text-slate-900 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                      ก. แยกตามกลุ่มงาน/ประเภทวัสดุ
                    </span>
                    <span className="text-[10px] font-mono bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-bold">
                      {categoryDonutData.length} หมวด
                    </span>
                  </h4>
                </div>

                <div className="h-48 relative cursor-pointer">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={categoryDonutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                        cursor="pointer"
                        onClick={(entry: any) => entry && entry.catKey && openCategoryModal(entry.catKey as CategoryId)}
                      >
                        {categoryDonutData.map((entry, idx) => (
                          <Cell key={`cat-cell-${idx}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={1.5} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(val: number) => [`${fmtBaht(val)} บาท`, 'งบรวม']}
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderRadius: '8px',
                          color: '#FFFFFF',
                          fontSize: '11px'
                        }}
                      />
                    </RechartsPie>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <span className="text-[9px] font-mono text-slate-400 uppercase font-bold">กลุ่มวัสดุ</span>
                    <span className="text-xs font-extrabold text-slate-800">{categoryDonutData.length} หมวด</span>
                  </div>
                </div>

                {/* Legend List */}
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-[11px]">
                  {categoryDonutData.map((c) => (
                    <div 
                      key={c.catKey} 
                      onClick={() => openCategoryModal(c.catKey as CategoryId)}
                      className="flex items-center justify-between p-1.5 bg-white hover:bg-indigo-50/50 border border-slate-100 hover:border-indigo-300 rounded-lg text-slate-700 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-1.5 truncate pr-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                        <span className="truncate font-semibold text-slate-800">{c.name}</span>
                      </div>
                      <div className="text-right shrink-0 font-mono">
                        <span className="font-bold text-slate-900">{fmtBaht(c.value)}</span>
                        <span className="text-[10px] text-indigo-600 font-bold ml-1">({(c.pct || 0).toFixed(0)}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* DONUT B: DEPARTMENT / DIVISION */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3 flex flex-col justify-between shadow-2xs">
                <div className="border-b border-slate-200/80 pb-2">
                  <h4 className="text-xs font-extrabold text-slate-900 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                      ข. แยกตามฝ่าย / หน่วยงานที่ขอ
                    </span>
                    <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                      {deptDonutData.length} ฝ่าย
                    </span>
                  </h4>
                </div>

                <div className="h-48 relative cursor-pointer">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={deptDonutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                        cursor="pointer"
                        onClick={(entry: any) => entry && entry.deptId && openDeptModal(entry.deptId)}
                      >
                        {deptDonutData.map((entry, idx) => (
                          <Cell key={`dept-cell-${idx}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={1.5} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(val: number) => [`${fmtBaht(val)} บาท`, 'งบขอ']}
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderRadius: '8px',
                          color: '#FFFFFF',
                          fontSize: '11px'
                        }}
                      />
                    </RechartsPie>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <span className="text-[9px] font-mono text-slate-400 uppercase font-bold">หน่วยงาน</span>
                    <span className="text-xs font-extrabold text-slate-800">{deptDonutData.length} ฝ่าย</span>
                  </div>
                </div>

                {/* Legend List */}
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-[11px]">
                  {deptDonutData.map((d) => (
                    <div 
                      key={d.deptId} 
                      onClick={() => openDeptModal(d.deptId)}
                      className="flex items-center justify-between p-1.5 bg-white hover:bg-blue-50/50 border border-slate-100 hover:border-blue-300 rounded-lg text-slate-700 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-1.5 truncate pr-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="truncate font-semibold text-slate-800">{d.name}</span>
                      </div>
                      <div className="text-right shrink-0 font-mono">
                        <span className="font-bold text-slate-900">{fmtBaht(d.value)}</span>
                        <span className="text-[10px] text-blue-600 font-bold ml-1">({(d.pct || 0).toFixed(0)}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* DONUT C: MATERIAL ITEMS */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3 flex flex-col justify-between shadow-2xs">
                <div className="border-b border-slate-200/80 pb-2">
                  <h4 className="text-xs font-extrabold text-slate-900 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                      ค. แยกตามรายการวัสดุสำคัญ
                    </span>
                    <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                      {sortedItemAgg.length} รายการ
                    </span>
                  </h4>
                </div>

                <div className="h-48 relative cursor-pointer">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={itemDonutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                        cursor="pointer"
                        onClick={(entry: any) => entry && entry.name && openItemModal(String(entry.name))}
                      >
                        {itemDonutData.map((entry, idx) => (
                          <Cell key={`item-cell-${idx}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={1.5} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(val: number) => [`${fmtBaht(val)} บาท`, 'งบรวมรายการ']}
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderRadius: '8px',
                          color: '#FFFFFF',
                          fontSize: '11px'
                        }}
                      />
                    </RechartsPie>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <span className="text-[9px] font-mono text-slate-400 uppercase font-bold">รายการวัสดุ</span>
                    <span className="text-xs font-extrabold text-slate-800">{sortedItemAgg.length} รายการ</span>
                  </div>
                </div>

                {/* Legend List */}
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-[11px]">
                  {itemDonutData.map((it) => (
                    <div 
                      key={it.name} 
                      onClick={() => openItemModal(it.name)}
                      className="flex items-center justify-between p-1.5 bg-white hover:bg-emerald-50/50 border border-slate-100 hover:border-emerald-300 rounded-lg text-slate-700 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-1.5 truncate pr-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: it.color }} />
                        <span className="truncate font-semibold text-slate-800">{it.name}</span>
                      </div>
                      <div className="text-right shrink-0 font-mono">
                        <span className="font-bold text-slate-900">{fmtBaht(it.value)}</span>
                        <span className="text-[10px] text-emerald-600 font-bold ml-1">({(it.pct || 0).toFixed(0)}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Section 2: Department Breakdown & Comparison */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="pb-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  การเจาะลึกงบประมาณและคำขอแยกตามฝ่าย / หน่วยงาน (Department Breakdown Matrix)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  คลิกข้อมูลหน่วยงานใดก็ได้เพื่อเปิด Popup แสดงตารางรายละเอียดวัสดุ กลุ่มงาน ฝ่าย และราคาได้อย่างรวดเร็ว
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {departmentStats.map(d => {
                const budgetPct = maxDeptBudget > 0 && !isNaN(d.totalBudget) ? Math.round((d.totalBudget / maxDeptBudget) * 100) : 0;
                const safeBudgetShare = isNaN(d.budgetShare) ? 0 : d.budgetShare;

                return (
                  <div key={d.deptId} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs hover:border-indigo-300 transition-all">
                    <div 
                      className="p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-indigo-50/30 transition-colors"
                      onClick={() => openDeptModal(d.deptId)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                          {d.deptName.slice(0, 2)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <span>{d.deptName}</span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600">
                              {d.itemsCount} รายการคำขอ
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                            <span>รวมปริมาณ: <strong className="text-slate-800 font-bold">{d.totalQty}</strong> ชิ้น/หน่วย</span>
                            <span>•</span>
                            <span>สัดส่วนงบ: <strong className="text-indigo-600 font-bold">{safeBudgetShare.toFixed(1)}%</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-base font-bold font-mono text-slate-900">
                            {fmtBaht(d.totalBudget)} <span className="text-xs font-sans text-slate-500 font-normal">บาท</span>
                          </div>
                          <div className="w-28 bg-slate-100 rounded-full h-1.5 overflow-hidden mt-1.5 ml-auto">
                            <div 
                              className="bg-indigo-600 h-full rounded-full" 
                              style={{ width: `${budgetPct}%` }}
                            />
                          </div>
                        </div>

                        <button 
                          type="button" 
                          onClick={(e) => { e.stopPropagation(); openDeptModal(d.deptId); }}
                          className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          ดู Popup รายละเอียด
                        </button>
                      </div>
                    </div>

                    {/* Category Tags Row */}
                    <div className="px-4 pb-3 flex flex-wrap items-center gap-1.5 text-xs border-t border-slate-100 pt-2.5 bg-slate-50/40">
                      <span className="font-bold text-slate-600 text-[11px]">หมวดหมู่ที่ขอ:</span>
                      {Object.entries(d.catBreakdownMap).map(([cKey, cData]) => {
                        const style = CATEGORY_BUTTON_STYLES[cKey] || CATEGORY_BUTTON_STYLES.office;
                        return (
                          <button
                            key={cKey}
                            type="button"
                            onClick={() => openCategoryModal(cKey as CategoryId)}
                            className={`px-2 py-0.5 rounded-lg text-[10.5px] border font-medium ${style.inactive} hover:opacity-80 transition-opacity cursor-pointer`}
                          >
                            {CATEGORY_LABELS[cKey as CategoryId] || cKey}: {fmtBaht(cData.budget)} บาท ({cData.qty} ชิ้น)
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED TAB: รายการที่ผู้บริหารอนุมัติเรียบร้อยแล้ว */}
      {activeTab === 'approved' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CheckCheck className="w-5 h-5 text-emerald-600" />
                  รายการที่ผู้บริหารอนุมัติเรียบร้อยแล้ว ({approvedRequests.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  รายการคำขอพัสดุครุภัณฑ์ที่ได้รับการอนุมัติขั้นสุดท้ายจากผู้บริหาร พร้อมส่งต่อให้ฝ่ายจัดซื้อดำเนินการ
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenReportModal}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs px-3.5 py-2 rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-700" />
                  เปิดรายงานสรุปทางการ (PDF/Print)
                </button>

                {!isPlanFrozen ? (
                  <button
                    type="button"
                    disabled={approvedRequests.length === 0 || stillPendingInSystem}
                    onClick={handleFreeze}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    สั่งล็อกแผนงบประมาณ (Freeze Plan)
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-100 border border-emerald-300 text-emerald-950 font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-700" />
                      แผนงบประมาณถูกล็อกแล้ว
                    </span>
                    {(currentUser?.username === 'admin' || currentUser?.role === 'executive') && (
                      <button
                        type="button"
                        onClick={handleUnfreeze}
                        className="bg-rose-100 hover:bg-rose-200 text-rose-850 font-bold text-xs px-3 py-1.5 rounded-xl border border-rose-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                        title="ปลดล็อกแผนงบประมาณเพื่อแก้ไขข้อมูล"
                      >
                        <Unlock className="w-3.5 h-3.5 text-rose-700" />
                        ปลดล็อกแผน
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Approved Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                <div className="text-[11px] font-bold text-emerald-800">จำนวนรายการอนุมัติแล้ว</div>
                <div className="text-xl font-bold font-mono text-emerald-950 mt-1">{approvedRequests.length} รายการ</div>
              </div>
              <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                <div className="text-[11px] font-bold text-indigo-800">งบประมาณรวมที่อนุมัติ</div>
                <div className="text-xl font-bold font-mono text-indigo-950 mt-1">{fmtBaht(approvedBudget)} บาท</div>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-[11px] font-bold text-slate-600">สัดส่วนของงบขอทั้งหมด</div>
                <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                  {totalSystemBudget > 0 ? ((approvedBudget / totalSystemBudget) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>

            {isPlanFrozen && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs p-3 rounded-xl flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  <strong>สถานะล็อกแผนงบประมาณแล้ว (Freeze Plan)</strong> — ระบบไม่เปิดรับการแก้ไขคำขอเพิ่มเติมในรอบนี้ สามารถพิมพ์รายงานเอกสารสรุปแผนเพื่อดำเนินการจัดซื้อได้ทันที
                </span>
              </div>
            )}

            {approvedRequests.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                ยังไม่มีรายการที่ได้รับการอนุมัติขั้นสุดท้ายในขณะนี้
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-base text-left">
                    <thead className="bg-slate-100 text-slate-700 uppercase font-mono text-sm border-b border-slate-200">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">รายการวัสดุ</th>
                        <th className="p-3">กลุ่มงาน</th>
                        <th className="p-3">ฝ่าย / หน่วยงาน</th>
                        <th className="p-3">หมวดหมู่</th>
                        <th className="p-3 text-right">จำนวนอนุมัติ</th>
                        <th className="p-3 text-right">ราคา/หน่วย</th>
                        <th className="p-3 text-right font-bold">งบรวม (บาท)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pageApprovedRequests.map((r, idx) => {
                        const globalIdx = (safeApprovedPage - 1) * numericApprovedSize + idx + 1;
                        const price = calcUnitPrice(r);
                        const lineBudget = calcBudget(r);
                        const cat = getItemCategory(r.itemName);
                        const style = CATEGORY_BUTTON_STYLES[cat] || CATEGORY_BUTTON_STYLES.office;

                        return (
                          <tr key={r.id} className="hover:bg-slate-50">
                            <td className="p-3 text-slate-400 font-mono text-[11px]">{globalIdx}</td>
                            <td className="p-3 font-bold text-slate-900">{r.itemName}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold border ${style.inactive}`}>
                                {CATEGORY_LABELS[cat] || cat}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-0.5 rounded text-[11px] font-semibold">
                                {deptName(r.deptId)}
                              </span>
                            </td>
                            <td className="p-3">
                              <CategoryBadge itemName={r.itemName} />
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-emerald-900">
                              {r.qtyRequested} {r.unit}
                            </td>
                            <td className="p-3 text-right font-mono text-slate-600">
                              {fmtBaht(price)}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-slate-900">
                              {fmtBaht(lineBudget)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <PaginationBar
                  pageSize={approvedPageSize}
                  currentPage={approvedCurrentPage}
                  totalItems={approvedRequests.length}
                  onPageSizeChange={s => { setApprovedPageSize(s); setApprovedCurrentPage(1); }}
                  onPageChange={p => setApprovedCurrentPage(p)}
                />
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'pending' && (
        <div className="space-y-4">
          <TableControlPanel
            title="อนุมัติงบประมาณพัสดุขั้นสุดท้าย"
            categoryLabel="รายการรออนุมัติ"
            fiscalYear={fiscalYear}
            totalCount={sortedPending.length}
            searchTerm={searchTerm}
            onSearchChange={term => {
              setSearchTerm(term);
              setCurrentPage(1);
            }}
            actions={
              filteredPending.length > 0 && !isPlanFrozen ? (
                <button
                  type="button"
                  onClick={handleApproveAllBatch}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <CheckCheck className="w-4 h-4" />
                  อนุมัติงบประมาณทั้งหมด ({filteredPending.length})
                </button>
              ) : undefined
            }
          />

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
            {sortedPending.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                ไม่มีรายการคำขอรออนุมัติงบประมาณในขณะนี้
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
                        <th className="p-2.5">กลุ่มงาน</th>
                        <th 
                          onClick={() => handleHeaderSort('deptId')}
                          className="p-2.5 cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-1">
                            <span>ฝ่าย / หน่วยงาน</span>
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>
                        <th className="p-2.5">หมวดหมู่</th>
                        <th 
                          onClick={() => handleHeaderSort('qtyRequested')}
                          className="p-2.5 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>จำนวนขอ</span>
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>
                        <th 
                          onClick={() => handleHeaderSort('price')}
                          className="p-2.5 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>ราคา/หน่วย</span>
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
                        <th className="p-2.5">เหตุผลการตีกลับ (ถ้ามี)</th>
                        <th className="p-2.5 text-right w-36">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pagePending.map((r: RequestItem) => {
                        const price = calcUnitPrice(r);
                        const lineBudget = calcBudget(r);
                        const cat = getItemCategory(r.itemName);
                        const style = CATEGORY_BUTTON_STYLES[cat] || CATEGORY_BUTTON_STYLES.office;

                        return (
                          <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-2.5 font-bold text-slate-800">{r.itemName}</td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${style.inactive}`}>
                                {CATEGORY_LABELS[cat]}
                              </span>
                            </td>
                            <td className="p-2.5">
                              <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                                {deptName(r.deptId)}
                              </span>
                            </td>
                            <td className="p-2.5">
                              <CategoryBadge itemName={r.itemName} />
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-indigo-900">
                              {r.qtyRequested} {r.unit}
                            </td>
                            <td className="p-2.5 text-right font-mono text-slate-600">
                              {fmtBaht(price)}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                              {fmtBaht(lineBudget)}
                            </td>
                            <td className="p-2.5">
                              <input
                                type="text"
                                disabled={isPlanFrozen}
                                value={comments[r.id] || ''}
                                onChange={e => setComments(prev => ({ ...prev, [r.id]: e.target.value }))}
                                placeholder="เหตุผลหากตีกลับ..."
                                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all placeholder:text-slate-400"
                              />
                            </td>
                            <td className="p-2.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5 whitespace-nowrap flex-nowrap shrink-0">
                                <button
                                  type="button"
                                  disabled={isPlanFrozen}
                                  onClick={() => handleRejectSingle(r)}
                                  className="px-3 py-1.5 border border-rose-200/90 bg-rose-50/80 hover:bg-rose-100 text-rose-700 font-bold rounded-xl transition-all shadow-2xs hover:shadow-xs flex items-center justify-center gap-1.5 text-[11.5px] cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 group whitespace-nowrap shrink-0"
                                  title="ตีกลับคำขอให้หน่วยงานทบทวน"
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
                                  <CheckCheck className="w-3.5 h-3.5 shrink-0" />
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
                  totalItems={filteredPending.length}
                  onPageSizeChange={s => { setPageSize(s); setCurrentPage(1); }}
                  onPageChange={p => setCurrentPage(p)}
                />
              </>
            )}
          </div>
        </div>
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
            itemNames={ALL_ITEMS}
            getQtyRequested={getAllQtyRequested}
            requests={requests}
          />
        </div>
      )}

      {/* POPUP DETAIL MODAL FOR CHART & MATRIX CLICK INTERACTIONS */}
      {modalDetail && modalDetail.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-5xl w-full flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  {modalDetail.title}
                </h3>
                {modalDetail.subtitle && (
                  <p className="text-xs text-slate-500 mt-0.5">{modalDetail.subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setModalDetail(null)}
                className="p-2 rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter / Search Bar */}
            <div className="px-6 py-3 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="relative flex-1 max-w-xs">
                <input
                  type="text"
                  value={modalSearchTerm}
                  onChange={e => setModalSearchTerm(e.target.value)}
                  placeholder="ค้นหาชื่อวัสดุ หรือหน่วยงาน..."
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 text-xs"
                />
                <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>

              <div className="flex items-center gap-2 text-slate-600">
                <span>จำนวนรายการ: <strong className="text-slate-900 font-bold">{modalDetail.items.length}</strong> รายการ</span>
                <span>•</span>
                <span>รวมงบ: <strong className="text-indigo-700 font-mono font-bold">{fmtBaht(modalDetail.items.reduce((s, r) => s + calcBudget(r), 0))}</strong> บาท</span>
              </div>
            </div>

            {/* Table Body with Required Columns: รายการวัสดุ, กลุ่มงาน, ฝ่าย, หมวดหมู่, จำนวนขอ, ราคา/หน่วย, งบรวม */}
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-3">
              {modalDetail.items.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  ไม่พบข้อมูลรายการคำขอ
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
                  <table className="w-full text-base text-left">
                    <thead className="bg-slate-100 text-slate-700 uppercase font-mono text-sm border-b border-slate-200">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">รายการวัสดุ</th>
                        <th className="p-3">กลุ่มงาน</th>
                        <th className="p-3">ฝ่าย / หน่วยงาน</th>
                        <th className="p-3">หมวดหมู่</th>
                        <th className="p-3 text-right">จำนวนขอ</th>
                        <th className="p-3 text-right">ราคา/หน่วย</th>
                        <th className="p-3 text-right font-bold">งบรวม (บาท)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {modalDetail.items
                        .filter(r => !modalSearchTerm || r.itemName.toLowerCase().includes(modalSearchTerm.toLowerCase()) || deptName(r.deptId).toLowerCase().includes(modalSearchTerm.toLowerCase()))
                        .map((r, idx) => {
                          const price = calcUnitPrice(r);
                          const lineBudget = calcBudget(r);
                          const cat = getItemCategory(r.itemName);
                          const style = CATEGORY_BUTTON_STYLES[cat] || CATEGORY_BUTTON_STYLES.office;

                          return (
                            <tr key={r.id || idx} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                              <td className="p-3 font-bold text-slate-900">{r.itemName}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-extrabold border ${style.inactive}`}>
                                  {CATEGORY_LABELS[cat] || cat}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className="bg-slate-100 border border-slate-200 text-slate-800 px-2.5 py-1 rounded-lg text-[11px] font-medium">
                                  {deptName(r.deptId)}
                                </span>
                              </td>
                              <td className="p-3">
                                <CategoryBadge itemName={r.itemName} />
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-indigo-900">
                                {r.qtyRequested} {r.unit}
                              </td>
                              <td className="p-3 text-right font-mono text-slate-600">
                                {fmtBaht(price)}
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-slate-900">
                                {fmtBaht(lineBudget)}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setModalDetail(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pending' && (
        <div className="space-y-4">
          <TableControlPanel
            title="อนุมัติงบประมาณพัสดุขั้นสุดท้าย"
            categoryLabel="รายการรออนุมัติ"
            fiscalYear={fiscalYear}
            totalCount={sortedPending.length}
            searchTerm={searchTerm}
            onSearchChange={term => {
              setSearchTerm(term);
              setCurrentPage(1);
            }}
            actions={
              filteredPending.length > 0 && !isPlanFrozen ? (
                <button
                  type="button"
                  onClick={handleApproveAllBatch}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <CheckCheck className="w-4 h-4" />
                  อนุมัติงบประมาณทั้งหมด ({filteredPending.length})
                </button>
              ) : undefined
            }
          />

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
            {sortedPending.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                ไม่มีรายการคำขอรออนุมัติงบประมาณในขณะนี้
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
                          onClick={() => handleHeaderSort('deptId')}
                          className="p-2.5 cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-1">
                            <span>หน่วยงาน</span>
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>
                        <th 
                          onClick={() => handleHeaderSort('qtyRequested')}
                          className="p-2.5 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>จำนวนขอ</span>
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>
                        <th 
                          onClick={() => handleHeaderSort('price')}
                          className="p-2.5 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>ราคา/หน่วย</span>
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
                        <th className="p-2.5">เหตุผลการตีกลับ (ถ้ามี)</th>
                        <th className="p-2.5 text-right w-36">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pagePending.map((r: RequestItem) => {
                        const price = calcUnitPrice(r);
                        const lineBudget = calcBudget(r);

                        return (
                          <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-2.5 font-bold text-slate-800">{r.itemName}</td>
                            <td className="p-2.5">
                              <CategoryBadge itemName={r.itemName} />
                            </td>
                            <td className="p-2.5">
                              <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                                {deptName(r.deptId)}
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-indigo-900">
                              {r.qtyRequested} {r.unit}
                            </td>
                            <td className="p-2.5 text-right font-mono text-slate-600">
                              {fmtBaht(price)}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                              {fmtBaht(lineBudget)}
                            </td>
                            <td className="p-2.5">
                              <input
                                type="text"
                                disabled={isPlanFrozen}
                                value={comments[r.id] || ''}
                                onChange={e => setComments(prev => ({ ...prev, [r.id]: e.target.value }))}
                                placeholder="เหตุผลหากตีกลับ..."
                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-rose-400"
                              />
                            </td>
                            <td className="p-2.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  disabled={isPlanFrozen}
                                  onClick={() => handleRejectSingle(r)}
                                  className="px-2 py-1 border border-rose-300 bg-white hover:bg-rose-50 text-rose-700 font-semibold rounded-lg transition-colors flex items-center gap-1 text-[11px]"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  ตีกลับ
                                </button>
                                <button
                                  type="button"
                                  disabled={isPlanFrozen}
                                  onClick={() => handleApproveSingle(r)}
                                  className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1 text-[11px]"
                                >
                                  <CheckCheck className="w-3.5 h-3.5" />
                                  อนุมัติ
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
                  totalItems={filteredPending.length}
                  onPageSizeChange={s => { setPageSize(s); setCurrentPage(1); }}
                  onPageChange={p => setCurrentPage(p)}
                />
              </>
            )}
          </div>
        </div>
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
            itemNames={ALL_ITEMS}
            getQtyRequested={getAllQtyRequested}
            requests={requests}
          />
        </div>
      )}

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
                  สรุปผลพัสดุที่ผ่านการอนุมัติขั้นสุดท้ายโดยผู้บริหาร (Approved Plan)
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
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-rose-200/60 pb-3">
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
                <span>หัวหน้ากลุ่มงาน/ฝ่ายตีกลับ:</span>
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
                <span>ฝ่ายพัสดุตีกลับ:</span>
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
                <span>หัวหน้าพัสดุตีกลับ:</span>
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

              <div className="relative min-w-[150px] md:min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ค้นหารายการ..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setRejectedCurrentPage(1);
                  }}
                  className="pl-9 pr-3 py-1.5 w-full bg-white border border-rose-200 rounded-lg text-xs placeholder:text-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400 transition-all"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-rose-100/60 shadow-xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-rose-50/50 text-rose-950 uppercase font-mono font-bold border-b border-rose-100">
                  <th className="p-3">หน่วยงาน</th>
                  <th className="p-3">รายการพัสดุ</th>
                  <th className="p-3">ประเภท</th>
                  <th className="p-3 text-center">สถานะ</th>
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
                                <span>หัวหน้ากลุ่มงาน/ฝ่ายตีกลับ</span>
                              </span>
                            ) : isProcRej ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-900 border border-blue-300 shadow-2xs">
                                <PackageCheck className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                                <span>ฝ่ายพัสดุตีกลับ</span>
                              </span>
                            ) : isProcHeadRej ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-2xs">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                <span>หัวหน้าพัสดุตีกลับ</span>
                              </span>
                            ) : isExecRej ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-900 border border-purple-300 shadow-2xs">
                                <Crown className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                                <span>ผู้บริหารตีกลับ</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-50 text-slate-800 border border-slate-300">
                                <UserCheck className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                                <span>ผู้อนุมัติตีกลับ ({r.rejectedByName || 'ผู้อนุมัติ'})</span>
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

      {/* TAB 7: พิจารณาปรับปรุงแผนงบประมาณรอบ 6 เดือน (REVISION REVIEW) */}
      {activeTab === 'revision-review' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-3xl p-6 text-white shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold backdrop-blur-xs">
                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                  การพิจารณาคำขอปรับปรุงแผนงบประมาณรอบ 6 เดือน (Executive Mid-Year Review)
                </div>
                <h2 className="text-xl md:text-2xl font-bold">
                  ตารางเปรียบเทียบ แผนเดิม vs แผนที่ขอปรับปรุงใหม่
                </h2>
                <p className="text-xs md:text-sm text-amber-100 max-w-3xl leading-relaxed">
                  ตรวจสอบผลต่างจำนวนและงบประมาณที่เพิ่มขึ้นหรือลดลงของแต่ละหน่วยงาน พร้อมอนุมัติหรือตีกลับรายการปรับปรุงแผน
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/25 rounded-2xl p-4 text-xs space-y-1 self-start md:self-auto min-w-[220px]">
                <div className="text-amber-100 font-medium">รายการที่ขอปรับแผนทั้งหมด:</div>
                <div className="text-2xl font-black text-white font-mono">
                  {requests.filter(r => r.isRevisionItem).length} <span className="text-xs font-normal">รายการ</span>
                </div>
              </div>
            </div>
          </div>

          {requests.filter(r => r.isRevisionItem).length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 shadow-sm">
              <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                <CheckCheck className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">ไม่มีรายการขอปรับปรุงแผนงบประมาณที่รอการพิจารณา</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                เมื่อฝ่ายพัสดุเปิดสิทธิ์และหน่วยงานยื่นคำขอปรับเพิ่ม/ลดรายการรอบ 6 เดือน รายการจะปรากฏในตารางนี้เพื่อให้ท่านพิจารณาอนุมัติ
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3 w-10 text-center">ลำดับ</th>
                      <th className="p-3">หน่วยงาน</th>
                      <th className="p-3">รายการวัสดุ</th>
                      <th className="p-3 text-center w-20">ประเภทปรับ</th>
                      <th className="p-3 text-right w-24">ยอดเดิม</th>
                      <th className="p-3 text-right w-24">ยอดขอใหม่</th>
                      <th className="p-3 text-center w-24">ผลต่าง (+/-)</th>
                      <th className="p-3 text-right w-28">งบประมาณผลต่าง</th>
                      <th className="p-3">เหตุผลความจำเป็น</th>
                      <th className="p-3 text-center w-28">การตัดสินใจ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {requests
                      .filter(r => r.isRevisionItem)
                      .map((r, idx) => {
                        const baseQty = r.revisionBaseQty ?? r.qtyOriginal ?? 0;
                        const newQty = r.qtyRequested;
                        const diffQty = newQty - baseQty;
                        const price = calcUnitPrice(r);
                        const diffBudget = diffQty * price;

                        return (
                          <tr key={r.id} className="hover:bg-slate-50/70">
                            <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                            <td className="p-3 font-bold text-slate-800">{deptName(r.deptId)}</td>
                            <td className="p-3 font-bold text-slate-900">{r.itemName}</td>
                            <td className="p-3 text-center">
                              {r.revisionType === 'add' ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">เพิ่มใหม่</span>
                              ) : r.revisionType === 'cancel' ? (
                                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">ขอยกเลิก</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">ปรับยอด</span>
                              )}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-slate-500">{baseQty}</td>
                            <td className="p-3 text-right font-mono font-bold text-slate-900">{newQty}</td>
                            <td className="p-3 text-center font-mono font-bold">
                              {diffQty > 0 ? (
                                <span className="text-emerald-600">+{diffQty}</span>
                              ) : diffQty < 0 ? (
                                <span className="text-rose-600">{diffQty}</span>
                              ) : (
                                <span className="text-slate-400">0</span>
                              )}
                            </td>
                            <td className="p-3 text-right font-mono font-bold">
                              {diffBudget > 0 ? (
                                <span className="text-emerald-600">+{fmtBaht(diffBudget)} ฿</span>
                              ) : diffBudget < 0 ? (
                                <span className="text-rose-600">{fmtBaht(diffBudget)} ฿</span>
                              ) : (
                                <span className="text-slate-400">0 ฿</span>
                              )}
                            </td>
                            <td className="p-3 text-slate-600 text-xs">{r.revisionReason || r.reason || '-'}</td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleApproveSingle(r)}
                                  className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all shadow-2xs"
                                  title="อนุมัติการปรับแผนรายการนี้"
                                >
                                  <CheckCheck className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectSingle(r)}
                                  className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-all shadow-2xs"
                                  title="ตีกลับรายการนี้"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hidden Printable Area for PDF Export */}
      <div id="printable-excel-area-exec" className="hidden print:block text-slate-950 font-sans bg-white p-8">
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
    </div>
  );
};
