
import React, { useState, useRef } from 'react';
import { useData } from '../services/store';
import { Calibration, CalibrationStatus, ProcessStatus } from '../types';
import { Plus, Search, Layers, ChevronRight, Copy, Keyboard, X, Barcode, Check } from 'lucide-react';
import { StatusBadge } from './ui/Badge';

interface Props {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export const CalibrationColumn: React.FC<Props> = ({ selectedId, onSelect }) => {
  const { calibrations, addCalibration, duplicateCalibration, processes, pallets, rawMaterials, subtypes, varieties, lots } = useData();
  const [filter, setFilter] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState<Calibration | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    lotId: '', // NEW
    rawMaterialId: '',
    subtypeId: '',
    varietyId: '',
    producer: '',
    startDate: new Date().toISOString().split('T')[0]
  });

  // Quick Code Inputs
  const [lotSearchInput, setLotSearchInput] = useState('');
  const [rawCodeInput, setRawCodeInput] = useState('');
  const [varCodeInput, setVarCodeInput] = useState('');
  
  const varietyRef = useRef<HTMLSelectElement>(null);
  const producerRef = useRef<HTMLInputElement>(null);

  // Handle Lot Search
  const handleLotSearch = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && lotSearchInput.trim()) {
          e.preventDefault();
          const lotCode = lotSearchInput.trim().toUpperCase();
          const matchedLot = lots.find(l => l.code === lotCode);
          if (matchedLot) {
              setFormData(prev => ({
                  ...prev,
                  lotId: matchedLot.id,
                  rawMaterialId: matchedLot.rawMaterialId,
                  subtypeId: matchedLot.subtypeId || '',
                  varietyId: matchedLot.varietyId || '',
                  producer: matchedLot.producer
              }));
              // Reset other inputs
              setRawCodeInput('');
              setVarCodeInput('');
          } else {
              // Optional: Show simplified toast or error here, but for now we just don't fill
          }
      }
  };

  const handleRawCodeSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && rawCodeInput.trim()) {
      e.preventDefault();
      const match = rawMaterials.find(r => r.code.toUpperCase() === rawCodeInput.trim().toUpperCase());
      if (match) {
        setFormData(prev => ({ ...prev, rawMaterialId: match.id, subtypeId: '', varietyId: '' }));
        setRawCodeInput('');
        // Focus Variety Search next
      }
    }
  };

  const handleVarCodeSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && varCodeInput.trim()) {
      e.preventDefault();
      const match = varieties.find(v => 
        v.code.toUpperCase() === varCodeInput.trim().toUpperCase() && 
        v.rawMaterialId === formData.rawMaterialId
      );
      if (match) {
        // Auto-fill subtype if variety implies it
        setFormData(prev => ({ 
            ...prev, 
            varietyId: match.id,
            subtypeId: match.subtypeId || prev.subtypeId
        }));
        setVarCodeInput('');
        producerRef.current?.focus();
      }
    }
  };

  const filteredCalibrations = calibrations.filter(c => 
    c.rawMaterial.toLowerCase().includes(filter.toLowerCase()) ||
    c.producer.toLowerCase().includes(filter.toLowerCase()) ||
    (c.lotCode || '').toLowerCase().includes(filter.toLowerCase())
  );

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rawName = rawMaterials.find(r => r.id === formData.rawMaterialId)?.name || '';
    const subtypeName = subtypes.find(s => s.id === formData.subtypeId)?.name || '';
    const varName = varieties.find(v => v.id === formData.varietyId)?.name || '';

    const payload = {
        lotId: formData.lotId || undefined,
        rawMaterialId: formData.rawMaterialId,
        rawMaterial: rawName,
        subtypeId: formData.subtypeId,
        subtype: subtypeName,
        varietyId: formData.varietyId,
        variety: varName,
        producer: formData.producer
    };

    if (isDuplicating) {
      duplicateCalibration(isDuplicating.id, payload);
      setIsDuplicating(null);
    } else {
      addCalibration({
        ...payload,
        startDate: new Date(formData.startDate).toISOString()
      });
      setIsAdding(false);
    }
    setFormData({ lotId: '', rawMaterialId: '', subtypeId: '', varietyId: '', producer: '', startDate: new Date().toISOString().split('T')[0] });
    setLotSearchInput('');
  };

  const openDuplicate = (cal: Calibration, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDuplicating(cal);
    setFormData({
        lotId: cal.lotId || '',
        rawMaterialId: cal.rawMaterialId || '',
        subtypeId: cal.subtypeId || '',
        varietyId: cal.varietyId || '',
        producer: cal.producer,
        startDate: new Date().toISOString().split('T')[0]
    });
  };

  const availableSubtypes = subtypes.filter(s => s.rawMaterialId === formData.rawMaterialId);
  const availableVarieties = varieties.filter(v => {
    if (v.rawMaterialId !== formData.rawMaterialId) return false;
    if (formData.subtypeId) return !v.subtypeId || v.subtypeId === formData.subtypeId;
    return true;
  });

  // Check if subtype is locked by selected variety
  const isSubtypeLocked = React.useMemo(() => {
    if (!formData.varietyId) return false;
    const v = varieties.find(x => x.id === formData.varietyId);
    return !!v?.subtypeId;
  }, [formData.varietyId, varieties]);

  const renderForm = () => (
    <div className="p-4 bg-white border-b border-slate-200 shadow-inner">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-slate-800">{isDuplicating ? `Cambio Lotto: ${isDuplicating.rawMaterial}` : 'Nuova Calibrazione'}</h3>
        <button onClick={() => { setIsAdding(false); setIsDuplicating(null); }} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
      </div>
      
      <form onSubmit={handleAddSubmit} className="space-y-4">
        
        {/* LOT SEARCH */}
        {!isDuplicating && (
             <div className="bg-blue-50/50 p-2 rounded-lg border border-blue-100 mb-2">
                <label className="block text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1 flex items-center gap-1"><Barcode className="w-3 h-3"/> Cerca Lotto Esistente</label>
                <div className="relative">
                    <input 
                        className="w-full border rounded px-2 py-1.5 text-sm font-mono uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Es. 14002..."
                        value={lotSearchInput}
                        onChange={e => setLotSearchInput(e.target.value)}
                        onKeyDown={handleLotSearch}
                    />
                    {formData.lotId && <div className="absolute right-2 top-1/2 -translate-y-1/2 text-green-600"><Check className="w-4 h-4"/></div>}
                </div>
                {formData.lotId && <div className="text-[10px] text-green-600 font-medium mt-1">Dati pre-caricati dal lotto!</div>}
             </div>
        )}

        {/* RAW MATERIAL */}
        <div className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-4">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Codice</label>
            <input 
              className="w-full border rounded px-2 py-1.5 text-xs font-mono uppercase focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
              placeholder="MND..."
              value={rawCodeInput}
              onChange={e => setRawCodeInput(e.target.value)}
              onKeyDown={handleRawCodeSubmit}
              title="Inserisci codice grezzo e premi Invio"
              disabled={!!formData.lotId} // Disable manual edit if lot selected
            />
          </div>
          <div className="col-span-8">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Grezzo</label>
            <select 
              required
              className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-slate-100"
              value={formData.rawMaterialId}
              onChange={e => setFormData({...formData, rawMaterialId: e.target.value, subtypeId: '', varietyId: ''})}
              disabled={!!formData.lotId}
            >
              <option value="">Seleziona...</option>
              {rawMaterials.map(rm => <option key={rm.id} value={rm.id}>{rm.name} ({rm.code})</option>)}
            </select>
          </div>
        </div>

        {/* SUBTYPE */}
        {availableSubtypes.length > 0 && (
             <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tipologia</label>
                <select 
                  className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-slate-100"
                  value={formData.subtypeId}
                  onChange={e => setFormData({...formData, subtypeId: e.target.value})}
                  disabled={!!formData.lotId || isSubtypeLocked}
                >
                  <option value="">Nessuna / Standard</option>
                  {availableSubtypes.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                </select>
            </div>
        )}
       
        {/* VARIETY */}
        <div className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-4">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Cod. Var</label>
            <input 
              className="w-full border rounded px-2 py-1.5 text-xs font-mono uppercase focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
              placeholder="NAD..."
              value={varCodeInput}
              onChange={e => setVarCodeInput(e.target.value)}
              onKeyDown={handleVarCodeSubmit}
              disabled={!formData.rawMaterialId || !!formData.lotId}
            />
          </div>
          <div className="col-span-8">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Varietà</label>
            <select 
              required
              ref={varietyRef}
              className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-slate-100"
              value={formData.varietyId}
              onChange={e => {
                  const vId = e.target.value;
                  const v = varieties.find(x => x.id === vId);
                  setFormData(prev => ({ 
                      ...prev, 
                      varietyId: vId,
                      subtypeId: v?.subtypeId || prev.subtypeId
                  }));
              }}
              disabled={!formData.rawMaterialId || !!formData.lotId}
            >
               <option value="">Seleziona...</option>
               {availableVarieties.map(v => <option key={v.id} value={v.id}>{v.name} ({v.code})</option>)}
            </select>
          </div>
        </div>

        {/* PRODUCER */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Produttore</label>
          <input 
            required
            ref={producerRef}
            className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100"
            placeholder="Val Venosta, etc."
            value={formData.producer}
            onChange={e => setFormData({...formData, producer: e.target.value})}
            disabled={!!formData.lotId}
          />
        </div>

        {!isDuplicating && (
             <div>
             <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Data</label>
             <input 
               type="date"
               required
               className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
               value={formData.startDate}
               onChange={e => setFormData({...formData, startDate: e.target.value})}
             />
           </div>
        )}
     
        <div className="flex gap-2">
             {formData.lotId && (
                 <button type="button" onClick={() => { setFormData({ lotId: '', rawMaterialId: '', subtypeId: '', varietyId: '', producer: '', startDate: formData.startDate }); setLotSearchInput(''); }} className="px-3 bg-slate-100 text-slate-600 rounded font-bold uppercase tracking-widest text-xs hover:bg-slate-200">Reset</button>
             )}
            <button type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold shadow-md transition-all active:scale-95 uppercase tracking-widest text-xs">
            {isDuplicating ? 'Conferma Cambio Lotto' : 'Crea Calibrazione'}
            </button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-slate-800">Calibrazioni</h2>
          </div>
          <button onClick={() => setIsAdding(true)} className="bg-blue-600 text-white p-1.5 rounded-lg shadow-sm hover:bg-blue-700 transition"><Plus className="w-5 h-5" /></button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Cerca lotto o produttore..." value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
      </div>

      {(isAdding || isDuplicating) && renderForm()}

      <div className="flex-1 overflow-y-auto bg-slate-50/30">
        {filteredCalibrations.map(cal => {
          const isSelected = selectedId === cal.id;
          const pCount = processes.filter(p => p.calibrationId === cal.id).length;
          const weight = pallets.filter(pal => processes.some(p => p.calibrationId === cal.id && p.id === pal.processId)).reduce((a, b) => a + b.weight, 0);
          
          const lotCodeSnapshot = cal.lotCode;

          return (
            <div key={cal.id} onClick={() => onSelect(cal.id)} className={`group p-4 border-b border-slate-100 cursor-pointer transition-all hover:bg-white ${isSelected ? 'bg-white ring-1 ring-inset ring-blue-500 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'}`}>
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                     <h3 className={`font-bold text-sm ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>{cal.rawMaterial}</h3>
                     {lotCodeSnapshot && <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 rounded font-mono border border-yellow-200">{lotCodeSnapshot}</span>}
                </div>
                <StatusBadge status={cal.status} />
              </div>
              
              <div className="text-xs text-slate-500 mb-3 space-x-2">
                <span className="font-bold text-slate-700">{cal.producer}</span>
                {cal.subtype && <span>• {cal.subtype}</span>}
                <span>• {cal.variety}</span>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex gap-3">
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">
                    <span className="text-slate-700 mr-1">{pCount}</span> Linee
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">
                    <span className="text-slate-700 mr-1">{weight.toLocaleString()}</span> Kg
                  </div>
                </div>
                {cal.status === CalibrationStatus.OPEN && (
                    <button onClick={(e) => openDuplicate(cal, e)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-blue-600 hover:bg-blue-50 rounded flex items-center gap-1 text-[10px] font-bold uppercase" title="Cambio Lotto"><Copy className="w-3 h-3" /> Cambio</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
