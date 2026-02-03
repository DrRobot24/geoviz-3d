
import React from 'react';
import { Ruler, Layers, Calculator, Building2, Palette, FileDown, Scissors } from 'lucide-react';
import { ExcavationDimensions, SurfaceData, SurfaceColors } from '../types';

interface SidebarProps {
  surfaces: SurfaceData[];
  dimensions: ExcavationDimensions;
  colors: SurfaceColors;
  onDimensionsChange: (dims: ExcavationDimensions) => void;
  onColorsChange: (colors: SurfaceColors) => void;
  onExportPDF: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  surfaces, 
  dimensions, 
  colors, 
  onDimensionsChange, 
  onColorsChange,
  onExportPDF
}) => {
  const totalArea = surfaces.reduce((acc, s) => {
    if (s.id === 'bottom') return acc + s.area;
    return acc + (s.area * 2);
  }, 0);

  const totalAreaConSfido = surfaces.reduce((acc, s) => {
    if (s.id === 'bottom') return acc + s.areaConSfido;
    return acc + (s.areaConSfido * 2);
  }, 0);

  const handleDimChange = (key: keyof ExcavationDimensions, value: string) => {
    const num = parseFloat(value) || 0;
    onDimensionsChange({ ...dimensions, [key]: num });
  };

  const handleColorChange = (key: keyof SurfaceColors, value: string) => {
    onColorsChange({ ...colors, [key]: value });
  };

  return (
    <aside className="w-full md:w-96 bg-white border-r border-slate-200 flex flex-col h-full z-20 shadow-2xl">
      {/* Header */}
      <div className="p-8 border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">GeoViz Dynamic</span>
        </div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Parametri Scavo</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {/* INPUT DIMENSIONI */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Ruler className="w-3.5 h-3.5 text-slate-300" />
            Dimensioni Geometriche (m)
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {[
              { label: 'Lunghezza (L)', key: 'length', val: dimensions.length },
              { label: 'Larghezza (W)', key: 'width', val: dimensions.width },
              { label: 'Profondità (D)', key: 'depth', val: dimensions.depth }
            ].map((d) => (
              <div key={d.key} className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">{d.label}</label>
                <input 
                  type="number" 
                  step="0.1"
                  min="0.1"
                  value={d.val}
                  onChange={(e) => handleDimChange(d.key as keyof ExcavationDimensions, e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            ))}
          </div>
        </section>

        {/* INPUT SFIDO */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Scissors className="w-3.5 h-3.5 text-slate-300" />
            Sfido / Sormonto (m)
          </h3>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-amber-700 uppercase ml-1">Sfido per lato</label>
              <input 
                type="number" 
                step="0.1"
                min="0"
                value={dimensions.sfido}
                onChange={(e) => handleDimChange('sfido', e.target.value)}
                className="bg-white border border-amber-300 rounded-xl px-4 py-2.5 font-bold text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
              />
              <p className="text-[10px] text-amber-600 mt-1 italic">
                Sovrapposizione aggiuntiva per incollaggio alle pareti
              </p>
            </div>
          </div>
        </section>

        {/* INPUT COLORI E RIEPILOGO MQ */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Palette className="w-3.5 h-3.5 text-slate-300" />
            Materiali e Colori TNT
          </h3>
          <div className="space-y-3">
            {surfaces.map((s) => (
              <div key={s.id} className="group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-200 transition-all">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      value={s.color}
                      onChange={(e) => handleColorChange(s.id as keyof SurfaceColors, e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border-none p-0 bg-transparent overflow-hidden"
                    />
                    <span className="font-extrabold text-slate-700 text-xs tracking-tight">{s.label}</span>
                  </div>
                </div>
                <div className="ml-11 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-400">Area teorica:</span>
                    <span className="text-slate-600 font-bold text-xs">{s.area.toFixed(2)} m²</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-amber-600 font-medium">Con sfido:</span>
                    <span className="text-amber-600 font-black text-xs">{s.areaConSfido.toFixed(2)} m²</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium pt-1">
                    Misure: {s.dimensions} → {s.dimensionsConSfido}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* RECAP TOTALE MQ */}
        <section className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-[-20px] right-[-20px] opacity-10">
            <Calculator className="w-24 h-24 text-white" />
          </div>
          <div className="relative z-10">
            <h3 className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] mb-3">Totale Fornitura TNT</h3>
            
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-slate-400 text-xs">Area teorica:</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-slate-300">{totalArea.toFixed(2)}</span>
                  <span className="text-sm text-slate-500">m²</span>
                </div>
              </div>
              
              <div className="border-t border-slate-700 pt-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-amber-400 text-xs font-bold">CON SFIDO ({dimensions.sfido}m):</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black tracking-tighter text-amber-400">{totalAreaConSfido.toFixed(2)}</span>
                    <span className="text-lg text-amber-500 font-black">m²</span>
                  </div>
                </div>
              </div>
            </div>
            
            <p className="text-[9px] text-slate-400 mt-3 italic">* Calcolo basato sulle 5 facciate + sfido per incollaggio</p>
          </div>
        </section>
      </div>

      <div className="p-6 border-t border-slate-100 bg-slate-50/50">
        <button 
          onClick={onExportPDF}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-2xl font-black text-xs tracking-widest shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <FileDown className="w-4 h-4" />
          GENERA PDF OFFERTA
        </button>
      </div>
    </aside>
  );
};
