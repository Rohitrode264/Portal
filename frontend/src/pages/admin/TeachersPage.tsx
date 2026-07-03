import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { api } from '../../lib/api';
import { Plus, Search, Shield, ShieldOff, Edit2, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

type Teacher = {
  cpId: string;
  name: string;
  email: string;
  subject: string;
  designation: string;
  isActive: boolean;
};

export function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'PHYSICS',
    designation: '',
    password: ''
  });

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const res = await api.get('/teachers');
      setTeachers(res.data.teachers);
    } catch (error) {
      toast.error('Failed to load teachers');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (cpId: string) => {
    try {
      const res = await api.patch(`/teachers/${cpId}/toggle`);
      setTeachers(teachers.map(t => t.cpId === cpId ? { ...t, isActive: res.data.isActive } : t));
      toast.success(res.data.message);
    } catch (error) {
      toast.error('Failed to toggle status');
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await api.post('/teachers', formData);
      setTeachers([res.data.teacher, ...teachers]);
      setAddModalOpen(false);
      setFormData({ name: '', email: '', phone: '', subject: 'PHYSICS', designation: '', password: '' });
      toast.success('Teacher added successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add teacher');
    } finally {
      setAdding(false);
    }
  };

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.cpId.toLowerCase().includes(search.toLowerCase())
  );

  const getSubjectColor = (subject: string) => {
    switch(subject) {
      case 'PHYSICS': return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'CHEMISTRY': return 'bg-purple-50 text-purple-600 border-purple-200';
      case 'MATHS': return 'bg-red-50 text-red-600 border-red-200';
      case 'BIOLOGY': return 'bg-green-50 text-green-600 border-green-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Faculty Management</h1>
            <p className="text-gray-500 mt-1 text-sm font-medium">Manage teachers, assign subjects, and control access.</p>
          </div>
          <button 
            onClick={() => setAddModalOpen(true)}
            className="bg-black text-white px-6 py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/10"
          >
            <Plus size={20} />
            Add Faculty
          </button>
        </div>

        {/* Toolbar */}
        <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Search by name or CP ID..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-transparent outline-none font-medium text-gray-900 placeholder-gray-400"
            />
          </div>
        </div>

        {/* List */}
        <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="animate-spin text-gray-400" size={32} />
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="p-12 text-center text-gray-500 font-medium">
              No faculty found.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredTeachers.map((teacher) => (
                <div key={teacher.cpId} className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors group">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-700">
                      {teacher.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-gray-900 text-lg">{teacher.name}</h3>
                        {!teacher.isActive && (
                          <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-wider">Deactivated</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-semibold text-gray-400">{teacher.cpId}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                        <span className="text-sm font-medium text-gray-500">{teacher.email}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                         <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${getSubjectColor(teacher.subject)}`}>
                            {teacher.subject}
                         </span>
                         {teacher.designation && (
                           <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">
                             {teacher.designation}
                           </span>
                         )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleToggleStatus(teacher.cpId)}
                      className={`p-2 rounded-xl transition-colors ${teacher.isActive ? 'text-red-500 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'}`}
                      title={teacher.isActive ? 'Deactivate Access' : 'Activate Access'}
                    >
                      {teacher.isActive ? <ShieldOff size={20} /> : <Shield size={20} />}
                    </button>
                    <button className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-black transition-colors">
                      <Edit2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setAddModalOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ opacity: 0, y: 100, scale: 0.95 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-3xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-8">
                <h2 className="text-2xl font-bold mb-6">Add New Faculty</h2>
                <form onSubmit={handleAddSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                      <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                      <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Subject</label>
                      <select value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black transition-all font-medium">
                        <option value="PHYSICS">Physics</option>
                        <option value="CHEMISTRY">Chemistry</option>
                        <option value="MATHS">Mathematics</option>
                        <option value="BIOLOGY">Biology</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Designation (Optional)</label>
                      <input type="text" placeholder="e.g. Head of Physics" value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black transition-all" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone (Optional)</label>
                      <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Initial Password</label>
                      <input required type="text" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black transition-all" />
                    </div>
                  </div>

                  <div className="pt-6 flex gap-3">
                    <button type="button" onClick={() => setAddModalOpen(false)} className="flex-1 py-3.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                      Cancel
                    </button>
                    <button type="submit" disabled={adding} className="flex-1 py-3.5 rounded-xl font-bold text-white bg-black hover:bg-gray-900 transition-colors disabled:opacity-70 flex items-center justify-center gap-2">
                      {adding ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                      {adding ? 'Adding...' : 'Add Faculty'}
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
