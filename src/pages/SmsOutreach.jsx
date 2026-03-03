import React from 'react';
import { Send, Inbox, DollarSign, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getSmsCampaigns } from '../utils/mock-data';
import { useDashboardData } from '../hooks/useDashboardData';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

// A custom pulsing node for the network graphic
const NetworkNode = ({ x, y, size = 6, delay = 0, isMain = false }) => (
    <g className="animate-pulse" style={{ animationDelay: `${delay}s`, animationDuration: '3s' }}>
        <circle
            cx={x}
            cy={y}
            r={size}
            className={cn("fill-current", isMain ? "text-fuchsia-500" : "text-purple-400")}
            style={{ filter: 'drop-shadow(0 0 8px currentColor)' }}
        />
        <circle
            cx={x}
            cy={y}
            r={size * 2.5}
            className={cn("fill-current opacity-20", isMain ? "text-fuchsia-500" : "text-purple-400")}
        />
    </g>
);

// Animated connection lines between nodes
const NetworkEdge = ({ x1, y1, x2, y2, delay = 0 }) => (
    <g>
        <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            className="stroke-white/10"
            strokeWidth="1"
        />
        {/* Animated packet traveling along the line */}
        <circle r="2" className="fill-fuchsia-400" style={{ filter: 'drop-shadow(0 0 4px #e879f9)' }}>
            <animateMotion
                dur="4s"
                repeatCount="indefinite"
                path={`M ${x1} ${y1} L ${x2} ${y2}`}
                begin={`${delay}s`}
            />
        </circle>
    </g>
);

export default function SmsOutreach() {
    const { data, isLoading } = useDashboardData(getSmsCampaigns);
    const messagesSent = data?.messagesSent ?? 0;
    const deliveryRate = data?.deliveryRate ?? 0;
    const totalCost = data?.totalCost ?? 0;

    // Top KPI Metrics (shows "-" while loading)
    const metrics = [
        {
            title: 'MESSAGES SENT',
            value: isLoading ? '-' : messagesSent,
            icon: Send,
            iconColor: 'text-fuchsia-400',
            iconBg: 'bg-fuchsia-400/10',
            borderColor: 'border-l-fuchsia-500',
        },
        {
            title: 'DELIVERY RATE',
            value: isLoading ? '-' : `${deliveryRate}%`,
            icon: Inbox,
            iconColor: 'text-teal-400',
            iconBg: 'bg-teal-400/10',
            borderColor: 'border-l-teal-400',
        },
        {
            title: 'TOTAL COST',
            value: isLoading ? '-' : `$${Number(totalCost).toFixed(2)}`,
            icon: DollarSign,
            iconColor: 'text-emerald-400',
            iconBg: 'bg-emerald-400/10',
            borderColor: 'border-l-emerald-400',
        },
    ];

    return (
        <div className="space-y-6 pb-10 h-full flex flex-col">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-fuchsia-400 tracking-tight">SMS Outreach</h1>
                <p className="text-gray-400 text-sm mt-1">Campaign delivery and cost tracking.</p>
            </div>

            {/* Metrics Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {metrics.map((metric, i) => {
                    const Icon = metric.icon;
                    return (
                        <div
                            key={i}
                            className={cn(
                                'bg-[#1a1f2e] rounded-xl p-6 flex flex-col justify-between border-l-2 shadow-lg transition-transform duration-300 relative overflow-hidden group',
                                metric.borderColor,
                                'border-y border-r border-y-white/5 border-r-white/5'
                            )}
                        >
                        {/* Loading Shimmer Effect */}
                        {isLoading && (
                            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent z-0" />
                        )}

                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <h3 className="text-gray-400 text-xs font-bold tracking-wider uppercase">{metric.title}</h3>
                            <div className={cn('p-2 rounded-lg border border-white/5', metric.iconBg, metric.iconColor)}>
                                <Icon size={20} className={isLoading ? "animate-pulse" : ""} strokeWidth={2.5} />
                            </div>
                        </div>

                        <div className="relative z-10 mt-2">
                            <div className="text-3xl font-bold text-white mb-2 tracking-tight transition-all duration-300">
                                {metric.value}
                            </div>
                        </div>
                        </div>
                    );
                })}
            </div>

            {/* Network Visualization Area */}
            <div className="flex-1 min-h-[500px] bg-[#1a1f2e] rounded-xl shadow-lg border border-white/5 overflow-hidden flex flex-col relative group">

                {/* Header Area */}
                <div className="p-6 border-b border-white/5 relative z-20 bg-[#1a1f2e]/80 backdrop-blur-sm">
                    <h3 className="text-white font-semibold text-lg flex items-center">
                        <Send className="mr-2 text-fuchsia-400" size={20} />
                        Global Delivery Network
                    </h3>

                    {/* Loading Text Indicator */}
                    {isLoading && (
                        <div className="flex items-center mt-3 text-fuchsia-400 text-sm font-medium">
                            <Loader2 size={16} className="animate-spin mr-2" />
                            Loading SMS logs...
                        </div>
                    )}
                </div>

                {/* SVG Network Grid Background */}
                <div className="absolute inset-0 z-0 opacity-20 pointer-events-none"
                    style={{
                        backgroundImage: 'linear-gradient(to right, #4a044e 1px, transparent 1px), linear-gradient(to bottom, #4a044e 1px, transparent 1px)',
                        backgroundSize: '40px 40px'
                    }}
                />

                {/* The SVG Network Diagram */}
                <div className="flex-1 w-full h-full relative z-10 flex items-center justify-center">
                    <svg className="w-full h-full" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid meet">
                        {/* Central Hub */}
                        <NetworkNode x={400} y={200} size={12} isMain={true} />

                        {/* Define peripheral node coordinates representing global carriers */}
                        {[
                            { x: 200, y: 100, delay: 0.5 },
                            { x: 150, y: 250, delay: 1.2 },
                            { x: 280, y: 320, delay: 0.8 },
                            { x: 600, y: 120, delay: 2.1 },
                            { x: 650, y: 280, delay: 1.5 },
                            { x: 500, y: 350, delay: 0.3 },
                            { x: 350, y: 70, delay: 1.8 },
                            { x: 480, y: 90, delay: 0.7 }
                        ].map((node, i) => (
                            <g key={i}>
                                {/* Draw line from center to node */}
                                <NetworkEdge x1={400} y1={200} x2={node.x} y2={node.y} delay={node.delay} />
                                {/* Draw the Node itself */}
                                <NetworkNode x={node.x} y={node.y} delay={node.delay} />

                                {/* Add secondary connections between some outer nodes to simulate a mesh network */}
                                {i > 0 && i % 2 === 0 && (
                                    <NetworkEdge x1={node.x} y1={node.y} x2={node.x - 100} y2={node.y + 40} delay={node.delay + 0.5} />
                                )}
                            </g>
                        ))}

                        {/* Radial gradients to simulate glowing center */}
                        <defs>
                            <radialGradient id="glow" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="#e879f9" stopOpacity="0.15" />
                                <stop offset="100%" stopColor="#1a1f2e" stopOpacity="0" />
                            </radialGradient>
                        </defs>
                        <circle cx="400" cy="200" r="150" fill="url(#glow)" className="animate-pulse" style={{ animationDuration: '4s' }} />
                    </svg>
                </div>

                {/* Optional subtle overlay gradient over the bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#1a1f2e] to-transparent z-20 pointer-events-none" />
            </div>
        </div>
    );
}

