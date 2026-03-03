import { Zap, DollarSign, AlertCircle, Clock, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef } from 'react';
import CountUpModule from 'react-countup';
import Tooltip from '../components/Tooltip';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import ExecutionVolumeChart from "../components/ExecutionVolumeChart";
import RecentFailures from "../components/RecentFailures";
import SystemHealth from "../components/SystemHealth";
import RecentActivityTable from "../components/RecentActivityTable";
import ChromaGrid from "../components/ChromaGrid";
import { useDashboardData } from "../hooks/useDashboardData";
import { useDashboardOverviewSse } from "../hooks/useDashboardOverviewSse";
import { getWorkflowMetrics } from "../utils/mock-data";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/useAuth";
import { gsap, ScrollTrigger } from "../lib/gsap.js";

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const CountUp = CountUpModule?.default ?? CountUpModule;

const MetricCard = ({ title, value, isCurrency = false, suffix = "", changeText, changeType, subText, icon: Icon, iconColor, borderColor }) => {
    const ChangeIcon = changeType === "positive" ? ArrowUpRight : ArrowDownRight;
    const changeColor = changeType === "positive" ? "text-emerald-400" : "text-rose-400";

    return (
        <div className={cn(
            "bg-[#1a1f2e] rounded-xl p-6 flex flex-col justify-between border-l-2 shadow-lg transition-transform duration-300 hover:scale-[1.02] hover:shadow-2xl relative overflow-hidden group",
            borderColor
        )}>
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10"></div>
            <div className="flex items-center justify-between mb-4 z-20">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">{title}</h3>
                <div className={cn("p-2 rounded-full bg-opacity-20", iconColor.replace('text-', 'bg-'))}>
                    <Icon size={18} className={iconColor} />
                </div>
            </div>
            <div className="flex flex-col z-20">
                <div className="text-3xl font-bold text-white mb-2">
                    {isCurrency && <span className="text-xl mr-1">$</span>}
                    <CountUp
                        end={value}
                        duration={1.5}
                        separator=","
                        decimals={isCurrency ? 2 : 0}
                        preserveValue
                    />
                    {suffix && <span className="text-xl ml-1">{suffix}</span>}
                </div>
                {changeText && (
                    <div className="flex items-center text-sm">
                        <ChangeIcon size={16} className={cn("mr-1", changeColor)} />
                        <span className={cn("font-semibold", changeColor)}>{changeText}</span>
                        {subText && <span className="text-gray-500 ml-2">{subText}</span>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default function Dashboard() {
    const { dataSource } = useSettings();
    const { token } = useAuth();

    const sse = useDashboardOverviewSse(dataSource === 'n8n-server', token);
    const http = useDashboardData(getWorkflowMetrics, '/dashboard/overview');

    const data = dataSource === 'n8n-server' ? (sse.data || http.data) : http.data;
    const isLoading = dataSource === 'n8n-server' ? (!sse.data && http.isLoading) : http.isLoading;
    const isRefetching = dataSource === 'n8n-server' ? sse.isConnected : http.isRefetching;
    const refetch = http.refetch;
    const rootRef = useRef(null);

    // Setup 8 second polling interval
    useEffect(() => {
        const intervalId = setInterval(() => {
            // Only refetch if we aren't currently loading or already in an error state we want the user to see 
            // and we aren't in static mockup mode which doesn't need polling
            if (!isLoading && dataSource !== 'mockup' && !(dataSource === 'n8n-server' && sse.isConnected)) {
                refetch();
            }
        }, 8000);

        return () => clearInterval(intervalId);
    }, [isLoading, dataSource, refetch, sse.isConnected]);

    useLayoutEffect(() => {
        if (!rootRef.current) return;
        const ctx = gsap.context(() => {
            ScrollTrigger.batch("[data-gsap='reveal']", {
                start: "top 85%",
                onEnter: (elements) =>
                    gsap.fromTo(
                        elements,
                        { y: 18, opacity: 0 },
                        { y: 0, opacity: 1, duration: 0.6, ease: "power2.out", stagger: 0.06, overwrite: true }
                    ),
                onLeaveBack: (elements) => gsap.set(elements, { opacity: 0, y: 18 })
            });

            gsap.utils.toArray("[data-gsap='parallax']").forEach((el) => {
                gsap.to(el, {
                    yPercent: -12,
                    ease: "none",
                    scrollTrigger: {
                        trigger: el,
                        start: "top bottom",
                        end: "bottom top",
                        scrub: 0.6
                    }
                });
            });
        }, rootRef);
        return () => ctx.revert();
    }, []);

    const metrics = [
        {
            title: "TOTAL EXECUTIONS",
            value: isLoading ? "-" : data?.totalExecutions || 0,
            changeText: isLoading ? null : `${data?.executionsChange > 0 ? '+' : ''}${data?.executionsChange || 0}%`,
            changeType: data?.executionsChange >= 0 ? "positive" : "negative",
            icon: Zap,
            iconColor: "text-[#00d9ff]",
            borderColor: "border-l-[#00d9ff]",
            subText: ""
        },
        {
            title: "TOTAL COST (24H)",
            value: isLoading ? "-" : data?.totalCost || 0,
            isCurrency: true,
            changeText: isLoading ? null : `${data?.costChange > 0 ? '+' : ''}${data?.costChange || 0}%`,
            changeType: data?.costChange >= 0 ? "positive" : "negative",
            icon: DollarSign,
            iconColor: "text-emerald-400",
            borderColor: "border-l-emerald-400",
            subText: ""
        },
        {
            title: "ERROR RATE",
            value: isLoading ? "-" : data?.errorRate || 0,
            suffix: "%",
            changeText: isLoading ? null : `${data?.errorRateChange > 0 ? '+' : ''}${data?.errorRateChange || 0}%`,
            changeType: data?.errorRateChange <= 0 ? "positive" : "negative", // Lower error rate is positive
            icon: AlertCircle,
            iconColor: "text-rose-400",
            borderColor: "border-l-rose-400",
            subText: "vs last 24h"
        },
        {
            title: "AVG DURATION",
            value: isLoading ? "-" : data?.averageDuration || 0,
            suffix: "ms",
            changeText: isLoading ? null : `${data?.durationChange > 0 ? '+' : ''}${data?.durationChange || 0}ms`,
            changeType: data?.durationChange <= 0 ? "positive" : "negative", // Lower duration is positive
            icon: Clock,
            iconColor: "text-amber-400",
            borderColor: "border-l-amber-400",
            subText: ""
        }
    ];

    return (
        <div ref={rootRef} className="space-y-6 relative">
            {/* Background Sync Indicator */}
            {isRefetching && (
                <div data-gsap="parallax" className="absolute top-0 right-0 -mt-10 flex items-center text-xs font-semibold text-primary/70 bg-primary/10 px-3 py-1.5 rounded-full z-20">
                    <RefreshCw size={12} className="mr-2 animate-spin" />
                    LIVE SYNC
                </div>
            )}

            <ChromaGrid
                items={metrics}
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6"
                renderItem={(metric, index, handleCardMove) => (
                    <div
                        key={index}
                        onMouseMove={handleCardMove}
                        className="group relative h-full w-full"
                        style={{ '--spotlight-color': 'rgba(255,255,255,0.08)' }}
                    >
                        <div data-gsap="reveal">
                            <MetricCard {...metric} />
                        </div>
                        <div
                            className="absolute inset-0 pointer-events-none transition-opacity duration-500 z-20 opacity-0 group-hover:opacity-100 rounded-xl"
                            style={{
                                background: 'radial-gradient(circle 250px at var(--mouse-x, 0) var(--mouse-y, 0), var(--spotlight-color), transparent 80%)'
                            }}
                        />
                    </div>
                )}
            />

            {/* Charts Section */}
            <div data-gsap="reveal" className="flex flex-col lg:flex-row gap-6">
                <ExecutionVolumeChart data={data?.volumeData} isLoading={isLoading} />

                {/* Right Side Sections */}
                <div className="w-full lg:w-[40%] flex flex-col sm:flex-row lg:flex-col gap-6">
                    <RecentFailures count={data?.failures24h || 0} />
                    <SystemHealth />
                </div>
            </div>

            {/* Bottom Table Section */}
            <div data-gsap="reveal">
                <RecentActivityTable />
            </div>
        </div>
    );
}
