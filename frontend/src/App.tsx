import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LoginPage } from './pages/Login';
import { SetupPage } from './pages/Setup';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { TeachersPage } from './pages/admin/TeachersPage';
import { AssistantsPage } from './pages/admin/AssistantsPage';
import { ClassesPage } from './pages/classes/ClassesPage';
import { ExamsPage } from './pages/exams/ExamsPage';
import { SectionStudentsPage } from './pages/classes/SectionStudentsPage';
import { ExamDetail } from './pages/exams/ExamDetail';
import { CreateExam } from './pages/exams/CreateExam';
import { StudentSearchPage } from './pages/students/StudentSearchPage';
import { StudentProfilePage } from './pages/students/StudentProfilePage';
import { StudentDashboard } from './pages/student/Dashboard';
import { LiveExam } from './pages/student/LiveExam';
import { LiveMonitor } from './pages/exams/LiveMonitor';
import { SettingsPage } from './pages/student/SettingsPage';
import { ExamResultsView } from './pages/exams/ExamResultsView';
import { StudentResultView } from './pages/student/StudentResultView';
import { CalendarPage } from './pages/CalendarPage';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user && !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  
  return children;
}

function DashboardRouter() {
  const { user } = useAuth();
  
  if (user?.role === 'STUDENT') {
    return <StudentDashboard />;
  } else if (user?.role === 'ADMIN') {
    return <Navigate to="/admin/teachers" replace />;
  } else {
    return <Navigate to="/classes" replace />;
  }
}

function RootRoute() {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#ffffff',
              color: '#111111',
              border: '1px solid #f3f4f6',
              borderRadius: '10px',
              boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)',
              fontSize: '13px',
              fontWeight: '500',
              padding: '10px 14px',
              maxWidth: '360px',
            },
            success: {
              iconTheme: { primary: '#16a34a', secondary: '#ffffff' },
            },
            error: {
              iconTheme: { primary: '#dc2626', secondary: '#ffffff' },
            },
          }}
        />
        <Routes>
          <Route path="/" element={<RootRoute />} />
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/setup" element={<SetupPage />} />
          
          <Route path="/admin/teachers" element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <TeachersPage />
            </ProtectedRoute>
          } />

          <Route path="/admin/assistants" element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AssistantsPage />
            </ProtectedRoute>
          } />

          <Route path="/classes" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'TEACHER', 'ASSISTANT']}>
              <ClassesPage />
            </ProtectedRoute>
          } />

          <Route path="/classes/:classId/group/:group" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'TEACHER', 'ASSISTANT', 'STUDENT']}>
              <ExamsPage />
            </ProtectedRoute>
          } />

          <Route path="/classes/:classId/group/:group/section/:sectionName" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'TEACHER', 'ASSISTANT', 'STUDENT']}>
              <SectionStudentsPage />
            </ProtectedRoute>
          } />

          <Route path="/exams" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'TEACHER', 'ASSISTANT', 'STUDENT']}>
              <ExamsPage />
            </ProtectedRoute>
          } />
          
          <Route path="/exams/create" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'TEACHER', 'ASSISTANT']}>
              <CreateExam />
            </ProtectedRoute>
          } />

          <Route path="/exams/:id" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'TEACHER', 'ASSISTANT', 'STUDENT']}>
              <ExamDetail />
            </ProtectedRoute>
          } />

          <Route path="/exams/:id/monitor" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'TEACHER', 'ASSISTANT']}>
              <LiveMonitor />
            </ProtectedRoute>
          } />

          <Route path="/live-exam/:id" element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <LiveExam />
            </ProtectedRoute>
          } />

          <Route path="/student/result/:id" element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <StudentResultView />
            </ProtectedRoute>
          } />

          <Route path="/exams/:id/results" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'TEACHER', 'ASSISTANT']}>
              <ExamResultsView />
            </ProtectedRoute>
          } />

          <Route path="/students" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'TEACHER', 'COORDINATOR']}>
              <StudentSearchPage />
            </ProtectedRoute>
          } />

          <Route path="/students/:id" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'TEACHER', 'COORDINATOR']}>
              <StudentProfilePage />
            </ProtectedRoute>
          } />
          
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'TEACHER', 'ASSISTANT', 'STUDENT']}>
              <DashboardRouter />
            </ProtectedRoute>
          } />

          <Route path="/settings" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'TEACHER', 'ASSISTANT', 'STUDENT']}>
              <SettingsPage />
            </ProtectedRoute>
          } />

          <Route path="/calendar" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'TEACHER', 'ASSISTANT', 'STUDENT']}>
              <CalendarPage />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
