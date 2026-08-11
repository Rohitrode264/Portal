import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { api } from '../../lib/api';
import { Loader2, ArrowLeft, Users, ShieldCheck, Download } from 'lucide-react';
import toast from 'react-hot-toast';

type PortalSection = {
  sectionName: string;
  coordinatorCpId: string | null;
  students: any[];
};

export function SectionStudentsPage() {
  const { classId, group, sectionName } = useParams<{ classId: string; group: string; sectionName: string }>();
  const [section, setSection] = useState<PortalSection | null>(null);
  const [classMeta, setClassMeta] = useState<{ className: string; academicYear: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [classId, group, sectionName]);

  const fetchData = async () => {
    if (!classId || !group || !sectionName) return;
    setLoading(true);
    try {
      const [studentsRes, staffRes] = await Promise.all([
        api.get(`/classes/${classId}/students?group=${group}`),
        api.get('/teachers/staff')
      ]);
      const sections = studentsRes.data.sections || [];
      const foundSection = sections.find((s: PortalSection) => s.sectionName === sectionName);
      setSection(foundSection || null);
      setClassMeta({ className: studentsRes.data.className || 'Class', academicYear: studentsRes.data.academicYear || '' });
      setStaff(staffRes.data.staff || []);
    } catch {
      toast.error('Failed to load section data');
    } finally {
      setLoading(false);
    }
  };

  const coordinatorName = section?.coordinatorCpId 
    ? staff.find(s => s.cpId === section.coordinatorCpId)?.name || section.coordinatorCpId
    : null;

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await api.get(`/classes/${classId}/export?group=${group}&sectionName=${sectionName}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      let fileName = `${group}_Section_${sectionName}_Students.xlsx`;
      if (classMeta) {
        fileName = `${classMeta.className}_${classMeta.academicYear}_${group}_Sec_${sectionName}.xlsx`.replace(/ /g, '_');
      }
      link.setAttribute('download', fileName);
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Export successful');
    } catch (error) {
      console.error(error);
      toast.error('Failed to export section students');
    } finally {
      setExporting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(`/classes/${classId}/group/${group}`)}
              className="p-2 -ml-2 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="w-7 h-7 rounded bg-blue-100 text-blue-700 flex items-center justify-center text-[15px]">
                  {sectionName}
                </span>
                Section {sectionName} Roster
              </h1>
              <p className="text-sm text-gray-500 mt-1">{group} Group</p>
            </div>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
          >
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Export Excel
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-gray-300" size={24} />
          </div>
        ) : !section ? (
          <div className="bg-white border border-gray-100 rounded-xl p-12 flex flex-col items-center text-center gap-2">
            <Users size={28} className="text-gray-200 mb-1" />
            <p className="text-sm font-medium text-gray-600">Section not found</p>
            <p className="text-xs text-gray-400">This section might not exist or has been repartitioned.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <ShieldCheck size={16} className={coordinatorName ? 'text-emerald-500' : 'text-gray-400'} />
                Coordinator: {coordinatorName || 'Not Assigned'}
              </div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Total Students: {section.students.length}
              </p>
            </div>
            
            <div className="divide-y divide-gray-50">
              {section.students.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400">No students in this section</div>
              ) : (
                section.students.map((student, index) => (
                  <div key={student.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-semibold text-gray-400 w-4">{index + 1}.</span>
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                        {student.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-gray-900">{student.name}</p>
                        <p className="text-[12px] text-gray-400 font-mono mt-0.5">{student.admissionNumber}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[12px] font-medium text-gray-500">
                        {student.whatsappNumber || student.phone || 'No Contact'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
