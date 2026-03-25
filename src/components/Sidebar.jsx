/* UI redesign: replaced hardcoded grays with CSS vars, standardized icon sizes 20px, fixed button heights, fixed sidebar width */
import { NavLink } from "react-router-dom";
import { Grid, File, MessageSquare, Settings, Shield } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { useAuth } from "../context/useAuth";

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export function Sidebar() {
    const { isAdmin, isApproved, hasFeature, user, logout } = useAuth();

    const navItems = (() => {
        if (!isApproved) return [{ name: "Settings", path: "/settings", icon: Settings }];
        const items = [{ name: "Dashboard", path: "/dashboard", icon: Grid }];
        if (isAdmin || hasFeature('supportChat'))
            items.push({ name: "Support Chat", path: "/support", icon: MessageSquare });
        if (isAdmin || hasFeature('invoiceRuns'))
            items.push({ name: "Invoice Runs", path: "/invoice-runs", icon: File });
        items.push({ name: "Settings", path: "/settings", icon: Settings });
        if (isAdmin)
            items.push({ name: "Admin", path: "/admin", icon: Shield });
        return items;
    })();

    return (
        <div className="relative z-10 w-[248px] min-h-screen bg-[var(--bg-surface)] border-r border-[var(--c-border)] flex flex-col shrink-0">
            {/* n8n Logo Area */}
            <div className="h-16 flex items-center px-6 border-b border-[var(--c-border)]">
                <div className="w-8 h-8 bg-[var(--c-accent)] rounded-[6px] flex items-center justify-center mr-3 font-bold text-[var(--c-bg)] text-[12px] tracking-tight">
                    n8n
                </div>
                <span className="font-semibold text-[16px] text-[var(--c-text)] hover:text-[var(--c-accent)] transition-colors cursor-pointer">
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
                                "flex items-center px-4 py-2.5 rounded-[6px] transition-all duration-200 group text-[14px] font-medium",
                                isActive
                                    ? "bg-[var(--c-accent)]/10 text-[var(--c-accent)]"
                                    : "text-[var(--c-text-muted)] hover:bg-[var(--c-hover)] hover:text-[var(--c-text-dim)]"
                            )
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon
                                    size={20}
                                    className={cn(
                                        "mr-3 shrink-0 transition-colors",
                                        isActive ? "text-[var(--c-accent)]" : "text-[var(--c-text-muted)] group-hover:text-[var(--c-text-dim)]"
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
                    className="w-full h-8 rounded-[6px] bg-[var(--c-hover)] border border-[var(--c-border)] text-[12px] font-medium text-[var(--c-text-dim)] hover:bg-[var(--c-hover2)] transition-colors"
                >
                    Logout
                </button>
                <div className="text-[12px] text-[var(--c-text-muted)] text-center">v2.0.0</div>
                <div className="text-[12px] text-[var(--c-text-subtle)] text-center">A product of Mad Fusion</div>
            </div>
        </div>
    );
}
