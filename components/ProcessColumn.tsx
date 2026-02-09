

import { useData } from '../services/store';
import { Process, ProcessStatus, CalibrationStatus } from '../types';
import { Plus, Settings, StopCircle, ArrowUpCircle, X, Pencil, Trash2 } from 'lucide-react';
import { StatusBadge } from './ui/Badge';
import { StatItem } from './ui/Stats';
import { ConfirmModal, DecisionModal, FormModal } from './ui/Modal';

interface Props {
  calibrationId: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onBack?: () => void;
}

export const ProcessColumn: React.FC<Props> = ({ calibrationId, selectedId, onSelect, onBack }) => {
  const { calibrations, getProcessesByCalibration, getPalletsByProcess, addProcess, updateProcess, deleteProcess, closeProcess, updateCalibrationStatus, addIncomingWeight, productTypes, packagings } = useData();
  const [isAdding, setIsAdding] = useState(false);
  const [isLoadingRaw, setIsLoadingRaw] = useState(false);
  const [rawWeightInput, setRawWeightInput] = useState('');
  
  const [formData, setFormData] = useState({ line: '', caliber: '', productTypeId: '', packagingId: '', note: '' });
  const [confirmCloseId, setConfirmCloseId] = useState<string | null>(null);
  const [editingProcess, setEditingProcess] = useState<Process | null>(null);
  const [editLine, setEditLine] = useState('');
  const [editCaliber, setEditCaliber] = useState('');
  const [editProductTypeId, setEditProductTypeId] = useState('');
  const [editPackagingId, setEditPackagingId] = useState('');
  const [editNote, setEditNote] = useState('');
  const [pendingProcessUpdate, setPendingProcessUpdate] = useState<{ processId: string; payload: any } | null>(null);
  const [deleteProcessId, setDeleteProcessId] = useState<string | null>(null);
  
  // Quick Code Inputs

  const calibration = calibrations.find(c => c.id === calibrationId);
  const processes = calibrationId ? getProcessesByCalibration(calibrationId) : [];


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


  const handleQuickEditProcess = (proc: Process, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProcess(proc);
    setEditLine(proc.line);
    setEditCaliber(proc.caliber);
    setEditProductTypeId(proc.productTypeId || '');
    setEditPackagingId(proc.packagingId || '');
    setEditNote(proc.note || '');
  };

  const applyProcessUpdate = (processId: string, payload: any, propagateToLinkedPallets: boolean) => {
    updateProcess(processId, payload, { propagateToLinkedPallets });
    setEditingProcess(null);
  };

  const handleEditProcessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProcess) return;
    const line = editLine.trim();
    const caliber = editCaliber.trim();
    if (!line || !caliber || !editProductTypeId || !editPackagingId) return;

    const pt = productTypes.find(p => p.id === editProductTypeId);
    const pkg = packagings.find(p => p.id === editPackagingId);

    const payload = {
      line,
      caliber,
      productTypeId: editProductTypeId,
      productType: pt?.name || '',
      packagingId: editPackagingId,
      packaging: pkg?.name || '',
      note: editNote.trim() || undefined,
    };

    const linkedPalletsCount = getPalletsByProcess(editingProcess.id).length;
    const affectsPalletSnapshots = payload.line !== editingProcess.line
      || payload.caliber !== editingProcess.caliber
      || payload.productTypeId !== editingProcess.productTypeId
      || payload.packagingId !== editingProcess.packagingId;

    if (linkedPalletsCount > 0 && affectsPalletSnapshots) {
      setPendingProcessUpdate({ processId: editingProcess.id, payload });
      return;
    }

    applyProcessUpdate(editingProcess.id, payload, false);
  };

  const handleDeleteProcess = (proc: Process, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteProcessId(proc.id);
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
      packaging: packagings.find(pkg => pkg.id === formData.packagingId)?.name || '',
      note: formData.note.trim() || undefined,
    });
    setFormData({ line: '', caliber: '', productTypeId: '', packagingId: '', note: '' });
    setIsAdding(false);
  };


  const renderProcessFields = (options: {
    line: string;
    caliber: string;
    productTypeId: string;
    packagingId: string;
    note: string;
    onLineChange: (v: string) => void;
    onCaliberChange: (v: string) => void;
    onProductTypeChange: (v: string) => void;
    onPackagingChange: (v: string) => void;
    onNoteChange: (v: string) => void;
    lineAutoFocus?: boolean;
  }) => (
    <>
      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Linea</label>
        <input autoFocus={options.lineAutoFocus} required className="w-full border rounded px-2.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={options.line} onChange={(e) => options.onLineChange(e.target.value)} />
      </div>
      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Calibro</label>
        <input required className="w-full border rounded px-2.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={options.caliber} onChange={(e) => options.onCaliberChange(e.target.value)} />
      </div>
      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Articolo</label>
        <select required className="w-full border rounded px-2.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={options.productTypeId} onChange={(e) => options.onProductTypeChange(e.target.value)}>
          <option value="">Seleziona...</option>
          {availableProductTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.name} ({pt.code})</option>)}
        </select>
      </div>
      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Imballaggio</label>
        <select required className="w-full border rounded px-2.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={options.packagingId} onChange={(e) => options.onPackagingChange(e.target.value)}>
          <option value="">Seleziona...</option>
          {packagings.map(pkg => <option key={pkg.id} value={pkg.id}>{pkg.name} ({pkg.code})</option>)}
        </select>
      </div>
      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Note</label>
        <textarea rows={2} className="w-full border rounded px-2.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={options.note} onChange={(e) => options.onNoteChange(e.target.value)} />
      </div>
    </>
  );

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
             {renderProcessFields({
               line: formData.line,
               caliber: formData.caliber,
               productTypeId: formData.productTypeId,
               packagingId: formData.packagingId,
               note: formData.note,
               onLineChange: (v) => setFormData({ ...formData, line: v }),
               onCaliberChange: (v) => setFormData({ ...formData, caliber: v }),
               onProductTypeChange: (v) => setFormData({ ...formData, productTypeId: v }),
               onPackagingChange: (v) => setFormData({ ...formData, packagingId: v }),
               onNoteChange: (v) => setFormData({ ...formData, note: v }),
             })}

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
                        <div className="flex items-center gap-1">
                          <button onClick={(e) => handleQuickEditProcess(proc, e)} className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100" title="Modifica lavorazione"><Pencil className="w-3.5 h-3.5"/></button>
                          <button onClick={(e) => handleDeleteProcess(proc, e)} className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50" title="Elimina lavorazione"><Trash2 className="w-3.5 h-3.5"/></button>
                          {proc.status === ProcessStatus.OPEN && <button onClick={(e) => { e.stopPropagation(); setConfirmCloseId(proc.id); }} className="text-[10px] text-red-500 hover:bg-red-50 px-2 py-0.5 rounded font-bold uppercase"><StopCircle className="w-3 h-3 inline mr-1" /> Termina</button>}
                        </div>
                    </div>
                    <div className="text-xs text-slate-600 mb-1 font-medium truncate">{proc.productType}</div>
                    {proc.note && <div className="text-[10px] text-slate-500 mb-2 line-clamp-2">{proc.note}</div>}
                    <div className="grid grid-cols-3 gap-1 border-t pt-2"><StatItem label="Ped." value={pstats.count} /><StatItem label="Colli" value={pstats.colli} /><StatItem label="Kg" value={pstats.kg.toLocaleString()} highlight /></div>
                </div>
            </div>
          );
        })}
      </div>


      <FormModal
        isOpen={!!editingProcess}
        onClose={() => setEditingProcess(null)}
        onSubmit={handleEditProcessSubmit}
        title="Modifica lavorazione"
        submitLabel="Salva"
      >
        {renderProcessFields({
          line: editLine,
          caliber: editCaliber,
          productTypeId: editProductTypeId,
          packagingId: editPackagingId,
          note: editNote,
          onLineChange: setEditLine,
          onCaliberChange: setEditCaliber,
          onProductTypeChange: setEditProductTypeId,
          onPackagingChange: setEditPackagingId,
          onNoteChange: setEditNote,
          lineAutoFocus: true,
        })}
      </FormModal>


      <DecisionModal
        isOpen={!!pendingProcessUpdate}
        onClose={() => setPendingProcessUpdate(null)}
        title="Propagare modifica alle pedane?"
        message="Hai modificato dati della lavorazione (articolo/imballaggio/linea/calibro). Vuoi aggiornare anche le pedane già collegate?"
        primaryLabel="Sì, propaga"
        secondaryLabel="No, solo lavorazione"
        onConfirmPrimary={() => {
          if (!pendingProcessUpdate) return;
          applyProcessUpdate(pendingProcessUpdate.processId, pendingProcessUpdate.payload, true);
          setPendingProcessUpdate(null);
        }}
        onConfirmSecondary={() => {
          if (!pendingProcessUpdate) return;
          applyProcessUpdate(pendingProcessUpdate.processId, pendingProcessUpdate.payload, false);
          setPendingProcessUpdate(null);
        }}
      />

      <ConfirmModal
        isOpen={!!deleteProcessId}
        onClose={() => setDeleteProcessId(null)}
        onConfirm={() => deleteProcessId && deleteProcess(deleteProcessId)}
        title="Elimina lavorazione"
        message="Verranno eliminate anche le pedane collegate. Confermi?"
        confirmLabel="Elimina"
        isDestructive
      />

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
