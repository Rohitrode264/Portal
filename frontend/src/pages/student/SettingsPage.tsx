import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Shield } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';

const ROLE_BADGE: Record<string, 'blue' | 'purple' | 'amber' | 'green'> = {
  ADMIN:     'purple',
  TEACHER:   'blue',
  ASSISTANT: 'amber',
  STUDENT:   'green',
};

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="px-5 py-3 flex items-center justify-between min-h-[44px]">
      <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className={['text-[13px] font-medium', mono ? 'font-mono' : ''].join(' ')} style={{ color: 'var(--text)' }}>
        {value}
      </span>
    </div>
  );
}

export function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-2xl">

        {/* Page Header */}
        <div>
          <h1 className="text-[22px] font-bold tracking-tight leading-none" style={{ color: 'var(--text)' }}>Settings</h1>
          <p className="text-[13px] mt-1.5" style={{ color: 'var(--text-muted)' }}>Manage your account and preferences.</p>
        </div>

        {/* Account Card */}
        <div className="rounded-xl overflow-hidden shadow-sm border" style={{ background: 'var(--surface)', borderColor: 'var(--card-border)' }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-1.5">
              <User size={13} style={{ color: 'var(--text-muted)' }} />
              <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Account</span>
            </div>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            <InfoRow label="Full Name" value={user?.name || '—'} />
            <InfoRow label="CP ID" value={user?.cpId || '—'} mono />
            {user?.email && <InfoRow label="Email" value={user.email} />}
            <div className="px-5 py-3 flex items-center justify-between min-h-[44px]">
              <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Role</span>
              <Badge variant={ROLE_BADGE[user?.role || ''] || 'default'} size="sm">
                {user?.role?.charAt(0) + (user?.role?.slice(1).toLowerCase() || '')}
              </Badge>
            </div>
          </div>
        </div>

        {/* Security Card */}
        <div className="rounded-xl overflow-hidden shadow-sm border" style={{ background: 'var(--surface)', borderColor: 'var(--card-border)' }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-1.5">
              <Shield size={13} style={{ color: 'var(--text-muted)' }} />
              <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Security</span>
            </div>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            <div className="px-5 py-3 flex items-center justify-between min-h-[52px]">
              <div>
                <p className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>Single Session Enforcement</p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>New login automatically signs out previous sessions.</p>
              </div>
              <Badge variant="green" size="sm">Active</Badge>
            </div>
            <div className="px-5 py-3 flex items-center justify-between min-h-[52px]">
              <div>
                <p className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>WhatsApp OTP Login</p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Secure one-time password via WhatsApp.</p>
              </div>
              <Badge variant="green" size="sm">Active</Badge>
            </div>
          </div>
        </div>

        {/* Sign Out */}
        <div className="rounded-xl overflow-hidden shadow-sm border" style={{ background: 'var(--surface)', borderColor: 'var(--card-border)' }}>
          <button
            onClick={handleLogout}
            className="w-full px-5 py-3.5 flex items-center justify-between text-left transition-colors group min-h-[56px]"
            style={{ background: 'transparent' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--danger-light)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <div>
              <p className="text-[13px] font-semibold" style={{ color: 'var(--danger)' }}>Sign out</p>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                You'll need your CP ID and OTP to sign back in.
              </p>
            </div>
            <LogOut size={15} className="transition-colors shrink-0 ml-4" style={{ color: 'var(--danger)' }} />
          </button>
        </div>

      </div>
    </DashboardLayout>
  );
}
