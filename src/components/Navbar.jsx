// components/Navbar.jsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  HomeIcon,
  ShoppingBagIcon,
  TagIcon,
  BuildingOfficeIcon,
  ReceiptPercentIcon,
  DocumentTextIcon,
  ShoppingCartIcon,
  UsersIcon,
  PhotoIcon,
  CogIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../lib/utils';

const NAV_GROUPS = [
  {
    title: 'Overview',
    items: [{ to: '/dashboard', label: 'Dashboard', icon: HomeIcon }],
  },
  {
    title: 'Catalog',
    items: [
      { to: '/products', label: 'Products', icon: ShoppingBagIcon },
      { to: '/categories', label: 'Categories', icon: TagIcon },
      { to: '/manufacturers', label: 'Manufacturers', icon: BuildingOfficeIcon },
    ],
  },
  {
    title: 'Sales',
    items: [
      { to: '/orders', label: 'Orders', icon: ShoppingCartIcon },
      { to: '/customers', label: 'Customers', icon: UsersIcon },
      { to: '/discounts', label: 'Discounts', icon: ReceiptPercentIcon },
    ],
  },
  {
    title: 'Content',
    items: [
      { to: '/blogs', label: 'Blogs', icon: DocumentTextIcon },
      { to: '/banners', label: 'Banners', icon: PhotoIcon },
    ],
  },
  {
    title: 'System',
    items: [{ to: '/settings', label: 'Settings', icon: CogIcon }],
  },
];

const Navbar = ({ mobileOpen = false, onClose = () => {} }) => {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('daadis-nav-collapsed') === '1'
  );
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    localStorage.setItem('daadis-nav-collapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  return (
    <>
      {/* Mobile backdrop — sits below the drawer, above content */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onClose} aria-hidden />
      )}
      <nav
        className={cn(
          // Mobile: fixed slide-in drawer (always full width). Desktop: in-flow, width-animated.
          'fixed inset-y-0 left-0 z-40 flex h-full w-64 flex-col border-r border-border bg-surface transition-transform duration-[250ms]',
          'lg:static lg:z-auto lg:translate-x-0 lg:transition-[width]',
          collapsed ? 'lg:w-[72px]' : 'lg:w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-3">
        {/* collapsed hides the mark on desktop only; the mobile drawer always shows it */}
        <div className={cn('flex items-center gap-2 px-1', collapsed && 'lg:hidden')}>
          <img src="/logo.png" alt="Daadi's" className="h-9 w-auto" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Admin</span>
        </div>
        {/* Desktop collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'hidden h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-raised hover:text-text lg:flex',
            collapsed && 'lg:mx-auto'
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRightIcon className="h-4 w-4" />
          ) : (
            <ChevronLeftIcon className="h-4 w-4" />
          )}
        </button>
        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-raised hover:text-text lg:hidden"
          aria-label="Close menu"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Nav groups */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <p className={cn('px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-muted', collapsed && 'lg:hidden')}>
              {group.title}
            </p>
            {collapsed && <div className="hidden pt-3 lg:block" />}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const isActive = location.pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'group flex items-center gap-3 rounded-[12px] px-3 py-2 text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary text-primary-fg shadow-sm'
                        : 'text-muted hover:bg-surface-raised hover:text-text'
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    <span className={cn('truncate', collapsed && 'lg:hidden')}>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Pinned profile block */}
      <div className="mt-auto border-t border-border p-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-semibold text-primary-fg">
            {(user?.firstName?.[0] || 'A').toUpperCase()}
          </div>
          <div className={cn('min-w-0', collapsed && 'lg:hidden')}>
            <p className="truncate text-sm font-medium text-text">
              {user?.firstName || 'Admin'}
            </p>
            <p className="truncate text-xs text-muted">{user?.email}</p>
          </div>
        </div>
      </div>
      </nav>
    </>
  );
};

export default Navbar;
