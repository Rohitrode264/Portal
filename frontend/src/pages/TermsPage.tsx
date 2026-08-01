import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function TermsPage() {
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
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-4">Terms of Service</h1>
            <p className="text-gray-500 font-medium">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          <div className="space-y-10 text-gray-700 leading-relaxed text-[16px]">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p>
                By accessing or using Merit by New Career Point ("the Platform"), you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the Platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Description of Service</h2>
              <p>
                Merit is an educational testing and learning management platform designed for students, teachers, and administrators. It provides tools for online examinations, performance tracking, and course management.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. User Conduct and Academic Integrity</h2>
              <p className="mb-4">Users agree to use the Platform only for lawful purposes. Specifically, students agree to:</p>
              <ul className="list-disc pl-6 space-y-3">
                <li>Maintain strict academic integrity during all examinations and assessments.</li>
                <li>Not use unauthorized aids or participate in cheating.</li>
                <li>Not attempt to circumvent the platform's security or proctoring features.</li>
                <li>Not share account credentials or access with third parties.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Intellectual Property Rights</h2>
              <p>
                All content, including but not limited to test questions, study materials, logos, and software, is the property of New Career Point or its content suppliers and is protected by intellectual property laws. You may not reproduce, distribute, or create derivative works without explicit permission.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Account Termination</h2>
              <p>
                We reserve the right to suspend or terminate your account at our sole discretion, without prior notice, for conduct that we believe violates these Terms of Service or is harmful to other users of the Platform, us, or third parties, or for any other reason.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Limitation of Liability</h2>
              <p>
                Merit and New Career Point shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your access to or use of, or inability to access or use, the Platform.
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
