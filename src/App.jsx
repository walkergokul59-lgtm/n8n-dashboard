import React, { Component } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SettingsProvider } from "./context/SettingsContext";
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import AIAgentLogs from "./pages/AIAgentLogs";
import InvoiceRuns from "./pages/InvoiceRuns";
import OrderSync from "./pages/OrderSync";
import SmsOutreach from "./pages/SmsOutreach";
import Settings from "./pages/Settings";

// Dummy pages to showcase routing and header updates
const PlaceholderPage = ({ title }) => (
  <div className="h-full flex flex-col items-center justify-center p-8 bg-[#141a21]/50 border border-white/5 rounded-2xl backdrop-blur-sm shadow-xl relative overflow-hidden group">
    <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
    <div className="w-16 h-16 mb-6 rounded-2xl bg-[#1a222a] border border-[#26313d] flex items-center justify-center shadow-lg shadow-black/50">
      <div className="w-8 h-8 rounded bg-primary/20 animate-pulse"></div>
    </div>
    <h2 className="text-3xl font-semibold mb-3 tracking-tight">{title} View</h2>
    <p className="text-gray-400 text-center max-w-md">
      This is a placeholder component for the {title} page in the n8n monitoring dashboard.
    </p>
  </div>
);

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
  return (
    <SettingsProvider>
      <ErrorBoundary>
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
              <Route path="*" element={<PlaceholderPage title="Not Found" />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </SettingsProvider>
  );
}

export default App;
