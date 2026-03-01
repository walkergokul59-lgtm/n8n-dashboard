import { useLocation } from "react-router-dom";

const ROUTE_LABELS = {
    "/": { title: "Dashboard", subtitle: "Overview of your workflows and metrics" },
    "/agent-logs": { title: "AI Agent Logs", subtitle: "Monitor AI agent executions and output logs" },
    "/invoice-runs": { title: "Invoice Runs", subtitle: "Track automated invoice generation workflows" },
    "/order-sync": { title: "Order Sync", subtitle: "Manage e-commerce order synchronization" },
    "/sms-outreach": { title: "SMS Outreach", subtitle: "View and manage automated SMS campaigns" },
    "/settings": { title: "Settings", subtitle: "Configure advanced dashboard preferences" },
};

export function Header() {
    const location = useLocation();
    const currentRouteInfo = ROUTE_LABELS[location.pathname] || {
        title: "Page Not Found",
        subtitle: "The requested page does not exist.",
    };

    return (
        <header className="h-20 bg-[#0f1419] border-b border-[#26313d] flex flex-col justify-center px-8 shrink-0 relative overflow-hidden">
            {/* Decorative gradient orb */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <div className="relative z-10 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
                        {currentRouteInfo.title}
                    </h1>
                    <p className="text-sm text-gray-400">
                        {currentRouteInfo.subtitle}
                    </p>
                </div>

                {/* Mock User Avatar */}
                <div className="flex items-center space-x-4">
                    <button className="h-8 px-4 text-xs font-semibold bg-[#1a222a] hover:bg-[#202933] rounded-md border border-[#26313d] transition-colors text-white">
                        Help
                    </button>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-[#00a0a0] flex items-center justify-center font-bold text-[#0f1419] shadow-lg shadow-primary/20 cursor-pointer hover:scale-105 transition-transform">
                        N
                    </div>
                </div>
            </div>
        </header>
    );
}
