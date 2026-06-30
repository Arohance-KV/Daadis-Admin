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
  CogIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
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
      { to: '/discounts', label: 'Discounts', icon: ReceiptPercentIcon },
    ],
  },
  {
    title: 'Content',
    items: [{ to: '/blogs', label: 'Blogs', icon: DocumentTextIcon }],
  },
  {
    title: 'System',
    items: [{ to: '/settings', label: 'Settings', icon: CogIcon }],
  },
];

const Navbar = () => {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('daadis-nav-collapsed') === '1'
  );
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    localStorage.setItem('daadis-nav-collapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  return (
    <nav
      className={cn(
        'flex h-full flex-col border-r border-border bg-surface transition-[width] duration-[250ms]',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-3">
        {!collapsed && (
          <div className="flex items-center gap-2 px-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
              <span className="text-sm font-bold text-primary-fg">D</span>
            </div>
            <span className="text-sm font-bold text-text">Daadi's Admin</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-raised hover:text-text',
            collapsed && 'mx-auto'
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRightIcon className="h-4 w-4" />
          ) : (
            <ChevronLeftIcon className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Nav groups */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <p className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-muted">
                {group.title}
              </p>
            )}
            {collapsed && <div className="pt-3" />}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const isActive = location.pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'group flex items-center gap-3 rounded-[12px] px-3 py-2 text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary text-primary-fg shadow-sm'
                        : 'text-muted hover:bg-surface-raised hover:text-text'
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!collapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
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
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text">
                {user?.firstName || 'Admin'}
              </p>
              <p className="truncate text-xs text-muted">{user?.email}</p>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
