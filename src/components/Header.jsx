import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
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
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { clientProfile, theme, toggleTheme } = useSettings();
    const rootRef = useRef(null);
    const titleRef = useRef(null);
    const subtitleRef = useRef(null);
    const actionsRef = useRef(null);
    const helpButtonRef = useRef(null);
    const helpMenuRef = useRef(null);
    const userButtonRef = useRef(null);
    const userMenuRef = useRef(null);
    const [isHelpMenuOpen, setIsHelpMenuOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [ticketPlaceholderMessage, setTicketPlaceholderMessage] = useState("");
    const [helpMenuPosition, setHelpMenuPosition] = useState({ top: 0, left: 0 });
    const [userMenuPosition, setUserMenuPosition] = useState({ top: 0, left: 0 });
    const currentRouteInfo = ROUTE_LABELS[location.pathname] || {
        title: "Page Not Found",
        subtitle: "The requested page does not exist.",
    };
    const isClientUser = user?.role === "client";
    const avatarLabel = isClientUser ? (clientProfile?.clientName || user?.email || "N") : (user?.email || "N");
    const showClientProfileImage = isClientUser && Boolean(clientProfile?.profileImage);
    const userInitial = String(avatarLabel).charAt(0).toUpperCase();
    const whatsappLink = "https://wa.me/919884209360";
    const supportEmailLink = "https://mail.google.com/mail/?view=cm&fs=1&to=neeranjanrit@gmail.com&su=Re%20support";
    const HELP_MENU_WIDTH = 256;
    const USER_MENU_WIDTH = 200;

    const updateHelpMenuPosition = () => {
        if (!helpButtonRef.current) return;
        const rect = helpButtonRef.current.getBoundingClientRect();
        const maxLeft = Math.max(8, window.innerWidth - HELP_MENU_WIDTH - 8);
        const left = Math.min(Math.max(8, rect.right - HELP_MENU_WIDTH), maxLeft);
        const top = rect.bottom + 8;
        setHelpMenuPosition({ top, left });
    };

    const updateUserMenuPosition = () => {
        if (!userButtonRef.current) return;
        const rect = userButtonRef.current.getBoundingClientRect();
        const maxLeft = Math.max(8, window.innerWidth - USER_MENU_WIDTH - 8);
        const left = Math.min(Math.max(8, rect.right - USER_MENU_WIDTH), maxLeft);
        const top = rect.bottom + 8;
        setUserMenuPosition({ top, left });
    };

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

    useEffect(() => {
        if (!isHelpMenuOpen) return;
        updateHelpMenuPosition();

        const handleOutsideClick = (event) => {
            const target = event.target;
            if (
                helpButtonRef.current?.contains(target) ||
                helpMenuRef.current?.contains(target)
            ) {
                return;
            }
            setIsHelpMenuOpen(false);
        };

        const handleEscape = (event) => {
            if (event.key === "Escape") {
                setIsHelpMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);
        document.addEventListener("keydown", handleEscape);
        window.addEventListener("resize", updateHelpMenuPosition);
        window.addEventListener("scroll", updateHelpMenuPosition, true);
        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
            document.removeEventListener("keydown", handleEscape);
            window.removeEventListener("resize", updateHelpMenuPosition);
            window.removeEventListener("scroll", updateHelpMenuPosition, true);
        };
    }, [isHelpMenuOpen]);

    useEffect(() => {
        if (!isUserMenuOpen) return;
        updateUserMenuPosition();

        const handleOutsideClick = (event) => {
            const target = event.target;
            if (
                userButtonRef.current?.contains(target) ||
                userMenuRef.current?.contains(target)
            ) {
                return;
            }
            setIsUserMenuOpen(false);
        };

        const handleEscape = (event) => {
            if (event.key === "Escape") {
                setIsUserMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);
        document.addEventListener("keydown", handleEscape);
        window.addEventListener("resize", updateUserMenuPosition);
        window.addEventListener("scroll", updateUserMenuPosition, true);
        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
            document.removeEventListener("keydown", handleEscape);
            window.removeEventListener("resize", updateUserMenuPosition);
            window.removeEventListener("scroll", updateUserMenuPosition, true);
        };
    }, [isUserMenuOpen]);

    useEffect(() => {
        if (!ticketPlaceholderMessage) return;
        const timer = setTimeout(() => setTicketPlaceholderMessage(""), 2500);
        return () => clearTimeout(timer);
    }, [ticketPlaceholderMessage]);

    return (
        <header ref={rootRef} className="h-20 bg-[var(--c-bg)] border-b border-[var(--c-border)] flex flex-col justify-center px-8 shrink-0 relative overflow-visible">
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
                <div ref={actionsRef} className="flex items-center space-x-4 relative">
                    <button
                        type="button"
                        onClick={toggleTheme}
                        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                        className="h-8 w-8 flex items-center justify-center rounded-md border border-[var(--c-border)] bg-[var(--c-hover)] hover:bg-[var(--c-hover2)] transition-colors text-gray-400 hover:text-[var(--c-text)]"
                    >
                        {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                    </button>
                    <div className="relative">
                        <button
                            ref={helpButtonRef}
                            type="button"
                            onClick={() => setIsHelpMenuOpen((current) => !current)}
                            aria-expanded={isHelpMenuOpen}
                            aria-haspopup="menu"
                            className="h-8 px-4 text-xs font-semibold bg-[var(--c-hover)] hover:bg-[var(--c-hover2)] rounded-md border border-[var(--c-border)] transition-colors text-[var(--c-text)]"
                        >
                            Help
                        </button>
                    </div>
                    <button
                        ref={userButtonRef}
                        type="button"
                        onClick={() => {
                            setIsUserMenuOpen((current) => !current);
                            setIsHelpMenuOpen(false);
                        }}
                        aria-haspopup="menu"
                        aria-expanded={isUserMenuOpen}
                        className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-[#00a0a0] flex items-center justify-center font-bold text-[var(--c-bg)] shadow-lg shadow-primary/20 cursor-pointer hover:scale-105 transition-transform overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--c-bg)]"
                    >
                        {showClientProfileImage ? (
                            <img
                                src={clientProfile.profileImage}
                                alt={clientProfile.clientName || "Client profile"}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            userInitial
                        )}
                    </button>
                </div>
                {ticketPlaceholderMessage ? (
                    <p className="absolute top-full right-8 mt-2 text-xs text-gray-400">
                        {ticketPlaceholderMessage}
                    </p>
                ) : null}
            </div>
            {isHelpMenuOpen && typeof document !== "undefined"
                ? createPortal(
                    <div
                        ref={helpMenuRef}
                        role="menu"
                        className="fixed w-64 rounded-md border border-[var(--c-border)] bg-[var(--c-bg)] shadow-xl z-[9999] py-1"
                        style={{
                            top: `${helpMenuPosition.top}px`,
                            left: `${helpMenuPosition.left}px`,
                        }}
                    >
                        <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noreferrer"
                            role="menuitem"
                            className="block px-3 py-2 text-sm text-[var(--c-text)] hover:bg-[var(--c-hover2)]"
                            onClick={() => setIsHelpMenuOpen(false)}
                        >
                            WhatsApp Support
                        </a>
                        <a
                            href={supportEmailLink}
                            target="_blank"
                            rel="noreferrer"
                            role="menuitem"
                            className="block px-3 py-2 text-sm text-[var(--c-text)] hover:bg-[var(--c-hover2)]"
                            onClick={() => setIsHelpMenuOpen(false)}
                        >
                            Email Support
                        </a>
                        <button
                            type="button"
                            role="menuitem"
                            className="w-full text-left px-3 py-2 text-sm text-[var(--c-text)] hover:bg-[var(--c-hover2)]"
                            onClick={() => {
                                setTicketPlaceholderMessage("Customer support ticket system coming soon.");
                                setIsHelpMenuOpen(false);
                            }}
                        >
                            Customer Ticket (Placeholder)
                        </button>
                    </div>,
                    document.body
                )
                : null}
            {isUserMenuOpen && typeof document !== "undefined"
                ? createPortal(
                    <div
                        ref={userMenuRef}
                        role="menu"
                        className="fixed w-52 rounded-md border border-[var(--c-border)] bg-[var(--c-bg)] shadow-xl z-[9999] py-1"
                        style={{
                            top: `${userMenuPosition.top}px`,
                            left: `${userMenuPosition.left}px`,
                        }}
                    >
                        <button
                            type="button"
                            role="menuitem"
                            className="w-full text-left px-3 py-2 text-sm text-[var(--c-text)] hover:bg-[var(--c-hover2)]"
                            onClick={() => {
                                setIsUserMenuOpen(false);
                                navigate("/settings");
                            }}
                        >
                            Settings
                        </button>
                        <button
                            type="button"
                            role="menuitem"
                            className="w-full text-left px-3 py-2 text-sm text-[var(--c-text)] hover:bg-[var(--c-hover2)]"
                            onClick={() => {
                                setIsUserMenuOpen(false);
                                logout();
                                navigate("/login", { replace: true });
                            }}
                        >
                            Logout
                        </button>
                    </div>,
                    document.body
                )
                : null}
        </header>
    );
}
