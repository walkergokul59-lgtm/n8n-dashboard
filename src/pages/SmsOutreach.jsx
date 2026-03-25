/* UI redesign: replaced hardcoded grays with CSS vars, consistent typography and spacing */
import React from 'react';
import { Send, Inbox, DollarSign, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getSmsCampaigns } from '../utils/mock-data';
import { useDashboardData } from '../hooks/useDashboardData';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

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

const NetworkEdge = ({ x1, y1, x2, y2, delay = 0 }) => (
    <g>
        <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            className="stroke-[var(--c-border)]/40"
            strokeWidth="1"
        />
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
            iconColor: 'text-[var(--c-success)]',
            iconBg: 'bg-[var(--c-success)]/10',
            borderColor: 'border-l-[var(--c-success)]',
        },
    ];

    return (
        <div className="space-y-6 pb-10 h-full flex flex-col">
            <div>
                <h1 className="text-[20px] font-semibold text-fuchsia-400 tracking-tight">SMS Outreach</h1>
                <p className="text-[var(--c-text-muted)] text-[14px] mt-1">Campaign delivery and cost tracking.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {metrics.map((metric, i) => {
                    const Icon = metric.icon;
                    return (
                        <div
                            key={i}
                            className={cn(
                                'bg-[var(--bg-elevated)] rounded-[8px] p-6 flex flex-col justify-between border-l-2 shadow-lg transition-transform duration-300 relative overflow-hidden group',
                                metric.borderColor,
                                'border-y border-r border-[var(--c-border)]/30'
                            )}
                        >
                        {isLoading && (
                            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-[var(--c-overlay-hover)] to-transparent z-0" />
                        )}

                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <h3 className="text-[var(--c-text-muted)] text-[12px] font-semibold tracking-wider uppercase">{metric.title}</h3>
                            <div className={cn('p-2 rounded-[6px] border border-[var(--c-border)]', metric.iconBg, metric.iconColor)}>
                                <Icon size={20} className={isLoading ? "animate-pulse" : ""} strokeWidth={2.5} />
                            </div>
                        </div>

                        <div className="relative z-10 mt-2">
                            <div className="text-[24px] font-semibold text-[var(--c-text)] mb-2 tracking-tight transition-all duration-300">
                                {metric.value}
                            </div>
                        </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex-1 min-h-[500px] bg-[var(--bg-elevated)] rounded-[8px] shadow-lg border border-[var(--c-border)] overflow-hidden flex flex-col relative group">

                <div className="p-6 border-b border-[var(--c-border)] relative z-20 bg-[var(--bg-elevated)]/80 backdrop-blur-sm">
                    <h3 className="text-[var(--c-text)] font-semibold text-[16px] flex items-center">
                        <Send className="mr-2 text-fuchsia-400" size={20} />
                        Global Delivery Network
                    </h3>

                    {isLoading && (
                        <div className="flex items-center mt-3 text-fuchsia-400 text-[14px] font-medium">
                            <Loader2 size={16} className="animate-spin mr-2" />
                            Loading SMS logs...
                        </div>
                    )}
                </div>

                <div className="absolute inset-0 z-0 opacity-20 pointer-events-none"
                    style={{
                        backgroundImage: 'linear-gradient(to right, #4a044e 1px, transparent 1px), linear-gradient(to bottom, #4a044e 1px, transparent 1px)',
                        backgroundSize: '40px 40px'
                    }}
                />

                <div className="flex-1 w-full h-full relative z-10 flex items-center justify-center">
                    <svg className="w-full h-full" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid meet">
                        <NetworkNode x={400} y={200} size={12} isMain={true} />

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
                                <NetworkEdge x1={400} y1={200} x2={node.x} y2={node.y} delay={node.delay} />
                                <NetworkNode x={node.x} y={node.y} delay={node.delay} />

                                {i > 0 && i % 2 === 0 && (
                                    <NetworkEdge x1={node.x} y1={node.y} x2={node.x - 100} y2={node.y + 40} delay={node.delay + 0.5} />
                                )}
                            </g>
                        ))}

                        <defs>
                            <radialGradient id="glow" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="#e879f9" stopOpacity="0.15" />
                                <stop offset="100%" stopColor="var(--bg-base)" stopOpacity="0" />
                            </radialGradient>
                        </defs>
                        <circle cx="400" cy="200" r="150" fill="url(#glow)" className="animate-pulse" style={{ animationDuration: '4s' }} />
                    </svg>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[var(--bg-elevated)] to-transparent z-20 pointer-events-none" />
            </div>
        </div>
    );
}
