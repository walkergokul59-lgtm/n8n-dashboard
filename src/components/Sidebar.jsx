import { NavLink } from "react-router-dom";
import { Grid, FileText, File, RefreshCw, MessageSquare, Settings, Shield } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { useAuth } from "../context/useAuth";

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export function Sidebar() {
    const { isAdmin, user, logout } = useAuth();
    const isApproved = isAdmin || user?.approvalStatus === 'approved';

    const fullNavItems = [
        { name: "Dashboard", path: "/dashboard", icon: Grid },
        { name: "AI Agent Logs", path: "/agent-logs", icon: FileText },
        { name: "Invoice Runs", path: "/invoice-runs", icon: File },
        { name: "Order Sync", path: "/order-sync", icon: RefreshCw },
        { name: "SMS Outreach", path: "/sms-outreach", icon: MessageSquare },
        { name: "Settings", path: "/settings", icon: Settings },
    ];
    const navItems = isApproved
        ? [...fullNavItems]
        : [{ name: "Settings", path: "/settings", icon: Settings }];
    if (isAdmin) {
        navItems.push({ name: "Admin", path: "/admin", icon: Shield });
    }

    return (
        <div className="relative z-10 w-[250px] min-h-screen bg-[var(--c-surface)] border-r border-[var(--c-border)] flex flex-col shrink-0">
            {/* n8n Logo Area */}
            <div className="h-16 flex items-center px-6 border-b border-[var(--c-border)]">
                <div className="w-8 h-8 bg-primary rounded flex items-center justify-center mr-3 font-extrabold text-[var(--c-bg)] text-sm">
                    n8n
                </div>
                <span className="font-semibold text-lg hover:text-primary transition-colors cursor-pointer">
                    Dashboard
                </span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-1">
                {navItems.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.path}
                        className={({ isActive }) =>
                            cn(
                                "flex items-center px-4 py-3 rounded-md transition-all duration-200 group text-sm font-medium",
                                isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-gray-400 hover:bg-[var(--c-hover)] hover:text-[var(--c-text-dim)]"
                            )
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon
                                    className={cn(
                                        "mr-3 h-5 w-5 transition-colors",
                                        isActive ? "text-primary/90" : "text-gray-400 group-hover:text-gray-300"
                                    )}
                                />
                                {item.name}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Footer Area */}
            <div className="p-4 border-t border-[var(--c-border)] space-y-3">
                <button
                    type="button"
                    onClick={logout}
                    className="w-full py-2 rounded-md bg-[var(--c-hover)] border border-[var(--c-border)] text-xs text-[var(--c-text-dim)] hover:bg-[var(--c-hover2)]"
                >
                    Logout
                </button>
                <div className="text-xs text-gray-500 text-center">v1.0.0</div>
            </div>
        </div>
    );
}
