import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { api } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Icon } from '../../components/ui/Icon';
import toast from 'react-hot-toast';

type SectionConfig = { sectionName: string; coordinatorCpId: string };
type GroupConfig   = { classStrength: number; sections: SectionConfig[] };
type AcademicClass = {
  id: string;
  name: string;
  academicYear: string;
  pcm: GroupConfig;
  pcb: GroupConfig;
};

/* ── Group Card (Minimalist) ─────────────────────────────────────────────── */
type GroupCardProps = {
  group: 'PCM' | 'PCB';
  cfg: GroupConfig;
  onClick: () => void;
};

const GROUP_META = {
  PCM: {
    label: 'PCM',
    fullLabel: 'Physics, Chem, Maths',
    colorVar: '--accent',
    bgVar: 'var(--accent-light)',
    icon: 'calculate',
  },
  PCB: {
    label: 'PCB',
    fullLabel: 'Physics, Chem, Biology',
    colorVar: '--success',
    bgVar: 'var(--success-light)',
    icon: 'eco',
  },
};

function GroupCard({ group, cfg, onClick }: GroupCardProps) {
  const meta = GROUP_META[group];
  const totalSections = cfg.sections.length;

  return (
    <button
      onClick={onClick}
      className="group flex items-center justify-between w-full p-3 transition-all duration-200 border"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        borderRadius: '14px',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = `var(${meta.colorVar})`;
        (e.currentTarget as HTMLElement).style.background = `var(--surface-sub)`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
        (e.currentTarget as HTMLElement).style.background = 'var(--surface)';
      }}
    >
      <div className="flex items-center gap-4">
        {/* Icon block */}
        <div
          className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
          style={{ background: meta.bgVar }}
        >
          <Icon name={meta.icon} size={20} style={{ color: `var(${meta.colorVar})` }} filled />
        </div>
        
        {/* Text */}
        <div className="text-left">
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--text)' }} className="text-[14px] font-bold">
              {meta.label} Group
            </span>
            <span style={{ color: 'var(--text-muted)' }} className="text-[11px] font-medium hidden sm:inline">
              ({meta.fullLabel})
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span style={{ color: 'var(--text-muted)' }} className="text-[12px]">
              <span className="font-semibold text-[var(--text-sub)]">{totalSections}</span> sections
            </span>
            <span style={{ color: 'var(--border)' }}>|</span>
            <span style={{ color: 'var(--text-muted)' }} className="text-[12px]">
              <span className="font-semibold text-[var(--text-sub)]">{cfg.classStrength}</span> seats
            </span>
          </div>
        </div>
      </div>

      {/* Right chevron */}
      <div className="pr-1 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5">
        <Icon name="chevron_right" size={18} />
      </div>
    </button>
  );
}

/* ── Main page ─────────────────────────────────────────────────────────────── */
export function ClassesPage() {
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingClass, setExportingClass] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => { fetchClasses(); }, []);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes');
      setClasses(res.data.classes);
    } catch {
      toast.error('Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (cls: AcademicClass) => {
    setExportingClass(cls.id);
    try {
      const response = await api.get(`/classes/${cls.id}/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${cls.name.replace(/ /g, '_')}_${cls.academicYear.replace(/ /g, '_')}_Students.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Export successful');
    } catch (error) {
      console.error(error);
      toast.error('Failed to export students');
    } finally {
      setExportingClass(null);
    }
  };

  if (loading) return <DashboardLayout><LoadingSpinner fullPage /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-5 animate-fade-in max-w-4xl">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-page-title text-[24px]">CET Batches</h1>
            <p className="text-secondary mt-1 text-[14px]">
              Select a batch and group to manage exams, sections, and invigilators.
            </p>
          </div>
        </div>

        {classes.length === 0 ? (
          <div className="card py-16 text-center" style={{ background: 'var(--surface)', borderRadius: '16px', borderColor: 'var(--border)' }}>
            <Icon name="school" size={32} style={{ color: 'var(--text-muted)', opacity: 0.3, margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text)' }} className="text-[15px] font-bold">No active batches</p>
            <p style={{ color: 'var(--text-muted)' }} className="text-[13px] mt-1">
              No active CET batches are linked from the Finance System.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger">
            {classes.map(cls => {
              return (
                <div
                  key={cls.id}
                  className="flex flex-col overflow-hidden border"
                  style={{
                    background: 'var(--surface-sub)',
                    borderColor: 'var(--border)',
                    borderRadius: '20px',
                  }}
                >
                  {/* Batch Header */}
                  <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center shrink-0">
                        <Icon name="school" size={22} style={{ color: 'var(--text)' }} />
                      </div>
                      <div>
                        <h2 style={{ color: 'var(--text)' }} className="text-[15px] font-bold leading-none">
                          {cls.name}
                        </h2>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span style={{ color: 'var(--text-muted)' }} className="text-[11px] font-medium">
                            {cls.academicYear} Batch
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleExport(cls)}
                      disabled={exportingClass === cls.id}
                      title="Export Students to Excel"
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-colors border"
                      style={{ 
                        background: 'var(--surface)', 
                        borderColor: 'var(--border)', 
                        opacity: exportingClass === cls.id ? 0.5 : 1 
                      }}
                      onMouseEnter={e => {
                        if (exportingClass !== cls.id) {
                          (e.currentTarget as HTMLElement).style.background = 'var(--surface-sub)';
                        }
                      }}
                      onMouseLeave={e => {
                        if (exportingClass !== cls.id) {
                          (e.currentTarget as HTMLElement).style.background = 'var(--surface)';
                        }
                      }}
                    >
                      {exportingClass === cls.id ? (
                        <div className="w-4 h-4 border-2 border-[var(--text-muted)] border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Icon name="file_download" size={18} style={{ color: 'var(--text-muted)' }} />
                      )}
                    </button>
                  </div>

                  {/* Groups */}
                  <div className="p-4 space-y-2.5">
                    <GroupCard group="PCM" cfg={cls.pcm} onClick={() => navigate(`/classes/${cls.id}/group/PCM`)} />
                    <GroupCard group="PCB" cfg={cls.pcb} onClick={() => navigate(`/classes/${cls.id}/group/PCB`)} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
