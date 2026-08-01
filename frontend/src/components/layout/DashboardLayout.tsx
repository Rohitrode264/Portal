import { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Icon } from '../ui/Icon';

type NavItem = {
  label: string;
  icon: string;
  path: string;
  roles: ('ADMIN' | 'TEACHER' | 'ASSISTANT' | 'STUDENT')[];
};

const navItems: NavItem[] = [
  { label: 'Dashboard',  icon: 'home',           path: '/dashboard',        roles: ['STUDENT'] },
  { label: 'Calendar',   icon: 'calendar_month', path: '/calendar',         roles: ['ADMIN', 'TEACHER', 'ASSISTANT', 'STUDENT'] },
  { label: 'Teachers',   icon: 'school',          path: '/admin/teachers',   roles: ['ADMIN'] },
  { label: 'Assistants', icon: 'manage_accounts', path: '/admin/assistants', roles: ['ADMIN'] },
  { label: 'Students',   icon: 'group',           path: '/students',         roles: ['ADMIN', 'TEACHER'] },
  { label: 'Classes',    icon: 'class',           path: '/classes',          roles: ['ADMIN', 'TEACHER', 'ASSISTANT'] },
  { label: 'Exams',      icon: 'description',     path: '/exams',            roles: ['ADMIN', 'TEACHER', 'ASSISTANT'] },
  { label: 'Settings',   icon: 'settings',        path: '/settings',         roles: ['ADMIN', 'TEACHER', 'ASSISTANT', 'STUDENT'] },
];

const ROLE_STYLE: Record<string, string> = {
  ADMIN:     'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  TEACHER:   'bg-blue-100   text-blue-700',
  ASSISTANT: 'bg-amber-100  text-amber-700',
  STUDENT:   'bg-emerald-100 text-emerald-700',
};

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };
  const allowedNavItems = navItems.filter(item => user && item.roles.includes(user.role));
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';
  const roleStyle = ROLE_STYLE[user?.role || ''] || 'bg-zinc-100 text-zinc-600';

  const isDark = theme === 'dark';

  return (
    <div style={{ background: 'var(--bg)' }} className="min-h-screen flex">

      {/* ── DESKTOP SIDEBAR ─────────────────────────────────────────────── */}
      <aside
        style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--sidebar-border)' }}
        className="hidden lg:flex flex-col h-screen w-[228px] border-r sticky top-0 z-50 shrink-0"
      >
        {/* Logo */}
        <div
          style={{ borderColor: 'var(--sidebar-border)' }}
          className="px-5 h-[60px] flex items-center gap-3 border-b shrink-0"
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
            <img
              src="/images/merit_logo.png"
              alt="Merit"
              className="w-full h-full object-contain"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
          <div className="min-w-0">
            <p style={{ color: 'var(--text)' }} className="text-[15px] font-black leading-none tracking-tight truncate">
              Merit
            </p>
            <p style={{ color: 'var(--text-muted)' }} className="text-[9.5px] font-bold leading-none mt-1 tracking-wider uppercase">
              By New Career Point
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {allowedNavItems.map(item => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={active
                  ? { background: 'var(--nav-active-bg)', color: 'var(--nav-active-text)' }
                  : { color: 'var(--nav-inactive-text)' }
                }
                className={[
                  'w-full flex items-center gap-3 px-3 h-9 rounded-xl text-[13.5px] font-medium text-left',
                  'transition-all duration-150',
                  !active && 'hover:bg-[var(--nav-hover-bg)] hover:text-[var(--nav-hover-text)]',
                ].join(' ')}
                onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'var(--nav-hover-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--nav-hover-text)'; } }}
                onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--nav-inactive-text)'; } }}
              >
                <Icon
                  name={item.icon}
                  size={18}
                  filled={active}
                  style={{ color: active ? 'var(--nav-icon-active)' : 'var(--text-muted)' }}
                />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ borderColor: 'var(--sidebar-border)' }} className="px-3 py-3 border-t space-y-1 shrink-0">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            style={{ color: 'var(--text-muted)' }}
            className="w-full flex items-center gap-3 px-3 h-9 rounded-xl text-[13px] font-medium transition-all"
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--nav-hover-bg)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
          >
            <Icon name={isDark ? 'light_mode' : 'dark_mode'} size={17} style={{ color: 'var(--text-muted)' }} />
            {isDark ? 'Light mode' : 'Dark mode'}
          </button>

          {/* User */}
          <div className="px-3 py-2 flex items-center gap-2.5">
            <div
              style={{ background: 'var(--primary)', color: 'var(--primary-text)' }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p style={{ color: 'var(--text)' }} className="text-[13px] font-semibold truncate leading-none">
                {user?.name}
              </p>
              <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5 uppercase tracking-wide leading-none ${roleStyle}`}>
                {user?.role?.toLowerCase()}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{ color: 'var(--text-muted)' }}
            className="w-full flex items-center gap-3 px-3 h-9 rounded-xl text-[13px] font-medium transition-colors hover:bg-red-50 hover:!text-red-500"
          >
            <Icon name="logout" size={17} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── MAIN ─────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden pb-16 lg:pb-0">

        {/* Mobile Header */}
        <header
          style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--sidebar-border)' }}
          className="lg:hidden h-14 px-4 flex items-center justify-between border-b sticky top-0 z-40"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
              <img src="/images/merit_logo.png" alt="Merit" className="w-full h-full object-contain"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
            <div className="flex flex-col">
              <p style={{ color: 'var(--text)' }} className="text-[14px] font-black leading-none">Merit</p>
              <p style={{ color: 'var(--text-muted)' }} className="text-[9px] font-bold leading-none uppercase mt-0.5 tracking-wider">By New Career Point</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              style={{ color: 'var(--text-muted)', background: 'var(--surface-sub)' }}
              className="w-8 h-8 flex items-center justify-center rounded-xl transition-colors"
            >
              <Icon name={isDark ? 'light_mode' : 'dark_mode'} size={16} />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                style={{ background: 'var(--primary)', color: 'var(--primary-text)' }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold focus:outline-none"
              >
                {initials}
              </button>
              {showMobileMenu && (
                <div
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                  className="absolute right-0 mt-2 w-52 rounded-2xl shadow-xl border py-2 z-50 animate-scale-in"
                >
                  <div style={{ borderColor: 'var(--border)' }} className="px-4 py-2.5 border-b">
                    <p style={{ color: 'var(--text)' }} className="text-[13px] font-semibold truncate">{user?.name}</p>
                    <p style={{ color: 'var(--text-muted)' }} className="text-[12px] truncate mt-0.5">{user?.email || user?.cpId}</p>
                  </div>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-[13px] text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors mt-1">
                    <Icon name="logout" size={16} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto w-full px-4 py-6 md:px-6 md:py-8 animate-fade-in">
            {children}
          </div>
        </div>

        {/* Mobile Bottom Nav */}
        <nav
          style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--sidebar-border)' }}
          className="lg:hidden fixed bottom-0 left-0 right-0 border-t z-40 h-[58px] shadow-sm overflow-x-auto"
        >
          <div className="flex items-center min-w-max px-2 h-full gap-0.5">
            {allowedNavItems.map(item => {
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  style={active
                    ? { background: 'var(--nav-active-bg)', color: 'var(--nav-active-text)' }
                    : { color: 'var(--nav-inactive-text)' }
                  }
                  className="flex flex-col items-center justify-center gap-1 px-3.5 h-[46px] rounded-2xl transition-all flex-shrink-0"
                >
                  <Icon name={item.icon} size={20} filled={active}
                    style={{ color: active ? 'var(--nav-icon-active)' : 'var(--text-muted)' }} />
                  <span className="text-[10px] font-semibold leading-none">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </main>
    </div>
  );
}
