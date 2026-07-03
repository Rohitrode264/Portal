import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { api } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2, Users, ArrowRight, ShieldCheck, Pencil, CheckCircle2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';

type GroupConfig = {
  examCoordinatorCpId: string | null;
};

type AcademicClass = {
  id: string;
  name: string;
  academicYear: string;
  pcm: GroupConfig;
  pcb: GroupConfig;
};

export function ClassesPage() {
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<any[]>([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<AcademicClass | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<'PCM' | 'PCB' | null>(null);
  const [selectedCoordinator, setSelectedCoordinator] = useState<string>('');
  const [assigning, setAssigning] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchClasses();
    fetchStaff();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes');
      setClasses(res.data.classes);
    } catch (error) {
      toast.error('Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await api.get('/teachers/staff');
      setStaff(res.data.staff || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGroupClick = (classId: string, group: string) => {
    navigate(`/classes/${classId}/group/${group}/exams`);
  };

  const handleOpenAssignModal = (cls: AcademicClass, group: 'PCM' | 'PCB', e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedClass(cls);
    setSelectedGroup(group);
    setSelectedCoordinator(group === 'PCM' ? (cls.pcm.examCoordinatorCpId || '') : (cls.pcb.examCoordinatorCpId || ''));
    setModalOpen(true);
  };

  const handleAssignCoordinatorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !selectedGroup) return;
    setAssigning(true);
    try {
      await api.patch(`/classes/${selectedClass.id}/coordinator`, {
        group: selectedGroup,
        teacherCpId: selectedCoordinator || null
      });
      toast.success('Coordinator updated successfully');
      setModalOpen(false);
      fetchClasses();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to assign coordinator');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Academic Classes</h1>
          <p className="text-gray-500 mt-1 text-sm font-medium">Select a class and group to manage exams and attendance.</p>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-gray-400" size={32} />
          </div>
        ) : classes.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center text-gray-500 font-medium border border-gray-100 shadow-sm">
            No active CET classes found in the Finance System.
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {classes.map((cls) => (
              <div key={cls.id} className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300">
                
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{cls.name}</h3>
                    <p className="text-gray-400 font-semibold text-sm mt-1">{cls.academicYear} Academic Year</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 shrink-0">
                    <Users size={24} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* PCM Card */}
                  {(() => {
                    const pcmCoordinator = cls.pcm.examCoordinatorCpId 
                      ? (staff.find(s => s.cpId === cls.pcm.examCoordinatorCpId)?.name || cls.pcm.examCoordinatorCpId)
                      : null;

                    return (
                      <button 
                        onClick={() => handleGroupClick(cls.id, 'PCM')}
                        className="group relative overflow-hidden bg-[#F8FAFC] hover:bg-blue-600 border border-blue-100 rounded-2xl p-5 text-left transition-all duration-300"
                      >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-full transition-transform group-hover:scale-150 group-hover:bg-black/10" />
                        <div className="relative z-10 flex flex-col h-full">
                          <div className="flex items-center justify-between">
                            <span className="text-xl font-black tracking-tight text-blue-900 group-hover:text-white transition-colors">PCM Group</span>
                            <ArrowRight size={20} className="text-blue-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                          </div>
                          <p className="text-blue-600/70 text-xs font-semibold mt-1 group-hover:text-blue-100 transition-colors">Physics • Chemistry • Maths</p>
                          
                          <div className="mt-6 flex items-center justify-between gap-2">
                            {pcmCoordinator ? (
                              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg group-hover:bg-emerald-500/20 group-hover:text-emerald-100 truncate flex-1 mr-2">
                                <ShieldCheck size={14} className="shrink-0" />
                                <span className="truncate">{pcmCoordinator}</span>
                              </div>
                            ) : (
                              <div className="text-xs font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg group-hover:bg-black/20 group-hover:text-white transition-colors flex-1 mr-2 truncate">
                                No Coordinator
                              </div>
                            )}
                            {user?.role === 'ADMIN' && (
                              <button
                                type="button"
                                onClick={(e) => handleOpenAssignModal(cls, 'PCM', e)}
                                className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-black transition-colors shrink-0 group-hover:bg-white/20 group-hover:text-white"
                                title="Assign Coordinator"
                              >
                                <Pencil size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })()}

                  {/* PCB Card */}
                  {(() => {
                    const pcbCoordinator = cls.pcb.examCoordinatorCpId 
                      ? (staff.find(s => s.cpId === cls.pcb.examCoordinatorCpId)?.name || cls.pcb.examCoordinatorCpId)
                      : null;

                    return (
                      <button 
                        onClick={() => handleGroupClick(cls.id, 'PCB')}
                        className="group relative overflow-hidden bg-[#F8FAFC] hover:bg-green-600 border border-green-100 rounded-2xl p-5 text-left transition-all duration-300"
                      >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-bl-full transition-transform group-hover:scale-150 group-hover:bg-black/10" />
                        <div className="relative z-10 flex flex-col h-full">
                          <div className="flex items-center justify-between">
                            <span className="text-xl font-black tracking-tight text-green-900 group-hover:text-white transition-colors">PCB Group</span>
                            <ArrowRight size={20} className="text-green-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                          </div>
                          <p className="text-green-600/70 text-xs font-semibold mt-1 group-hover:text-green-100 transition-colors">Physics • Chemistry • Biology</p>
                          
                          <div className="mt-6 flex items-center justify-between gap-2">
                            {pcbCoordinator ? (
                              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg group-hover:bg-emerald-500/20 group-hover:text-emerald-100 truncate flex-1 mr-2">
                                <ShieldCheck size={14} className="shrink-0" />
                                <span className="truncate">{pcbCoordinator}</span>
                              </div>
                            ) : (
                              <div className="text-xs font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg group-hover:bg-black/20 group-hover:text-white transition-colors flex-1 mr-2 truncate">
                                No Coordinator
                              </div>
                            )}
                            {user?.role === 'ADMIN' && (
                              <button
                                type="button"
                                onClick={(e) => handleOpenAssignModal(cls, 'PCB', e)}
                                className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-black transition-colors shrink-0 group-hover:bg-white/20 group-hover:text-white"
                                title="Assign Coordinator"
                              >
                                <Pencil size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })()}

                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assign Coordinator Modal */}
      <AnimatePresence>
        {isModalOpen && selectedClass && selectedGroup && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ opacity: 0, y: 100, scale: 0.95 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-3xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-8">
                <h2 className="text-2xl font-bold mb-1">Assign Coordinator</h2>
                <p className="text-xs text-gray-400 font-medium mb-6">
                  Select coordinator for {selectedClass.name} ({selectedGroup} Group)
                </p>
                <form onSubmit={handleAssignCoordinatorSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Coordinator</label>
                    <select 
                      value={selectedCoordinator} 
                      onChange={e => setSelectedCoordinator(e.target.value)} 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black transition-all font-medium bg-transparent cursor-pointer"
                    >
                      <option value="">None (Unassigned)</option>
                      {staff.map(s => (
                        <option key={s.cpId} value={s.cpId}>
                          {s.name} ({s.cpId}) — {s.role === 'TEACHER' ? (s.subject ? `${s.subject.charAt(0) + s.subject.slice(1).toLowerCase()} Teacher` : 'Faculty') : s.role.charAt(0) + s.role.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-6 flex gap-3">
                    <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-3.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                      Cancel
                    </button>
                    <button type="submit" disabled={assigning} className="flex-1 py-3.5 rounded-xl font-bold text-white bg-black hover:bg-gray-900 transition-colors disabled:opacity-70 flex items-center justify-center gap-2">
                      {assigning ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                      {assigning ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
