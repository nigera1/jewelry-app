'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import QRCode from 'react-qr-code'
import { Search, Printer, History, Clock, User, ArrowRight } from 'lucide-react'

export default function AdminMasterView() {
  const [searchId, setSearchId] = useState('')
  const [orders, setOrders] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [logs, setLogs] = useState([])
  const searchInputRef = useRef(null)

  useEffect(() => {
    fetchOrders()
    // Auto-focus search bar for physical scanners
    if (searchInputRef.current) searchInputRef.current.focus()
  }, [])

  const fetchOrders = async () => {
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
    if (data) setOrders(data)
  }

  const handleSearch = async (e) => {
    if (e) e.preventDefault()
    const id = searchId.toUpperCase().trim()
    const order = orders.find(o => o.vtiger_id === id)
    if (order) {
      viewDetails(order)
      setSearchId('')
    }
  }

  const viewDetails = async (order) => {
    setSelectedOrder(order)
    const { data } = await supabase
      .from('production_logs')
      .select('*')
      .eq('order_id', order.id)
      .order('created_at', { ascending: false })
    if (data) setLogs(data)
  }

  return (
    <div className="max-w-7xl mx-auto p-6 font-sans">
      {/* 1. MASTER SCANNER BOX */}
      <div className="mb-10">
        <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
          <input 
            ref={searchInputRef}
            type="text"
            placeholder="SCAN TICKET OR TYPE ID..."
            className="w-full p-6 pl-14 border-4 border-black rounded-2xl text-2xl font-black uppercase shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] focus:outline-none"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
          />
          <Search className="absolute left-5 top-7 text-gray-400" size={30} />
          <p className="text-[10px] font-black uppercase mt-4 text-center tracking-widest text-gray-400">
            Scanner is active. Focus this box to use physical scanner.
          </p>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 2. ORDER LIST */}
        <div className="lg:col-span-1 border-4 border-black rounded-3xl overflow-hidden h-[600px] overflow-y-auto">
          <div className="bg-black text-white p-4 font-black uppercase text-xs tracking-widest">Recent Jobs</div>
          {orders.map(o => (
            <div 
              key={o.id} 
              onClick={() => viewDetails(o)}
              className={`p-4 border-b-2 border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${selectedOrder?.id === o.id ? 'bg-blue-50' : ''}`}
            >
              <div className="font-black">{o.vtiger_id}</div>
              <div className="text-xs font-bold text-gray-400">{o.client_name}</div>
            </div>
          ))}
        </div>

        {/* 3. HISTORY & QR VIEW */}
        <div className="lg:col-span-2 space-y-6">
          {selectedOrder ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="border-4 border-black p-8 rounded-3xl bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-5xl font-black leading-none">{selectedOrder.vtiger_id}</h2>
                    <p className="text-xl font-bold text-gray-500 uppercase mt-2">{selectedOrder.client_name}</p>
                    <div className="mt-4 flex gap-2">
                        <span className="bg-yellow-300 border-2 border-black px-3 py-1 rounded-lg font-black text-xs uppercase">
                            {selectedOrder.current_stage}
                        </span>
                    </div>
                  </div>

                  {/* QR CODE FOR RE-PRINTING */}
                  <div className="text-center p-2 border-2 border-black rounded-xl bg-white print:block">
                    <QRCode value={selectedOrder.vtiger_id} size={100} viewBox={`0 0 256 256`} />
                    <button 
                      onClick={() => window.print()}
                      className="mt-2 text-[10px] font-black uppercase flex items-center justify-center gap-1 w-full bg-gray-100 py-1 rounded print:hidden"
                    >
                      <Printer size={12} /> Print
                    </button>
                  </div>
                </div>

                {/* TIMELINE / HISTORY */}
                <div className="space-y-6">
                  <h3 className="font-black uppercase text-sm flex items-center gap-2">
                    <History size={18} /> Production History
                  </h3>
                  <div className="space-y-4">
                    {logs.map((log, idx) => (
                      <div key={idx} className="flex gap-4 items-start relative pb-4 border-l-2 border-gray-100 pl-6 ml-2">
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-black border-4 border-white" />
                        <div className="flex-1">
                          <div className="text-xs font-black uppercase text-blue-600 leading-none">
                             {log.previous_stage} <ArrowRight size={10} className="inline mx-1" /> {log.new_stage}
                          </div>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-1 text-sm font-bold"><User size={14}/> {log.staff_name}</div>
                            <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono"><Clock size={12}/> {new Date(log.created_at).toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {logs.length === 0 && <p className="text-gray-400 italic text-sm">No moves recorded yet.</p>}
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="h-full border-4 border-dashed border-gray-200 rounded-3xl flex items-center justify-center flex-col text-gray-300">
              <Search size={60} className="mb-4 opacity-20" />
              <p className="font-black uppercase tracking-widest text-sm">Scan a ticket to view history</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}