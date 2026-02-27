'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Clock, BarChart3 } from 'lucide-react'

export function StageTimeSummary({ orderId }) {
  const [logs, setLogs] = useState([])
  const [totalTime, setTotalTime] = useState(0)

  useEffect(() => {
    async function getStats() {
      const { data } = await supabase
        .from('production_logs')
        .select('previous_stage, duration_seconds, staff_name')
        .eq('order_id', orderId)
        .not('duration_seconds', 'is', null)

      if (data) {
        setLogs(data)
        const total = data.reduce((acc, log) => acc + (log.duration_seconds || 0), 0)
        setTotalTime(total)
      }
    }
    getStats()
  }, [orderId])

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`
  }

  return (
    <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-[4px_4px_0px_0px_black]">
      <h3 className="flex items-center gap-2 font-black uppercase text-sm mb-4 border-b-2 border-gray-100 pb-2">
        <BarChart3 size={16}/> Production Breakdown
      </h3>
      
      <div className="space-y-3">
        {logs.map((log, i) => (
          <div key={i} className="flex justify-between items-center text-xs">
            <div>
              <p className="font-black uppercase">{log.previous_stage}</p>
              <p className="text-gray-400 font-bold">{log.staff_name}</p>
            </div>
            <div className="font-mono font-black bg-gray-100 px-2 py-1 rounded">
              {formatTime(log.duration_seconds)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t-4 border-black flex justify-between items-center">
        <span className="font-black uppercase text-sm">Total Labor Time:</span>
        <span className="text-xl font-black text-blue-600">{formatTime(totalTime)}</span>
      </div>
    </div>
  )
}