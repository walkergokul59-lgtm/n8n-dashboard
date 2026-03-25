/* UI redesign: replaced hardcoded hex colors with CSS vars for theme support */
import { ShieldCheck, SlidersHorizontal, LockKeyhole } from "lucide-react";

export default function AdminSettings() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            <div className="rounded-[8px] border border-[var(--c-success)]/20 bg-[var(--c-success-bg)] px-4 py-3">
                <h2 className="text-[14px] font-semibold text-[var(--c-success-text)]">Admin Settings</h2>
                <p className="text-[13px] text-[var(--c-success-text)]/80">This settings page is scoped for admin users only.</p>
            </div>

            <div className="rounded-[8px] border border-[var(--c-border)] bg-[var(--bg-surface)] p-6">
                <div className="flex items-center gap-3 mb-4">
                    <ShieldCheck className="text-[var(--c-accent)]" size={20} />
                    <h3 className="text-[16px] font-semibold text-[var(--c-text)]">Admin Configuration Scope</h3>
                </div>

                <div className="space-y-3 text-[14px] text-[var(--c-text-dim)]">
                    <p className="flex items-center gap-2">
                        <SlidersHorizontal size={16} className="text-[var(--c-text-muted)] shrink-0" />
                        Client profile details are managed in client settings only.
                    </p>
                    <p className="flex items-center gap-2">
                        <LockKeyhole size={16} className="text-[var(--c-text-muted)] shrink-0" />
                        Use the Admin Panel to manage RBAC, users, clients, and workflow access.
                    </p>
                </div>
            </div>
        </div>
    );
}
