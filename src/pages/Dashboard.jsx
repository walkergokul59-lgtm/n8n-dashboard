import { Zap, CalendarDays, CheckCircle2, Clock, RefreshCw, ChevronDown } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import CountUpModule from 'react-countup';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import ExecutionVolumeChart from "../components/ExecutionVolumeChart";
import RecentFailures from "../components/RecentFailures";
import SystemHealth from "../components/SystemHealth";
import RecentActivityTable from "../components/RecentActivityTable";
import ChromaGrid from "../components/ChromaGrid";
import { useDashboardData } from "../hooks/useDashboardData";
import { getWorkflowMetrics } from "../utils/mock-data";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/useAuth";
import { gsap, ScrollTrigger } from "../lib/gsap.js";

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const CountUp = CountUpModule?.default ?? CountUpModule;

const formatDateInput = (date) => {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
};

const defaultRange = () => {
    const now = new Date();
    return {
        from: formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
        to: formatDateInput(now),
    };
};
const RANGE_REQUEST_TIMEOUT_MS = 30000;
const WORKFLOWS_MOCK_FETCHER = () => ({ data: [] });

const buildWorkflowParam = (selectedWorkflowIds) => {
    const normalized = [...new Set((selectedWorkflowIds || []).map((id) => String(id).trim()).filter(Boolean))];
    return normalized.join(",");
};

const isAbortLikeError = (error) => {
    if (!error) return false;
    if (error.name === "AbortError") return true;
    const message = String(error.message || "").toLowerCase();
    return message.includes("aborted") || message.includes("signal");
};

const MetricCard = ({ title, value, isCurrency = false, suffix = "", icon, iconColor, borderColor }) => {
    const MetricIcon = icon;
    const numericValue = typeof value === "number" ? value : Number(value);
    const canAnimate = Number.isFinite(numericValue);

    return (
        <div className={cn(
            "bg-[var(--c-raised)] rounded-xl p-6 flex flex-col justify-between border-l-2 shadow-lg transition-transform duration-300 hover:scale-[1.02] hover:shadow-2xl relative overflow-hidden group",
            borderColor
        )}>
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10"></div>
            <div className="flex items-center justify-between mb-4 z-20">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">{title}</h3>
                <div className={cn("p-2 rounded-full bg-opacity-20", iconColor.replace('text-', 'bg-'))}>
                    <MetricIcon size={18} className={iconColor} />
                </div>
            </div>
            <div className="flex flex-col z-20">
                <div className="text-3xl font-bold text-[var(--c-text)] mb-2">
                    {isCurrency && <span className="text-xl mr-1">$</span>}
                    {canAnimate ? (
                        <CountUp
                            end={numericValue}
                            duration={1.5}
                            separator=","
                            decimals={isCurrency ? 2 : 0}
                            preserveValue
                        />
                    ) : (
                        <span>{String(value ?? "-")}</span>
                    )}
                    {suffix && <span className="text-xl ml-1">{suffix}</span>}
                </div>
            </div>
        </div>
    );
};

export default function Dashboard() {
    const showSystemHealthCard = false;
    const { dataSource } = useSettings();
    const { apiFetch } = useAuth();
    const [selectedWorkflowIds, setSelectedWorkflowIds] = useState([]);
    const [isWorkflowPickerOpen, setIsWorkflowPickerOpen] = useState(false);
    const [workflowSearch, setWorkflowSearch] = useState("");
    const [workflowMenuStyle, setWorkflowMenuStyle] = useState({ top: 0, left: 0, width: 320 });
    const [executionRange, setExecutionRange] = useState(defaultRange);
    const [rangeCount, setRangeCount] = useState(0);
    const [isRangeLoading, setIsRangeLoading] = useState(false);
    const [rangeError, setRangeError] = useState("");
    const [refreshNonce, setRefreshNonce] = useState(0);
    const rootRef = useRef(null);
    const workflowPickerRef = useRef(null);
    const workflowMenuRef = useRef(null);

    const selectedWorkflowParam = useMemo(() => buildWorkflowParam(selectedWorkflowIds), [selectedWorkflowIds]);
    const workflowQuery = selectedWorkflowParam ? `workflowIds=${encodeURIComponent(selectedWorkflowParam)}` : "";
    const overviewEndpoint = workflowQuery ? `/dashboard/overview?${workflowQuery}` : '/dashboard/overview';
    const workflowsEndpoint = '/dashboard/workflows';

    const http = useDashboardData(getWorkflowMetrics, overviewEndpoint);
    const workflowsPayload = useDashboardData(WORKFLOWS_MOCK_FETCHER, workflowsEndpoint);
    const workflows = useMemo(() => {
        return Array.isArray(workflowsPayload?.data?.data) ? workflowsPayload.data.data : [];
    }, [workflowsPayload?.data?.data]);
    const selectedWorkflowSet = useMemo(() => new Set((selectedWorkflowIds || []).map((id) => String(id))), [selectedWorkflowIds]);
    const filteredWorkflows = useMemo(() => {
        const search = String(workflowSearch || "").trim().toLowerCase();
        if (!search) return workflows;
        return workflows.filter((workflow) => {
            const name = String(workflow?.name || "").toLowerCase();
            const id = String(workflow?.id || "").toLowerCase();
            return name.includes(search) || id.includes(search);
        });
    }, [workflows, workflowSearch]);

    const data = http.data;
    const isLoading = http.isLoading;
    const isRefetching = http.isRefetching;
    const loadError = http.error;
    const refetch = http.refetch;
    const refetchWorkflows = workflowsPayload.refetch;

    const handleManualRefresh = async () => {
        setRefreshNonce((previous) => previous + 1);
        await Promise.all([refetch(), refetchWorkflows()]);
    };

    const toggleWorkflowSelection = (workflowId) => {
        const normalizedId = String(workflowId);
        setSelectedWorkflowIds((previous) => {
            const nextSet = new Set((previous || []).map((id) => String(id)));
            if (nextSet.has(normalizedId)) nextSet.delete(normalizedId);
            else nextSet.add(normalizedId);
            return [...nextSet];
        });
    };

    const selectAllVisibleWorkflows = () => {
        const visibleIds = filteredWorkflows.map((workflow) => String(workflow.id));
        setSelectedWorkflowIds((previous) => {
            const nextSet = new Set((previous || []).map((id) => String(id)));
            for (const workflowId of visibleIds) nextSet.add(workflowId);
            return [...nextSet];
        });
    };

    const clearWorkflowSelection = () => {
        setSelectedWorkflowIds([]);
    };

    useEffect(() => {
        if (!isWorkflowPickerOpen) return;

        const updateMenuPosition = () => {
            const pickerEl = workflowPickerRef.current;
            if (!pickerEl) return;

            const rect = pickerEl.getBoundingClientRect();
            const viewportPadding = 8;
            const width = Math.max(320, Math.round(rect.width));
            const maxLeft = Math.max(viewportPadding, window.innerWidth - width - viewportPadding);
            const left = Math.min(Math.max(viewportPadding, rect.left), maxLeft);
            const top = Math.min(rect.bottom + 8, window.innerHeight - viewportPadding);

            setWorkflowMenuStyle({ top, left, width });
        };

        const onPointerDown = (event) => {
            const target = event.target;
            if (!(target instanceof Node)) return;
            if (workflowPickerRef.current?.contains(target)) return;
            if (workflowMenuRef.current?.contains(target)) return;
            setIsWorkflowPickerOpen(false);
        };

        const onKeyDown = (event) => {
            if (event.key === "Escape") setIsWorkflowPickerOpen(false);
        };

        updateMenuPosition();
        window.addEventListener("resize", updateMenuPosition);
        window.addEventListener("scroll", updateMenuPosition, true);
        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);

        return () => {
            window.removeEventListener("resize", updateMenuPosition);
            window.removeEventListener("scroll", updateMenuPosition, true);
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [isWorkflowPickerOpen]);

    useEffect(() => {
        const from = executionRange.from;
        const to = executionRange.to;

        if (!from || !to) return;
        if (from > to) {
            setRangeError("Start date must be on or before end date.");
            setRangeCount(0);
            setIsRangeLoading(false);
            return;
        }

        if (dataSource === "n8n-server") return;

        const fromMs = new Date(`${from}T00:00:00`).getTime();
        const toMs = new Date(`${to}T23:59:59.999`).getTime();
        const count = Array.isArray(data?.volumeData)
            ? data.volumeData.reduce((sum, point) => {
                const ts = new Date(point?.timestamp).getTime();
                const inRange = Number.isFinite(ts) && ts >= fromMs && ts <= toMs;
                return inRange ? sum + Number(point?.executions || 0) : sum;
            }, 0)
            : 0;

        setRangeError("");
        setRangeCount(Math.max(0, Math.round(count)));
        setIsRangeLoading(false);
    }, [executionRange.from, executionRange.to, dataSource, data?.volumeData, refreshNonce]);

    useEffect(() => {
        const from = executionRange.from;
        const to = executionRange.to;

        if (dataSource !== "n8n-server") return;
        if (!from || !to || from > to) return;

        let cancelled = false;
        const controller = new AbortController();

        const fetchExecutionCount = async () => {
            setIsRangeLoading(true);
            setRangeError("");
            try {
                const timeoutId = setTimeout(() => controller.abort(), RANGE_REQUEST_TIMEOUT_MS);
                const params = new URLSearchParams({ from, to });
                if (selectedWorkflowParam) {
                    params.set("workflowIds", selectedWorkflowParam);
                }
                const response = await apiFetch(`/api/dashboard/executions-count?${params.toString()}`, {
                    headers: { Accept: "application/json" },
                    signal: controller.signal,
                }).finally(() => {
                    clearTimeout(timeoutId);
                });

                if (!response.ok) {
                    const payload = await response.json().catch(() => ({}));
                    throw new Error(payload?.error || `Failed to fetch execution count (${response.status})`);
                }

                const payload = await response.json();
                if (!cancelled) setRangeCount(Math.max(0, Number(payload?.count) || 0));
            } catch (error) {
                if (cancelled || isAbortLikeError(error)) return;
                if (!cancelled) {
                    setRangeError("Could not fetch execution count. Please try refreshing.");
                }
            } finally {
                if (!cancelled) setIsRangeLoading(false);
            }
        };

        void fetchExecutionCount();

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [executionRange.from, executionRange.to, selectedWorkflowParam, apiFetch, dataSource, refreshNonce]);

    const rangeSummary = useMemo(() => {
        if (isRangeLoading) return "Loading execution count...";
        if (rangeError) return rangeError;
        return `Showing executions from ${executionRange.from} to ${executionRange.to}.`;
    }, [executionRange.from, executionRange.to, isRangeLoading, rangeError]);

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
            icon: Zap,
            iconColor: "text-[#00d9ff]",
            borderColor: "border-l-[#00d9ff]",
        },
        {
            title: "MONTHLY EXECUTIONS",
            value: isRangeLoading ? "-" : rangeCount,
            icon: CalendarDays,
            iconColor: "text-emerald-400",
            borderColor: "border-l-emerald-400",
        },
        {
            title: "SUCCESS RATE",
            value: isLoading ? "-" : Math.max(0, Math.min(100, Math.round(100 - Number(data?.errorRate || 0)))),
            suffix: "%",
            icon: CheckCircle2,
            iconColor: "text-emerald-400",
            borderColor: "border-l-emerald-400",
        },
        {
            title: "AVG DURATION",
            value: isLoading ? "-" : data?.averageDuration || 0,
            suffix: "ms",
            icon: Clock,
            iconColor: "text-amber-400",
            borderColor: "border-l-amber-400",
        }
    ];

    return (
        <div ref={rootRef} className="space-y-6 relative">
            {/* Background Sync Indicator */}
            {isRefetching && (
                <div data-gsap="parallax" className="absolute top-0 right-0 -mt-10 flex items-center text-xs font-semibold text-primary/70 bg-primary/10 px-3 py-1.5 rounded-full z-20">
                    <RefreshCw size={12} className="mr-2 animate-spin" />
                    REFRESHING
                </div>
            )}

            <div data-gsap="reveal" className="relative z-[70] rounded-xl border border-[var(--c-border-light)] bg-[var(--c-surface)]/80 p-4">
                <div className="flex flex-wrap items-end gap-4">
                    <div ref={workflowPickerRef} className="relative">
                        <label className="flex flex-col gap-1">
                            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Workflows</span>
                            <button
                                type="button"
                                onClick={() => setIsWorkflowPickerOpen((current) => !current)}
                                className="inline-flex min-w-[220px] items-center justify-between rounded-md border border-[var(--c-border-light)] bg-[var(--c-bg)] px-3 py-2 text-sm text-[var(--c-text)] outline-none hover:border-[#00d9ff]/80"
                            >
                                <span className="truncate">
                                    {selectedWorkflowIds.length > 0
                                        ? `${selectedWorkflowIds.length} selected`
                                        : "All accessible workflows"}
                                </span>
                                <ChevronDown size={14} className={`ml-2 shrink-0 transition-transform ${isWorkflowPickerOpen ? "rotate-180" : ""}`} />
                            </button>
                        </label>

                        {isWorkflowPickerOpen ? (
                            <div
                                ref={workflowMenuRef}
                                className="fixed z-[1000] rounded-lg border border-[var(--c-border-light)] bg-[var(--c-bg)] shadow-xl"
                                style={{ top: `${workflowMenuStyle.top}px`, left: `${workflowMenuStyle.left}px`, width: `${workflowMenuStyle.width}px` }}
                            >
                                <div className="border-b border-[var(--c-border-light)] p-2">
                                    <input
                                        type="text"
                                        value={workflowSearch}
                                        onChange={(event) => setWorkflowSearch(event.target.value)}
                                        placeholder="Search by workflow name or id"
                                        className="w-full rounded-md border border-[var(--c-border-light)] bg-[var(--c-surface)] px-2 py-1.5 text-sm text-[var(--c-text)] outline-none focus:border-[#00d9ff]/80"
                                    />
                                </div>

                                <div className="flex items-center justify-between border-b border-[var(--c-border-light)] px-2 py-1.5">
                                    <button
                                        type="button"
                                        onClick={selectAllVisibleWorkflows}
                                        className="text-xs text-[#00d9ff] hover:text-[#6deaff]"
                                    >
                                        Select visible
                                    </button>
                                    <button
                                        type="button"
                                        onClick={clearWorkflowSelection}
                                        className="text-xs text-rose-300 hover:text-rose-200"
                                    >
                                        Clear
                                    </button>
                                </div>

                                <div className="max-h-64 overflow-auto p-2 space-y-1">
                                    {workflowsPayload.isLoading ? (
                                        <p className="px-1 py-2 text-xs text-gray-500">Loading workflows...</p>
                                    ) : filteredWorkflows.length === 0 ? (
                                        <p className="px-1 py-2 text-xs text-gray-500">No workflows found.</p>
                                    ) : (
                                        filteredWorkflows.map((workflow) => {
                                            const workflowId = String(workflow.id);
                                            const checked = selectedWorkflowSet.has(workflowId);
                                            return (
                                                <label key={workflowId} className="flex items-center gap-2 rounded px-1 py-1 text-sm text-[var(--c-text-dim)] hover:bg-white/5">
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => toggleWorkflowSelection(workflowId)}
                                                    />
                                                    <span className="truncate">{workflow.name || workflowId}</span>
                                                </label>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <label className="flex flex-col gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">From</span>
                        <input
                            type="date"
                            value={executionRange.from}
                            max={executionRange.to}
                            onChange={(event) => setExecutionRange((prev) => ({ ...prev, from: event.target.value }))}
                            className="rounded-md border border-[var(--c-border-light)] bg-[var(--c-bg)] px-3 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[#00d9ff]/80"
                        />
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">To</span>
                        <input
                            type="date"
                            value={executionRange.to}
                            min={executionRange.from}
                            onChange={(event) => setExecutionRange((prev) => ({ ...prev, to: event.target.value }))}
                            className="rounded-md border border-[var(--c-border-light)] bg-[var(--c-bg)] px-3 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[#00d9ff]/80"
                        />
                    </label>

                    <button
                        type="button"
                        onClick={handleManualRefresh}
                        disabled={isRefetching || isRangeLoading}
                        className="inline-flex items-center rounded-md border border-[#00d9ff]/30 bg-[#00d9ff]/10 px-4 py-2 text-sm font-semibold text-[#7cf3ff] transition hover:bg-[#00d9ff]/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={`mr-2 ${(isRefetching || isRangeLoading) ? "animate-spin" : ""}`} />
                        Refresh Data
                    </button>

                    <p className={`text-sm ${rangeError ? "text-rose-400" : "text-gray-400"}`}>
                        {rangeSummary} {selectedWorkflowIds.length > 0 ? `| Filtered to ${selectedWorkflowIds.length} workflow(s)` : "| Using all workflows"}
                    </p>
                </div>
            </div>

            {loadError ? (
                <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                    {loadError.message || "Failed to load dashboard data. Click Refresh Data to retry."}
                </div>
            ) : null}

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
                    {showSystemHealthCard && <SystemHealth />}
                </div>
            </div>

            {/* Bottom Table Section */}
            <div data-gsap="reveal">
                <RecentActivityTable selectedWorkflowIds={selectedWorkflowIds} refreshNonce={refreshNonce} />
            </div>
        </div>
    );
}
