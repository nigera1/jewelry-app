'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { 
  BarChart3, History, ArrowRight, ChevronDown, 
  Factory, Hammer, Gem, Sparkles, Search, 
  Filter, LayoutDashboard, Loader2, X, CheckCircle2 
} from 'lucide-react'

export default function AdminPage() {
  const [logs, setLogs] = useState([])
  const [wipJobs, setWipJobs] = useState([]) 
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  
  // UI State
  const [displayLimit, setDisplayLimit] = useState(15)
  const [searchTerm, setSearchTerm] = useState('')
  const [hoveredOrder, setHoveredOrder] = useState(null)

  useEffect(() => {
    fetchLiveProduction()
    fetchLogs()
  }, [displayLimit])

  const fetchLiveProduction = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .in('current_stage', ['At Casting', 'Goldsmithing', 'Setting', 'Polishing'])
      .order('created_at', { ascending: true })
    if (data) setWipJobs(data)
  }

  const fetchLogs = async () => {
    if (displayLimit === 15) setLoading(true)
    else setLoadingMore(true)
    
    const { data: logData } = await supabase
      .from('production_logs')
      .select('*, orders(vtiger_id)') 
      .order('created_at', { ascending: false })
      .limit(displayLimit)

    if (logData) setLogs(logData)
    setLoading(false)
    setLoadingMore(false)
  }

  const renderColumn = (title, icon, jobs, color) => (
    <div className={`${color.bg} border-4 ${color.border} rounded-[2rem] p-5 shadow-[4px_4px_0px_0px_black]`}>
      <div className={`flex items-center gap-2 ${color.text} mb-4 border-b ${color.accent} pb-2 font-black uppercase text-[10px]`}>
        {icon} {title} ({jobs.length})
      </div>
      <div className="space-y-2 overflow-y-auto max-h-[500px] pr-1 custom-scrollbar">
        {jobs.map(job => (
          <div 
            key={job.id} 
            onMouseEnter={() => setHoveredOrder(job)}
            onMouseLeave={() => setHoveredOrder(null)}
            className="bg-white p-3 rounded-xl border-2 border-black shadow-sm cursor-help hover:scale-[1.02] transition-transform active:scale-95"
          >
            <p className="font-black text-sm">{job.vtiger_id}</p>
            <p className="text-[9px] font-bold text-gray-400 uppercase truncate">{job.client_name || 'Stock'}</p>
          </div>
        ))}
        {jobs.length === 0 && <p className="text-center py-4 text-[9px] font-black text-gray-300 italic uppercase">Clear</p>}
      </div>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-10 pb-20 relative">
      
      {/* --- HOVER PREVIEW MODAL --- */}
      {hoveredOrder && (
        <>
          <div className="fixed inset-0 bg-black/10 backdrop-blur-[1px] z-40 transition-opacity" />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-80 bg-white border-[6px] border-black p-6 rounded-[2.5rem] shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] animate-in zoom-in duration-150">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-4xl font-black tracking-tighter leading-none">{hoveredOrder.vtiger_id}</h2>
                <p className="text-[10px] font-black text-blue-600 uppercase mt-2">{hoveredOrder.client_name}</p>
              </div>
              <div className="p-2 bg-yellow-100 rounded-full text-yellow-600"><Sparkles size={20}/></div>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Description</p>
                <p className="text-xs font-bold leading-tight">{hoveredOrder.description || "No specific instructions."}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className={`p-2 rounded-xl border-2 border-black flex items-center gap-2 ${hoveredOrder.center_stone_received ? 'bg-green-100 border-green-600' : 'bg-gray-50 opacity-40'}`}>
                  <CheckCircle2 size={12} className={hoveredOrder.center_stone_received ? 'text-green-600' : 'text-gray-400'} />
                  <span className="text-[8px] font-black uppercase">Center</span>
                </div>
                <div className={`p-2 rounded-xl border-2 border-black flex items-center gap-2 ${hoveredOrder.side_stones_received ? 'bg-green-100 border-green-600' : 'bg-gray-50 opacity-40'}`}>
                  <CheckCircle2 size={12} className={hoveredOrder.side_stones_received ? 'text-green-600' : 'text-gray-400'} />
                  <span className="text-[8px] font-black uppercase">Sides</span>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <p className="text-[8px] font-black text-gray-300 uppercase italic text-center">Currently at {hoveredOrder.current_stage}</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
          <div className="bg-black text-white p-2 rounded-lg"><LayoutDashboard size={24} /></div>
          Control Center
        </h1>
      </div>

      {/* --- PRODUCTION BOARD --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {renderColumn('Casting', <Factory size={16}/>, wipJobs.filter(j => j.current_stage === 'At Casting'), { bg: 'bg-blue-50', border: 'border-blue-600', text: 'text-blue-700', accent: 'border-blue-200' })}
        {renderColumn('Goldsmithing', <Hammer size={16}/>, wipJobs.filter(j => j.current_stage === 'Goldsmithing'), { bg: 'bg-orange-50', border: 'border-orange-500', text: 'text-orange-700', accent: 'border-orange-200' })}
        {renderColumn('Setting', <Gem size={16}/>, wipJobs.filter(j => j.current_stage === 'Setting'), { bg: 'bg-purple-50', border: 'border-purple-600', text: 'text-purple-700', accent: 'border-purple-200' })}
        {renderColumn('Polishing', <Sparkles size={16}/>, wipJobs.filter(j => j.current_stage === 'Polishing'), { bg: 'bg-emerald-50', border: 'border-emerald-500', text: 'text-emerald-700', accent: 'border-emerald-200' })}
      </div>

      

      {/* --- AUDIT LOG --- */}
      <div className="bg-white border-4 border-black p-8 rounded-[2.5rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b-2 border-gray-100 pb-6">
          <div className="flex items-center gap-2">
            <History size={20} className="text-gray-400"/>
            <h2 className="font-black uppercase text-lg">Workshop Audit</h2>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16}/>
            <input 
              type="text" 
              placeholder="Filter by vTiger ID..." 
              className="pl-9 pr-4 py-2 border-2 border-black rounded-xl text-xs font-bold outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-300" size={32} /></div>
          ) : logs.filter(l => l.orders?.vtiger_id?.includes(searchTerm.toUpperCase())).map((log, i) => (
            <div key={i} className="flex items-start justify-between gap-4 text-sm border-b border-gray-50 pb-4 last:border-0">
              <div className="flex-1">
                <p className="font-bold">
                  <span className="bg-black text-white px-2 py-0.5 rounded text-[10px] uppercase mr-2 font-black tracking-tighter">{log.staff_name}</span>
                  updated <span className="font-black text-blue-600">{log.orders?.vtiger_id || 'UNKNOWN'}</span>
                </p>
                <div className="flex items-center gap-2 text-xs font-mono text-gray-400 mt-1 uppercase">
                  <span>{log.previous_stage}</span>
                  <ArrowRight size={10} />
                  <span className={log.redo_reason ? 'text-red-500 font-bold' : 'text-green-600 font-bold'}>{log.new_stage}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-gray-300 uppercase">{new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                {log.redo_reason && <p className="text-[9px] text-red-500 font-black uppercase">REDO: {log.redo_reason}</p>}
              </div>
            </div>
          ))}
          
          <button 
            onClick={() => setDisplayLimit(prev => prev + 15)}
            disabled={loadingMore}
            className="w-full mt-4 py-3 border-2 border-dashed border-gray-300 rounded-2xl flex items-center justify-center gap-2 text-gray-400 font-black text-xs uppercase hover:bg-gray-50 transition-all"
          >
            {loadingMore ? <Loader2 className="animate-spin" size={14} /> : "Load 15 More Entries"}
          </button>
        </div>
      </div>
    </div>
  )
}