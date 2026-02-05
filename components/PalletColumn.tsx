
import React, { useState, useEffect } from 'react';
import { useData } from '../services/store';
import { ProcessStatus, WeightType } from '../types';
import { Package, Trash2, Clock, Info, Printer, X } from 'lucide-react';
import { ConfirmModal } from './ui/Modal';
import { LabelEditor } from './LabelEditor';

interface Props {
  processId: string | null;
  onBack?: () => void;
}

export const PalletColumn: React.FC<Props> = ({ processId, onBack }) => {
  const { processes, getPalletsByProcess, addPallet, deletePallet, calibrations, lots, varieties, productTypes, labelLayouts } = useData();
  const [caseCount, setCaseCount] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [deletePalletId, setDeletePalletId] = useState<string | null>(null);
  
  const [printingPallet, setPrintingPallet] = useState<any | null>(null);
  const [printingLayoutId, setPrintingLayoutId] = useState<string | undefined>(undefined);

  const process = processes.find(p => p.id === processId);
  const pallets = processId ? getPalletsByProcess(processId) : [];
  const isOpen = process?.status === ProcessStatus.OPEN;

  const safeCalculate = (value: string): string => {
    if (!value) return '';
    try {
      const normalized = value.replace(/,/g, '.');
      if (/[^0-9\.\+\-\*\/\(\)\s]/.test(normalized)) return value;
      if (!/[\+\-\*\/]/.test(normalized)) return value;
      const result = new Function('return ' + normalized)();
      if (!isFinite(result) || isNaN(result)) return value;
      return String(Math.round(result * 100) / 100);
    } catch { return value; }
  };

  useEffect(() => {
    if (process?.weightType === WeightType.EGALIZZATO && process.standardWeight && caseCount) {
        const safeCases = safeCalculate(caseCount);
        if (!isNaN(parseFloat(safeCases))) {
            setWeight((parseFloat(safeCases) * process.standardWeight).toFixed(2));
        }
    }
  }, [caseCount, process?.weightType, process?.standardWeight]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCases = safeCalculate(caseCount);
    const finalWeight = safeCalculate(weight);
    if (!processId || !finalCases || !finalWeight) return;
    addPallet({ processId, caseCount: parseInt(finalCases), weight: parseFloat(finalWeight), notes: notes || undefined });
    setCaseCount(''); setWeight(''); setNotes('');
  };

  const handlePrint = (pallet: any) => {
      if (!process) return;
      const pt = productTypes.find(p => p.id === process.productTypeId);
      const calibration = calibrations.find(c => c.id === process.calibrationId);
      const lot = calibration?.lotId ? lots.find(l => l.id === calibration.lotId) : null;

      // Determine the layout
      // 1. Specific layout for product
      // 2. Default layout
      // 3. First layout found
      const layoutId = pt?.labelLayoutId || labelLayouts.find(l => l.isDefault)?.id || labelLayouts[0]?.id;

      const printData = {
          ...pallet,
          rawMaterial: calibration?.rawMaterial,
          productType: process.productType,
          variety: calibration?.variety,
          lotCode: lot?.code || '---',
          producer: calibration?.producer,
          packaging: process.packaging,
          quality: pt?.quality
      };
      setPrintingPallet(printData);
      setPrintingLayoutId(layoutId);
  };

  if (!processId || !process) return (
    <div className="flex flex-col h-full items-center justify-center bg-slate-50 text-slate-400 p-8"><Package className="w-12 h-12 mb-4 opacity-20" /><p>Seleziona una lavorazione.</p></div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="bg-white p-4 border-b shadow-sm z-10 flex justify-between items-end shrink-0">
        <div>
            {onBack && <button onClick={onBack} className="text-xs text-blue-600 mb-2 font-medium">&larr; Indietro</button>}
            <h2 className="font-bold text-slate-800 text-lg leading-tight">{process.productType}</h2>
            <div className="text-xs text-slate-500">{process.packaging} • {process.line}</div>
        </div>
        <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{pallets.reduce((a,b) => a+b.weight, 0).toLocaleString()} <span className="text-xs text-slate-400 font-normal">Kg</span></div>
            <div className="text-[10px] text-slate-500 font-bold uppercase">{pallets.length} PEDANE</div>
        </div>
      </div>

      {isOpen && (
        <div className="p-4 bg-white border-b shadow-sm z-10">
            <form onSubmit={handleSubmit} className="flex gap-2 items-end">
                <div className="flex-1"><label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Colli</label><input type="text" inputMode="decimal" required className="w-full border rounded px-3 py-2 text-xl font-bold" placeholder="0" value={caseCount} onChange={e => setCaseCount(e.target.value)} onBlur={() => setCaseCount(safeCalculate(caseCount))} /></div>
                <div className="flex-1"><label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Peso (Kg)</label><input type="text" inputMode="decimal" required className="w-full border rounded px-3 py-2 text-xl font-bold" placeholder="0.00" value={weight} onChange={e => setWeight(e.target.value)} onBlur={() => setWeight(safeCalculate(weight))} readOnly={process.weightType === WeightType.EGALIZZATO} /></div>
                <button type="submit" className="h-[52px] px-6 bg-blue-600 text-white rounded font-bold">SALVA</button>
            </form>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {pallets.map((p, idx) => (
            <div key={p.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center group">
                <div><div className="font-bold text-slate-800">{p.weight} Kg</div><div className="text-[10px] text-slate-500">{p.caseCount} Colli</div></div>
                <div className="flex gap-1">
                    <button onClick={() => handlePrint(p)} className="text-slate-300 hover:text-blue-600 p-2"><Printer className="w-4 h-4" /></button>
                    {isOpen && <button onClick={() => setDeletePalletId(p.id)} className="text-slate-300 hover:text-red-500 p-2"><Trash2 className="w-4 h-4" /></button>}
                </div>
            </div>
        ))}
      </div>

      <ConfirmModal isOpen={!!deletePalletId} onClose={() => setDeletePalletId(null)} onConfirm={() => deletePalletId && deletePallet(deletePalletId)} title="Elimina Pedana" message="Confermi l'eliminazione?" confirmLabel="Elimina" isDestructive />

      {printingPallet && (
          <div className="fixed inset-0 z-[120] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-8">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[650px] flex flex-col overflow-hidden">
                   <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                       <h3 className="font-bold text-slate-800 flex items-center gap-2"><Printer className="w-5 h-5"/> Anteprima Stampa</h3>
                       {/* Added missing X icon here */}
                       <button onClick={() => setPrintingPallet(null)} className="text-slate-400 hover:text-slate-600"><X/></button>
                   </div>
                   <div className="flex-1 bg-slate-200 p-8 flex items-center justify-center overflow-auto">
                       <LabelEditor layoutId={printingLayoutId} readOnly mockData={printingPallet} onClose={() => setPrintingPallet(null)} />
                   </div>
                   <div className="p-4 border-t bg-white flex justify-end gap-2">
                       <button onClick={() => setPrintingPallet(null)} className="px-4 py-2 text-slate-600 font-bold">Chiudi</button>
                       <button onClick={() => { alert('Stampa in corso...'); setPrintingPallet(null); }} className="px-6 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 shadow-md">Stampa</button>
                   </div>
              </div>
          </div>
      )}
    </div>
  );
};
