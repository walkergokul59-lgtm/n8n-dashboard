/* UI redesign: replaced hardcoded emerald/amber with CSS var status colors */
import { Activity } from 'lucide-react';
import { useDashboardData } from '../hooks/useDashboardData';

export default function SystemHealth() {
    const { data } = useDashboardData(() => ({ ok: true, n8nLatencyMs: 45 }), '/dashboard/health');
    const latency = Number.isFinite(data?.n8nLatencyMs) ? data.n8nLatencyMs : 0;
    const latencyPct = Math.max(0, Math.min(100, Math.round((latency / 200) * 100)));

    return (
        <div className="bg-[var(--bg-elevated)] rounded-[8px] p-6 shadow-lg border border-[var(--c-border)] w-full flex flex-col relative overflow-hidden group">
            <div className="dark-only absolute bottom-0 right-0 w-32 h-32 bg-[var(--c-warning)]/5 rounded-full blur-[40px] translate-y-1/2 translate-x-1/2 pointer-events-none transition-opacity duration-300 group-hover:bg-[var(--c-warning)]/10"></div>

            <div className="flex items-center justify-between mb-6 relative z-10">
                <h3 className="text-[var(--c-text)] font-semibold text-[16px] flex items-center">
                    <Activity className="mr-2 text-[var(--c-accent)]" size={20} />
                    System Health
                </h3>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-6 relative z-10">
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[var(--c-text-muted)] text-[14px] font-medium">API Latency</span>
                        <span className="text-[var(--c-success)] font-semibold">{latency}ms</span>
                    </div>
                    <div className="w-full bg-[var(--bg-base)] rounded-full h-2.5 border border-[var(--c-border)] overflow-hidden">
                        <div
                            className="bg-[var(--c-success)] h-2.5 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${latencyPct}%` }}
                        ></div>
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[var(--c-text-muted)] text-[14px] font-medium">Database Load</span>
                        <span className="text-[var(--c-warning)] font-semibold">62%</span>
                    </div>
                    <div className="w-full bg-[var(--bg-base)] rounded-full h-2.5 border border-[var(--c-border)] overflow-hidden">
                        <div
                            className="bg-[var(--c-warning)] h-2.5 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: '62%' }}
                        ></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
