import { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import toast from 'react-hot-toast';
import { ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function SetupPage() {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const navigate = useNavigate();

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const res = await api.post('/setup/admin', formData);
      setSuccessData(res.data.data);
      toast.success('Admin created successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Setup failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4 text-blue-600">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Portal Setup</h1>
          <p className="text-gray-500 mt-2 text-center text-sm">Create the first administrator account to get started.</p>
        </div>

        {successData ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 mb-6">
              <p className="text-sm text-gray-500 mb-1">Your Admin ID is</p>
              <p className="text-3xl font-bold text-gray-900 tracking-tight">{successData.cpId}</p>
            </div>
            <Button onClick={() => navigate('/login')}>Go to Login</Button>
          </motion.div>
        ) : (
          <form onSubmit={handleSetup} className="flex flex-col gap-2">
            <Input 
              label="Full Name" 
              placeholder="e.g. System Admin"
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
            <Input 
              label="Email Address" 
              type="email"
              placeholder="admin@school.com"
              required
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
            <Input 
              label="Phone Number" 
              type="tel"
              placeholder="+91..."
              required
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
            />
            <Input 
              label="Secure Password" 
              type="password"
              placeholder="••••••••"
              required
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
            <div className="mt-4">
              <Button type="submit" isLoading={isLoading}>Create Admin Account</Button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
