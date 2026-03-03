import { Activity } from 'lucide-react';
import { useDashboardData } from '../hooks/useDashboardData';

export default function SystemHealth() {
    const { data } = useDashboardData(() => ({ ok: true, n8nLatencyMs: 45 }), '/dashboard/health');
    const latency = Number.isFinite(data?.n8nLatencyMs) ? data.n8nLatencyMs : 0;
    const latencyPct = Math.max(0, Math.min(100, Math.round((latency / 200) * 100))); // 200ms => 100%

    return (
        <div className="bg-[#1a1f2e] rounded-xl p-6 shadow-lg border border-white/5 w-full flex flex-col relative overflow-hidden group">
            {/* Background Accent */}
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-[40px] translate-y-1/2 translate-x-1/2 pointer-events-none transition-opacity duration-300 group-hover:bg-amber-500/10"></div>

            <div className="flex items-center justify-between mb-6 relative z-10">
                <h3 className="text-white font-semibold text-lg flex items-center">
                    <Activity className="mr-2 text-[#00d9ff]" size={20} />
                    System Health
                </h3>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-6 relative z-10">
                {/* API Latency */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-400 text-sm font-medium">API Latency</span>
                        <span className="text-emerald-400 font-bold">{latency}ms</span>
                    </div>
                    <div className="w-full bg-[#0f1419] rounded-full h-2.5 border border-white/5 overflow-hidden">
                        <div
                            className="bg-emerald-400 h-2.5 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)] transition-all duration-1000 ease-out"
                            style={{ width: `${latencyPct}%` }}
                        ></div>
                    </div>
                </div>

                {/* Database Load */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-400 text-sm font-medium">Database Load</span>
                        <span className="text-amber-400 font-bold">62%</span>
                    </div>
                    <div className="w-full bg-[#0f1419] rounded-full h-2.5 border border-white/5 overflow-hidden">
                        <div
                            className="bg-amber-400 h-2.5 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.5)] transition-all duration-1000 ease-out"
                            style={{ width: '62%' }}
                        ></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
