import React, { Component, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SettingsProvider } from "./context/SettingsContext";
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import AIAgentLogs from "./pages/AIAgentLogs";
import InvoiceRuns from "./pages/InvoiceRuns";
import OrderSync from "./pages/OrderSync";
import SmsOutreach from "./pages/SmsOutreach";
import Settings from "./pages/Settings";
import Preloader from "./components/Preloader";

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

function App() {
  const [isBootReady, setIsBootReady] = useState(false);
  const [showPreloader, setShowPreloader] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const minDelay = new Promise((resolve) => setTimeout(resolve, 900));
    const fontsReady = document.fonts?.ready?.catch(() => undefined) ?? Promise.resolve();

    Promise.all([minDelay, fontsReady]).then(() => {
      if (!cancelled) setIsBootReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
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
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="agent-logs" element={<AIAgentLogs />} />
              <Route path="invoice-runs" element={<InvoiceRuns />} />
              <Route path="order-sync" element={<OrderSync />} />
              <Route path="sms-outreach" element={<SmsOutreach />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </SettingsProvider>
  );
}

export default App;
