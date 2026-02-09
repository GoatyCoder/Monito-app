
import React, { useState, useEffect } from 'react';
import { useData } from '../services/store';
import { ProcessStatus, WeightType } from '../types';
import { Package, Trash2, Clock, Info, Printer, Pencil } from 'lucide-react';
import { ConfirmModal, DecisionModal, FormModal } from './ui/Modal';
import { LabelEditor } from './LabelEditor';

interface Props {
  processId: string | null;
  onBack?: () => void;
}

export const PalletColumn: React.FC<Props> = ({ processId, onBack }) => {
  const { processes, getPalletsByProcess, addPallet, updatePallet, deletePallet, calibrations, productTypes } = useData();
  const [caseCount, setCaseCount] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [deletePalletId, setDeletePalletId] = useState<string | null>(null);
  const [editingPallet, setEditingPallet] = useState<any | null>(null);
  const [editCaseCount, setEditCaseCount] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editProcessId, setEditProcessId] = useState('');
  const [editLotCode, setEditLotCode] = useState('');
  const [editRawMaterial, setEditRawMaterial] = useState('');
  const [editVariety, setEditVariety] = useState('');
  const [editProducer, setEditProducer] = useState('');
  const [editProductType, setEditProductType] = useState('');
  const [editPackaging, setEditPackaging] = useState('');
  const [editLine, setEditLine] = useState('');
  const [editCaliber, setEditCaliber] = useState('');
  const [pendingPalletUpdate, setPendingPalletUpdate] = useState<{ palletId: string; payload: any } | null>(null);
  
  // Printing State
  const [printingPallet, setPrintingPallet] = useState<any | null>(null);

  const process = processes.find(p => p.id === processId);
  const pallets = processId ? getPalletsByProcess(processId) : [];
  const isOpen = process?.status === ProcessStatus.OPEN;

  // Simple math expression evaluator
  const safeCalculate = (value: string): string => {
    if (!value) return '';
    try {
      // 1. Normalize: replace comma with dot
      const normalized = value.replace(/,/g, '.');
      
      // 2. Security Check: Allow only numbers, operators, dots, parens and spaces
      if (/[^0-9\.\+\-\*\/\(\)\s]/.test(normalized)) return value;
      
      // 3. Evaluate if it looks like math (contains operators)
      if (!/[\+\-\*\/]/.test(normalized)) return value;

      // eslint-disable-next-line no-new-func
      const result = new Function('return ' + normalized)();
      
      if (!isFinite(result) || isNaN(result)) return value;
      
      // 4. Return formatted result (max 2 decimals)
      return String(Math.round(result * 100) / 100);
    } catch {
      return value;
    }
  };

  const handleBlurCaseCount = () => {
    const result = safeCalculate(caseCount);
    if (result !== caseCount) setCaseCount(result);
  };

  const handleBlurWeight = () => {
    const result = safeCalculate(weight);
    if (result !== weight) setWeight(result);
  };

  // Auto-calculate weight for Egalizzato
  useEffect(() => {
    if (process?.weightType === WeightType.EGALIZZATO && process.standardWeight && caseCount) {
        // Ensure we calculate based on the evaluated case count (if user typed math)
        const safeCases = safeCalculate(caseCount);
        if (!isNaN(parseFloat(safeCases))) {
            const calculated = (parseFloat(safeCases) * process.standardWeight).toFixed(2);
            setWeight(calculated);
        }
    }
  }, [caseCount, process?.weightType, process?.standardWeight]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Final calculation check before submit (in case user hits enter directly without blurring)
    const finalCases = safeCalculate(caseCount);
    const finalWeight = safeCalculate(weight);

    if (!processId || !finalCases || !finalWeight) return;

    const parsedCases = Number(finalCases);
    const parsedWeight = Number(finalWeight);
    if (!Number.isFinite(parsedCases) || !Number.isInteger(parsedCases) || parsedCases <= 0) return;
    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) return;

    addPallet({ 
        processId, 
        caseCount: parsedCases, 
        weight: parsedWeight, 
        notes: notes || undefined 
    });
    setCaseCount(''); setWeight(''); setNotes('');
  };


  const handleEditPallet = (pallet: any) => {
    setEditingPallet(pallet);
    setEditCaseCount(String(pallet.caseCount));
    setEditWeight(String(pallet.weight));
    setEditNotes(pallet.notes || '');
    setEditProcessId(pallet.processId);
    setEditLotCode(pallet.lotCode || process?.lotCode || '');
    setEditRawMaterial(pallet.rawMaterial || process?.rawMaterial || '');
    setEditVariety(pallet.variety || process?.variety || '');
    setEditProducer(pallet.producer || process?.producer || '');
    setEditProductType(pallet.productType || process?.productType || '');
    setEditPackaging(pallet.packaging || process?.packaging || '');
    setEditLine(pallet.line || process?.line || '');
    setEditCaliber(pallet.caliber || process?.caliber || '');
  };

  const applyPalletUpdate = (palletId: string, payload: any, propagateToSiblingPallets: boolean) => {
    updatePallet(palletId, payload, { propagateToSiblingPallets });
    setEditingPallet(null);
  };

  const handleEditPalletSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPallet) return;

    const finalCases = safeCalculate(editCaseCount);
    const finalWeight = safeCalculate(editWeight);
    const caseCount = Number(finalCases);
    const weight = Number(finalWeight);

    if (!Number.isFinite(caseCount) || !Number.isInteger(caseCount) || caseCount <= 0) return;
    if (!Number.isFinite(weight) || weight <= 0) return;

    const payload = {
      processId: editProcessId,
      caseCount,
      weight,
      notes: editNotes.trim() || undefined,
      lotCode: editLotCode.trim() || undefined,
      rawMaterial: editRawMaterial.trim() || undefined,
      variety: editVariety.trim() || undefined,
      producer: editProducer.trim() || undefined,
      productType: editProductType.trim() || undefined,
      packaging: editPackaging.trim() || undefined,
      line: editLine.trim() || undefined,
      caliber: editCaliber.trim() || undefined,
    };

    const affectsGroupSnapshots = payload.processId !== editingPallet.processId
      || payload.lotCode !== (editingPallet.lotCode || undefined)
      || payload.rawMaterial !== (editingPallet.rawMaterial || undefined)
      || payload.variety !== (editingPallet.variety || undefined)
      || payload.producer !== (editingPallet.producer || undefined)
      || payload.productType !== (editingPallet.productType || undefined)
      || payload.packaging !== (editingPallet.packaging || undefined)
      || payload.line !== (editingPallet.line || undefined)
      || payload.caliber !== (editingPallet.caliber || undefined);

    const siblingCount = pallets.filter(p => p.processId === editingPallet.processId).length;
    if (siblingCount > 1 && affectsGroupSnapshots) {
      setPendingPalletUpdate({ palletId: editingPallet.id, payload });
      return;
    }

    applyPalletUpdate(editingPallet.id, payload, false);
  };

  const handlePrint = (pallet: any) => {
      // Gather all necessary info for the label
      if (!process) return;
      const calibration = calibrations.find(c => c.id === process.calibrationId);
      const pt = productTypes.find(p => p.id === process.productTypeId);

      const printData = {
          ...pallet,
          rawMaterial: pallet.rawMaterial || process.rawMaterial || calibration?.rawMaterial,
          productType: pallet.productType || process.productType,
          variety: pallet.variety || process.variety || calibration?.variety,
          lotCode: pallet.lotCode || process.lotCode || calibration?.lotCode || '---',
          producer: pallet.producer || process.producer || calibration?.producer,
          packaging: pallet.packaging || process.packaging,
          quality: pt?.quality
      };
      setPrintingPallet(printData);
  };

  if (!processId || !process) return (
    <div className="flex flex-col h-full items-center justify-center bg-slate-50 text-slate-400 p-8"><Package className="w-12 h-12 mb-4 opacity-20" /><p>Seleziona una lavorazione per gestire le pedane.</p></div>
  );

  const totalKg = pallets.reduce((acc, p) => acc + p.weight, 0);
  const totalCases = pallets.reduce((acc, p) => acc + p.caseCount, 0);

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="bg-white p-4 border-b shadow-sm z-10">
        {onBack && <button onClick={onBack} className="text-xs text-blue-600 mb-2 font-medium">&larr; Indietro</button>}
        <div className="flex justify-between items-end">
            <div>
                <h2 className="font-bold text-slate-800 text-lg leading-tight">{process.productType}</h2>
                <div className="text-xs text-slate-500 mt-0.5">{process.packaging} • {process.line}</div>
                {process.weightType === WeightType.EGALIZZATO && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase">
                        Standard: {process.standardWeight} Kg/Collo
                    </div>
                )}
            </div>
            <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{totalKg.toLocaleString()} <span className="text-xs text-slate-400 font-normal uppercase">Kg</span></div>
                <div className="text-[10px] text-slate-500 font-bold uppercase">{pallets.length} PEDANE • {totalCases} COLLI</div>
            </div>
        </div>
      </div>

      {isOpen ? (
        <div className="p-4 bg-white border-b sticky top-0 shadow-sm z-10">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">Registra Nuova Pedana</h3>
            <form onSubmit={handleSubmit} className="flex gap-2 items-end">
                <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Colli</label>
                    <input 
                        type="text" 
                        inputMode="decimal"
                        required 
                        className="w-full border-slate-300 border rounded px-3 py-2 text-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-300" 
                        placeholder="0" 
                        value={caseCount} 
                        onChange={e => setCaseCount(e.target.value)} 
                        onBlur={handleBlurCaseCount}
                        title="Puoi usare formule (es. 7*5)"
                    />
                </div>
                <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Peso (Kg)</label>
                    <input 
                        type="text"
                        inputMode="decimal"
                        required 
                        className={`w-full border-slate-300 border rounded px-3 py-2 text-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-300 ${process.weightType === WeightType.EGALIZZATO ? 'bg-blue-50/50' : ''}`} 
                        placeholder="0.00" 
                        value={weight} 
                        onChange={e => setWeight(e.target.value)} 
                        onBlur={handleBlurWeight}
                        readOnly={process.weightType === WeightType.EGALIZZATO}
                    />
                </div>
                <button type="submit" className="h-[52px] px-6 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 shadow-md flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50">SALVA</button>
            </form>
            {process.weightType === WeightType.EGALIZZATO && (
                <div className="mt-2 text-[10px] text-blue-500 flex items-center gap-1 font-medium"><Info className="w-3 h-3" /> Il peso è calcolato automaticamente in base ai colli.</div>
            )}
        </div>
      ) : (
          <div className="p-4 bg-slate-200 border-b text-slate-500 text-[10px] font-bold uppercase tracking-widest text-center">Lavorazione Chiusa</div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {pallets.map((pallet, index) => (
            <div key={pallet.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center group hover:border-blue-200 transition-colors">
                <div className="flex items-center gap-4">
                    <div className="bg-slate-50 text-slate-300 font-black text-xs h-8 w-8 rounded-full border border-slate-100 flex items-center justify-center">{pallets.length - index}</div>
                    <div>
                        <div className="font-bold text-slate-800 text-lg leading-none">{pallet.weight} <span className="text-xs font-normal text-slate-400">Kg</span></div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-1.5 font-medium uppercase tracking-wider"><Clock className="w-2.5 h-2.5" />{new Date(pallet.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {pallet.caseCount} Colli</div>
                    </div>
                </div>
                <div className="flex gap-1">
                    <button onClick={() => handlePrint(pallet)} className="text-slate-200 hover:text-blue-500 p-2 transition-colors" title="Stampa Etichetta"><Printer className="w-4 h-4" /></button>
                    {isOpen && <button onClick={() => handleEditPallet(pallet)} className="text-slate-200 hover:text-slate-600 p-2 transition-colors" title="Modifica pedana"><Pencil className="w-4 h-4" /></button>}
                    {isOpen && <button onClick={() => setDeletePalletId(pallet.id)} className="text-slate-200 hover:text-red-500 p-2 transition-colors"><Trash2 className="w-4 h-4" /></button>}
                </div>
            </div>
        ))}
        {pallets.length === 0 && <div className="text-center py-20 text-slate-300 text-xs font-medium uppercase tracking-widest">In attesa della prima pedana...</div>}
      </div>


      <FormModal
        isOpen={!!editingPallet}
        onClose={() => setEditingPallet(null)}
        onSubmit={handleEditPalletSubmit}
        title="Modifica pedana"
        submitLabel="Salva"
      >
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Colli</label>
          <input autoFocus required inputMode="numeric" className="w-full border rounded px-2.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={editCaseCount} onChange={(e) => setEditCaseCount(e.target.value)} />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Peso (Kg)</label>
          <input required inputMode="decimal" className="w-full border rounded px-2.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={editWeight} onChange={(e) => setEditWeight(e.target.value)} />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Note</label>
          <textarea rows={2} className="w-full border rounded px-2.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Lavorazione</label>
          <select className="w-full border rounded px-2.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={editProcessId} onChange={(e) => setEditProcessId(e.target.value)}>
            {processes.map(pr => <option key={pr.id} value={pr.id}>{pr.line} • {pr.productType}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Lotto</label><input className="w-full border rounded px-2.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={editLotCode} onChange={(e) => setEditLotCode(e.target.value)} /></div>
          <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Grezzo</label><input className="w-full border rounded px-2.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={editRawMaterial} onChange={(e) => setEditRawMaterial(e.target.value)} /></div>
          <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Varietà</label><input className="w-full border rounded px-2.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={editVariety} onChange={(e) => setEditVariety(e.target.value)} /></div>
          <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Produttore</label><input className="w-full border rounded px-2.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={editProducer} onChange={(e) => setEditProducer(e.target.value)} /></div>
          <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Articolo</label><input className="w-full border rounded px-2.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={editProductType} onChange={(e) => setEditProductType(e.target.value)} /></div>
          <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Imballaggio</label><input className="w-full border rounded px-2.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={editPackaging} onChange={(e) => setEditPackaging(e.target.value)} /></div>
          <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Linea</label><input className="w-full border rounded px-2.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={editLine} onChange={(e) => setEditLine(e.target.value)} /></div>
          <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Calibro</label><input className="w-full border rounded px-2.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={editCaliber} onChange={(e) => setEditCaliber(e.target.value)} /></div>
        </div>
      </FormModal>


      <DecisionModal
        isOpen={!!pendingPalletUpdate}
        onClose={() => setPendingPalletUpdate(null)}
        title="Propagare alle pedane dello stesso gruppo?"
        message="Hai modificato dati condivisi della pedana. Vuoi applicare la modifica a tutte le pedane della stessa lavorazione?"
        primaryLabel="Sì, propaga"
        secondaryLabel="No, solo questa"
        onConfirmPrimary={() => {
          if (!pendingPalletUpdate) return;
          applyPalletUpdate(pendingPalletUpdate.palletId, pendingPalletUpdate.payload, true);
          setPendingPalletUpdate(null);
        }}
        onConfirmSecondary={() => {
          if (!pendingPalletUpdate) return;
          applyPalletUpdate(pendingPalletUpdate.palletId, pendingPalletUpdate.payload, false);
          setPendingPalletUpdate(null);
        }}
      />

      <ConfirmModal 
        isOpen={!!deletePalletId}
        onClose={() => setDeletePalletId(null)}
        onConfirm={() => deletePalletId && deletePallet(deletePalletId)}
        title="Elimina Pedana"
        message="Sei sicuro di voler eliminare definitivamente questa pedana? Il peso totale verrà aggiornato."
        confirmLabel="Elimina"
        isDestructive
      />

      {printingPallet && (
          <div className="fixed inset-0 z-[120] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-8">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
                   <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                       <h3 className="font-bold text-slate-800 flex items-center gap-2"><Printer className="w-5 h-5"/> Anteprima di Stampa</h3>
                       <button onClick={() => setPrintingPallet(null)} className="text-slate-400 hover:text-slate-600"><span className="sr-only">Chiudi</span>&times;</button>
                   </div>
                   <div className="flex-1 bg-slate-200 p-8 flex items-center justify-center overflow-auto">
                       <LabelEditor readOnly mockData={printingPallet} onClose={() => setPrintingPallet(null)} />
                   </div>
                   <div className="p-4 border-t bg-white flex justify-end gap-2">
                       <button onClick={() => setPrintingPallet(null)} className="px-4 py-2 text-slate-600 font-bold text-sm">Chiudi</button>
                       <button onClick={() => setPrintingPallet(null)} className="px-6 py-2 bg-blue-600 text-white rounded font-bold text-sm hover:bg-blue-700 shadow-md">Conferma Stampa</button>
                   </div>
              </div>
          </div>
      )}
    </div>
  );
};
