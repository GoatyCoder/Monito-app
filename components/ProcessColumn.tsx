
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '../services/store';
import { Process, ProcessStatus, CalibrationStatus } from '../types';
import { Plus, Settings, StopCircle, ArrowUpCircle, X, ArrowRight, Keyboard, List } from 'lucide-react';
import { StatusBadge } from './ui/Badge';
import { StatItem } from './ui/Stats';
import { ConfirmModal } from './ui/Modal';

interface Props {
  calibrationId: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onBack?: () => void;
}

export const ProcessColumn: React.FC<Props> = ({ calibrationId, selectedId, onSelect, onBack }) => {
  const { calibrations, getProcessesByCalibration, getPalletsByProcess, addProcess, closeProcess, updateCalibrationStatus, addIncomingWeight, productTypes, packagings, rawMaterials } = useData();
  const [isAdding, setIsAdding] = useState(false);
  const [isLoadingRaw, setIsLoadingRaw] = useState(false);
  const [rawWeightInput, setRawWeightInput] = useState('');
  
  const [formData, setFormData] = useState({ line: '', caliber: '', productTypeId: '', packagingId: '' });
  const [confirmCloseId, setConfirmCloseId] = useState<string | null>(null);
  
  // Quick Code Inputs
  const [ptCodeInput, setPtCodeInput] = useState('');
  const [pkgCodeInput, setPkgCodeInput] = useState('');

  // Caliber UI State
  const [caliberMode, setCaliberMode] = useState<'RANGE' | 'MANUAL'>('MANUAL');
  const [calStart, setCalStart] = useState('');
  const [calEnd, setCalEnd] = useState('');

  const lineRef = useRef<HTMLInputElement>(null);
  const caliberRef = useRef<HTMLInputElement>(null);

  const calibration = calibrations.find(c => c.id === calibrationId);
  const processes = calibrationId ? getProcessesByCalibration(calibrationId) : [];

  // Determine available calibers based on the RawMaterial linked to the calibration
  const availableCalibers = useMemo(() => {
      if (!calibration || !calibration.rawMaterialId) return [];
      const rm = rawMaterials.find(r => r.id === calibration.rawMaterialId);
      return rm?.calibers || [];
  }, [calibration, rawMaterials]);

  // Set default caliber mode when opening form
  useEffect(() => {
      if (isAdding) {
          if (availableCalibers.length > 0) {
              setCaliberMode('RANGE');
          } else {
              setCaliberMode('MANUAL');
          }
          setCalStart('');
          setCalEnd('');
      }
  }, [isAdding, availableCalibers]);

  // Update formData.caliber when Range inputs change
  useEffect(() => {
      if (caliberMode === 'RANGE') {
          if (!calStart) {
              setFormData(prev => ({...prev, caliber: ''}));
              return;
          }
          if (!calEnd || calEnd === calStart) {
              setFormData(prev => ({...prev, caliber: calStart}));
          } else {
              setFormData(prev => ({...prev, caliber: `${calStart}-${calEnd}`}));
          }
      }
  }, [calStart, calEnd, caliberMode]);

  const handlePtCodeSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && ptCodeInput.trim()) {
      e.preventDefault();
      const code = ptCodeInput.trim().toUpperCase();
      const match = productTypes.find(pt => pt.code === code);
      if (match) {
        setFormData(prev => ({ ...prev, productTypeId: match.id }));
        setPtCodeInput('');
      }
    }
  };

  const handlePkgCodeSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && pkgCodeInput.trim()) {
      e.preventDefault();
      const code = pkgCodeInput.trim().toUpperCase();
      const match = packagings.find(pkg => pkg.code === code);
      if (match) {
        setFormData(prev => ({ ...prev, packagingId: match.id }));
        setPkgCodeInput('');
      }
    }
  };

  const stats = useMemo(() => {
    if (!calibrationId) return { totalProduced: 0, yield: 0 };
    const allProcs = getProcessesByCalibration(calibrationId);
    const total = allProcs.reduce((acc, p) => {
        const pallets = getPalletsByProcess(p.id);
        return acc + pallets.reduce((pacc, pal) => pacc + pal.weight, 0);
    }, 0);
    const raw = calibration?.incomingRawWeight ?? 0;
    const yieldValue = raw > 0 ? (total / raw) * 100 : 0;
    return { totalProduced: total, yield: yieldValue };
  }, [calibrationId, getProcessesByCalibration, getPalletsByProcess, calibration?.incomingRawWeight]);

  const availableProductTypes = useMemo(() => {
    if (!calibration) return [];
    return productTypes.filter(pt => {
        if (pt.varietyId && pt.varietyId !== calibration.varietyId) return false;
        if (pt.subtypeId && pt.subtypeId !== calibration.subtypeId) return false;
        if (pt.rawMaterialId && pt.rawMaterialId !== calibration.rawMaterialId) return false;
        return true;
    });
  }, [productTypes, calibration]);

  const sortedProcesses = useMemo(() => {
    return [...processes].sort((a, b) => {
      if (a.status === b.status) return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
      return a.status === ProcessStatus.OPEN ? -1 : 1;
    });
  }, [processes]);

  const getProcessStats = (procId: string) => {
    const pPallets = getPalletsByProcess(procId);
    return {
      count: pPallets.length,
      colli: pPallets.reduce((acc, p) => acc + p.caseCount, 0),
      kg: pPallets.reduce((acc, p) => acc + p.weight, 0)
    };
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productTypeId || !formData.packagingId) return;
    const pt = productTypes.find(p => p.id === formData.productTypeId);
    addProcess({ 
      calibrationId: calibrationId!, 
      line: formData.line, 
      caliber: formData.caliber, 
      productTypeId: formData.productTypeId, 
      productType: pt?.name || '', 
      packagingId: formData.packagingId, 
      packaging: packagings.find(pkg => pkg.id === formData.packagingId)?.name || '' 
    });
    setFormData({ line: '', caliber: '', productTypeId: '', packagingId: '' });
    setIsAdding(false);
  };

  if (!calibrationId || !calibration) return (
    <div className="flex flex-col h-full items-center justify-center bg-slate-50 text-slate-400 p-8 border-r"><Settings className="w-12 h-12 mb-4 opacity-20" /><p>Seleziona una calibrazione.</p></div>
  );

  return (
    <div className="flex flex-col h-full bg-white border-r">
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        {onBack && <button onClick={onBack} className="text-xs text-blue-600 mb-2 font-medium flex items-center">&larr; Indietro</button>}
        <div className="flex justify-between items-start">
            <div>
                <h2 className="font-bold text-slate-800 text-lg leading-tight">{calibration.rawMaterial}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1"><StatusBadge status={calibration.status} />{calibration.subtype && <span className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded border border-purple-200 uppercase font-bold">{calibration.subtype}</span>}</div>
            </div>
            <div className="text-right">
                <div className="text-lg font-bold text-green-600">{stats.yield.toFixed(1)}% <span className="text-[10px] text-slate-400 font-normal uppercase">Resa</span></div>
                <div className="text-[10px] text-slate-500">{stats.totalProduced.toLocaleString()} / {calibration.incomingRawWeight.toLocaleString()} Kg</div>
            </div>
        </div>

        {calibration.status === CalibrationStatus.OPEN && (
            <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
                <div className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><ArrowUpCircle className="w-4 h-4 text-blue-500" /> Carico Grezzo</div>
                {isLoadingRaw ? (
                    <div className="flex gap-1 animate-in slide-in-from-right-2">
                        <input autoFocus className="w-20 text-xs border rounded px-2 py-1 outline-none font-mono" type="number" placeholder="Kg" value={rawWeightInput} onChange={e => setRawWeightInput(e.target.value)} onKeyDown={(e) => {
                          if (e.key !== 'Enter' || !rawWeightInput) return;
                          const parsed = parseFloat(rawWeightInput);
                          if (!Number.isFinite(parsed) || parsed <= 0) return;
                          addIncomingWeight(calibrationId, parsed);
                          setRawWeightInput('');
                          setIsLoadingRaw(false);
                        }} />
                        <button onClick={() => {
                          if (!rawWeightInput) return;
                          const parsed = parseFloat(rawWeightInput);
                          if (!Number.isFinite(parsed) || parsed <= 0) return;
                          addIncomingWeight(calibrationId, parsed);
                          setRawWeightInput('');
                          setIsLoadingRaw(false);
                        }} className="bg-blue-600 text-white text-[10px] px-2 rounded font-bold">OK</button>
                    </div>
                ) : (
                    <button onClick={() => setIsLoadingRaw(true)} className="text-[10px] bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 px-3 py-1 rounded font-bold transition-all shadow-sm">REGISTRA BIN</button>
                )}
            </div>
        )}
      </div>

      <div className="px-4 py-3 flex justify-between items-center border-b"><h3 className="font-bold text-slate-700 text-sm tracking-tight">Lavorazioni Attive</h3>{calibration.status !== CalibrationStatus.CLOSED && <button onClick={() => setIsAdding(!isAdding)} className="bg-blue-600 text-white text-[10px] px-3 py-1.5 rounded hover:bg-blue-700 shadow-sm font-bold uppercase tracking-widest">+ Aggiungi Linea</button>}</div>

      {isAdding && (
        <div className="p-4 bg-slate-50 border-b animate-in fade-in zoom-in-95">
           <form onSubmit={handleAddSubmit} className="space-y-4">
             <div className="flex gap-3">
               <div className="w-20">
                 <label className="text-[10px] font-bold text-slate-500 uppercase">Linea</label>
                 <input ref={lineRef} required placeholder="L1" className="w-full text-sm border p-2 rounded" value={formData.line} onChange={e => setFormData({...formData, line: e.target.value})} />
               </div>
               
               {/* SMART CALIBER SELECTOR */}
               <div className="flex-1">
                   <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Calibro</label>
                        {availableCalibers.length > 0 && (
                            <button 
                                type="button" 
                                onClick={() => setCaliberMode(prev => prev === 'RANGE' ? 'MANUAL' : 'RANGE')} 
                                className="text-[10px] text-blue-600 flex items-center gap-1 hover:underline"
                            >
                                {caliberMode === 'RANGE' ? <><Keyboard className="w-3 h-3"/> Manuale</> : <><List className="w-3 h-3"/> Seleziona</>}
                            </button>
                        )}
                   </div>
                   
                   {caliberMode === 'RANGE' && availableCalibers.length > 0 ? (
                       <div className="flex gap-2 items-center">
                           <div className="flex-1">
                                <select 
                                    className="w-full text-sm border p-2 rounded bg-white" 
                                    value={calStart} 
                                    onChange={e => { setCalStart(e.target.value); if(!calEnd) setCalEnd(e.target.value); }}
                                    required
                                >
                                    <option value="">Da...</option>
                                    {availableCalibers.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                           </div>
                           <ArrowRight className="w-4 h-4 text-slate-400"/>
                           <div className="flex-1">
                                <select 
                                    className="w-full text-sm border p-2 rounded bg-white" 
                                    value={calEnd} 
                                    onChange={e => setCalEnd(e.target.value)}
                                    required
                                >
                                    <option value="">A...</option>
                                    {availableCalibers.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                           </div>
                       </div>
                   ) : (
                       <input ref={caliberRef} required placeholder="Es. 75/80 o Misto" className="w-full text-sm border p-2 rounded" value={formData.caliber} onChange={e => setFormData({...formData, caliber: e.target.value})} />
                   )}
               </div>
             </div>

             <div className="grid grid-cols-12 gap-2 items-end">
               <div className="col-span-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Cod. Art</label>
                  <input className="w-full border rounded px-2 py-2 text-xs font-mono uppercase bg-blue-50/50" placeholder="MSF" value={ptCodeInput} onChange={e => setPtCodeInput(e.target.value)} onKeyDown={handlePtCodeSubmit} />
               </div>
               <div className="col-span-9">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Articolo</label>
                  <select required className="w-full text-sm border p-2 rounded bg-white" value={formData.productTypeId} onChange={e => setFormData({...formData, productTypeId: e.target.value})}>
                    <option value="">Seleziona...</option>
                    {availableProductTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.name} ({pt.code})</option>)}
                  </select>
               </div>
             </div>

             <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Cod. Imb</label>
                    <input className="w-full border rounded px-2 py-2 text-xs font-mono uppercase bg-blue-50/50" placeholder="C34" value={pkgCodeInput} onChange={e => setPkgCodeInput(e.target.value)} onKeyDown={handlePkgCodeSubmit} />
                </div>
                <div className="col-span-9">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Imballaggio</label>
                    <select required className="w-full text-sm border p-2 rounded bg-white" value={formData.packagingId} onChange={e => setFormData({...formData, packagingId: e.target.value})}>
                      <option value="">Seleziona...</option>
                      {packagings.map(pkg => <option key={pkg.id} value={pkg.id}>{pkg.name} ({pkg.code})</option>)}
                    </select>
                </div>
             </div>

             <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 text-xs bg-slate-200 py-2 rounded font-bold uppercase tracking-widest">Annulla</button>
                <button type="submit" className="flex-1 text-xs bg-blue-600 text-white py-2 rounded font-bold uppercase tracking-widest shadow-md">Salva Linea</button>
             </div>
           </form>
        </div>
      )}

      <div className="flex-1 overflow-y-auto bg-slate-50/50 p-2 space-y-2">
        {sortedProcesses.map(proc => {
          const pstats = getProcessStats(proc.id);
          const isSelected = selectedId === proc.id;
          return (
            <div key={proc.id} onClick={() => onSelect(proc.id)} className={`relative bg-white rounded-lg shadow-sm border p-3 cursor-pointer transition-all ${isSelected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200 hover:border-blue-300'} ${proc.status === ProcessStatus.CLOSED ? 'opacity-70 grayscale' : ''}`}>
                <div className={`absolute top-0 left-0 bottom-0 w-1 rounded-l-lg ${proc.status === ProcessStatus.OPEN ? 'bg-green-500' : 'bg-slate-300'}`} />
                <div className="pl-2">
                    <div className="flex justify-between mb-1">
                        <div className="flex items-center gap-2"><span className="text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 uppercase">{proc.line}</span><span className="font-bold text-slate-800 text-sm">{proc.caliber}</span></div>
                        {proc.status === ProcessStatus.OPEN && <button onClick={(e) => { e.stopPropagation(); setConfirmCloseId(proc.id); }} className="text-[10px] text-red-500 hover:bg-red-50 px-2 py-0.5 rounded font-bold uppercase"><StopCircle className="w-3 h-3 inline mr-1" /> Termina</button>}
                    </div>
                    <div className="text-xs text-slate-600 mb-2 font-medium truncate">{proc.productType}</div>
                    <div className="grid grid-cols-3 gap-1 border-t pt-2"><StatItem label="Ped." value={pstats.count} /><StatItem label="Colli" value={pstats.colli} /><StatItem label="Kg" value={pstats.kg.toLocaleString()} highlight /></div>
                </div>
            </div>
          );
        })}
      </div>

      <ConfirmModal 
        isOpen={!!confirmCloseId}
        onClose={() => setConfirmCloseId(null)}
        onConfirm={() => confirmCloseId && closeProcess(confirmCloseId)}
        title="Chiudi Lavorazione"
        message="Sei sicuro di voler terminare questa linea di produzione? Non potrai più aggiungere pedane."
        confirmLabel="Termina"
        isDestructive
      />
    </div>
  );
};
