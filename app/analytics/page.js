'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { BarChart3, TrendingUp, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'

// DEFINING THESE LOCALLY FIXES THE PRERENDER ERROR
const REDO_REASONS = ['Loose Stone', 'Polishing Issue', 'Sizing Error', 'Metal Flaw', 'Other']

export default function AnalyticsPage() {
  const [logs, setAllLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLogs = async () => {
      const { data } = await supabase.from('production_logs').select('*').order('created_at', { ascending: false })
      if (data) setAllLogs(data)
      setLoading(false)
    }
    fetchLogs()
  }, [])

  const redos = logs.filter(l => l.redo_reason)
  const completions = logs.filter(l => l.new_stage === 'Completed')

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen font-black uppercase tracking-widest text-gray-400 animate-pulse">
       <Loader2 className="animate-spin mr-2" /> Loading Intelligence...
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-6xl font-black italic uppercase tracking-tighter mb-10">Shop Stats</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div className="bg-green-50 border-4 border-black p-6 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <p className="font-black uppercase text-xs text-green-700 mb-2">Total Finished</p>
          <p className="text-5xl font-black">{completions.length}</p>
        </div>
        <div className="bg-orange-50 border-4 border-black p-6 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <p className="font-black uppercase text-xs text-orange-700 mb-2">Total Redos</p>
          <p className="text-5xl font-black">{redos.length}</p>
        </div>
      </div>

      <div className="border-4 border-black p-8 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white">
        <h3 className="font-black uppercase mb-6 flex items-center gap-2"><AlertTriangle /> Rejection Analysis</h3>
        <div className="space-y-6">
          {REDO_REASONS.map(reason => {
            const count = redos.filter(r => r.redo_reason === reason).length
            const pct = redos.length ? (count / redos.length) * 100 : 0
            return (
              <div key={reason}>
                <div className="flex justify-between font-black uppercase text-[10px] mb-1">
                  <span>{reason}</span> <span>{count}</span>
                </div>
                <div className="h-4 bg-gray-100 border-2 border-black rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500" style={{ width: `${pct}%` }}></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}