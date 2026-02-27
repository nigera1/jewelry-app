'use client'

import { useAnalytics } from '@/app/(protected)/analytics/hooks/useAnalytics'
import {
    BarChart3, TrendingUp, Users, Package, Zap, Clock,
    RefreshCw, ChevronRight, Award
} from 'lucide-react'

function formatDuration(seconds: number) {
    if (!seconds || seconds <= 0) return '—'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (h > 0) return `${h}h ${m}m`
    if (m > 0) return `${m}m`
    return `${Math.round(seconds)}s`
}

const STAGE_COLORS = {
    'At Casting': { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-700' },
    'Goldsmithing': { bg: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-700' },
    'Setting': { bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-700' },
    'Polishing': { bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-700' },
    'QC': { bg: 'bg-teal-500', light: 'bg-teal-50', text: 'text-teal-700' },
    'Completed': { bg: 'bg-gray-500', light: 'bg-gray-50', text: 'text-gray-700' },
}

function getStageColor(stage: string): { bg: string, light: string, text: string } {
    return (STAGE_COLORS as Record<string, { bg: string, light: string, text: string }>)[stage] || { bg: 'bg-slate-400', light: 'bg-slate-50', text: 'text-slate-700' }
}

export default function AnalyticsPage() {
    const {
        loading, error, fetchData,
        totalOrders, wipOrders, completedOrders,
        rushOrders, rushPercent, avgCompletionTime,
        ordersByStage, avgDurationByStage, staffStats,
        ordersByMetal, dailyTrend,
    } = useAnalytics()

    const maxDailyCount = Math.max(...dailyTrend.map(d => d.count), 1)
    const maxStageDuration = Math.max(...avgDurationByStage.map(d => d.avg), 1)

    return (
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 py-6 pb-20 font-sans">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-4 sm:border-b-8 border-black pb-5 mb-8">
                <div className="flex items-center gap-4">
                    <div className="bg-black text-white p-3 rounded-2xl">
                        <BarChart3 size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">
                            Analytics
                        </h1>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">
                            Production Intelligence
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => fetchData()}
                    disabled={loading}
                    className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wide hover:bg-gray-800 transition-colors disabled:opacity-40"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {error && (
                <div className="bg-red-100 border-4 border-red-500 text-red-700 p-4 rounded-2xl font-bold text-sm mb-6">
                    ⚠️ {error}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-20 text-gray-400 font-bold text-sm uppercase tracking-widest">
                    <RefreshCw size={16} className="animate-spin mr-2" /> Loading analytics…
                </div>
            ) : (
                <div className="space-y-8 animate-in fade-in duration-500">

                    {/* ── KPI Cards ── */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                        {[
                            { label: 'Total Orders', value: totalOrders, icon: <Package size={18} />, color: 'border-black' },
                            { label: 'In Progress', value: wipOrders, icon: <TrendingUp size={18} />, color: 'border-blue-500' },
                            { label: 'Completed', value: completedOrders, icon: <ChevronRight size={18} />, color: 'border-emerald-500' },
                            { label: 'Avg Completion', value: formatDuration(avgCompletionTime), icon: <Clock size={18} />, color: 'border-orange-500' },
                            { label: 'Rush Orders', value: `${rushOrders} (${rushPercent}%)`, icon: <Zap size={18} />, color: 'border-red-500' },
                        ].map(kpi => (
                            <div
                                key={kpi.label}
                                className={`bg-white border-4 ${kpi.color} p-5 rounded-[2rem] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all`}
                            >
                                <div className="flex items-center gap-2 text-gray-400 mb-2">
                                    {kpi.icon}
                                    <span className="text-[10px] font-black uppercase tracking-widest">{kpi.label}</span>
                                </div>
                                <p className="text-2xl sm:text-3xl font-black tracking-tight">{kpi.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* ── Two-column section: Stage Pipeline + Stage Durations ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* Stage Pipeline */}
                        <div className="bg-white border-4 border-black rounded-[2rem] p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
                            <h2 className="text-lg font-black uppercase tracking-tight mb-5 flex items-center gap-2">
                                <Package size={18} /> Orders by Stage
                            </h2>
                            <div className="space-y-3">
                                {ordersByStage.map(({ stage, count }) => {
                                    const color = getStageColor(stage)
                                    const pct = totalOrders ? (count / totalOrders) * 100 : 0
                                    return (
                                        <div key={stage}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-bold">{stage}</span>
                                                <span className={`text-xs font-black px-2 py-0.5 rounded-full ${color.light} ${color.text}`}>
                                                    {count}
                                                </span>
                                            </div>
                                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${color.bg} rounded-full transition-all duration-700`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                                {ordersByStage.length === 0 && (
                                    <p className="text-sm text-gray-400 italic py-4 text-center">No orders yet</p>
                                )}
                            </div>
                        </div>

                        {/* Avg Stage Durations */}
                        <div className="bg-white border-4 border-black rounded-[2rem] p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
                            <h2 className="text-lg font-black uppercase tracking-tight mb-5 flex items-center gap-2">
                                <Clock size={18} /> Avg Time per Stage
                            </h2>
                            <div className="space-y-3">
                                {avgDurationByStage.map(({ stage, avg, count }) => {
                                    const color = getStageColor(stage)
                                    const pct = (avg / maxStageDuration) * 100
                                    return (
                                        <div key={stage}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-bold">{stage}</span>
                                                <span className="text-xs font-bold text-gray-500">
                                                    {formatDuration(avg)} <span className="text-gray-300">({count} logs)</span>
                                                </span>
                                            </div>
                                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${color.bg} rounded-full transition-all duration-700`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                                {avgDurationByStage.length === 0 && (
                                    <p className="text-sm text-gray-400 italic py-4 text-center">No production logs yet</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Daily Trend ── */}
                    <div className="bg-white border-4 border-black rounded-[2rem] p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
                        <h2 className="text-lg font-black uppercase tracking-tight mb-5 flex items-center gap-2">
                            <TrendingUp size={18} /> Daily Orders (Last 30 Days)
                        </h2>
                        <div className="flex items-end gap-1 h-40">
                            {dailyTrend.map(({ date, count }) => (
                                <div key={date} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                                    <div
                                        className="w-full bg-black rounded-t-lg transition-all duration-300 hover:bg-blue-600 min-h-[2px]"
                                        style={{ height: `${Math.max((count / maxDailyCount) * 100, 2)}%` }}
                                    />
                                    {/* Tooltip */}
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                        {date.slice(5)}: {count}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between mt-2 text-[9px] font-bold text-gray-300 uppercase">
                            <span>{dailyTrend[0]?.date.slice(5)}</span>
                            <span>{dailyTrend[dailyTrend.length - 1]?.date.slice(5)}</span>
                        </div>
                    </div>

                    {/* ── Two-column: Staff + Metal ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* Staff Leaderboard */}
                        <div className="bg-white border-4 border-black rounded-[2rem] p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
                            <h2 className="text-lg font-black uppercase tracking-tight mb-5 flex items-center gap-2">
                                <Users size={18} /> Staff Leaderboard
                            </h2>
                            <div className="overflow-hidden rounded-2xl border-2 border-gray-100">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                            <th className="text-left p-3">#</th>
                                            <th className="text-left p-3">Name</th>
                                            <th className="text-right p-3">Time</th>
                                            <th className="text-right p-3">Moves</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {staffStats.slice(0, 10).map((s, i) => (
                                            <tr key={s.name} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                                                <td className="p-3 font-black">
                                                    {i < 3 ? (
                                                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-[10px] font-black ${i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : 'bg-orange-400'
                                                            }`}>
                                                            {i + 1}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-300 pl-1.5">{i + 1}</span>
                                                    )}
                                                </td>
                                                <td className="p-3 font-bold">{s.name}</td>
                                                <td className="p-3 text-right font-bold text-gray-500">{formatDuration(s.totalTime)}</td>
                                                <td className="p-3 text-right">
                                                    <span className="bg-black text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                                                        {s.moves}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {staffStats.length === 0 && (
                                            <tr><td colSpan={4} className="p-6 text-center text-gray-400 italic">No staff data</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Metal Distribution */}
                        <div className="bg-white border-4 border-black rounded-[2rem] p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
                            <h2 className="text-lg font-black uppercase tracking-tight mb-5 flex items-center gap-2">
                                <Award size={18} /> Metal Distribution
                            </h2>
                            <div className="space-y-4">
                                {ordersByMetal.map(({ metal, count }) => {
                                    const pct = totalOrders ? Math.round((count / totalOrders) * 100) : 0
                                    const colors = metal === 'Au'
                                        ? { bar: 'bg-yellow-500', ring: 'ring-yellow-200' }
                                        : metal === 'PT'
                                            ? { bar: 'bg-gray-400', ring: 'ring-gray-200' }
                                            : { bar: 'bg-slate-500', ring: 'ring-slate-200' }
                                    return (
                                        <div key={metal} className="flex items-center gap-4">
                                            <div className={`w-14 h-14 rounded-2xl ${colors.bar} ring-4 ${colors.ring} flex items-center justify-center`}>
                                                <span className="text-white font-black text-lg">{metal}</span>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm font-bold">{metal === 'Au' ? 'Gold' : metal === 'PT' ? 'Platinum' : metal}</span>
                                                    <span className="text-xs font-black text-gray-400">{count} orders · {pct}%</span>
                                                </div>
                                                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${colors.bar} rounded-full transition-all duration-700`}
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                                {ordersByMetal.length === 0 && (
                                    <p className="text-sm text-gray-400 italic py-4 text-center">No orders yet</p>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            )}
        </div>
    )
}
