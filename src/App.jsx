import React, { Component, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SettingsProvider } from "./context/SettingsContext";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/useAuth";
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import AIAgentLogs from "./pages/AIAgentLogs";
import InvoiceRuns from "./pages/InvoiceRuns";
import OrderSync from "./pages/OrderSync";
import SmsOutreach from "./pages/SmsOutreach";
import Settings from "./pages/Settings";
import AdminSettings from "./pages/AdminSettings";
import Preloader from "./components/Preloader";
import Login from "./pages/Login";
import AdminPanel from "./pages/AdminPanel";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      hasError: true,
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: '#222', color: 'red', height: '100vh', width: '100vw' }}>
          <h2>Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

function RequireAuth({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen bg-[#0f1419] text-gray-300 flex items-center justify-center">Checking session...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function RequireAdmin({ children }) {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen bg-[#0f1419] text-gray-300 flex items-center justify-center">Checking access...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function RoleBasedSettings() {
  const { isAdmin } = useAuth();
  return isAdmin ? <AdminSettings /> : <Settings />;
}

function App() {
  const [isBootReady, setIsBootReady] = useState(false);
  const [showPreloader, setShowPreloader] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const minDelay = new Promise((resolve) => setTimeout(resolve, 900));
    const fontsReady = document.fonts?.ready?.catch(() => undefined) ?? Promise.resolve();
    // Failsafe: never let font loading block app boot indefinitely.
    const hardTimeout = new Promise((resolve) => setTimeout(resolve, 3000));

    Promise.race([Promise.all([minDelay, fontsReady]), hardTimeout]).then(() => {
      if (!cancelled) setIsBootReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AuthProvider>
      <SettingsProvider>
        <ErrorBoundary>
          {showPreloader && (
            <Preloader
              ready={isBootReady}
              onDone={() => {
                setShowPreloader(false);
              }}
            />
          )}
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={(
                  <RequireAuth>
                    <Layout />
                  </RequireAuth>
                )}
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="agent-logs" element={<AIAgentLogs />} />
                <Route path="invoice-runs" element={<InvoiceRuns />} />
                <Route path="order-sync" element={<OrderSync />} />
                <Route path="sms-outreach" element={<SmsOutreach />} />
                <Route path="settings" element={<RoleBasedSettings />} />
                <Route
                  path="admin"
                  element={(
                    <RequireAdmin>
                      <AdminPanel />
                    </RequireAdmin>
                  )}
                />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ErrorBoundary>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
