import { Link, Database, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useSettings } from "../context/SettingsContext";

export default function Settings() {
    const { dataSource, setDataSource } = useSettings();

    // Data Source Map
    const dataSources = [
        {
            id: 'mockup',
            title: 'Static Mock Data',
            description: 'Displays static n8n dummy data. Disables background polling and interactions.',
            icon: Database,
            color: 'text-gray-400'
        },
        {
            id: 'realtime-mockup',
            title: 'Real-Time Interactivity',
            description: 'Simulates live n8n network fetches, latency, and background polling using mock schemas.',
            icon: CheckCircle2,
            color: 'text-[#00d9ff]'
        },
        {
            id: 'n8n-server',
            title: 'Live n8n Server',
            description: 'Connects to a live n8n instance through this dashboard server. Token stays server-side via .env.',
            icon: Link,
            color: 'text-emerald-400'
        }
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">

            {/* Top Config Header */}
            <div>
                <h2 className="text-xl font-bold text-white mb-1">Data Source Configuration</h2>
                <p className="text-sm text-gray-400">Select how the dashboard ingests and displays metric payloads.</p>
            </div>

            {/* Toggle Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {dataSources.map((source) => {
                    const active = dataSource === source.id;
                    const Icon = source.icon;
                    return (
                        <div
                            key={source.id}
                            onClick={() => setDataSource(source.id)}
                            className={`relative cursor-pointer rounded-xl p-6 border transition-all duration-300 ${active
                                    ? 'bg-[#00d9ff]/5 border-[#00d9ff] shadow-[0_0_20px_rgba(0,217,255,0.15)] ring-1 ring-[#00d9ff]/50 hover:bg-[#00d9ff]/10'
                                    : 'bg-[#1a1f2e] border-white/5 hover:bg-[#1a222a] hover:border-white/10 opacity-70 hover:opacity-100'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-2 rounded-lg bg-[#0f1419]/50 border ${active ? 'border-[#00d9ff]/20' : 'border-white/5'} ${source.color}`}>
                                    <Icon size={24} strokeWidth={2.5} />
                                </div>
                                <div className={`h-4 w-4 rounded-full border-2 transition-colors ${active ? 'border-[#00d9ff] bg-[#00d9ff]' : 'border-gray-500 bg-transparent'}`} />
                            </div>
                            <h3 className={`text-lg font-bold mb-2 ${active ? 'text-white' : 'text-gray-300'}`}>{source.title}</h3>
                            <p className="text-sm text-gray-400 leading-relaxed">{source.description}</p>
                        </div>
                    );
                })}
            </div>

            {/* Live API Note - Only Active if 'n8n-server' Selected */}
            <div className={`mt-10 bg-[#1a1f2e] rounded-xl border border-white/5 overflow-hidden transition-all duration-500 ${dataSource === 'n8n-server' ? 'ring-1 ring-emerald-500/50 outline outline-1 outline-emerald-500/10' : 'opacity-40 grayscale pointer-events-none'}`}>

                <div className="p-6 border-b border-white/5 bg-[#141a21]/50 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-white mb-1">Live Server Authentication</h3>
                        <p className="text-sm text-gray-400">Configure `N8N_BASE_URL` and `N8N_API_TOKEN` in `.env` on the server.</p>
                    </div>
                    {dataSource === 'n8n-server' && (
                        <div className="flex items-center text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <ShieldAlert size={14} className="mr-2" />
                            Secure Context
                        </div>
                    )}
                </div>

                <div className="p-6 space-y-6">
                    <div>
                        <p className="text-sm text-gray-300">
                            This dashboard no longer stores your n8n token in the browser. Put your settings in `.env` (see `.env.example`).
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                            Tip: restart `npm run dev` after changing `.env`.
                        </p>
                    </div>
                </div>

            </div>

        </div>
    );
}
