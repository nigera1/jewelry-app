'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Hammer, Diamond, ShieldCheck, Clock, ArrowRight, User, Calendar } from 'lucide-react'

export default function AdminDashboard() {
  const [orders, setOrders] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState({ Goldsmithing: 0, Setting: 0, QC: 0 })

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) {
      setOrders(data)
      const counts = data.reduce((acc, order) => {
        acc[order.current_stage] = (acc[order.current_stage] || 0) + 1
        return acc
      }, {})
      setStats(counts)
    }
  }

  const viewOrderDetails = async (order) => {
    setSelectedOrder(order)
    const { data, error } = await supabase
      .from('production_logs')
      .select('*')
      .eq('order_id', order.id)
      .order('created_at', { ascending: false })
    
    if (data) setLogs(data)
  }

  return (
    <div className="max-w-7xl mx-auto p-6 min-h-screen bg-white">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase">Workshop Control</h1>
          <p className="text-gray-400 font-bold tracking-widest text-xs uppercase mt-1">Production Intelligence</p>
        </div>
        <div className="flex gap-4">
            <StatSmall label="Goldsmiths" count={stats.Goldsmithing || 0} color="text-orange-500" />
            <StatSmall label="Setters" count={stats.Setting || 0} color="text-blue-500" />
            <StatSmall label="QC" count={stats.QC || 0} color="text-purple-500" />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* LEFT: THE ORDER LIST */}
        <div className="lg:col-span-2">
          <div className="border-4 border-black rounded-3xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <table className="w-full text-left">
              <thead className="bg-black text-white text-[10px] uppercase tracking-widest">
                <tr>
                  <th className="p-4">vTiger ID</th>
                  <th className="p-4">Stage</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-gray-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="p-4">
                      <div className="font-black text-lg">{order.vtiger_id}</div>
                      <div className="text-xs text-gray-400 uppercase font-bold">{order.client_name}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border-2 ${
                        order.current_stage === 'Goldsmithing' ? 'bg-orange-50 border-orange-200 text-orange-600' :
                        order.current_stage === 'Setting' ? 'bg-blue-50 border-blue-200 text-blue-600' :
                        'bg-gray-50 border-gray-200 text-gray-600'
                      }`}>
                        {order.current_stage}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => viewOrderDetails(order)}
                        className="bg-black text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ArrowRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: THE DETAIL TIMELINE */}
        <div className="lg:col-span-1">
          {selectedOrder ? (
            <div className="border-4 border-black p-6 rounded-3xl sticky top-24 shadow-[8px_8px_0px_0px_rgba(254,240,138,1)] bg-white animate-in slide-in-from-right duration-300">
              <h2 className="text-3xl font-black mb-1">{selectedOrder.vtiger_id}</h2>
              <p className="text-gray-400 font-bold uppercase text-xs mb-6 border-b-2 pb-4">Job History & Logs</p>
              
              <div className="space-y-6">
                {logs.length > 0 ? logs.map((log) => (
                  <div key={log.id} className="relative pl-6 border-l-2 border-gray-200 pb-2">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-black" />
                    <p className="text-xs font-black text-blue-600 uppercase">Moved to {log.new_stage}</p>
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-800 mt-1">
                      <User size={14} /> {log.staff_name}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-1 font-mono">
                      <Calendar size={12} /> {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-10 text-gray-300 italic">No history recorded yet</div>
                )}
              </div>

              <div className="mt-8 pt-6 border-t-2 border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase">Specifications</p>
                <div className="flex justify-between mt-2 font-bold text-sm">
                  <span>{selectedOrder.metal_type}</span>
                  <span>Size {selectedOrder.ring_size}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center border-4 border-dashed border-gray-100 rounded-3xl text-gray-300 font-black uppercase tracking-widest text-sm">
              Select an order to view timeline
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

function StatSmall({ label, count, color }) {
    return (
        <div className="text-right">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{label}</p>
            <p className={`text-2xl font-black leading-none ${color}`}>{count}</p>
        </div>
    )
}