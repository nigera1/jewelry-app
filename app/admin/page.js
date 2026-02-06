'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { BarChart3, Clock, Hammer, Diamond, ShieldCheck } from 'lucide-react'

export default function AdminDashboard() {
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState({ Goldsmithing: 0, Setting: 0, QC: 0, Completed: 0 })

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
      // Calculate counts for each stage
      const counts = data.reduce((acc, order) => {
        acc[order.current_stage] = (acc[order.current_stage] || 0) + 1
        return acc
      }, {})
      setStats(prev => ({ ...prev, ...counts }))
    }
  }

  const getStatusColor = (stage) => {
    const colors = {
      'Goldsmithing': 'bg-orange-100 text-orange-700 border-orange-200',
      'Setting': 'bg-blue-100 text-blue-700 border-blue-200',
      'QC': 'bg-purple-100 text-purple-700 border-purple-200',
      'Completed': 'bg-green-100 text-green-700 border-green-200'
    }
    return colors[stage] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="max-w-6xl mx-auto p-8 bg-white min-h-screen">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black tracking-tight">PRODUCTION OVERVIEW</h1>
          <p className="text-gray-500 font-medium">Real-time workshop status</p>
        </div>
        <button onClick={fetchOrders} className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold">Refresh Data</button>
      </header>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <StatCard icon={<Hammer size={20}/>} label="Goldsmithing" count={stats.Goldsmithing} color="border-orange-500" />
        <StatCard icon={<Diamond size={20}/>} label="Setting" count={stats.Setting} color="border-blue-500" />
        <StatCard icon={<ShieldCheck size={20}/>} label="Quality Control" count={stats.QC} color="border-purple-500" />
        <StatCard icon={<Clock size={20}/>} label="Total Active" count={orders.filter(o => o.current_stage !== 'Completed').length} color="border-black" />
      </div>

      {/* ORDERS TABLE */}
      <div className="border-2 border-black rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b-2 border-black">
            <tr>
              <th className="p-4 font-black uppercase text-xs">Order ID</th>
              <th className="p-4 font-black uppercase text-xs">Client</th>
              <th className="p-4 font-black uppercase text-xs">Specification</th>
              <th className="p-4 font-black uppercase text-xs">Current Stage</th>
              <th className="p-4 font-black uppercase text-xs">Started</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="p-4 font-bold">{order.vtiger_id}</td>
                <td className="p-4 font-medium text-gray-600">{order.client_name}</td>
                <td className="p-4">
                  <span className="text-xs font-bold block">{order.metal_type}</span>
                  <span className="text-[10px] text-gray-400">Size: {order.ring_size}</span>
                </td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-black border ${getStatusColor(order.current_stage)}`}>
                    {order.current_stage}
                  </span>
                </td>
                <td className="p-4 text-xs text-gray-400 font-mono">
                  {new Date(order.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatCard({ icon, label, count, color }) {
  return (
    <div className={`p-6 bg-white border-l-4 ${color} shadow-sm rounded-lg border-y border-r border-gray-200`}>
      <div className="flex items-center gap-3 text-gray-400 mb-2">
        {icon}
        <span className="text-xs font-black uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-3xl font-black">{count || 0}</div>
    </div>
  )
}