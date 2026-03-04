import { ShieldCheck, SlidersHorizontal, LockKeyhole } from "lucide-react";

export default function AdminSettings() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                <h2 className="text-sm font-semibold text-emerald-300">Admin Settings</h2>
                <p className="text-xs text-emerald-200/80">This settings page is scoped for admin users only.</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#141a21]/80 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <ShieldCheck className="text-[var(--c-accent)]" size={18} />
                    <h3 className="text-lg font-bold text-white">Admin Configuration Scope</h3>
                </div>

                <div className="space-y-3 text-sm text-gray-300">
                    <p className="flex items-center gap-2">
                        <SlidersHorizontal size={15} className="text-gray-400" />
                        Client profile details are managed in client settings only.
                    </p>
                    <p className="flex items-center gap-2">
                        <LockKeyhole size={15} className="text-gray-400" />
                        Use the Admin Panel to manage RBAC, users, clients, and workflow access.
                    </p>
                </div>
            </div>
        </div>
    );
}
