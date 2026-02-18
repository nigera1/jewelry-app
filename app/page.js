'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabaseClient'
import {
  PlusCircle, Printer, CheckCircle2, PackagePlus, Gem, Layers,
  Type, Sparkles, Circle, Ruler
} from 'lucide-react'

// ✅ STEP 2: Lazy-load QRCodeCanvas so it's excluded from the initial bundle
const QRCodeCanvas = dynamic(
  () => import('qrcode.react').then(m => m.QRCodeCanvas),
  { ssr: false }
)

// ✅ STEP 3: Move constants to the top — options arrays and INITIAL_FORM
const SETTING_CENTRAL_OPTIONS = ['round', 'tiger', 'bezel', 'square', 'v-shape', 'other']
const SETTING_SMALL_OPTIONS   = ['prong', 'pave', 'castle', 'flush', 'perle', 'bezel']
const FINISH_OPTIONS          = ['polished', 'rhodium', 'mat']

const INITIAL_FORM = {
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
  deadline: '', // ✅ New deadline field
}

// ✅ STEP 4a: Reusable ToggleButton component
function ToggleButton({ active, onClick, activeClass, children, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-2.5 border-2 border-black rounded-lg flex items-center justify-center gap-1.5 font-bold text-[10px] uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all ${active ? activeClass : 'bg-gray-100 text-gray-500'} ${className}`}
    >
      {children}
    </button>
  )
}

// ✅ STEP 4b: Reusable CheckboxGroup component
function CheckboxGroup({ title, icon: Icon, options, selected, onChange }) {
  return (
    <div className="border-2 border-black rounded-xl p-3 bg-gray-50">
      <div className="flex items-center gap-1 text-[10px] font-black uppercase mb-1">
        <Icon size={14} /> {title}
      </div>
      {/* ✅ STEP 5: grid-cols-2 on mobile, 3 on sm+ for better wrapping */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1">
        {options.map(opt => (
          <label key={opt} className="flex items-center gap-1 text-xs capitalize cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 accent-black"
              checked={selected.includes(opt)}
              onChange={() => onChange(opt)}
            />
            {opt}
          </label>
        ))}
      </div>
    </div>
  )
}

export default function OrderEntry() {
  const [loading, setLoading] = useState(false)
  const [savedOrder, setSavedOrder] = useState(null)
  const [formData, setFormData] = useState(INITIAL_FORM)

  // ✅ STEP 6: Single updateField helper — no more stale state spreads
  const updateField = (field, value) =>
    setFormData(prev => ({ ...prev, [field]: value }))

  const toggleArrayOption = (field, option) =>
    setFormData(prev => {
      const current = prev[field] || []
      return {
        ...prev,
        [field]: current.includes(option)
          ? current.filter(i => i !== option)
          : [...current, option],
      }
    })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase.from('orders').insert([formData]).select().single()
    if (error) {
      alert('Error: ' + error.message)
    } else {
      setSavedOrder(data)
      setFormData(INITIAL_FORM) // ✅ STEP 3: reuse INITIAL_FORM constant
    }
    setLoading(false)
  }

  // ✅ STEP 7: Use env var for site URL instead of window.location.origin inline
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://atelier-os.vercel.app'

  return (
    <div className="max-w-5xl mx-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-6">

      {/* FORM */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="bg-black text-white p-1.5 rounded-lg"><PackagePlus size={20} /></div>
          <h1 className="text-2xl font-black uppercase tracking-tighter">New Job</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Job ID + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              {/* ✅ STEP 5: label text-xs min for mobile readability */}
              <label className="text-xs font-black uppercase text-gray-600 mb-0.5 block">Job ID</label>
              <input
                required type="text" placeholder="SO-1234"
                className="w-full p-2.5 border-2 border-black rounded-lg font-bold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] outline-none focus:bg-yellow-50"
                value={formData.vtiger_id}
                onChange={e => updateField('vtiger_id', e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase text-gray-600 mb-0.5 block">Priority</label>
              <button
                type="button"
                onClick={() => updateField('is_rush', !formData.is_rush)}
                className={`w-full p-2.5 border-2 border-black rounded-lg font-bold text-xs transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none ${formData.is_rush ? 'bg-red-500 text-white' : 'bg-white text-black'}`}
              >
                {formData.is_rush ? '🔥 RUSH' : 'STANDARD'}
              </button>
            </div>
          </div>

          {/* Article Code + Metal */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black uppercase text-gray-600 mb-0.5 block">Article Code</label>
              <input
                required type="text" placeholder="RNG-782-YG"
                className="w-full p-2.5 border-2 border-black rounded-lg font-bold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] outline-none"
                value={formData.article_code}
                onChange={e => updateField('article_code', e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase text-gray-600 mb-0.5 block">Metal</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'Au', label: 'Au', activeClass: 'bg-yellow-500 text-white' },
                  { value: 'PT', label: 'PT', activeClass: 'bg-gray-400 text-white' },
                ].map(({ value, label, activeClass }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateField('metal', value)}
                    className={`p-2 border-2 border-black rounded-lg font-bold text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none ${formData.metal === value ? activeClass : 'bg-white'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ✅ New Deadline field */}
          <div>
            <label className="text-xs font-black uppercase text-gray-600 mb-0.5 block">Deadline</label>
            <input
              type="date"
              className="w-full p-2.5 border-2 border-black rounded-lg font-bold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] outline-none"
              value={formData.deadline}
              onChange={e => updateField('deadline', e.target.value)}
            />
          </div>

          {/* Stone Received — using ToggleButton */}
          <div className="grid grid-cols-2 gap-3">
            <ToggleButton
              active={formData.center_stone_received}
              onClick={() => updateField('center_stone_received', !formData.center_stone_received)}
              activeClass="bg-green-500 text-white"
            >
              <Gem size={14} /> {formData.center_stone_received ? 'Center: OK' : 'Center: Missing'}
            </ToggleButton>
            <ToggleButton
              active={formData.side_stones_received}
              onClick={() => updateField('side_stones_received', !formData.side_stones_received)}
              activeClass="bg-green-500 text-white"
            >
              <Layers size={14} /> {formData.side_stones_received ? 'Sides: OK' : 'Sides: Missing'}
            </ToggleButton>
          </div>

          {/* Engraving */}
          <div className="border-2 border-black rounded-xl p-3 bg-gray-50 space-y-2">
            <div className="flex items-center gap-1 text-[10px] font-black uppercase"><Type size={14} /> Engraving</div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1 text-xs cursor-pointer">
                <input
                  type="checkbox" className="w-4 h-4 accent-black"
                  checked={formData.engraving_company}
                  onChange={e => updateField('engraving_company', e.target.checked)}
                />
                Company
              </label>
              <div className="flex items-center gap-1">
                <label className="flex items-center gap-1 text-xs cursor-pointer">
                  <input
                    type="checkbox" className="w-4 h-4 accent-black"
                    checked={formData.engraving_personal}
                    onChange={e => updateField('engraving_personal', e.target.checked)}
                  />
                  Personal
                </label>
                {formData.engraving_personal && (
                  <input
                    type="text" placeholder="Font"
                    className="border-2 border-black p-1 rounded-lg text-xs w-24"
                    value={formData.engraving_font}
                    onChange={e => updateField('engraving_font', e.target.value)}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Setting Central — using CheckboxGroup */}
          <CheckboxGroup
            title="Setting Central"
            icon={Sparkles}
            options={SETTING_CENTRAL_OPTIONS}
            selected={formData.setting_central}
            onChange={opt => toggleArrayOption('setting_central', opt)}
          />

          {/* Setting Small — using CheckboxGroup */}
          <CheckboxGroup
            title="Setting Small"
            icon={Layers}
            options={SETTING_SMALL_OPTIONS}
            selected={formData.setting_small}
            onChange={opt => toggleArrayOption('setting_small', opt)}
          />

          {/* Finish + Ring Size */}
          <div className="grid grid-cols-2 gap-3">
            <CheckboxGroup
              title="Finish"
              icon={Circle}
              options={FINISH_OPTIONS}
              selected={formData.finish}
              onChange={opt => toggleArrayOption('finish', opt)}
            />
            <div>
              <label className="text-xs font-black uppercase text-gray-600 mb-0.5 flex items-center gap-1">
                <Ruler size={12} /> Ring Size
              </label>
              <input
                type="text" placeholder="6.5 / L / 52"
                className="w-full p-2.5 border-2 border-black rounded-lg font-bold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] outline-none"
                value={formData.ring_size}
                onChange={e => updateField('ring_size', e.target.value)}
              />
            </div>
          </div>

          {/* Details */}
          <div>
            <label className="text-xs font-black uppercase text-gray-600 mb-0.5 block">Details</label>
            <textarea
              rows="1"
              className="w-full p-2.5 border-2 border-black rounded-lg font-bold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] outline-none resize-none"
              value={formData.description}
              onChange={e => updateField('description', e.target.value)}
            />
          </div>

          {/* Submit */}
          <button
            disabled={loading} type="submit"
            className="w-full bg-blue-600 text-white p-3.5 border-2 border-black rounded-xl font-black text-base shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'SAVING...' : 'CREATE JOB'}
          </button>
        </form>
      </div>

      {/* LABEL PREVIEW */}
      {/* ✅ STEP 5: min-h on mobile so box doesn't collapse when empty */}
      <div className="flex flex-col items-center justify-center min-h-[200px] border-2 border-dashed border-gray-300 rounded-4xl p-6 bg-white">
        {savedOrder ? (
          <div className="animate-in zoom-in duration-300 flex flex-col items-center">
            <div className="bg-green-100 text-green-700 px-3 py-0.5 rounded-full text-[8px] font-black uppercase mb-4 flex items-center gap-1">
              <CheckCircle2 size={10} /> Saved
            </div>
            <div className="bg-white border-2 border-black p-4 w-48 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] flex flex-col items-center text-center">
              <h2 className="text-2xl font-black mb-0.5 leading-none">{savedOrder.vtiger_id}</h2>
              <p className="text-[8px] font-black uppercase text-blue-600 mb-2">{savedOrder.article_code}</p>
              <div className="bg-white p-1 border border-black rounded mb-2">
                <QRCodeCanvas
                  value={`${siteUrl}/workshop?search=${savedOrder.vtiger_id}`}
                  size={100}
                  level="H"
                />
              </div>
              <div className="flex gap-1 w-full">
                <span className={`flex-1 py-0.5 text-[6px] font-black uppercase border border-black rounded ${savedOrder.center_stone_received ? 'bg-black text-white' : 'bg-white text-gray-300 line-through'}`}>C</span>
                <span className={`flex-1 py-0.5 text-[6px] font-black uppercase border border-black rounded ${savedOrder.side_stones_received ? 'bg-black text-white' : 'bg-white text-gray-300 line-through'}`}>S</span>
              </div>
            </div>
            <button onClick={() => window.print()} className="mt-4 flex items-center gap-1 font-black uppercase text-xs border-b border-black pb-0.5">
              <Printer size={12} /> Print
            </button>
            <button onClick={() => setSavedOrder(null)} className="mt-2 text-[10px] font-bold">
              Create another?
            </button>
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