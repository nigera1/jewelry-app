'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { QRCodeCanvas } from 'qrcode.react'
import { 
  PlusCircle, Printer, CheckCircle2, PackagePlus, Gem, Layers,
  Type, Sparkles, Circle, Ruler
} from 'lucide-react'

const SITE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://atelier-os.vercel.app'

const SETTING_CENTRAL_OPTIONS = ['round', 'tiger', 'bezel', 'square', 'v-shape', 'other']
const SETTING_SMALL_OPTIONS   = ['prong', 'pave', 'castle', 'flush', 'perle', 'bezel']
const FINISH_OPTIONS          = ['polished', 'rhodium', 'mat']

export default function OrderEntry() {
  const [loading, setLoading] = useState(false)
  const [savedOrder, setSavedOrder] = useState(null)
  const [formData, setFormData] = useState({
    vtiger_id: '',
    article_code: '',
    description: '',
    current_stage: 'At Casting',
    is_rush: false,
    center_stone_received: false,
    side_stones_received: false,
    metal: 'Au',
    engraving_company: false,
    engraving_personal: false,
    engraving_font: '',
    setting_central: [],
    setting_small: [],
    finish: [],
    ring_size: '',
  })

  const toggleArrayOption = (field, option) => {
    setFormData(prev => {
      const current = prev[field] || []
      if (current.includes(option)) {
        return { ...prev, [field]: current.filter(item => item !== option) }
      } else {
        return { ...prev, [field]: [...current, option] }
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    const { data, error } = await supabase.from('orders').insert([formData]).select().single()

    if (error) {
      alert("Error: " + error.message)
    } else {
      setSavedOrder(data)
      setFormData({ 
        vtiger_id: '', article_code: '', description: '', current_stage: 'At Casting',
        is_rush: false, center_stone_received: false, side_stones_received: false,
        metal: 'Au', engraving_company: false, engraving_personal: false, engraving_font: '',
        setting_central: [], setting_small: [], finish: [], ring_size: '',
      })
    }
    setLoading(false)
  }

  return (
    <div className="max-w-5xl mx-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
      
      {/* FORM - COMPACT */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="bg-black text-white p-1.5 rounded-lg"><PackagePlus size={20} /></div>
          <h1 className="text-2xl font-black uppercase tracking-tighter">New Job</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row: Job ID + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[8px] font-black uppercase text-gray-600 mb-0.5 block">Job ID</label>
              <input required type="text" placeholder="SO-1234" 
                className="w-full p-2.5 border-2 border-black rounded-lg font-bold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] outline-none focus:bg-yellow-50" 
                value={formData.vtiger_id} onChange={e => setFormData({...formData, vtiger_id: e.target.value.toUpperCase()})} />
            </div>
            <div>
              <label className="text-[8px] font-black uppercase text-gray-600 mb-0.5 block">Priority</label>
              <button type="button" onClick={() => setFormData({...formData, is_rush: !formData.is_rush})} 
                className={`w-full p-2.5 border-2 border-black rounded-lg font-bold text-xs transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none ${formData.is_rush ? 'bg-red-500 text-white' : 'bg-white text-black'}`}>
                {formData.is_rush ? '🔥 RUSH' : 'STANDARD'}
              </button>
            </div>
          </div>

          {/* Row: Article Code + Metal */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[8px] font-black uppercase text-gray-600 mb-0.5 block">Article Code</label>
              <input required type="text" placeholder="RNG-782-YG" 
                className="w-full p-2.5 border-2 border-black rounded-lg font-bold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] outline-none" 
                value={formData.article_code} onChange={e => setFormData({...formData, article_code: e.target.value.toUpperCase()})} />
            </div>
            <div>
              <label className="text-[8px] font-black uppercase text-gray-600 mb-0.5 block">Metal</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setFormData({...formData, metal: 'Au'})}
                  className={`p-2 border-2 border-black rounded-lg font-bold text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none ${formData.metal === 'Au' ? 'bg-yellow-500 text-white' : 'bg-white'}`}>
                  Au
                </button>
                <button type="button" onClick={() => setFormData({...formData, metal: 'PT'})}
                  className={`p-2 border-2 border-black rounded-lg font-bold text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none ${formData.metal === 'PT' ? 'bg-gray-400 text-white' : 'bg-white'}`}>
                  PT
                </button>
              </div>
            </div>
          </div>

          {/* Row: Stone Received */}
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setFormData({...formData, center_stone_received: !formData.center_stone_received})}
              className={`p-2.5 border-2 border-black rounded-lg flex items-center justify-center gap-1.5 font-bold text-[10px] uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none ${formData.center_stone_received ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <Gem size={14} /> {formData.center_stone_received ? 'Center: OK' : 'Center: Missing'}
            </button>
            <button type="button" onClick={() => setFormData({...formData, side_stones_received: !formData.side_stones_received})}
              className={`p-2.5 border-2 border-black rounded-lg flex items-center justify-center gap-1.5 font-bold text-[10px] uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none ${formData.side_stones_received ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <Layers size={14} /> {formData.side_stones_received ? 'Sides: OK' : 'Sides: Missing'}
            </button>
          </div>

          {/* Engraving - compact row */}
          <div className="border-2 border-black rounded-xl p-3 bg-gray-50 space-y-2">
            <div className="flex items-center gap-1 text-[10px] font-black uppercase"><Type size={14} /> Engraving</div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1 text-xs">
                <input type="checkbox" className="w-4 h-4 accent-black" checked={formData.engraving_company}
                  onChange={(e) => setFormData({...formData, engraving_company: e.target.checked})} />
                Company
              </label>
              <div className="flex items-center gap-1">
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" className="w-4 h-4 accent-black" checked={formData.engraving_personal}
                    onChange={(e) => setFormData({...formData, engraving_personal: e.target.checked})} />
                  Personal
                </label>
                {formData.engraving_personal && (
                  <input type="text" placeholder="Font" className="border-2 border-black p-1 rounded-lg text-xs w-24"
                    value={formData.engraving_font} onChange={(e) => setFormData({...formData, engraving_font: e.target.value})} />
                )}
              </div>
            </div>
          </div>

          {/* Setting Central - compact grid */}
          <div className="border-2 border-black rounded-xl p-3 bg-gray-50">
            <div className="flex items-center gap-1 text-[10px] font-black uppercase mb-1"><Sparkles size={14} /> Setting Central</div>
            <div className="grid grid-cols-3 gap-x-3 gap-y-1">
              {SETTING_CENTRAL_OPTIONS.map(opt => (
                <label key={opt} className="flex items-center gap-1 text-xs capitalize">
                  <input type="checkbox" className="w-4 h-4 accent-black"
                    checked={formData.setting_central.includes(opt)}
                    onChange={() => toggleArrayOption('setting_central', opt)} />
                  {opt}
                </label>
              ))}
            </div>
          </div>

          {/* Setting Small - compact grid */}
          <div className="border-2 border-black rounded-xl p-3 bg-gray-50">
            <div className="flex items-center gap-1 text-[10px] font-black uppercase mb-1"><Layers size={14} /> Setting Small</div>
            <div className="grid grid-cols-3 gap-x-3 gap-y-1">
              {SETTING_SMALL_OPTIONS.map(opt => (
                <label key={opt} className="flex items-center gap-1 text-xs capitalize">
                  <input type="checkbox" className="w-4 h-4 accent-black"
                    checked={formData.setting_small.includes(opt)}
                    onChange={() => toggleArrayOption('setting_small', opt)} />
                  {opt}
                </label>
              ))}
            </div>
          </div>

          {/* Finish + Ring Size row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="border-2 border-black rounded-xl p-3 bg-gray-50">
              <div className="flex items-center gap-1 text-[10px] font-black uppercase mb-1"><Circle size={14} /> Finish</div>
              <div className="flex flex-wrap gap-2">
                {FINISH_OPTIONS.map(opt => (
                  <label key={opt} className="flex items-center gap-1 text-xs capitalize">
                    <input type="checkbox" className="w-4 h-4 accent-black"
                      checked={formData.finish.includes(opt)}
                      onChange={() => toggleArrayOption('finish', opt)} />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[8px] font-black uppercase text-gray-600 mb-0.5 flex items-center gap-1"><Ruler size={12} /> Ring Size</label>
              <input type="text" placeholder="6.5 / L / 52" 
                className="w-full p-2.5 border-2 border-black rounded-lg font-bold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] outline-none"
                value={formData.ring_size} onChange={e => setFormData({...formData, ring_size: e.target.value})} />
            </div>
          </div>

          {/* Details */}
          <div>
            <label className="text-[8px] font-black uppercase text-gray-600 mb-0.5 block">Details</label>
            <textarea rows="1" className="w-full p-2.5 border-2 border-black rounded-lg font-bold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] outline-none resize-none" 
              value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>

          {/* Submit */}
          <button disabled={loading} type="submit" 
            className="w-full bg-blue-600 text-white p-3.5 border-2 border-black rounded-xl font-black text-base shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 transition-all">
            {loading ? 'SAVING...' : 'CREATE JOB'}
          </button>
        </form>
      </div>

      {/* LABEL PREVIEW - unchanged but optional to shrink */}
      <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-4xl p-6 bg-white">
        {savedOrder ? (
          <div className="animate-in zoom-in duration-300 flex flex-col items-center">
            <div className="bg-green-100 text-green-700 px-3 py-0.5 rounded-full text-[8px] font-black uppercase mb-4 flex items-center gap-1">
              <CheckCircle2 size={10}/> Saved
            </div>
            <div className="bg-white border-2 border-black p-4 w-48 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] flex flex-col items-center text-center">
              <h2 className="text-2xl font-black mb-0.5 leading-none">{savedOrder.vtiger_id}</h2>
              <p className="text-[8px] font-black uppercase text-blue-600 mb-2">{savedOrder.article_code}</p>
              <div className="bg-white p-1 border border-black rounded mb-2">
                <QRCodeCanvas value={`${SITE_URL}/workshop?search=${savedOrder.vtiger_id}`} size={100} level={"H"} />
              </div>
              <div className="flex gap-1 w-full">
                <span className={`flex-1 py-0.5 text-[6px] font-black uppercase border border-black rounded ${savedOrder.center_stone_received ? 'bg-black text-white' : 'bg-white text-gray-300 line-through'}`}>C</span>
                <span className={`flex-1 py-0.5 text-[6px] font-black uppercase border border-black rounded ${savedOrder.side_stones_received ? 'bg-black text-white' : 'bg-white text-gray-300 line-through'}`}>S</span>
              </div>
            </div>
            <button onClick={() => window.print()} className="mt-4 flex items-center gap-1 font-black uppercase text-xs border-b border-black pb-0.5">
              <Printer size={12}/> Print
            </button>
            <button onClick={() => setSavedOrder(null)} className="mt-2 text-[10px] font-bold">Create another?</button>
          </div>
        ) : (
          <div className="text-center space-y-2">
            <div className="bg-black w-16 h-16 rounded-full flex items-center justify-center mx-auto">
              <PlusCircle className="text-white" size={32} />
            </div>
            <p className="font-black text-black uppercase text-[10px] tracking-widest">Label Preview</p>
          </div>
        )}
      </div>
    </div>
  )
}