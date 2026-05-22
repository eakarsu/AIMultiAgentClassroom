import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ClassroomSession from './pages/ClassroomSession';
import SocraticDebate from './pages/SocraticDebate';
import LearningPath from './pages/LearningPath';
import Progress from './pages/Progress';
import AITools from './pages/AITools';
import TeacherDashboard from './pages/TeacherDashboard';
import CustomViewsPage from './pages/CustomViewsPage';
import AccommodationPlanner from './pages/AccommodationPlanner';

import CodexCustomVizFeature from './pages/CodexCustomVizFeature';
import CodexOperationsFeature from './pages/CodexOperationsFeature';

import TimelineView from './pages/TimelineView';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={styles.centered}>Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
};

const styles = {
  centered: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: 18 },
};

const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <Routes>
        <Route path="/insights/timeline" element={<TimelineView />} />
        <Route path="/codex/custom-viz" element={<CodexCustomVizFeature />} />
        <Route path="/codex/operations" element={<CodexOperationsFeature />} />

      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/session/:id" element={<PrivateRoute><ClassroomSession /></PrivateRoute>} />
      <Route path="/debate/:id" element={<PrivateRoute><SocraticDebate /></PrivateRoute>} />
      <Route path="/learning-path" element={<PrivateRoute><LearningPath /></PrivateRoute>} />
      <Route path="/progress" element={<PrivateRoute><Progress /></PrivateRoute>} />
      <Route path="/ai-tools" element={<PrivateRoute><AITools /></PrivateRoute>} />
      <Route path="/teacher" element={<PrivateRoute><TeacherDashboard /></PrivateRoute>} />
      <Route path="/custom-views" element={<PrivateRoute><CustomViewsPage /></PrivateRoute>} />
      <Route path="/accommodation-planner" element={<PrivateRoute><AccommodationPlanner /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
