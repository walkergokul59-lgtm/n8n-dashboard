import { Key, Link, Database, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useSettings } from "../context/SettingsContext";

export default function Settings() {
    const { dataSource, setDataSource, apiUrl, setApiUrl, apiKey, setApiKey } = useSettings();

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
            id: 'n8n-api',
            title: 'Live n8n Server',
            description: 'Connects to a live n8n instance via authenticated endpoints. Requires API Key & URL.',
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

            {/* Live API Fields - Only Active if 'n8n-api' Selected */}
            <div className={`mt-10 bg-[#1a1f2e] rounded-xl border border-white/5 overflow-hidden transition-all duration-500 ${dataSource === 'n8n-api' ? 'ring-1 ring-emerald-500/50 outline outline-1 outline-emerald-500/10' : 'opacity-40 grayscale pointer-events-none'}`}>

                <div className="p-6 border-b border-white/5 bg-[#141a21]/50 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-white mb-1">Live Server Authentication</h3>
                        <p className="text-sm text-gray-400">Provide keys required to securely handshake with your n8n API.</p>
                    </div>
                    {dataSource === 'n8n-api' && (
                        <div className="flex items-center text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <ShieldAlert size={14} className="mr-2" />
                            Secure Context
                        </div>
                    )}
                </div>

                <div className="p-6 space-y-6">
                    {/* Base URL Input */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wider">Base n8n External URL</label>
                        <input
                            type="url"
                            value={apiUrl}
                            onChange={(e) => setApiUrl(e.target.value)}
                            placeholder="https://n8n.yourdomain.com/api/v1"
                            className="w-full bg-[#0f1419] border border-white/10 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-[#00d9ff] focus:ring-1 focus:ring-[#00d9ff] transition-all placeholder:text-gray-600 font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-2">The fully qualified domain terminating with the api version slug.</p>
                    </div>

                    {/* API Key Input */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wider flex items-center">
                            Authentication Token <Key size={14} className="ml-2 text-gray-500" />
                        </label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="n8n_api_xxxxxxxx..."
                            className="w-full bg-[#0f1419] border border-white/10 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-[#00d9ff] focus:ring-1 focus:ring-[#00d9ff] transition-all placeholder:text-gray-600 font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-2">Your private service account token. This is encrypted strictly in your browser's local storage and never leaves this client unless directly querying your URL.</p>
                    </div>
                </div>

            </div>

        </div>
    );
}
