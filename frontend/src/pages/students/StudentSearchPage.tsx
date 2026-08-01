import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Icon } from '../../components/ui/Icon';
import { Badge } from '../../components/ui/Badge';

interface StudentSearchResult {
  id: string;
  admissionNumber: string;
  name: string;
  phone: string;
  cetBucket: string;
  academicYear: string;
  className: string;
  section: string | null;
}

/* ── Avatar colour from name ─────────────────────────────────────────────── */
const AVATAR_PALETTES = [
  { bg: 'var(--primary-light)', text: 'var(--primary)' },
  { bg: 'var(--success-light)', text: 'var(--success)' },
  { bg: 'var(--accent-light)', text: 'var(--accent)' },
  { bg: 'var(--danger-light)', text: 'var(--danger)' },
];
const getAvatar = (name: string) => AVATAR_PALETTES[name.charCodeAt(0) % AVATAR_PALETTES.length];

/* ── Empty search state ──────────────────────────────────────────────────── */
function EmptySearch({ searched, query }: { searched: boolean; query: string }) {
  return (
    <div className="py-24 text-center">
      <div
        className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center"
        style={{ background: 'var(--surface-sub)' }}
      >
        <Icon name={searched ? "search_off" : "person_search"} size={48} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
      </div>
      <p style={{ color: 'var(--text)' }} className="text-[20px] font-bold tracking-tight">
        {searched ? `No results for "${query}"` : 'Find a student'}
      </p>
      <p style={{ color: 'var(--text-muted)' }} className="text-[14px] mt-2 max-w-sm mx-auto">
        {searched
          ? 'Try checking for typos or searching by a different name or admission number.'
          : 'Type a name or admission number in the search bar above to view their profile, exam history, and report cards.'}
      </p>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────────────────── */
export function StudentSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StudentSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const navigate = useNavigate();

  const fetchStudents = useCallback(async (q: string) => {
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await api.get(`/student/search?q=${encodeURIComponent(q)}`);
      setResults(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); setHasSearched(false); return; }
    const timer = setTimeout(() => fetchStudents(query), 300);
    return () => clearTimeout(timer);
  }, [query, fetchStudents]);

  const pcmCount = results.filter(s => s.cetBucket === 'PCM').length;
  const pcbCount = results.filter(s => s.cetBucket === 'PCB').length;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">

        {/* ── Page Header ──────────────────────────────────────────── */}
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: 'var(--primary-light)' }}>
            <Icon name="contacts" size={32} style={{ color: 'var(--primary)' }} filled />
          </div>
          <h1 className="text-[36px] font-black tracking-tight" style={{ color: 'var(--text)' }}>
            Student Directory
          </h1>
          <p className="text-[16px] font-medium mt-2" style={{ color: 'var(--text-muted)' }}>
            Search across all active CET batches and sections.
          </p>
        </div>

        {/* ── Search Bar (M3 Pill style) ───────────────────────────── */}
        <div className="relative z-10 mx-auto max-w-2xl transform transition-transform focus-within:scale-[1.02]">
          <div
            className="flex items-center gap-3 px-6 shadow-sm"
            style={{ 
              background: 'var(--surface)', 
              borderRadius: '32px',
              height: '64px',
              border: '1px solid var(--border)'
            }}
          >
            <Icon name="search" size={24} style={{ color: 'var(--text-muted)' }} className="shrink-0" />
            <input
              type="text"
              placeholder="Search by name or admission number…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
              style={{
                background: 'transparent',
                color: 'var(--text)',
                border: 'none',
                outline: 'none',
                width: '100%',
                height: '100%',
                fontSize: '18px',
                fontWeight: 500,
                fontFamily: 'inherit',
              }}
              className="placeholder:text-[var(--text-placeholder)]"
            />
            {loading && (
              <span className="material-symbols-outlined animate-spin shrink-0"
                style={{ fontSize: 24, color: 'var(--primary)' }}>progress_activity</span>
            )}
            {query && !loading && (
              <button
                onClick={() => setQuery('')}
                style={{ color: 'var(--text-muted)', background: 'var(--surface-sub)' }}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:opacity-70"
              >
                <Icon name="close" size={18} />
              </button>
            )}
          </div>
        </div>

        {/* ── Results ──────────────────────────────────────────────── */}
        {!query.trim() && !hasSearched ? (
          <EmptySearch searched={false} query={query} />
        ) : loading && results.length === 0 ? (
          <div className="py-24 text-center">
             <span className="material-symbols-outlined animate-spin" style={{ fontSize: 48, color: 'var(--text-muted)', opacity: 0.5 }}>
              progress_activity
            </span>
          </div>
        ) : results.length === 0 ? (
          <EmptySearch searched={hasSearched} query={query} />
        ) : (
          <div className="space-y-4 animate-fade-in pt-4">
            {/* Result count bar */}
            <div className="flex items-center justify-between px-2">
              <span style={{ color: 'var(--text-muted)' }} className="text-[14px] font-bold">
                {results.length} result{results.length !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-2">
                {pcmCount > 0 && (
                  <span style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
                    className="text-[12px] font-bold px-3 py-1 rounded-full">
                    PCM: {pcmCount}
                  </span>
                )}
                {pcbCount > 0 && (
                  <span style={{ background: 'var(--success-light)', color: 'var(--success)' }}
                    className="text-[12px] font-bold px-3 py-1 rounded-full">
                    PCB: {pcbCount}
                  </span>
                )}
              </div>
            </div>

            {/* List of Student Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map(student => {
                const av = getAvatar(student.name);
                const isPCM = student.cetBucket === 'PCM';
                return (
                  <div
                    key={student.id}
                    onClick={() => navigate(`/students/${student.id}`)}
                    className="group cursor-pointer p-4 transition-all duration-200"
                    style={{ 
                      background: 'var(--surface)', 
                      borderRadius: '24px',
                      border: '1px solid var(--border)' 
                    }}
                    onMouseEnter={e => {
                       (e.currentTarget as HTMLElement).style.borderColor = isPCM ? 'var(--accent)' : 'var(--success)';
                       (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px -8px color-mix(in srgb, ${isPCM ? 'var(--accent)' : 'var(--success)'} 30%, transparent)`;
                    }}
                    onMouseLeave={e => {
                       (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                       (e.currentTarget as HTMLElement).style.boxShadow = '';
                    }}
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div
                        style={{ background: av.bg, color: av.text }}
                        className="w-14 h-14 rounded-full flex items-center justify-center text-[20px] font-black shrink-0"
                      >
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p style={{ color: 'var(--text)' }} className="font-bold text-[16px] truncate">
                            {student.name}
                          </p>
                          <div
                            className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 transition-colors"
                            style={{ background: 'var(--surface-sub)', color: 'var(--text-muted)' }}
                          >
                            <Icon name="arrow_forward" size={16} className="group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mb-2">
                           <span style={{ background: 'var(--surface-sub)', color: 'var(--text-muted)' }}
                            className="font-mono text-[12px] font-semibold px-2 py-0.5 rounded-md">
                            #{student.admissionNumber}
                          </span>
                          <span style={{ color: 'var(--text-muted)' }} className="text-[13px] font-medium">
                            {student.className} · {student.academicYear}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
                               style={{ background: isPCM ? 'var(--accent-light)' : 'var(--success-light)', color: isPCM ? 'var(--accent)' : 'var(--success)' }}>
                            <Icon name={isPCM ? 'calculate' : 'eco'} size={12} filled />
                            <span className="text-[11px] font-bold tracking-wide">{student.cetBucket}</span>
                          </div>
                          {student.section && (
                             <Badge variant="default" size="sm">Sec {student.section}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
