'use client'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { 
  History, ArrowRight, Clock, Factory, Hammer, Gem, Sparkles, 
  Search, PlayCircle, Archive 
} from 'lucide-react'

// ---------- TIME BREAKDOWN COMPONENT ----------
const TimeBreakdown = ({ orderId }) => {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLogs = async () => {
      const { data } = await supabase
        .from('production_logs')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true })
      if (data) setLogs(data)
      setLoading(false)
    }
    fetchLogs()
  }, [orderId])

  if (loading) return <div className="text-[10px] text-gray-400">Loading breakdown...</div>
  if (logs.length === 0) return <div className="text-[10px] text-gray-400">No logs recorded.</div>

  return (
    <div className="mt-4 border-t-2 pt-4">
      <h4 className="font-black text-[10px] mb-2 uppercase text-gray-500 tracking-widest">Time Breakdown</h4>
      <div className="space-y-1">
        {logs.map((log, i) => (
          <div key={i} className="flex justify-between text-xs py-1 border-b border-gray-50 last:border-0">
            <span className="font-bold uppercase text-gray-700">
              {log.action === 'REJECTED' ? 'REDO: ' : ''} 
              {log.previous_stage} <span className="text-gray-400 font-normal">({log.staff_name})</span>
            </span>
            <span className="font-mono font-black text-blue-600">
              {log.duration_seconds ? Math.floor(log.duration_seconds / 60) : 0}m
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------- MAIN ADMIN PAGE ----------
export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('live')
  const [logs, setLogs] = useState([]) 
  const [wipJobs, setWipJobs] = useState([])
  const [completedJobs, setCompletedJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [hoveredOrder, setHoveredOrder] = useState(null)
  const [stageDurations, setStageDurations] = useState({})

  // Fetch all data
  useEffect(() => {
    fetchData()
  }, [activeTab, searchTerm]) // Re-run when searching

  async function fetchData() {
    setLoading(true)
    
    // 1. Fetch WIP Jobs (Live Board)
    const { data: live } = await supabase
      .from('orders')
      .select('*')
      .neq('current_stage', 'Completed')
      .order('created_at', { ascending: true })
    if (live) setWipJobs(live)

    // 2. Fetch Completed Jobs (with Server-Side Search)
    let completedQuery = supabase
      .from('orders')
      .select('*')
      .eq('current_stage', 'Completed')
      .order('updated_at', { ascending: false })

    if (searchTerm) {
      // Searches entire DB, not just the list
      completedQuery = completedQuery.or(`vtiger_id.ilike.%${searchTerm}%,article_code.ilike.%${searchTerm}%`)
    } else {
      completedQuery = completedQuery.limit(20)
    }

    const { data: done } = await completedQuery
    if (done) {
      setCompletedJobs(done)
      // Fetch stage-specific times for these orders
      fetchStageTimes(done.map(j => j.id))
    }

    // 3. Fetch Audit Logs
    const { data: logData } = await supabase
      .from('production_logs')
      .select('*, orders(vtiger_id)')
      .order('created_at', { ascending: false })
      .limit(15)
    if (logData) setLogs(logData)

    setLoading(false)
  }

  // Fetch combined stage times from logs
  async function fetchStageTimes(orderIds) {
    if (orderIds.length === 0) return
    const { data: logsData } = await supabase
      .from('production_logs')
      .select('order_id, previous_stage, duration_seconds')
      .in('order_id', orderIds)
      .not('duration_seconds', 'is', null)

    const durations = {}
    orderIds.forEach(id => {
      durations[id] = { Goldsmithing: 0, Setting: 0, Polishing: 0 }
    })

    logsData?.forEach(log => {
      const stage = log.previous_stage
      if (durations[log.order_id] && durations[log.order_id][stage] !== undefined) {
        durations[log.order_id][stage] += (log.duration_seconds || 0)
      }
    })
    setStageDurations(durations)
  }

  // --- IMPROVED DURATION HELPERS ---
  const formatDurationPrecise = (seconds) => {
    if (!seconds || seconds <= 0) return '---'
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (hrs > 0) return `${hrs}h ${mins}m`
    return `${mins}m`
  }

  const calculateTotalTime = (start, end) => {
    if (!start || !end) return '---'
    const diffMs = new Date(end) - new Date(start)
    const totalSecs = Math.floor(diffMs / 1000)
    return formatDurationPrecise(totalSecs)
  }

  const renderColumn = (title, icon, jobs, color) => (
    <div className={`${color.bg} border-4 ${color.border} rounded-4xl p-5 shadow-[4px_4px_0px_0px_black]`}>
      <div className={`flex items-center gap-2 ${color.text} mb-4 border-b ${color.accent} pb-2 font-black uppercase text-[10px]`}>
        {icon} {title} ({jobs.length})
      </div>
      <div className="space-y-2 overflow-y-auto max-h-125 pr-1">
        {jobs.map(job => (
          <div
            key={job.id}
            onMouseEnter={() => setHoveredOrder(job)}
            onMouseLeave={() => setHoveredOrder(null)}
            className="bg-white p-3 rounded-xl border-2 border-black shadow-sm cursor-help hover:scale-[1.02] transition-transform"
          >
            <p className="font-black text-sm">{job.vtiger_id}</p>
            <p className="text-[9px] font-bold text-blue-600 uppercase truncate">
              {job.article_code || 'No Article'}
            </p>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 pb-20 relative">
      
      {/* HOVER PREVIEW MODAL */}
      {hoveredOrder && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center p-4">
          <div className="bg-white border-[6px] border-black p-8 rounded-[3rem] shadow-[30px_30px_0px_0px_rgba(0,0,0,1)] w-full max-w-md pointer-events-auto animate-in zoom-in duration-150">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-5xl font-black tracking-tighter leading-none">{hoveredOrder.vtiger_id}</h2>
                <p className="text-blue-600 font-black text-xs uppercase mt-1">Article: {hoveredOrder.article_code}</p>
              </div>
              <div className="bg-black text-white p-2 rounded-xl"><Clock size={20} /></div>
            </div>
            <TimeBreakdown orderId={hoveredOrder.id} />
          </div>
        </div>
      )}

      {/* NAVIGATION TABS */}
      <div className="flex items-center justify-between border-b-4 border-black pb-4">
        <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">Admin Dashboard</h1>
        <div className="flex bg-gray-100 p-1 rounded-xl border-2 border-black">
          <button onClick={() => setActiveTab('live')} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-black text-xs uppercase transition-all ${activeTab === 'live' ? 'bg-black text-white' : 'text-gray-400 hover:text-black'}`}><PlayCircle size={14} /> Live Board</button>
          <button onClick={() => setActiveTab('completed')} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-black text-xs uppercase transition-all ${activeTab === 'completed' ? 'bg-black text-white' : 'text-gray-400 hover:text-black'}`}><Archive size={14} /> Completed</button>
        </div>
      </div>

      {activeTab === 'live' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {renderColumn('Casting', <Factory size={16} />, wipJobs.filter(j => j.current_stage === 'At Casting'), { bg: 'bg-blue-50', border: 'border-blue-600', text: 'text-blue-700', accent: 'border-blue-200' })}
          {renderColumn('Goldsmithing', <Hammer size={16} />, wipJobs.filter(j => j.current_stage === 'Goldsmithing'), { bg: 'bg-orange-50', border: 'border-orange-500', text: 'text-orange-700', accent: 'border-orange-200' })}
          {renderColumn('Setting', <Gem size={16} />, wipJobs.filter(j => j.current_stage === 'Setting'), { bg: 'bg-purple-50', border: 'border-purple-600', text: 'text-purple-700', accent: 'border-purple-200' })}
          {renderColumn('Polishing', <Sparkles size={16} />, wipJobs.filter(j => j.current_stage === 'Polishing'), { bg: 'bg-emerald-50', border: 'border-emerald-500', text: 'text-emerald-700', accent: 'border-emerald-200' })}
        </div>
      ) : (
        <div className="bg-white border-4 border-black rounded-[2.5rem] overflow-hidden shadow-[10px_10px_0px_0px_black]">
          <div className="p-6 bg-gray-50 border-b-4 border-black flex justify-between items-center">
            <h2 className="font-black uppercase">Production History</h2>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Search entire database..."
                className="pl-9 pr-4 py-2 border-2 border-black rounded-lg text-xs font-bold outline-none uppercase"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black text-white text-[10px] uppercase font-black">
                <th className="p-4">vTiger ID</th>
                <th className="p-4">Article Code</th>
                <th className="p-4">Total Lead Time</th>
                <th className="p-4">Goldsmith</th>
                <th className="p-4">Setting</th>
                <th className="p-4">Polishing</th>
                <th className="p-4 text-right">Finished</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-gray-100">
              {completedJobs.map(job => {
                const durations = stageDurations[job.id] || { Goldsmithing: 0, Setting: 0, Polishing: 0 }
                return (
                  <tr key={job.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="p-4 font-black text-sm">{job.vtiger_id}</td>
                    <td className="p-4 text-xs font-black text-blue-600 uppercase">{job.article_code}</td>
                    <td className="p-4">
                      <span className="bg-black text-white px-2 py-1 rounded text-[10px] font-black">
                        {calculateTotalTime(job.created_at, job.updated_at)}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-bold text-gray-400">{formatDurationPrecise(durations.Goldsmithing)}</td>
                    <td className="p-4 text-xs font-bold text-gray-400">{formatDurationPrecise(durations.Setting)}</td>
                    <td className="p-4 text-xs font-bold text-gray-400">{formatDurationPrecise(durations.Polishing)}</td>
                    <td className="p-4 text-right text-[10px] font-black text-gray-300">{new Date(job.updated_at).toLocaleDateString()}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ACTIVITY LOG */}
      <div className="bg-white border-4 border-black p-8 rounded-[2.5rem] shadow-[8px_8px_0px_0px_black]">
        <h2 className="font-black uppercase flex items-center gap-2 mb-6 text-lg"><History size={20} /> Production Audit</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {logs.map((log, i) => (
            <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border-2 border-transparent hover:border-black transition-all">
              <div>
                <span className="bg-black text-white px-2 py-0.5 rounded text-[9px] font-black mr-2 uppercase">{log.staff_name}</span>
                <span className="font-bold text-xs">{log.orders?.vtiger_id}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase">
                {log.previous_stage} <ArrowRight size={12} /> <span className="text-blue-600">{log.new_stage}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}