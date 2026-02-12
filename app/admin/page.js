'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { 
  BarChart3, History, ArrowRight, 
  Search, Filter, ChevronDown, Loader2,
  Factory, Hammer, Gem, Sparkles, LayoutDashboard
} from 'lucide-react'

export default function AdminPage() {
  const [logs, setLogs] = useState([])
  const [wipJobs, setWipJobs] = useState([]) 
  const [loading, setLoading] = useState(true)
  const [displayLimit, setDisplayLimit] = useState(15)

  useEffect(() => {
    fetchAdminData()
    fetchLiveProduction()
  }, [displayLimit])

  const fetchLiveProduction = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .in('current_stage', ['At Casting', 'Goldsmithing', 'Setting', 'Polishing'])
      .order('created_at', { ascending: true })
    
    if (data) setWipJobs(data)
  }

  const fetchAdminData = async () => {
    setLoading(true)
    const { data: logData } = await supabase
      .from('production_logs')
      .select('*, orders(vtiger_id)') 
      .order('created_at', { ascending: false })
      .limit(displayLimit)

    if (logData) setLogs(logData)
    setLoading(false)
  }

  // Column Filters
  const castingList = wipJobs.filter(j => j.current_stage === 'At Casting')
  const goldsmithList = wipJobs.filter(j => j.current_stage === 'Goldsmithing')
  const settingList = wipJobs.filter(j => j.current_stage === 'Setting')
  const polishingList = wipJobs.filter(j => j.current_stage === 'Polishing')

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-10 pb-20">
      
      <div className="flex items-center gap-3">
        <div className="bg-black text-white p-2 rounded-lg"><LayoutDashboard size={24} /></div>
        <h1 className="text-3xl font-black uppercase tracking-tighter">Production Board</h1>
      </div>

      {/* --- 4-COLUMN WORKSHOP BOARD --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        {/* CASTING */}
        <div className="bg-blue-50 border-4 border-blue-600 rounded-4xl p-5 shadow-[4px_4px_0px_0px_rgba(37,99,235,1)]">
          <div className="flex items-center gap-2 text-blue-700 mb-4 border-b border-blue-200 pb-2 font-black uppercase text-xs">
            <Factory size={16} /> Casting ({castingList.length})
          </div>
          <div className="space-y-2">
            {castingList.map(job => (
              <div key={job.id} className="bg-white p-3 rounded-xl border-2 border-blue-200 shadow-sm">
                <p className="font-black text-blue-600 text-sm">{job.vtiger_id}</p>
                <p className="text-[9px] font-bold text-gray-400 uppercase truncate">{job.client_name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* GOLDSMITH */}
        <div className="bg-orange-50 border-4 border-orange-500 rounded-4xl p-5 shadow-[4px_4px_0px_0px_rgba(249,115,22,1)]">
          <div className="flex items-center gap-2 text-orange-700 mb-4 border-b border-orange-200 pb-2 font-black uppercase text-xs">
            <Hammer size={16} /> Goldsmith ({goldsmithList.length})
          </div>
          <div className="space-y-2">
            {goldsmithList.map(job => (
              <div key={job.id} className="bg-white p-3 rounded-xl border-2 border-orange-200 shadow-sm">
                <p className="font-black text-orange-600 text-sm">{job.vtiger_id}</p>
                <p className="text-[9px] font-bold text-gray-400 uppercase truncate">{job.client_name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* SETTING */}
        <div className="bg-purple-50 border-4 border-purple-600 rounded-4xl p-5 shadow-[4px_4px_0px_0px_rgba(147,51,234,1)]">
          <div className="flex items-center gap-2 text-purple-700 mb-4 border-b border-purple-200 pb-2 font-black uppercase text-xs">
            <Gem size={16} /> Setting ({settingList.length})
          </div>
          <div className="space-y-2">
            {settingList.map(job => (
              <div key={job.id} className="bg-white p-3 rounded-xl border-2 border-purple-200 shadow-sm">
                <p className="font-black text-purple-600 text-sm">{job.vtiger_id}</p>
                <p className="text-[9px] font-bold text-gray-400 uppercase truncate">{job.client_name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* POLISHING (NEW) */}
        <div className="bg-emerald-50 border-4 border-emerald-500 rounded-4xl p-5 shadow-[4px_4px_0px_0px_rgba(16,185,129,1)]">
          <div className="flex items-center gap-2 text-emerald-700 mb-4 border-b border-emerald-200 pb-2 font-black uppercase text-xs">
            <Sparkles size={16} /> Polishing ({polishingList.length})
          </div>
          <div className="space-y-2">
            {polishingList.map(job => (
              <div key={job.id} className="bg-white p-3 rounded-xl border-2 border-emerald-200 shadow-sm">
                <p className="font-black text-emerald-600 text-sm">{job.vtiger_id}</p>
                <p className="text-[9px] font-bold text-gray-400 uppercase truncate">{job.client_name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AUDIT LOG... (rest of your log code remains the same) */}
    </div>
  )
}