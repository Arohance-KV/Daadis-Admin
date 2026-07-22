import React, { useState, useEffect } from 'react';
import {
  UserCircleIcon,
  ChevronDownIcon,
  SunIcon,
  MoonIcon,
  MagnifyingGlassIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout, fetchProfile } from '../redux/slices/authSlice';
import { useTheme } from '../hooks/useTheme';
import Breadcrumbs from '../ui/breadcrumbs';

const LABELS = {
  dashboard: 'Dashboard',
  products: 'Products',
  categories: 'Categories',
  manufacturers: 'Manufacturers',
  orders: 'Orders',
  discounts: 'Discounts',
  blogs: 'Blogs',
  settings: 'Settings',
};

const Topbar = ({ onMenuClick = () => {} }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const { theme, toggle } = useTheme();

  const { user, isLoading } = useSelector((state) => state.auth);

  // Build breadcrumbs from current route
  const seg = location.pathname.split('/').filter(Boolean)[0] || 'dashboard';
  const crumbs = [
    { label: 'Daadis', to: '/dashboard' },
    { label: LABELS[seg] || seg },
  ];

  useEffect(() => {
    if (!user) {
      dispatch(fetchProfile());
    }
  }, [user, dispatch]);

  const handleLogout = () => {
    setShowProfileMenu(false);
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileMenu && !event.target.closest('.profile-dropdown')) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  const displayName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin User'
    : 'Loading...';

  const displayEmail = user?.email || 'admin@daadi.com';

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur-md sm:px-6">
      {/* Left: mobile menu button + Breadcrumbs */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onMenuClick}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] border border-border bg-surface text-muted transition-colors hover:bg-surface-raised hover:text-text lg:hidden"
          aria-label="Open menu"
        >
          <Bars3Icon className="h-5 w-5" />
        </button>
        <Breadcrumbs items={crumbs} />
      </div>

      {/* Right: Search + Theme Toggle + Profile Dropdown */}
      <div className="flex items-center gap-2 shrink-0 sm:gap-3">
        {/* Search Slot — hidden on small screens */}
        <div className="relative hidden md:block">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="h-9 w-48 rounded-[12px] border border-border bg-surface pl-9 pr-3 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary transition-colors lg:w-64"
          />
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className="grid h-9 w-9 place-items-center rounded-[12px] border border-border bg-surface text-muted transition-colors hover:bg-surface-raised hover:text-text"
        >
          {theme === 'dark' ? (
            <SunIcon className="h-5 w-5" />
          ) : (
            <MoonIcon className="h-5 w-5" />
          )}
        </button>

        {/* Profile Dropdown */}
        <div className="relative profile-dropdown">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            disabled={isLoading}
            className="flex items-center space-x-2 rounded-[12px] border border-border bg-surface px-3 py-2 text-text transition-colors hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UserCircleIcon className="h-6 w-6 text-muted" />
            <div className="hidden text-left sm:block">
              <div className="text-sm font-medium text-text">
                {isLoading ? (
                  <div className="h-4 w-20 animate-pulse rounded bg-surface-raised" />
                ) : (
                  displayName
                )}
              </div>
              <div className="text-xs text-muted">
                {isLoading ? (
                  <div className="mt-1 h-3 w-32 animate-pulse rounded bg-surface-raised" />
                ) : (
                  displayEmail
                )}
              </div>
            </div>
            <ChevronDownIcon
              className={`h-4 w-4 text-muted transition-transform ${
                showProfileMenu ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 rounded-[12px] border border-border bg-surface py-1 shadow-lg z-50">
              <hr className="my-1 border-border" />
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 text-sm text-red-500 transition-colors hover:bg-surface-raised"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
