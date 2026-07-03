import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LoginPage } from './pages/Login';
import { SetupPage } from './pages/Setup';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TeachersPage } from './pages/admin/TeachersPage';
import { AssistantsPage } from './pages/admin/AssistantsPage';
import { ClassesPage } from './pages/classes/ClassesPage';
import { ExamsPage } from './pages/exams/ExamsPage';
import { ExamDetail } from './pages/exams/ExamDetail';
import { CreateExam } from './pages/exams/CreateExam';
import { StudentDashboard } from './pages/student/Dashboard';
import { LiveExam } from './pages/student/LiveExam';
import { LiveMonitor } from './pages/exams/LiveMonitor';
import { SettingsPage } from './pages/student/SettingsPage';
import { ExamResultsView } from './pages/exams/ExamResultsView';
import { StudentResultView } from './pages/student/StudentResultView';

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
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<RootRoute />} />
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
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

          <Route path="/classes/:classId/group/:group/exams" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'TEACHER', 'ASSISTANT', 'STUDENT']}>
              <ExamsPage />
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

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
