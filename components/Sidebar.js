'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore, useThemeStore, useSidebarStore, useNotificationStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  GitBranch,
  Activity,
  Users,
  MapPin,
  Settings,
  Package,
  Database,
  Layers,
  UserCircle,
  FileText,
  ShoppingCart,
  Handshake,
  Building2,
  DollarSign,
  LogOut,
  ChevronRight,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Bell,
  Search,
  Sun,
  Moon,
  PhoneCall,
  PhoneMissed,
  Clock,
  History,
  BarChart3,
  CalendarCheck,
  UserPlus,
  Warehouse,
  CheckCircle2,
  ClipboardCheck,
  Network,
  Receipt,
  Menu,
  Headphones,
  ClipboardList,
  TrendingDown,
  Inbox,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useEffect, useState, useCallback, useRef } from 'react';
import { onSocketReady } from '@/lib/socket';

// Fallback polling interval - socket is the primary real-time mechanism
const SIDEBAR_COUNTS_POLL_INTERVAL = 10 * 60 * 1000; // 10 minutes fallback

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme, initialize: initTheme } = useThemeStore();
  const { isCollapsed, toggle, initialize: initSidebar, counts, fetchSidebarCounts, isMobileOpen, closeMobile } = useSidebarStore();
  const [expandedMenus, setExpandedMenus] = useState({});
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    initTheme();
    initSidebar();
  }, [initTheme, initSidebar]);

  // Unified sidebar counts fetching with fast polling and visibility refresh
  useEffect(() => {
    if (!user) return;

    // Initial fetch
    fetchSidebarCounts();

    // Set up fallback polling interval (10 minutes)
    pollIntervalRef.current = setInterval(fetchSidebarCounts, SIDEBAR_COUNTS_POLL_INTERVAL);

    // Visibility change handler - refresh when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchSidebarCounts();
      }
    };

    // Focus handler - refresh when window gains focus
    const handleFocus = () => {
      fetchSidebarCounts();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, fetchSidebarCounts]);

  // Listen for real-time sidebar refresh signals via socket
  useEffect(() => {
    let activeSocket = null;

    const handleSidebarRefresh = () => {
      fetchSidebarCounts();
    };

    // onSocketReady calls immediately if socket exists, or queues for when initSocket runs
    const unsubscribe = onSocketReady((socket) => {
      activeSocket = socket;
      socket.on('sidebar:refresh', handleSidebarRefresh);
    });

    return () => {
      unsubscribe();
      if (activeSocket) {
        activeSocket.off('sidebar:refresh', handleSidebarRefresh);
      }
    };
  }, [fetchSidebarCounts]);

  // Close mobile sidebar on navigation
  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  // Close mobile sidebar on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMobileOpen) {
        closeMobile();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, closeMobile]);

  // Auto-expand menus based on current path
  useEffect(() => {
    if (pathname.includes('/campaigns')) {
      setExpandedMenus((prev) => ({ ...prev, campaigns: true }));
    }
    if (pathname.includes('/raw-data')) {
      setExpandedMenus((prev) => ({ ...prev, rawData: true }));
    }
    if (pathname.includes('/products')) {
      setExpandedMenus((prev) => ({ ...prev, products: true }));
    }
  }, [pathname]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const isActive = (path) => pathname === path;
  const isParentActive = (paths) => paths.some((p) => pathname.startsWith(p));

  const toggleMenu = (menuKey) => {
    if (isCollapsed && !isMobileOpen) return; // Don't toggle submenus when collapsed on desktop
    setExpandedMenus((prev) => ({ ...prev, [menuKey]: !prev[menuKey] }));
  };

  const getInitials = (name) => {
    if (!name) return 'A';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 1);
  };

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAdminRole = user?.role === 'ADMIN';
  const isAdmin = isSuperAdmin; // For backward compatibility
  const canApprovePO = isSuperAdmin || isAdminRole; // Both can approve POs
  const isBDM = user?.role === 'BDM';
  const isBDMTeamLeader = user?.role === 'BDM_TEAM_LEADER';
  const isISR = user?.role === 'ISR';
  const isSAM = user?.role === 'SAM';
  const isFeasibilityTeam = user?.role === 'FEASIBILITY_TEAM';
  const isOpsTeam = user?.role === 'OPS_TEAM';
  const isDocsTeam = user?.role === 'DOCS_TEAM';
  const isAccountsTeam = user?.role === 'ACCOUNTS_TEAM';
  const isDeliveryTeam = user?.role === 'DELIVERY_TEAM';
  const isStoreManager = user?.role === 'STORE_MANAGER';
  const isAreaHead = user?.role === 'AREA_HEAD';
  const isNOC = user?.role === 'NOC';
  const isSAMHead = user?.role === 'SAM_HEAD';
  const isSAMExecutive = user?.role === 'SAM_EXECUTIVE';
  const isSupportTeam = user?.role === 'SUPPORT_TEAM';
  const isSuperAdmin2 = user?.role === 'SUPER_ADMIN_2';
  const isMaster = user?.role === 'MASTER';
  const canApproveDeliveryRequest = isSuperAdmin || isAreaHead;

  // Accent colors
  const accent = {
    brand: 'text-orange-600',
    gradient: 'from-orange-500 to-orange-600',
    activeBg: 'bg-orange-50 dark:bg-orange-950/40',
    activeText: 'text-orange-600 dark:text-orange-400',
    activeBorder: 'border-l-orange-500',
    badge: 'bg-red-500',
    hoverText: 'hover:text-orange-600 dark:hover:text-orange-400',
  };

  // ── MASTER: Grouped sidebar with all team sections ──
  const masterNavItems = [
    {
      name: 'ISR',
      icon: PhoneCall,
      menuKey: 'masterISR',
      submenu: [
        { name: 'Dashboard', path: '/dashboard' },
        { name: 'Calling Queue', path: '/dashboard/calling-queue', badge: counts.callingQueue > 0 ? counts.callingQueue : null },
        { name: 'Retry Queue', path: '/dashboard/retry-calls', badge: counts.retryQueue > 0 ? counts.retryQueue : null },
        { name: 'Leads', path: '/dashboard/leads' },
        { name: 'Follow-Ups', path: '/dashboard/follow-ups', badge: counts.followUps > 0 ? counts.followUps : null },
        { name: 'Call History', path: '/dashboard/call-history' },
      ]
    },
    {
      name: 'BDM',
      icon: Handshake,
      menuKey: 'masterBDM',
      submenu: [
        { name: 'New Lead Assigned', path: '/dashboard/bdm-queue', badge: counts.queue > 0 ? counts.queue : null },
        { name: 'Scheduled Meetings', path: '/dashboard/bdm-meetings', badge: counts.meetings > 0 ? counts.meetings : null },
        { name: 'BDM Follow-Ups', path: '/dashboard/bdm-follow-ups', badge: counts.followUps > 0 ? counts.followUps : null },
        { name: 'Lead Pipeline', path: '/dashboard/quotation-mgmt', badge: counts.leadPipeline > 0 ? counts.leadPipeline : null },
        { name: 'Delivery Completed', path: '/dashboard/delivery-completed', badge: counts.deliveryCompleted > 0 ? counts.deliveryCompleted : null },
      ]
    },
    {
      name: 'Raw Data',
      icon: Database,
      menuKey: 'masterRawData',
      submenu: [
        { name: 'Campaign', path: '/dashboard/raw-data/campaign' },
        { name: 'Self Data', path: '/dashboard/raw-data/self-data' },
        { name: 'Social Media', path: '/dashboard/raw-data/social-media' },
        { name: 'All Data', path: '/dashboard/raw-data/all-data' },
      ]
    },
    {
      name: 'Feasibility',
      icon: Search,
      menuKey: 'masterFeasibility',
      submenu: [
        { name: 'Feasibility Queue', path: '/dashboard/feasibility-queue', badge: counts.feasibilityPending > 0 ? counts.feasibilityPending : null },
        { name: 'Vendors', path: '/dashboard/vendors', badge: counts.vendorDocsPending > 0 ? counts.vendorDocsPending : null },
      ]
    },
    {
      name: 'OPS',
      icon: Settings,
      menuKey: 'masterOPS',
      submenu: [
        { name: 'OPS Approval Queue', path: '/dashboard/ops-approval', badge: counts.opsPending > 0 ? counts.opsPending : null },
      ]
    },
    {
      name: 'Docs',
      icon: FileText,
      menuKey: 'masterDocs',
      submenu: [
        { name: 'Docs Verification', path: '/dashboard/docs-verification', badge: counts.docsPending > 0 ? counts.docsPending : null },
        { name: 'Order Reviews', path: '/dashboard/docs-verification/order-reviews', badge: counts.docsOrderReviewPending > 0 ? counts.docsOrderReviewPending : null },
      ]
    },
    {
      name: 'Accounts',
      icon: DollarSign,
      menuKey: 'masterAccounts',
      submenu: [
        { name: 'Accounts Dashboard', path: '/dashboard/accounts-dashboard' },
        { name: 'Accounts Verification', path: '/dashboard/accounts-verification', badge: counts.accountsPending > 0 ? counts.accountsPending : null },
        { name: 'Add Customer', path: '/dashboard/accounts-add-customer' },
        { name: 'Vendor Docs', path: '/dashboard/vendors', badge: counts.vendorDocsToVerify > 0 ? counts.vendorDocsToVerify : null },
        { name: 'Demo Plan Assignment', path: '/dashboard/accounts-demo-plan', badge: counts.demoPlanPending > 0 ? counts.demoPlanPending : null },
        { name: 'Create Plan', path: '/dashboard/accounts-create-plan', badge: (counts.createPlanPending || 0) + (counts.orderRequestsPending || 0) > 0 ? (counts.createPlanPending || 0) + (counts.orderRequestsPending || 0) : null },
        { name: 'PO Creation', path: '/dashboard/accounts-po-creation' },
        { name: 'Billing Management', path: '/dashboard/billing-mgmt' },
        { name: 'Daily Collection', path: '/dashboard/accounts-dashboard/daily-collection' },
        { name: 'Invoice Report', path: '/dashboard/accounts-dashboard/invoice-report' },
        { name: 'Outstanding Report', path: '/dashboard/accounts-dashboard/outstanding-report' },
        { name: 'Credit Note Report', path: '/dashboard/accounts-dashboard/credit-note-report' },
        { name: 'CN Approvals', path: '/dashboard/credit-note-approvals', badge: counts.cnPendingApproval > 0 ? counts.cnPendingApproval : null },
        { name: 'Business Impact', path: '/dashboard/accounts-dashboard/business-impact' },
        { name: 'Ageing Report', path: '/dashboard/accounts-dashboard/ageing-report' },
        { name: 'Tax Report (TDS)', path: '/dashboard/accounts-dashboard/tax-report' },
        { name: 'Call History', path: '/dashboard/accounts-dashboard/call-history' },
      ]
    },
    {
      name: 'Delivery',
      icon: Package,
      menuKey: 'masterDelivery',
      submenu: [
        { name: 'Delivery Queue', path: '/dashboard/delivery-queue', badge: counts.deliveryPending > 0 ? counts.deliveryPending : null },
        { name: 'Delivery Report', path: '/dashboard/delivery-report' },
      ]
    },
    {
      name: 'NOC',
      icon: Network,
      menuKey: 'masterNOC',
      submenu: [
        { name: 'NOC Queue', path: '/dashboard/noc-queue', badge: counts.nocPending > 0 ? counts.nocPending : null },
        { name: 'Order Requests', path: '/dashboard/noc-queue/order-requests', badge: counts.nocOrdersPending > 0 ? counts.nocOrdersPending : null },
        { name: 'Users Created', path: '/dashboard/noc-users-created' },
      ]
    },
    {
      name: 'SAM Head',
      icon: Users,
      menuKey: 'masterSAMHead',
      submenu: [
        { name: 'Customer Assignment', path: '/dashboard/sam-head', badge: counts.unassignedCustomers > 0 ? counts.unassignedCustomers : null },
        { name: 'SAM Executives', path: '/dashboard/sam-head/executives' },
        { name: 'Customer Referrals', path: '/dashboard/sam-head/customer-referrals', badge: counts.pendingEnquiries > 0 ? counts.pendingEnquiries : null },
        { name: 'All MOMs', path: '/dashboard/sam-head/meetings' },
        { name: 'Order Mgmt', path: '/dashboard/sam-head/orders', badge: (counts.allOrdersPending || 0) + (counts.samActivationPending || 0) > 0 ? (counts.allOrdersPending || 0) + (counts.samActivationPending || 0) : null },
        { name: 'Business Impact', path: '/dashboard/sam-head/business-impact' },
        { name: 'SAM Leads', path: '/dashboard/sam-leads' },
      ]
    },
    {
      name: 'SAM Executive',
      icon: UserCircle,
      menuKey: 'masterSAMExec',
      submenu: [
        { name: 'SAM Dashboard', path: '/dashboard/sam-executive' },
        { name: 'My Customers', path: '/dashboard/sam-executive/customers' },
        { name: 'Meeting MOM', path: '/dashboard/sam-executive/meetings', badge: counts.pendingMomEmails > 0 ? counts.pendingMomEmails : null },
        { name: 'Order Mgmt', path: '/dashboard/sam-executive/orders', badge: (counts.ordersPending || 0) + (counts.samActivationPending || 0) > 0 ? (counts.ordersPending || 0) + (counts.samActivationPending || 0) : null },
        { name: 'Business Impact', path: '/dashboard/sam-executive/business-impact' },
        { name: 'SAM Leads', path: '/dashboard/sam-leads' },
      ]
    },
    {
      name: 'Store',
      icon: Warehouse,
      menuKey: 'masterStore',
      submenu: [
        { name: 'Product Management', path: '/dashboard/product-management' },
        { name: 'PO Management', path: '/dashboard/po-management' },
        { name: 'Store Inventory', path: '/dashboard/store-inventory' },
        { name: 'Inventory', path: '/dashboard/inventory' },
        { name: 'Store Requests', path: '/dashboard/store-requests', badge: counts.storeRequests > 0 ? counts.storeRequests : null },
      ]
    },
    {
      name: 'Complaints',
      icon: Headphones,
      menuKey: 'masterComplaints',
      submenu: [
        { name: 'Complaints', path: '/dashboard/complaints', badge: ((counts.complaintsAssigned || 0) + (counts.customerRequestsPending || 0)) > 0 ? (counts.complaintsAssigned || 0) + (counts.customerRequestsPending || 0) : null },
        { name: 'Customer Complaints', path: '/dashboard/customer-complaints' },
        { name: 'Complaint Settings', path: '/dashboard/complaint-categories' },
      ]
    },
    {
      name: 'Approvals',
      icon: CheckCircle2,
      menuKey: 'masterApprovals',
      badge: (counts.poApprovalPending || 0) + (counts.deliveryRequestPending || 0) + (counts.orderApprovalPending || 0) + (counts.vendorsPendingAdmin || 0) + (counts.sa2Pending || 0) + (counts.cnPendingApproval || 0) > 0
        ? (counts.poApprovalPending || 0) + (counts.deliveryRequestPending || 0) + (counts.orderApprovalPending || 0) + (counts.vendorsPendingAdmin || 0) + (counts.sa2Pending || 0) + (counts.cnPendingApproval || 0)
        : null,
      submenu: [
        { name: 'Quotation Approval', path: '/dashboard/super-admin2-approval', badge: counts.sa2Pending > 0 ? counts.sa2Pending : null },
        { name: 'PO Approval', path: '/dashboard/po-approval', badge: counts.poApprovalPending > 0 ? counts.poApprovalPending : null },
        { name: 'Goods Receipt', path: '/dashboard/goods-receipt' },
        { name: 'Delivery Approval', path: '/dashboard/delivery-request-approval', badge: counts.deliveryRequestPending > 0 ? counts.deliveryRequestPending : null },
        { name: 'Order Approvals', path: '/dashboard/order-approvals', badge: counts.orderApprovalPending > 0 ? counts.orderApprovalPending : null },
        { name: 'CN Approval', path: '/dashboard/credit-note-approvals', badge: counts.cnPendingApproval > 0 ? counts.cnPendingApproval : null },
        { name: 'Vendor Approval', path: '/dashboard/vendor-approval', badge: counts.vendorsPendingAdmin > 0 ? counts.vendorsPendingAdmin : null },
        { name: 'Vendor PO Approval', path: '/dashboard/vendor-po-approval' },
      ]
    },
    {
      name: 'Admin',
      icon: LayoutDashboard,
      menuKey: 'masterAdmin',
      submenu: [
        { name: 'Team Dashboard', path: '/dashboard/admin-dashboards' },
        { name: 'Customer 360', path: '/dashboard/customer-360' },
        { name: 'Employees', path: '/dashboard/employees' },
        { name: 'Vendors', path: '/dashboard/vendors' },
        { name: 'Products', path: '/dashboard/products' },
        { name: 'Inventory', path: '/dashboard/inventory' },
      ]
    },
  ];

  const navItems = isMaster ? masterNavItems : [
    // Super Admin top item
    ...(isSuperAdmin ? [{ name: 'Team Dashboard & Reports', path: '/dashboard/admin-dashboards', icon: BarChart3 }] : []),
    ...(!isOpsTeam && !isDocsTeam && !isAccountsTeam && !isDeliveryTeam && !isNOC && !isSuperAdmin && !isSuperAdmin2 && !isSAMHead && !isSAMExecutive && !isStoreManager ? [{ name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }] : []),
    // Raw Data - available for Admin, ISR, BDM, and BDM Team Leader
    ...(isAdmin || isISR || isBDM || isBDMTeamLeader ? [
      {
        name: 'Raw Data',
        icon: Database,
        menuKey: 'rawData',
        submenu: [
          { name: 'Campaign', path: '/dashboard/raw-data/campaign' },
          { name: 'Self Data', path: '/dashboard/raw-data/self-data' },
          { name: 'Social Media', path: '/dashboard/raw-data/social-media' },
          { name: 'All Data', path: '/dashboard/raw-data/all-data' },
        ]
      },
    ] : []),
    // ISR-only items
    ...(isISR ? [
      { name: 'Calling Queue', path: '/dashboard/calling-queue', icon: PhoneCall, badge: counts.callingQueue > 0 ? counts.callingQueue : null },
      { name: 'Retry Queue', path: '/dashboard/retry-calls', icon: PhoneMissed, badge: counts.retryQueue > 0 ? counts.retryQueue : null },
    ] : []),
    // SAM-only items
    ...(isSAM ? [
      { name: 'Add Data', path: '/dashboard/sam-data', icon: UserPlus },
      { name: 'Self Calling Queue', path: '/dashboard/sam-calling-queue', icon: PhoneCall, badge: counts.callingQueue > 0 ? counts.callingQueue : null },
    ] : []),
    // BDM-only items (ordered by priority)
    ...(isBDM ? [
      { name: 'New Lead Assigned', path: '/dashboard/bdm-queue', icon: PhoneCall, badge: counts.queue > 0 ? counts.queue : null },
      { name: 'Self Calling Queue', path: '/dashboard/calling-queue', icon: PhoneCall, badge: counts.callingQueue > 0 ? counts.callingQueue : null },
      { name: 'Retry Queue', path: '/dashboard/retry-calls', icon: PhoneMissed, badge: counts.retryQueue > 0 ? counts.retryQueue : null },
      { name: 'Scheduled Meetings', path: '/dashboard/bdm-meetings', icon: CalendarCheck, badge: counts.meetings > 0 ? counts.meetings : null },
      { name: 'BDM Follow-Ups', path: '/dashboard/bdm-follow-ups', icon: Clock, badge: counts.followUps > 0 ? counts.followUps : null },
      { name: 'Lead Pipeline', path: '/dashboard/quotation-mgmt', icon: FileText, badge: counts.leadPipeline > 0 ? counts.leadPipeline : null },
      { name: 'Delivery Completed', path: '/dashboard/delivery-completed', icon: CheckCircle2, badge: counts.deliveryCompleted > 0 ? counts.deliveryCompleted : null },
      { name: 'Reports', path: '/dashboard/bdm-reports', icon: BarChart3 },
    ] : []),
    // BDM Team Leader items - includes BDM work items + oversight items
    ...(isBDMTeamLeader ? [
      { name: 'New Lead Assigned', path: '/dashboard/bdm-queue', icon: PhoneCall, badge: counts.queue > 0 ? counts.queue : null },
      { name: 'Scheduled Meetings', path: '/dashboard/bdm-meetings', icon: CalendarCheck, badge: counts.meetings > 0 ? counts.meetings : null },
      { name: 'BDM Follow-Ups', path: '/dashboard/bdm-follow-ups', icon: Clock, badge: counts.followUps > 0 ? counts.followUps : null },
      { name: 'Lead Pipeline', path: '/dashboard/quotation-mgmt', icon: FileText, badge: counts.leadPipeline > 0 ? counts.leadPipeline : null },
      { name: 'Delivery Completed', path: '/dashboard/delivery-completed', icon: CheckCircle2, badge: counts.deliveryCompleted > 0 ? counts.deliveryCompleted : null },
      { name: 'Reports', path: '/dashboard/bdm-reports', icon: BarChart3 },
      { name: 'Feasibility Queue', path: '/dashboard/feasibility-queue', icon: FileText },
      { name: 'OPS Approval', path: '/dashboard/ops-approval', icon: FileText },
      { name: 'Docs Verification', path: '/dashboard/docs-verification', icon: FileText },
      { name: 'Accounts Verification', path: '/dashboard/accounts-verification', icon: DollarSign },
      { name: 'Delivery Queue', path: '/dashboard/delivery-queue', icon: Package },
      { name: 'NOC Queue', path: '/dashboard/noc-queue', icon: Network },
      { name: 'Leads', path: '/dashboard/leads', icon: Users },
      { name: 'My BDMs', path: '/dashboard/employees', icon: UserCircle },
    ] : []),
    // Feasibility Team-only items
    ...(isFeasibilityTeam ? [
      { name: 'Feasibility Queue', path: '/dashboard/feasibility-queue', icon: FileText, badge: counts.feasibilityPending > 0 ? counts.feasibilityPending : null },
      { name: 'Vendors', path: '/dashboard/vendors', icon: Building2, badge: counts.vendorDocsPending > 0 ? counts.vendorDocsPending : null },
    ] : []),
    // OPS Team-only items
    ...(isOpsTeam ? [
      { name: 'OPS Approval Queue', path: '/dashboard/ops-approval', icon: FileText, badge: counts.opsPending > 0 ? counts.opsPending : null },
      { name: 'Installation Assignment', path: '/dashboard/ops-installation', icon: Package, badge: counts.installationPending > 0 ? counts.installationPending : null },
    ] : []),
    // Super Admin 2-only items
    ...(isSuperAdmin2 ? [
      { name: 'Quotation Approval', path: '/dashboard/super-admin2-approval', icon: ClipboardCheck, badge: counts.sa2Pending > 0 ? counts.sa2Pending : null },
      { name: 'Leads', path: '/dashboard/leads', icon: Users },
      { name: 'Billing Management', path: '/dashboard/billing-mgmt', icon: Receipt },
      { name: 'Customer 360', path: '/dashboard/customer-360', icon: UserCircle },
    ] : []),
    // Docs Verification Team-only items
    ...(isDocsTeam ? [
      { name: 'Docs Verification', path: '/dashboard/docs-verification', icon: FileText, badge: counts.docsPending > 0 ? counts.docsPending : null },
      { name: 'Order Reviews', path: '/dashboard/docs-verification/order-reviews', icon: ClipboardList, badge: counts.docsOrderReviewPending > 0 ? counts.docsOrderReviewPending : null },
    ] : []),
    // Accounts Team-only items
    ...(isAccountsTeam ? [
      { name: 'Accounts Dashboard', path: '/dashboard/accounts-dashboard', icon: LayoutDashboard },
      { name: 'Accounts Verification', path: '/dashboard/accounts-verification', icon: DollarSign, badge: counts.accountsPending > 0 ? counts.accountsPending : null },
      { name: 'Add Customer', path: '/dashboard/accounts-add-customer', icon: UserPlus },
      { name: 'Vendor Docs', path: '/dashboard/vendors', icon: Building2, badge: counts.vendorDocsToVerify > 0 ? counts.vendorDocsToVerify : null },
      { name: 'Demo Plan Assignment', path: '/dashboard/accounts-demo-plan', icon: FileText, badge: counts.demoPlanPending > 0 ? counts.demoPlanPending : null },
      { name: 'Create Plan', path: '/dashboard/accounts-create-plan', icon: FileText, badge: (counts.createPlanPending || 0) + (counts.orderRequestsPending || 0) > 0 ? (counts.createPlanPending || 0) + (counts.orderRequestsPending || 0) : null },
      { name: 'PO Creation', path: '/dashboard/accounts-po-creation', icon: FileText },
      { name: 'Billing Management', path: '/dashboard/billing-mgmt', icon: Receipt },
      {
        name: 'Reports',
        icon: BarChart3,
        menuKey: 'accountsReports',
        submenu: [
          { name: 'Daily Collection', path: '/dashboard/accounts-dashboard/daily-collection' },
          { name: 'Invoice Report', path: '/dashboard/accounts-dashboard/invoice-report' },
          { name: 'Outstanding Report', path: '/dashboard/accounts-dashboard/outstanding-report' },
          { name: 'Credit Note Report', path: '/dashboard/accounts-dashboard/credit-note-report' },
          { name: 'Business Impact', path: '/dashboard/accounts-dashboard/business-impact' },
          { name: 'Ageing Report', path: '/dashboard/accounts-dashboard/ageing-report' },
          { name: 'Tax Report (TDS)', path: '/dashboard/accounts-dashboard/tax-report' },
          { name: 'Call History', path: '/dashboard/accounts-dashboard/call-history' },
        ]
      },
    ] : []),
    // Delivery Team-only items
    ...(isDeliveryTeam ? [
      { name: 'Delivery Queue', path: '/dashboard/delivery-queue', icon: Package, badge: counts.deliveryPending > 0 ? counts.deliveryPending : null },
      { name: 'Delivery Report', path: '/dashboard/delivery-report', icon: ClipboardCheck },
    ] : []),
    // NOC Team-only items
    ...(isNOC ? [
      { name: 'NOC Queue', path: '/dashboard/noc-queue', icon: Network, badge: counts.nocPending > 0 ? counts.nocPending : null },
      { name: 'Order Requests', path: '/dashboard/noc-queue/order-requests', icon: ClipboardList, badge: counts.nocOrdersPending > 0 ? counts.nocOrdersPending : null },
      { name: 'Users Created', path: '/dashboard/noc-users-created', icon: UserPlus },
    ] : []),
    // Customer 360
    ...(isSuperAdmin ? [
      { name: 'Customer 360', path: '/dashboard/customer-360', icon: UserCircle },
      { name: 'Business Impact', path: '/dashboard/sam-head/business-impact', icon: TrendingDown },
    ] : []),
    // Complaint Management
    ...(isSuperAdmin || isNOC || isSupportTeam || isOpsTeam || isAccountsTeam ? [
      { name: 'Complaints', path: '/dashboard/complaints', icon: Headphones, badge: ((counts.complaintsAssigned || 0) + (counts.customerRequestsPending || 0)) > 0 ? (counts.complaintsAssigned || 0) + (counts.customerRequestsPending || 0) : null },
    ] : []),
    ...(isSuperAdmin || isNOC || isSupportTeam || isOpsTeam || isAccountsTeam ? [
      { name: 'Customer Complaints', path: '/dashboard/customer-complaints', icon: Users },
    ] : []),
    // SAM Head-only items
    ...(isSAMHead ? [
      { name: 'Customer Assignment', path: '/dashboard/sam-head', icon: Users, badge: counts.unassignedCustomers > 0 ? counts.unassignedCustomers : null },
      { name: 'SAM Executives', path: '/dashboard/sam-head/executives', icon: UserPlus },
      { name: 'Customer Referrals', path: '/dashboard/sam-head/customer-referrals', icon: Inbox, badge: counts.pendingEnquiries > 0 ? counts.pendingEnquiries : null },
      { name: 'All MOMs', path: '/dashboard/sam-head/meetings', icon: CalendarCheck },
      { name: 'Order Mgmt', path: '/dashboard/sam-head/orders', icon: ClipboardList, badge: (counts.allOrdersPending || 0) + (counts.samActivationPending || 0) > 0 ? (counts.allOrdersPending || 0) + (counts.samActivationPending || 0) : null },
      { name: 'Business Impact', path: '/dashboard/sam-head/business-impact', icon: TrendingDown },
      { name: 'SAM Leads', path: '/dashboard/sam-leads', icon: UserPlus },
    ] : []),
    // SAM Executive-only items
    ...(isSAMExecutive ? [
      { name: 'SAM Dashboard', path: '/dashboard/sam-executive', icon: LayoutDashboard },
      { name: 'My Customers', path: '/dashboard/sam-executive/customers', icon: Users },
      { name: 'Meeting MOM', path: '/dashboard/sam-executive/meetings', icon: CalendarCheck, badge: counts.pendingMomEmails > 0 ? counts.pendingMomEmails : null },
      { name: 'Order Mgmt', path: '/dashboard/sam-executive/orders', icon: ClipboardList, badge: (counts.ordersPending || 0) + (counts.samActivationPending || 0) > 0 ? (counts.ordersPending || 0) + (counts.samActivationPending || 0) : null },
      { name: 'Business Impact', path: '/dashboard/sam-executive/business-impact', icon: TrendingDown },
      { name: 'SAM Leads', path: '/dashboard/sam-leads', icon: UserPlus },
    ] : []),
    // Store Manager-only items
    ...(isStoreManager ? [
      { name: 'Product Management', path: '/dashboard/product-management', icon: Package },
      { name: 'PO Management', path: '/dashboard/po-management', icon: ShoppingCart },
      { name: 'Store Inventory', path: '/dashboard/store-inventory', icon: Warehouse },
      { name: 'Inventory', path: '/dashboard/inventory', icon: Warehouse },
      { name: 'Store Requests', path: '/dashboard/store-requests', icon: ClipboardCheck, badge: counts.storeRequests > 0 ? counts.storeRequests : null },
    ] : []),
    // Leads - available for all roles except Docs Team, Accounts Team, Store Manager, and OPS Team
    ...(!isDocsTeam && !isAccountsTeam && !isStoreManager && !isOpsTeam && !isDeliveryTeam && !isBDMTeamLeader && !isNOC && !isSuperAdmin && !isSuperAdmin2 && !isSAMHead && !isSAMExecutive ? [{ name: 'Leads', path: '/dashboard/leads', icon: Users }] : []),
    // ISR-only items
    ...(isISR ? [
      { name: 'Follow-Ups', path: '/dashboard/follow-ups', icon: Clock, badge: counts.followUps > 0 ? counts.followUps : null },
      { name: 'Call History', path: '/dashboard/call-history', icon: History },
      { name: 'Reports', path: '/dashboard/reports', icon: BarChart3 },
    ] : []),
    // SAM Follow-ups
    ...(isSAM ? [
      { name: 'Follow-Ups', path: '/dashboard/sam-follow-ups', icon: Clock, badge: counts.followUps > 0 ? counts.followUps : null },
    ] : []),
    // PO Approval - Admin only (Super Admin gets it via Approvals submenu)
    ...(canApprovePO && !isSuperAdmin ? [
      { name: 'PO Approval', path: '/dashboard/po-approval', icon: CheckCircle2, badge: counts.poApprovalPending > 0 ? counts.poApprovalPending : null },
      { name: 'Goods Receipt', path: '/dashboard/goods-receipt', icon: ClipboardCheck },
    ] : []),
    // Delivery Request Approval - Area Head only (Super Admin gets it via Approvals submenu)
    ...(canApproveDeliveryRequest && !isSuperAdmin ? [
      { name: 'Delivery Approval', path: '/dashboard/delivery-request-approval', icon: ClipboardCheck, badge: counts.deliveryRequestPending > 0 ? counts.deliveryRequestPending : null },
    ] : []),
    // Super Admin only items
    ...(isSuperAdmin ? [
      {
        name: 'Approvals',
        icon: CheckCircle2,
        menuKey: 'approvals',
        badge: (counts.poApprovalPending || 0) + (counts.deliveryRequestPending || 0) + (counts.orderApprovalPending || 0) + (counts.vendorsPendingAdmin || 0) + (counts.sa2Pending || 0) + (counts.cnPendingApproval || 0) > 0
          ? (counts.poApprovalPending || 0) + (counts.deliveryRequestPending || 0) + (counts.orderApprovalPending || 0) + (counts.vendorsPendingAdmin || 0) + (counts.sa2Pending || 0) + (counts.cnPendingApproval || 0)
          : null,
        submenu: [
          { name: 'Quotation Approval', path: '/dashboard/super-admin2-approval', badge: counts.sa2Pending > 0 ? counts.sa2Pending : null },
          { name: 'PO Approval', path: '/dashboard/po-approval', badge: counts.poApprovalPending > 0 ? counts.poApprovalPending : null },
          { name: 'Goods Receipt', path: '/dashboard/goods-receipt' },
          { name: 'Delivery Approval', path: '/dashboard/delivery-request-approval', badge: counts.deliveryRequestPending > 0 ? counts.deliveryRequestPending : null },
          { name: 'Order Approvals', path: '/dashboard/order-approvals', badge: counts.orderApprovalPending > 0 ? counts.orderApprovalPending : null },
          { name: 'CN Approval', path: '/dashboard/credit-note-approvals', badge: counts.cnPendingApproval > 0 ? counts.cnPendingApproval : null },
          { name: 'Vendor Approval', path: '/dashboard/vendor-approval', badge: counts.vendorsPendingAdmin > 0 ? counts.vendorsPendingAdmin : null },
          { name: 'Vendor PO Approval', path: '/dashboard/vendor-po-approval' },
        ]
      },
      { name: 'Employees', path: '/dashboard/employees', icon: UserCircle },
      // Product Master - admin only
      {
        name: 'Product Master',
        icon: Package,
        menuKey: 'products',
        submenu: [
          { name: 'Products', path: '/dashboard/products' },
          { name: 'Create Product', path: '/dashboard/products/create' },
        ]
      },
      { name: 'Complaint Settings', path: '/dashboard/complaint-categories', icon: Settings },
      { name: 'Vendors', path: '/dashboard/vendors', icon: Building2 },
      { name: 'Inventory', path: '/dashboard/inventory', icon: Warehouse },
    ] : []),
  ];

  // Shared sidebar content renderer (used by both desktop and mobile)
  const renderSidebarContent = (collapsed) => (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 dark:border-slate-800/60">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shadow-orange-500/20">
              G
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Gazon
            </span>
          </div>
        )}
        <button
          onClick={collapsed ? toggle : (isMobileOpen ? closeMobile : toggle)}
          className={cn(
            "p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors",
            collapsed && "mx-auto"
          )}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
        </button>
      </div>

      

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-1 scrollbar-thin">
        {navItems.map((item) => {
          const Icon = item.icon;

          // Submenu item
          if (item.submenu) {
            const isExpanded = expandedMenus[item.menuKey];
            const isSubmenuActive = item.submenu.some((sub) => isActive(sub.path));
            const isRoleSection = item.isRoleSection;

            return (
              <div key={item.menuKey} className="relative group">
                <button
                  onClick={() => toggleMenu(item.menuKey)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl w-full transition-all duration-200 text-sm font-medium border border-slate-200/70 dark:border-slate-800/70",
                    isRoleSection
                      ? isExpanded
                        ? `${accent.activeBg} ${accent.activeText} border-orange-200/80 dark:border-orange-900/50`
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-300/80 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-slate-200"
                      : isSubmenuActive
                        ? `${accent.activeBg} ${accent.activeText} border-orange-200/80 dark:border-orange-900/50`
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-300/80 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-slate-200",
                    collapsed && "justify-center px-2"
                  )}
                  title={collapsed ? item.name : undefined}
                >
                  <Icon size={20} className={cn("flex-shrink-0", (isSubmenuActive || (isRoleSection && isExpanded)) && "text-orange-500")} />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left truncate">{item.name}</span>
                      {item.badge && (
                        <span className={`${accent.badge} text-white text-[10px] font-semibold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shadow-sm shadow-red-500/25`}>
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight size={16} className={cn("text-slate-400 transition-transform duration-200", isExpanded && "rotate-90")} />
                    </>
                  )}
                </button>

                {/* Collapsed hover submenu */}
                {collapsed && (
                  <div className="absolute left-full top-0 ml-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 rounded-xl shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all min-w-[180px] z-50">
                    <div className="px-3 py-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{item.name}</div>
                    {item.submenu.map((subItem) => (
                      <Link
                        key={subItem.path}
                        href={subItem.path}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 mx-1.5 rounded-lg transition-all text-sm",
                          isActive(subItem.path)
                            ? `${accent.activeBg} ${accent.activeText} font-medium`
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                        )}
                      >
                        <span className="flex-1">{subItem.name}</span>
                        {subItem.badge && (
                          <span className={`${accent.badge} text-white text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm shadow-red-500/25`}>
                            {subItem.badge}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Expanded submenu */}
                {!collapsed && isExpanded && (
                  <div className="ml-5 mt-0.5 mb-1 pl-3 border-l-2 border-slate-200 dark:border-slate-700/60 space-y-0.5">
                    {item.submenu.map((subItem) => (
                      <Link
                        key={subItem.path}
                        href={subItem.path}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm",
                          isActive(subItem.path)
                            ? `${accent.activeBg} ${accent.activeText} font-medium`
                            : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
                        )}
                      >
                        <span className="flex-1">{subItem.name}</span>
                        {subItem.badge && (
                          <span className={`${accent.badge} text-white text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm shadow-red-500/25`}>
                            {subItem.badge}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          // Regular item
          return (
            <div key={item.path} className="relative group">
              <Link
                href={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium border border-slate-200/70 dark:border-slate-800/70",
                  isActive(item.path)
                    ? `${accent.activeBg} ${accent.activeText} border-orange-200/80 dark:border-orange-900/50`
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-300/80 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-slate-200",
                  collapsed && "justify-center px-2"
                )}
                title={collapsed ? item.name : undefined}
              >
                <div className="relative">
                  <Icon size={20} className={cn("flex-shrink-0", isActive(item.path) && "text-orange-500")} />
                  {collapsed && item.badge && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] bg-red-500 rounded-full text-[8px] flex items-center justify-center text-white px-0.5 font-semibold shadow-sm shadow-red-500/30">
                      {item.badge > 99 ? '!' : item.badge}
                    </span>
                  )}
                </div>
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate">{item.name}</span>
                    {item.badge && (
                      <span className={`${accent.badge} text-white text-[10px] font-semibold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shadow-sm shadow-red-500/25`}>
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                    {item.hasSubmenu && <ChevronRight size={16} className="text-slate-400" />}
                  </>
                )}
              </Link>

              {/* Tooltip for collapsed state */}
              {collapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-slate-800 dark:bg-slate-700 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg">
                  {item.name}
                  {item.badge && (
                    <span className="ml-2 px-1.5 py-0.5 bg-red-500 rounded-full text-[10px]">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Theme Toggle & Logout */}
      <div className="px-3 py-3 border-t border-slate-100 dark:border-slate-800/60 space-y-0.5">
        {/* Theme Toggle */}
        <div className="relative group">
          <button
            onClick={toggleTheme}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-300 transition-all duration-200 text-sm font-medium",
              collapsed && "justify-center px-2"
            )}
            title={collapsed ? (theme === 'light' ? 'Dark Mode' : 'Light Mode') : undefined}
          >
            {theme === 'light' ? <Moon size={20} className="flex-shrink-0" /> : <Sun size={20} className="flex-shrink-0" />}
            {!collapsed && <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>}
          </button>
          {collapsed && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-slate-800 dark:bg-slate-700 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg">
              {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
            </div>
          )}
        </div>

        {/* Logout */}
        <div className="relative group">
          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 text-sm font-medium",
              collapsed && "justify-center px-2"
            )}
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut size={20} className="flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
          {collapsed && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-slate-800 dark:bg-slate-700 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg">
              Logout
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar - hidden on mobile */}
      <aside
        className={cn(
          "hidden lg:flex h-screen bg-white/80 dark:bg-slate-950/90 backdrop-blur-xl border-r border-slate-200/60 dark:border-slate-800/50 flex-col fixed left-0 top-0 overflow-hidden transition-all duration-300 z-50",
          isCollapsed ? "w-[70px]" : "w-[250px]"
        )}
      >
        {renderSidebarContent(isCollapsed)}
      </aside>

      {/* Mobile Sidebar Drawer - visible only on mobile when open */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={closeMobile}
          />
          {/* Drawer */}
          <aside className="fixed left-0 top-0 h-screen w-[250px] bg-white dark:bg-slate-950 border-r border-slate-200/60 dark:border-slate-800/50 flex flex-col overflow-hidden z-50 animate-in slide-in-from-left duration-300">
            {renderSidebarContent(false)}
          </aside>
        </div>
      )}
    </>
  );
}

export function Header() {
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { openMobile } = useSidebarStore();
  const { unreadCount } = useNotificationStore();

  const accent = { gradient: 'from-orange-500 to-orange-600', hoverText: 'hover:text-orange-600 dark:hover:text-orange-400' };

  const getInitials = (name) => {
    if (!name) return 'A';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 1);
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:justify-end lg:px-6">
      {/* Hamburger - mobile only */}
      <button
        onClick={openMobile}
        className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Menu size={22} />
      </button>

      <div className="flex items-center gap-2 sm:gap-4">


        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`text-slate-600 dark:text-slate-400 ${accent.hoverText} transition-colors p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800`}
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        {/* Notifications */}
        <Link
          href="/dashboard/notifications"
          className={`relative text-slate-600 dark:text-slate-400 ${accent.hoverText} transition-colors p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800`}
        >
          <Bell size={22} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-600 rounded-full text-[10px] flex items-center justify-center text-white px-1 font-medium">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>

        {/* User */}
        <div className="flex items-center gap-3 pl-3 sm:pl-4 border-l border-slate-200 dark:border-slate-800">
          <Avatar className={`h-9 w-9 bg-gradient-to-br ${accent.gradient}`}>
            <AvatarFallback className="bg-transparent text-white text-sm font-semibold">
              {getInitials(user?.name)}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:flex flex-col">
            <span className="text-slate-900 dark:text-slate-100 text-sm font-medium">{user?.name || 'Admin User'}</span>
            <span className="text-slate-500 text-xs">{user?.role || 'SUPER_ADMIN'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
