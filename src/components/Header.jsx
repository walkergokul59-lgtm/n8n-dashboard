import { useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Sun, Moon } from "lucide-react";
import { gsap } from "../lib/gsap.js";
import { useAuth } from "../context/useAuth";
import { useSettings } from "../context/SettingsContext";

const ROUTE_LABELS = {
    "/": { title: "N8N Dashboard", subtitle: "Overview of your workflows and metrics" },
    "/dashboard": { title: "N8N Dashboard", subtitle: "Overview of your workflows and metrics" },
    "/agent-logs": { title: "AI Agent Logs", subtitle: "Monitor AI agent executions and output logs" },
    "/invoice-runs": { title: "Invoice Runs", subtitle: "Track automated invoice generation workflows" },
    "/order-sync": { title: "Order Sync", subtitle: "Manage e-commerce order synchronization" },
    "/sms-outreach": { title: "SMS Outreach", subtitle: "View and manage automated SMS campaigns" },
    "/settings": { title: "Settings", subtitle: "Configure advanced dashboard preferences" },
    "/admin": { title: "Admin Panel", subtitle: "Manage clients, users, and workflow access rules" },
};

export function Header() {
    const location = useLocation();
    const { user } = useAuth();
    const { clientProfile, theme, toggleTheme } = useSettings();
    const rootRef = useRef(null);
    const titleRef = useRef(null);
    const subtitleRef = useRef(null);
    const actionsRef = useRef(null);
    const currentRouteInfo = ROUTE_LABELS[location.pathname] || {
        title: "Page Not Found",
        subtitle: "The requested page does not exist.",
    };
    const isClientUser = user?.role === "client";
    const avatarLabel = isClientUser ? (clientProfile?.clientName || user?.email || "N") : (user?.email || "N");
    const showClientProfileImage = isClientUser && Boolean(clientProfile?.profileImage);
    const userInitial = String(avatarLabel).charAt(0).toUpperCase();

    useLayoutEffect(() => {
        if (!rootRef.current) return;
        const ctx = gsap.context(() => {
            gsap.fromTo(
                [titleRef.current, subtitleRef.current],
                { y: 10, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 0.45,
                    ease: "power2.out",
                    stagger: 0.06,
                    overwrite: true
                }
            );

            gsap.fromTo(
                actionsRef.current,
                { y: -6, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 0.4,
                    ease: "power2.out",
                    delay: 0.05,
                    overwrite: true
                }
            );
        }, rootRef);
        return () => ctx.revert();
    }, [location.pathname]);

    return (
        <header ref={rootRef} className="h-20 bg-[var(--c-bg)] border-b border-[var(--c-border)] flex flex-col justify-center px-8 shrink-0 relative overflow-hidden">
            {/* Decorative gradient orb */}
            <div className="dark-only absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <div className="relative z-10 flex items-center justify-between">
                <div>
                    <h1 ref={titleRef} className="text-2xl font-bold tracking-tight text-[var(--c-text)] mb-1">
                        {currentRouteInfo.title}
                    </h1>
                    <p ref={subtitleRef} className="text-sm text-gray-400">
                        {currentRouteInfo.subtitle}
                    </p>
                </div>

                {/* Mock User Avatar */}
                <div ref={actionsRef} className="flex items-center space-x-4">
                    <button
                        type="button"
                        onClick={toggleTheme}
                        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                        className="h-8 w-8 flex items-center justify-center rounded-md border border-[var(--c-border)] bg-[var(--c-hover)] hover:bg-[var(--c-hover2)] transition-colors text-gray-400 hover:text-[var(--c-text)]"
                    >
                        {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                    </button>
                    <button className="h-8 px-4 text-xs font-semibold bg-[var(--c-hover)] hover:bg-[var(--c-hover2)] rounded-md border border-[var(--c-border)] transition-colors text-[var(--c-text)]">
                        Help
                    </button>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-[#00a0a0] flex items-center justify-center font-bold text-[var(--c-bg)] shadow-lg shadow-primary/20 cursor-pointer hover:scale-105 transition-transform overflow-hidden">
                        {showClientProfileImage ? (
                            <img
                                src={clientProfile.profileImage}
                                alt={clientProfile.clientName || "Client profile"}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            userInitial
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
