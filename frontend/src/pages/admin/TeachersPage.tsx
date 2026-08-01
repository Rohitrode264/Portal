import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { FormField } from '../../components/ui/FormField';
import { Select } from '../../components/ui/Select';
import { Icon } from '../../components/ui/Icon';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

type Teacher = {
  cpId: string;
  name: string;
  email: string;
  subject: string;
  designation: string;
  isActive: boolean;
};

const SUBJECT_CONFIG: Record<string, { label: string; variant: 'blue' | 'purple' | 'red' | 'green' | 'default'; icon: string }> = {
  PHYSICS:   { label: 'Physics',     variant: 'blue',   icon: 'science' },
  CHEMISTRY: { label: 'Chemistry',   variant: 'purple', icon: 'biotech' },
  MATHS:     { label: 'Mathematics', variant: 'red',    icon: 'calculate' },
  BIOLOGY:   { label: 'Biology',     variant: 'green',  icon: 'eco' },
};

const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-700',
  'bg-purple-100 text-purple-700',
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
];

const getAvatarColor = (name: string) =>
  AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

export function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', subject: 'PHYSICS', designation: '', password: '',
  });

  useEffect(() => { fetchTeachers(); }, []);

  const fetchTeachers = async () => {
    try {
      const res = await api.get('/teachers');
      setTeachers(res.data.teachers);
    } catch {
      toast.error('Failed to load teachers');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (cpId: string) => {
    setToggling(cpId);
    try {
      const res = await api.patch(`/teachers/${cpId}/toggle`);
      setTeachers(t => t.map(x => x.cpId === cpId ? { ...x, isActive: res.data.isActive } : x));
      toast.success(res.data.message);
    } catch {
      toast.error('Failed to toggle status');
    } finally {
      setToggling(null);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await api.post('/teachers', formData);
      setTeachers(prev => [res.data.teacher, ...prev]);
      setModalOpen(false);
      setFormData({ name: '', email: '', phone: '', subject: 'PHYSICS', designation: '', password: '' });
      toast.success('Teacher added successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add teacher');
    } finally {
      setAdding(false);
    }
  };

  const field = (key: keyof typeof formData) => ({
    value: formData[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setFormData({ ...formData, [key]: e.target.value }),
  });

  const filtered = teachers.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.cpId.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount   = teachers.filter(t => t.isActive).length;
  const inactiveCount = teachers.filter(t => !t.isActive).length;

  return (
    <DashboardLayout>
      <div className="space-y-5 animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-page-title">Faculty</h1>
            <p className="text-secondary mt-1">Manage teachers, assign subjects, and control portal access.</p>
          </div>
          <Button variant="primary" size="md" onClick={() => setModalOpen(true)}>
            <Icon name="add" size={16} />
            Add Teacher
          </Button>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap gap-3">
          <StatCard label="Total" value={teachers.length} icon="group" />
          <StatCard label="Active" value={activeCount} icon="verified" color="var(--success)" bg="var(--success-light)" />
          <StatCard label="Inactive" value={inactiveCount} icon="person_off" color="var(--danger)" bg="var(--danger-light)" />
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <SearchInput
            placeholder="Search by name, CP ID, or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <span style={{ color: 'var(--text-muted)' }} className="text-[13px] shrink-0">
            {filtered.length} {filtered.length === 1 ? 'teacher' : 'teachers'}
          </span>
        </div>

        {/* Table */}
        <div className="card overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--card-border)' }}>
          {loading ? (
            <LoadingSpinner fullPage />
          ) : filtered.length === 0 ? (
            <EmptyTable
              search={search}
              noun="teacher"
              onAdd={() => setModalOpen(true)}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
              <thead>
                <tr>
                  <th>Faculty Member</th>
                  <th>CP ID</th>
                  <th>Subject</th>
                  <th>Designation</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(teacher => {
                  const sub  = SUBJECT_CONFIG[teacher.subject] || { label: teacher.subject, variant: 'default', icon: 'menu_book' };
                  const avatarCls = getAvatarColor(teacher.name);
                  const isToggling = toggling === teacher.cpId;
                  return (
                    <tr key={teacher.cpId}>
                      {/* Name + email */}
                      <td>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[12px] font-bold shrink-0 ${avatarCls}`}>
                            {teacher.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p style={{ color: 'var(--text)' }} className="font-semibold text-[13px] leading-none">{teacher.name}</p>
                            <p style={{ color: 'var(--text-muted)' }} className="text-[11px] mt-0.5 truncate max-w-[180px]">{teacher.email}</p>
                          </div>
                        </div>
                      </td>
                      {/* CP ID */}
                      <td>
                        <span style={{ color: 'var(--text-muted)', background: 'var(--surface-sub)' }}
                          className="font-mono text-[12px] px-2 py-0.5 rounded-md">
                          {teacher.cpId}
                        </span>
                      </td>
                      {/* Subject */}
                      <td>
                        <div className="flex items-center gap-1.5">
                          <Icon name={sub.icon} size={13} style={{ color: 'var(--text-muted)' }} />
                          <Badge variant={sub.variant as any} size="sm">{sub.label}</Badge>
                        </div>
                      </td>
                      {/* Designation */}
                      <td>
                        <span style={{ color: 'var(--text-muted)' }} className="text-[12px]">
                          {teacher.designation || <span style={{ color: 'var(--text-muted)', opacity: 0.5 }}>—</span>}
                        </span>
                      </td>
                      {/* Status */}
                      <td>
                        {teacher.isActive
                          ? <Badge variant="green" size="sm" dot>Active</Badge>
                          : <Badge variant="red" size="sm" dot>Inactive</Badge>
                        }
                      </td>
                      {/* Actions */}
                      <td>
                        <button
                          onClick={() => handleToggleStatus(teacher.cpId)}
                          disabled={!!isToggling}
                          title={teacher.isActive ? 'Deactivate' : 'Activate'}
                          style={{ color: 'var(--text-muted)' }}
                          className={[
                            'p-1.5 rounded-lg transition-colors',
                            teacher.isActive
                              ? 'hover:bg-red-50 hover:!text-red-500'
                              : 'hover:bg-emerald-50 hover:!text-emerald-600',
                            isToggling ? 'opacity-40 pointer-events-none' : '',
                          ].join(' ')}
                        >
                          <Icon name={teacher.isActive ? 'person_off' : 'person_check'} size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Faculty Member"
        description="Create a new teacher account with portal access."
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Full Name" required>
              <input required type="text" placeholder="e.g. Dr. Rajesh Kumar" className="form-input" {...field('name')} />
            </FormField>
            <FormField label="Email Address" required>
              <input required type="email" placeholder="name@example.com" className="form-input" {...field('email')} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Subject" required {...(field('subject') as any)}>
              <option value="PHYSICS">Physics</option>
              <option value="CHEMISTRY">Chemistry</option>
              <option value="MATHS">Mathematics</option>
              <option value="BIOLOGY">Biology</option>
            </Select>
            <FormField label="Designation" hint="Optional">
              <input type="text" placeholder="e.g. Head of Physics" className="form-input" {...field('designation')} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Phone" hint="Optional">
              <input type="text" placeholder="+91 9876543210" className="form-input" {...field('phone')} />
            </FormField>
            <FormField label="Initial Password" required>
              <input required type="text" placeholder="Min. 6 characters" className="form-input" {...field('password')} />
            </FormField>
          </div>
          <div className="flex gap-2.5 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" className="flex-1" isLoading={adding}>Add Teacher</Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}

/* ── Shared sub-components ───────────────────────────────────────────────── */

function StatCard({ label, value, icon, color, bg }: {
  label: string; value: number; icon: string;
  color?: string; bg?: string;
}) {
  return (
    <div className="card flex items-center gap-3 px-4 py-3 min-w-[120px]"
      style={{ background: 'var(--surface)', borderColor: 'var(--card-border)' }}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: bg || 'var(--surface-sub)' }}>
        <Icon name={icon} size={16} style={{ color: color || 'var(--text-muted)' }} />
      </div>
      <div>
        <p style={{ color: 'var(--text)' }} className="text-[18px] font-bold leading-none">{value}</p>
        <p style={{ color: 'var(--text-muted)' }} className="text-[11px] mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function SearchInput({ placeholder, value, onChange }: {
  placeholder: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="relative flex-1 max-w-xs">
      <Icon name="search" size={16} style={{ color: 'var(--text-muted)' }}
        className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="form-input pl-9"
      />
    </div>
  );
}

function EmptyTable({ search, noun, onAdd }: { search: string; noun: string; onAdd: () => void }) {
  return (
    <div className="py-14 text-center">
      <Icon name={search ? 'search_off' : 'group_add'} size={36}
        style={{ color: 'var(--text-muted)', opacity: 0.3, margin: '0 auto 12px' }} />
      <p style={{ color: 'var(--text-sub)' }} className="text-[14px] font-semibold">
        {search ? `No ${noun}s found` : `No ${noun}s yet`}
      </p>
      <p style={{ color: 'var(--text-muted)' }} className="text-[13px] mt-1">
        {search ? 'Try a different search term.' : `Add your first ${noun} to get started.`}
      </p>
      {!search && (
        <div className="mt-4">
          <Button size="sm" variant="primary" onClick={onAdd}>
            <Icon name="add" size={15} />
            Add {noun.charAt(0).toUpperCase() + noun.slice(1)}
          </Button>
        </div>
      )}
    </div>
  );
}
