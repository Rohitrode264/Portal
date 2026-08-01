import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Gilroy', system-ui, sans-serif" }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              <img src="/images/merit_logo.png" alt="Merit" className="w-11 h-11 rounded-lg object-contain" />
              <span className="font-bold text-gray-900 text-lg">Merit</span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-12 md:py-16">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-4">Privacy Policy</h1>
            <p className="text-gray-500 font-medium">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          <div className="space-y-10 text-gray-700 leading-relaxed text-[16px]">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
              <p>
                At Merit by New Career Point, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect your personal information when you use our educational testing platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>
              <p className="mb-4">We collect information that you provide directly to us, including:</p>
              <ul className="list-disc pl-6 space-y-3">
                <li><strong>Account Information:</strong> Name, CP ID, email address, and role (student, teacher, etc.).</li>
                <li><strong>Academic Data:</strong> Examination answers, scores, performance metrics, and course progress.</li>
                <li><strong>Usage Information:</strong> Device information, IP addresses, and interaction logs within the platform.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
              <p className="mb-4">We use the collected information for the following purposes:</p>
              <ul className="list-disc pl-6 space-y-3">
                <li>To provide, maintain, and improve our educational services.</li>
                <li>To evaluate student performance and generate academic reports.</li>
                <li>To communicate important updates, exam schedules, and results.</li>
                <li>To ensure platform security and prevent academic dishonesty.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Sharing and Disclosure</h2>
              <p>
                We do not sell or rent your personal information to third parties. Academic records and performance data may be shared with authorized teachers, administrators, and parents/guardians as part of the educational process within New Career Point.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Security</h2>
              <p>
                We implement robust security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet or electronic storage is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Contact Us</h2>
              <p>
                If you have any questions or concerns about this Privacy Policy, please contact the administration at New Career Point.
              </p>
            </section>
          </div>
        </motion.div>
      </main>

      <footer className="py-8 text-center text-sm text-gray-500 font-medium border-t border-gray-100 max-w-3xl mx-auto">
        &copy; {new Date().getFullYear()} Merit by New Career Point. All rights reserved.
      </footer>
    </div>
  );
}
