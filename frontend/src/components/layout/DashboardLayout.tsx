import type { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Users, BookOpen, Clock, Settings } from 'lucide-react';

type NavItem = {
  label: string;
  icon: ReactNode;
  path: string;
  roles: ('ADMIN' | 'TEACHER' | 'ASSISTANT' | 'STUDENT')[];
};

const navItems: NavItem[] = [
  { label: 'My Exams', icon: <Clock size={18} />, path: '/dashboard', roles: ['STUDENT'] },
  { label: 'Teachers', icon: <Users size={18} />, path: '/admin/teachers', roles: ['ADMIN'] },
  { label: 'Assistants', icon: <Users size={18} />, path: '/admin/assistants', roles: ['ADMIN'] },
  { label: 'Classes', icon: <BookOpen size={18} />, path: '/classes', roles: ['ADMIN', 'TEACHER', 'ASSISTANT'] },
  { label: 'Exams', icon: <Clock size={18} />, path: '/exams', roles: ['ADMIN', 'TEACHER', 'ASSISTANT'] },
  { label: 'Settings', icon: <Settings size={18} />, path: '/settings', roles: ['ADMIN', 'TEACHER', 'ASSISTANT', 'STUDENT'] },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const allowedNavItems = navItems.filter(item => user && item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex">

      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hidden lg:flex flex-col h-screen w-60 bg-white border-r border-gray-100 sticky top-0 z-50 shrink-0">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2.5">
          <img src="/images/logo_red.jpg" alt="Logo" className="w-8 h-8 rounded-lg object-contain shrink-0" />
          <div>
            <p className="text-sm font-black text-gray-900 leading-tight tracking-tight">New Career Point</p>
            <p className="text-[10px] text-gray-500 font-bold leading-tight uppercase tracking-wider mt-0.5">Learning Portal</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {allowedNavItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all text-sm ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-semibold'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800 font-medium'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="px-3 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2.5 px-3 py-2.5 mb-1">
            <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-xs font-semibold text-gray-600 shrink-0">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{user?.name}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-red-500 transition-colors text-xs font-medium"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden pb-16 lg:pb-0">
        {/* Mobile Passive Branding Bar (No Navbar Menu) */}
        <header className="lg:hidden bg-white/90 backdrop-blur-md h-14 px-4 flex items-center justify-between border-b border-gray-100 sticky top-0 z-40">
          <div className="flex items-center gap-2.5">
            <img src="/images/logo_red.jpg" alt="Logo" className="w-7 h-7 rounded-lg object-contain shrink-0" />
            <div>
              <p className="text-sm font-black text-gray-900 leading-tight tracking-tight">New Career Point</p>
              <p className="text-[9px] text-gray-500 font-bold leading-tight uppercase tracking-wider">Learning Portal</p>
            </div>
          </div>
          <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-700 border border-gray-200">
            {user?.name?.charAt(0) || 'U'}
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto w-full px-4 py-6 md:px-8 md:py-8">
            {children}
          </div>
        </div>

        {/* ── MOBILE BOTTOM NAV (Primary Navigation) ── */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40 flex justify-around items-center h-16 px-2 shadow-lg">
          {allowedNavItems.slice(0, 5).map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center gap-1 px-3 py-1.5 rounded-xl transition-all ${
                  isActive ? 'text-black font-bold scale-105' : 'text-gray-400 hover:text-gray-700 font-medium'
                }`}
              >
                {item.icon}
                <span className="text-[11px] tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
