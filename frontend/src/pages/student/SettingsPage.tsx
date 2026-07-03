import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Shield } from 'lucide-react';

export function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">

        {/* Page header */}
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage your account and preferences.</p>
        </div>

        {/* Account Info */}
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <User size={12} /> Account
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            <div className="px-4 py-3 flex items-center justify-between">
              <p className="text-sm text-gray-500">Name</p>
              <p className="text-sm font-medium text-gray-900">{user?.name || '—'}</p>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <p className="text-sm text-gray-500">CP ID</p>
              <p className="text-sm font-medium text-gray-900 font-mono">{user?.cpId || '—'}</p>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <p className="text-sm text-gray-500">Role</p>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded capitalize">
                {user?.role?.toLowerCase() || '—'}
              </span>
            </div>
            {user?.email && (
              <div className="px-4 py-3 flex items-center justify-between">
                <p className="text-sm text-gray-500">Email</p>
                <p className="text-sm font-medium text-gray-900">{user.email}</p>
              </div>
            )}
          </div>
        </div>

        {/* Security Info */}
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <Shield size={12} /> Security
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Single Session Enforcement</p>
                <p className="text-xs text-gray-400 mt-0.5">Logging in on a new device automatically signs out previous sessions.</p>
              </div>
              <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded shrink-0 ml-4">Active</span>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">WhatsApp OTP Login</p>
                <p className="text-xs text-gray-400 mt-0.5">Secure one-time password delivered via WhatsApp.</p>
              </div>
              <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded shrink-0 ml-4">Active</span>
            </div>
          </div>
        </div>


        {/* Sign Out */}
        <div className="bg-white border border-red-100 rounded-xl overflow-hidden">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-red-50/50 transition-colors group"
          >
            <div>
              <p className="text-sm font-medium text-red-600">Sign out</p>
              <p className="text-xs text-gray-400 mt-0.5">You'll need your CP ID and WhatsApp OTP to sign back in.</p>
            </div>
            <LogOut size={16} className="text-red-400 group-hover:text-red-600 transition-colors shrink-0 ml-4" />
          </button>
        </div>

      </div>
    </DashboardLayout>
  );
}
