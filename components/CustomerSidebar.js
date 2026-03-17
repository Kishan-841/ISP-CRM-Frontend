'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCustomerAuthStore } from '@/lib/customerStore';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Wifi,
  FileText,
  CreditCard,
  MessageSquare,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  Menu,
  Sun,
  Moon,
  X,
  User,
  ShieldAlert,
  UserPlus,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

const navItems = [
  { name: 'Dashboard', path: '/customer-portal/dashboard', icon: LayoutDashboard },
  { name: 'My Details', path: '/customer-portal/details', icon: User },
  { name: 'Plan Details', path: '/customer-portal/plan', icon: Wifi },
  { name: 'Invoices', path: '/customer-portal/invoices', icon: FileText },
  { name: 'Payments', path: '/customer-portal/payments', icon: CreditCard },
  { name: 'Complaints', path: '/customer-portal/complaints', icon: MessageSquare },
  { name: 'Enquiry', path: '/customer-portal/enquiries', icon: UserPlus },
  { name: 'Support Contacts', path: '/customer-portal/support-contacts', icon: ShieldAlert },
];

export default function CustomerSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { customer, logout } = useCustomerAuthStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMobileOpen) setIsMobileOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen]);

  // Listen for mobile toggle event from header
  useEffect(() => {
    const handler = () => setIsMobileOpen(prev => !prev);
    window.addEventListener('customer-sidebar-toggle', handler);
    return () => window.removeEventListener('customer-sidebar-toggle', handler);
  }, []);

  // Persist collapse state
  useEffect(() => {
    const saved = localStorage.getItem('customer_sidebar_collapsed');
    if (saved === 'true') setIsCollapsed(true);
  }, []);

  const toggle = useCallback(() => {
    setIsCollapsed(prev => {
      localStorage.setItem('customer_sidebar_collapsed', String(!prev));
      return !prev;
    });
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/customer-portal/login');
  };

  const isActive = (path) => pathname === path;
  const isParentActive = (path) => pathname.startsWith(path) && path !== '/customer-portal/dashboard';

  const getInitials = (name) => {
    if (!name) return 'C';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const displayName = customer?.company || customer?.name || customer?.customerUsername || 'Customer';

  const renderSidebarContent = (collapsed) => (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-slate-200 dark:border-slate-800">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
              <Wifi size={16} className="text-white" />
            </div>
            <span className="text-blue-600 dark:text-blue-400 text-lg font-bold">My Account</span>
          </div>
        )}
        <button
          onClick={collapsed ? toggle : (isMobileOpen ? () => setIsMobileOpen(false) : toggle)}
          className={cn(
            "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800",
            collapsed && "mx-auto"
          )}
        >
          {isMobileOpen ? <X size={20} /> : collapsed ? <ChevronsRight size={20} /> : <ChevronsLeft size={20} />}
        </button>
      </div>

      {/* Customer Info */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-4 border-b border-slate-200 dark:border-slate-800",
        collapsed && "justify-center"
      )}>
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-semibold text-sm">{getInitials(displayName)}</span>
        </div>
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-slate-900 dark:text-slate-100 text-sm font-semibold truncate">{displayName}</span>
            <span className="text-slate-500 dark:text-slate-400 text-xs truncate">{customer?.customerUserId || ''}</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path) || isParentActive(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200",
                  collapsed && "justify-center px-2"
                )}
              >
                <Icon size={20} className={cn(active ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500")} />
                {!collapsed && <span>{item.name}</span>}
                {collapsed && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-sm rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Logout */}
      <div className="px-2 pb-4 border-t border-slate-200 dark:border-slate-800 pt-3">
        <button
          onClick={handleLogout}
          className={cn(
            "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-all w-full",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut size={20} />
          {!collapsed && <span>Logout</span>}
          {collapsed && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-sm rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
              Logout
            </div>
          )}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex h-screen bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex-col fixed left-0 top-0 overflow-hidden transition-all duration-300 z-50",
          isCollapsed ? "w-[70px]" : "w-[250px]"
        )}
      >
        {renderSidebarContent(isCollapsed)}
      </aside>

      {/* Mobile Sidebar Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setIsMobileOpen(false)} />
          <aside className="fixed left-0 top-0 h-screen w-[270px] bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden z-50 animate-in slide-in-from-left duration-300">
            {renderSidebarContent(false)}
          </aside>
        </div>
      )}
    </>
  );
}

export function CustomerHeader() {
  const { customer } = useCustomerAuthStore();
  const [theme, setTheme] = useState('light');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'light';
    setTheme(saved);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  // Expose mobile toggle via a global event (so layout can use it)
  const openMobile = () => {
    window.dispatchEvent(new CustomEvent('customer-sidebar-toggle'));
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

      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        {/* Customer info */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-800">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
            <User size={16} className="text-white" />
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-slate-900 dark:text-slate-100 text-sm font-medium">
              {customer?.company || customer?.name || 'Customer'}
            </span>
            <span className="text-slate-500 text-xs">{customer?.customerUserId || ''}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
