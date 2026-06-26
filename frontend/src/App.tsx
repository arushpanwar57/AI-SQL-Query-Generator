import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/common/Layout';
import { Login } from './components/auth/Login';
import { Register } from './components/auth/Register';
import { QueryGenerator } from './components/dashboard/QueryGenerator';
import { SchemaExplorer } from './components/dashboard/SchemaExplorer';
import { DeveloperDDL } from './components/admin/DeveloperDDL';
import { AdminDashboard } from './components/admin/AdminDashboard';

// Route guard for Developer or Admin roles
const DeveloperRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isDeveloper } = useAuth();
  if (!isDeveloper) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

// Route guard for Admin role only
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

// Route guard for unauthenticated guest pages (login/register)
const GuestRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const AppContent: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Guest Routes */}
        <Route path="/login" element={
          <GuestRoute>
            <Login />
          </GuestRoute>
        } />
        <Route path="/register" element={
          <GuestRoute>
            <Register />
          </GuestRoute>
        } />

        {/* Workspace Protected Layout */}
        <Route path="/" element={<Layout />}>
          <Route index element={<QueryGenerator />} />
          <Route path="schema" element={<SchemaExplorer />} />
          
          {/* Developer Tools Guarded */}
          <Route path="developer-ddl" element={
            <DeveloperRoute>
              <DeveloperDDL />
            </DeveloperRoute>
          } />
          
          {/* Admin Management Guarded */}
          <Route path="admin" element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};
