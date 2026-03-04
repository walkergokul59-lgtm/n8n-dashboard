import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import { Loader2 } from 'lucide-react';

function CustomTooltipContent({ active, payload, label }) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[var(--c-hover)] border border-[var(--c-border-light)] p-3 rounded-lg shadow-xl">
                <p className="text-gray-400 text-xs mb-1">{`Time: ${label}`}</p>
                <p className="text-[var(--c-accent)] font-bold">
                    {`Requests: ${payload[0].value}`}
                </p>
            </div>
        );
    }
    return null;
}

function RenderLegendContent(props) {
    const { payload } = props;
    return (
        <div className="flex justify-end w-full mb-2">
            {payload.map((entry, index) => (
                <div key={`item-${index}`} className="flex items-center text-sm text-gray-400">
                    <span
                        className="w-2.5 h-2.5 rounded-full mr-2"
                        style={{ backgroundColor: entry.color }}
                    />
                    {entry.value.charAt(0).toUpperCase() + entry.value.slice(1)}
                </div>
            ))}
        </div>
    );
}

export default function ExecutionVolumeChart({ data, isLoading }) {
    const hasData = Array.isArray(data) && data.length > 0;
    const chartData = hasData
        ? data.map((d) => ({
            time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            requests: d.executions
        }))
        : [];

    return (
        <div className="bg-[var(--c-raised)] rounded-xl p-6 shadow-lg border border-[var(--c-border-sub)] w-full lg:w-[60%] h-[350px] flex flex-col">
            <h3 className="text-[var(--c-text)] font-semibold text-lg mb-6">Execution Volume</h3>

            {isLoading ? (
                <div className="flex-1 w-full h-full flex flex-col items-center justify-center min-h-[250px] opacity-50">
                    <Loader2 size={32} className="animate-spin text-[var(--c-accent)] mb-4" />
                    <p className="text-gray-400 text-sm animate-pulse">Synchronizing cluster data...</p>
                </div>
            ) : !hasData ? (
                <div className="flex-1 w-full h-full flex flex-col items-center justify-center min-h-[250px]">
                    <p className="text-gray-400 text-sm">No execution volume data available right now.</p>
                </div>
            ) : (
                <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={chartData}
                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--c-accent)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="var(--c-accent)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="rgba(255,255,255,0.05)"
                                vertical={false}
                            />
                            <XAxis
                                dataKey="time"
                                stroke="#6b7280"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                            />
                            <YAxis
                                stroke="#6b7280"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                domain={[0, 'dataMax + 10']}
                                tickCount={5}
                            />
                            <Tooltip content={<CustomTooltipContent />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                            <Legend content={RenderLegendContent} verticalAlign="top" align="right" />
                            <Area
                                type="monotone"
                                dataKey="requests"
                                stroke="var(--c-accent)"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorRequests)"
                                animationDuration={1000}
                                activeDot={{ r: 6, fill: 'var(--c-raised)', stroke: 'var(--c-accent)', strokeWidth: 2 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
