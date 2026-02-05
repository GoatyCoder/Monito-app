
import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../services/store';
import { Trash2, Tag, Scale, Boxes, Sparkles, Pencil, X, Hash, Search, ChevronLeft, ChevronRight, AlertCircle, Barcode, Printer, Plus, ArrowRight } from 'lucide-react';
import { WeightType, ProductQuality, ProductNature } from '../types';
import { LabelEditor } from './LabelEditor'; // Import the new editor

type Tab = 'GREZZI' | 'TIPOLOGIE' | 'VARIETA' | 'IMBALLAGGI' | 'LAVORATI' | 'LOTTI' | 'ETICHETTA';

const ITEMS_PER_PAGE = 10;

export const RegistryManager: React.FC = () => {
  const { 
    rawMaterials, addRawMaterial, updateRawMaterial, deleteRawMaterial,
    subtypes, addSubtype, updateSubtype, deleteSubtype,
    varieties, addVariety, updateVariety, deleteVariety,
    packagings, addPackaging, updatePackaging, deletePackaging,
    productTypes, addProductType, updateProductType, deleteProductType,
    lots, addLot, updateLot, deleteLot
  } = useData();

  const [activeTab, setActiveTab] = useState<Tab>('GREZZI');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Filtering & Pagination State
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Input States
  const [newRawMaterial, setNewRawMaterial] = useState('');
  const [newRawCode, setNewRawCode] = useState('');
  const [newRawCalibers, setNewRawCalibers] = useState<string[]>([]); // Array of calibers
  const [tempCaliberInput, setTempCaliberInput] = useState(''); // Input for adding caliber

  const [newSubtypeName, setNewSubtypeName] = useState('');
  const [newSubtypeRawId, setNewSubtypeRawId] = useState('');
  const [newVarietyName, setNewVarietyName] = useState('');
  const [newVarietyCode, setNewVarietyCode] = useState('');
  const [newVarietyRawId, setNewVarietyRawId] = useState('');
  const [newVarietySubtypeId, setNewVarietySubtypeId] = useState('');
  const [newPkgName, setNewPkgName] = useState('');
  const [newPkgCode, setNewPkgCode] = useState('');

  // Lavorati State
  const [ptForm, setPtForm] = useState({
    code: '',
    name: '', 
    nature: ProductNature.FINITO,
    quality: ProductQuality.PRIMA, 
    ean: '',
    weightType: WeightType.VARIABILE, 
    standardWeight: '',
    rawMaterialId: '', 
    subtypeId: '', 
    varietyId: ''
  });

  // Lotti State
  const [lotForm, setLotForm] = useState({
      code: '',
      rawMaterialId: '',
      subtypeId: '',
      varietyId: '',
      producer: '',
      notes: ''
  });

  // Reset logic on navigation
  useEffect(() => {
    cancelEdit();
    setSearchTerm('');
    setCurrentPage(1);
    setValidationError(null);
  }, [activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const cancelEdit = () => {
    setEditingId(null);
    setValidationError(null);
    setNewRawMaterial('');
    setNewRawCode('');
    setNewRawCalibers([]);
    setTempCaliberInput('');
    setNewSubtypeName('');
    setNewSubtypeRawId('');
    setNewVarietyName('');
    setNewVarietyCode('');
    setNewVarietyRawId('');
    setNewVarietySubtypeId('');
    setNewPkgName('');
    setNewPkgCode('');
    setPtForm({ 
        code: '', name: '', nature: ProductNature.FINITO, quality: ProductQuality.PRIMA, ean: '', 
        weightType: WeightType.VARIABILE, standardWeight: '', rawMaterialId: '', subtypeId: '', varietyId: '' 
    });
    setLotForm({ code: '', rawMaterialId: '', subtypeId: '', varietyId: '', producer: '', notes: '' });
  };

  // --- FILTER LOGIC ---
  const filteredData = useMemo(() => {
    const s = searchTerm.toLowerCase();
    switch (activeTab) {
      case 'GREZZI':
        return rawMaterials.filter(rm => rm.name.toLowerCase().includes(s) || rm.code.toLowerCase().includes(s));
      case 'TIPOLOGIE':
        return subtypes.filter(st => {
          const rmName = rawMaterials.find(r => r.id === st.rawMaterialId)?.name.toLowerCase() || '';
          return st.name.toLowerCase().includes(s) || rmName.includes(s);
        });
      case 'VARIETA':
        return varieties.filter(v => {
          const rmName = rawMaterials.find(r => r.id === v.rawMaterialId)?.name.toLowerCase() || '';
          return v.name.toLowerCase().includes(s) || v.code.toLowerCase().includes(s) || rmName.includes(s);
        });
      case 'IMBALLAGGI':
        return packagings.filter(p => p.name.toLowerCase().includes(s) || p.code.toLowerCase().includes(s));
      case 'LAVORATI':
        return productTypes.filter(pt => 
          pt.name.toLowerCase().includes(s) || 
          pt.code.toLowerCase().includes(s) || 
          pt.quality.toLowerCase().includes(s) ||
          pt.nature.toLowerCase().includes(s)
        );
      case 'LOTTI':
        return lots.filter(l => 
            l.code.toLowerCase().includes(s) || 
            l.producer.toLowerCase().includes(s)
        );
      default:
        return [];
    }
  }, [activeTab, searchTerm, rawMaterials, subtypes, varieties, packagings, productTypes, lots]);

  // --- PAGINATION LOGIC ---
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  // UI Handlers
  const handleEditRawMaterial = (rm: any) => { 
      setEditingId(rm.id); 
      setNewRawMaterial(rm.name); 
      setNewRawCode(rm.code); 
      setNewRawCalibers(rm.calibers || []);
      setValidationError(null); 
  };
  const handleEditSubtype = (st: any) => { setEditingId(st.id); setNewSubtypeName(st.name); setNewSubtypeRawId(st.rawMaterialId); setValidationError(null); };
  const handleEditVariety = (v: any) => { setEditingId(v.id); setNewVarietyName(v.name); setNewVarietyCode(v.code); setNewVarietyRawId(v.rawMaterialId); setNewVarietySubtypeId(v.subtypeId || ''); setValidationError(null); };
  const handleEditPkg = (pkg: any) => { setEditingId(pkg.id); setNewPkgName(pkg.name); setNewPkgCode(pkg.code); setValidationError(null); };
  const handleEditPt = (pt: any) => {
    setEditingId(pt.id);
    setValidationError(null);
    setPtForm({
        code: pt.code, name: pt.name, nature: pt.nature, quality: pt.quality, ean: pt.ean || '',
        weightType: pt.weightType, standardWeight: pt.standardWeight?.toString() || '',
        rawMaterialId: pt.rawMaterialId || '', subtypeId: pt.subtypeId || '', varietyId: pt.varietyId || ''
    });
  };
  const handleEditLot = (l: any) => {
      setEditingId(l.id);
      setValidationError(null);
      setLotForm({
          code: l.code,
          rawMaterialId: l.rawMaterialId,
          subtypeId: l.subtypeId || '',
          varietyId: l.varietyId || '',
          producer: l.producer,
          notes: l.notes || ''
      });
  };

  const handleAddRawMaterial = (e: React.FormEvent) => { 
    e.preventDefault(); 
    const code = newRawCode.trim().toUpperCase();
    const payload = { 
        name: newRawMaterial.trim(), 
        code, 
        calibers: newRawCalibers // Save calibers
    };
    const success = editingId ? updateRawMaterial(editingId, payload) : addRawMaterial(payload);
    if (!success) setValidationError(`Codice "${code}" già esistente!`);
    else cancelEdit();
  };

  const addCaliber = () => {
      if (tempCaliberInput.trim()) {
          setNewRawCalibers([...newRawCalibers, tempCaliberInput.trim().toUpperCase()]);
          setTempCaliberInput('');
      }
  };

  const removeCaliber = (index: number) => {
      setNewRawCalibers(newRawCalibers.filter((_, i) => i !== index));
  };

  const handleAddSubtype = (e: React.FormEvent) => { 
    e.preventDefault(); 
    if(newSubtypeName.trim() && newSubtypeRawId) { 
        if(editingId) updateSubtype(editingId, newSubtypeName.trim(), newSubtypeRawId);
        else addSubtype(newSubtypeName.trim(), newSubtypeRawId); 
        cancelEdit();
    } 
  };

  const handleAddVariety = (e: React.FormEvent) => { 
    e.preventDefault(); 
    const code = newVarietyCode.trim().toUpperCase();
    const payload = { name: newVarietyName.trim(), code, rawMaterialId: newVarietyRawId, subtypeId: newVarietySubtypeId || undefined };
    const success = editingId ? updateVariety(editingId, payload) : addVariety(payload);
    if (!success) setValidationError(`Codice "${code}" già esistente!`);
    else cancelEdit();
  };

  const handleAddPkg = (e: React.FormEvent) => { 
    e.preventDefault(); 
    const code = newPkgCode.trim().toUpperCase();
    const payload = { name: newPkgName.trim(), code };
    const success = editingId ? updatePackaging(editingId, payload) : addPackaging(payload);
    if (!success) setValidationError(`Codice "${code}" già esistente!`);
    else cancelEdit();
  };

  const handleAddPt = (e: React.FormEvent) => {
    e.preventDefault();
    const code = ptForm.code.trim().toUpperCase();
    const payload = {
        ...ptForm,
        code,
        name: ptForm.name.trim(),
        ean: ptForm.ean.trim() || undefined,
        standardWeight: ptForm.weightType === WeightType.EGALIZZATO ? parseFloat(ptForm.standardWeight) : undefined,
        rawMaterialId: ptForm.rawMaterialId || undefined,
        subtypeId: ptForm.subtypeId || undefined,
        varietyId: ptForm.varietyId || undefined
    };
    const success = editingId ? updateProductType(editingId, payload) : addProductType(payload);
    if (!success) setValidationError(`Codice "${code}" già esistente!`);
    else cancelEdit();
  };

  const handleAddLot = (e: React.FormEvent) => {
      e.preventDefault();
      const code = lotForm.code.trim().toUpperCase();
      const payload = {
          ...lotForm,
          code,
          subtypeId: lotForm.subtypeId || undefined,
          varietyId: lotForm.varietyId || undefined,
          notes: lotForm.notes || undefined
      };
      const success = editingId ? updateLot(editingId, payload) : addLot(payload);
      if (!success) setValidationError(`Codice Lotto "${code}" già esistente!`);
      else cancelEdit();
  };

  const TabButton = ({ id, label }: { id: Tab, label: string }) => (
    <button onClick={() => setActiveTab(id)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{label}</button>
  );

  const FilterBar = () => (
    <div className="relative mb-4">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input 
        type="text"
        className="w-full pl-10 pr-10 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
        placeholder={`Filtra ${activeTab.toLowerCase()}...`}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      {searchTerm && (
        <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  const Pagination = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200">
        <div className="text-xs text-slate-500">
          Pagina <span className="font-bold text-slate-700">{currentPage}</span> di <span className="font-bold text-slate-700">{totalPages}</span>
          <span className="ml-2">({filteredData.length} elementi)</span>
        </div>
        <div className="flex gap-2">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
            className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const ErrorAlert = () => {
    if (!validationError) return null;
    return (
      <div className="flex items-center gap-2 bg-red-50 text-red-600 p-2 rounded border border-red-100 mb-4 animate-in fade-in slide-in-from-top-2">
        <AlertCircle className="w-4 h-4" />
        <span className="text-xs font-bold">{validationError}</span>
      </div>
    );
  };

  // Helper to determine if subtype should be locked
  const isLotSubtypeLocked = useMemo(() => {
    if (!lotForm.varietyId) return false;
    const v = varieties.find(x => x.id === lotForm.varietyId);
    return !!v?.subtypeId;
  }, [lotForm.varietyId, varieties]);

  // Filter varieties for Lot form
  const availableLotVarieties = useMemo(() => {
    if (!lotForm.rawMaterialId) return [];
    return varieties.filter(v => {
        if (v.rawMaterialId !== lotForm.rawMaterialId) return false;
        if (lotForm.subtypeId) return !v.subtypeId || v.subtypeId === lotForm.subtypeId;
        return true;
    });
  }, [lotForm.rawMaterialId, lotForm.subtypeId, varieties]);

  return (
    <div className="flex flex-col h-full bg-slate-50">
        <div className="bg-white border-b border-slate-200 px-6 pt-4 shrink-0">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-slate-800">Gestione Anagrafiche</h2>
                <div className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-bold uppercase tracking-widest border border-blue-100">Setup Mode</div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
                <TabButton id="GREZZI" label="Grezzi" />
                <TabButton id="TIPOLOGIE" label="Tipologie" />
                <TabButton id="VARIETA" label="Varietà" />
                <TabButton id="IMBALLAGGI" label="Imballaggi" />
                <TabButton id="LAVORATI" label="Lavorati" />
                <TabButton id="LOTTI" label="Lotti" />
                <TabButton id="ETICHETTA" label="Etichetta" />
            </div>
        </div>

        <div className="flex-1 overflow-auto p-0 max-w-full mx-auto w-full">
            {activeTab === 'ETICHETTA' ? (
                <LabelEditor />
            ) : (
                <div className="p-6 max-w-5xl mx-auto">
                    <ErrorAlert />
                    {/* ... Existing Tabs Content ... */}
                    {activeTab === 'GREZZI' && (
                        <div className="space-y-6">
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                                <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">{editingId ? 'Modifica Grezzo' : 'Aggiungi Grezzo'}</h3>
                                <form onSubmit={handleAddRawMaterial} className="space-y-4">
                                    <div className="flex gap-2">
                                        <input className="w-32 border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase" placeholder="Codice (MND)" value={newRawCode} onChange={e => { setNewRawCode(e.target.value); setValidationError(null); }} required />
                                        <input className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nome (Es. Mandarini)" value={newRawMaterial} onChange={e => setNewRawMaterial(e.target.value)} required />
                                    </div>
                                    
                                    {/* Calibers Management */}
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase flex items-center gap-1"><Scale className="w-3 h-3"/> Scala Calibri (Opzionale)</label>
                                        <div className="flex gap-2 mb-2">
                                            <input 
                                                className="w-32 border border-slate-300 rounded px-2 py-1.5 text-xs font-mono uppercase" 
                                                placeholder="Es. 1X" 
                                                value={tempCaliberInput} 
                                                onChange={e => setTempCaliberInput(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCaliber())} 
                                            />
                                            <button type="button" onClick={addCaliber} className="bg-slate-200 text-slate-600 px-3 py-1.5 rounded text-xs font-bold hover:bg-slate-300"><Plus className="w-3 h-3"/></button>
                                        </div>
                                        {newRawCalibers.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {newRawCalibers.map((cal, idx) => (
                                                    <div key={idx} className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded shadow-sm text-xs font-mono font-bold">
                                                        <span>{idx+1}.</span> <span className="text-blue-600">{cal}</span>
                                                        <button type="button" onClick={() => removeCaliber(idx)} className="text-slate-400 hover:text-red-500 ml-1"><X className="w-3 h-3"/></button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-[10px] text-slate-400 italic">Nessun calibro definito. Verrà usato input libero.</p>
                                        )}
                                    </div>

                                    <div className="flex justify-end gap-2">
                                        {editingId && <button type="button" onClick={cancelEdit} className="px-4 py-2 text-slate-500 bg-slate-100 rounded text-sm font-medium hover:bg-slate-200">Annulla</button>}
                                        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700">{editingId ? 'Aggiorna' : 'Aggiungi'}</button>
                                    </div>
                                </form>
                            </div>
                            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-4 bg-slate-50 border-b border-slate-200">
                                    <FilterBar />
                                </div>
                                <table className="w-full text-sm text-left"><thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200"><tr><th className="px-4 py-3 w-32">Codice</th><th className="px-4 py-3">Nome Grezzo</th><th className="px-4 py-3">Calibri</th><th className="px-4 py-3 w-32 text-right">Azioni</th></tr></thead><tbody className="divide-y divide-slate-100">{paginatedData.map((rm: any) => (<tr key={rm.id} className={`hover:bg-slate-50 ${editingId === rm.id ? 'bg-blue-50' : ''}`}><td className="px-4 py-3 font-mono font-bold text-blue-600">{rm.code}</td><td className="px-4 py-3 font-medium text-slate-800">{rm.name}</td><td className="px-4 py-3 text-xs text-slate-500">{rm.calibers?.length ? <div className="flex gap-1 flex-wrap">{rm.calibers.map((c:string, i:number) => <span key={i} className="bg-slate-100 px-1 rounded border border-slate-200">{c}</span>)}</div> : '-'}</td><td className="px-4 py-3 text-right flex gap-2 justify-end"><button onClick={() => handleEditRawMaterial(rm)} className="text-slate-400 hover:text-blue-600 p-1"><Pencil className="w-4 h-4" /></button><button onClick={() => deleteRawMaterial(rm.id)} className="text-slate-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button></td></tr>))}</tbody></table>
                                {filteredData.length === 0 && <div className="p-10 text-center text-slate-400 text-sm">Nessun elemento corrispondente alla ricerca.</div>}
                                <Pagination />
                            </div>
                        </div>
                    )}
                    {activeTab === 'TIPOLOGIE' && (
                        <div className="space-y-6">
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                                <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">{editingId ? 'Modifica Tipologia' : 'Aggiungi Tipologia'}</h3>
                                <form onSubmit={handleAddSubtype} className="flex gap-2 items-end">
                                    <div className="w-1/3">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Grezzo</label>
                                        <select required className="w-full border border-slate-300 rounded px-3 py-2 text-sm bg-white" value={newSubtypeRawId} onChange={e => setNewSubtypeRawId(e.target.value)}>
                                            <option value="">Seleziona...</option>
                                            {rawMaterials.map(rm => <option key={rm.id} value={rm.id}>{rm.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Nome Tipologia</label>
                                        <input className="w-full border border-slate-300 rounded px-3 py-2 text-sm" placeholder="Es. Rossa senza semi..." value={newSubtypeName} onChange={e => setNewSubtypeName(e.target.value)} required />
                                    </div>
                                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 h-[38px]">{editingId ? 'Aggiorna' : 'Aggiungi'}</button>
                                    {editingId && <button type="button" onClick={cancelEdit} className="h-[38px] p-2 text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>}
                                </form>
                            </div>
                            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-4 bg-slate-50 border-b border-slate-200">
                                    <FilterBar />
                                </div>
                                <table className="w-full text-sm text-left"><thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200"><tr><th className="px-4 py-3">Tipologia</th><th className="px-4 py-3">Grezzo</th><th className="px-4 py-3 w-32 text-right">Azioni</th></tr></thead><tbody className="divide-y divide-slate-100">{paginatedData.map((st: any) => (<tr key={st.id} className={`hover:bg-slate-50 ${editingId === st.id ? 'bg-blue-50' : ''}`}><td className="px-4 py-3 font-medium text-slate-800">{st.name}</td><td className="px-4 py-3 text-slate-600">{rawMaterials.find(r => r.id === st.rawMaterialId)?.name || '-'}</td><td className="px-4 py-3 text-right flex gap-2 justify-end"><button onClick={() => handleEditSubtype(st)} className="text-slate-400 hover:text-blue-600 p-1"><Pencil className="w-4 h-4" /></button><button onClick={() => deleteSubtype(st.id)} className="text-slate-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button></td></tr>))}</tbody></table>
                                {filteredData.length === 0 && <div className="p-10 text-center text-slate-400 text-sm">Nessun elemento corrispondente alla ricerca.</div>}
                                <Pagination />
                            </div>
                        </div>
                    )}

                    {activeTab === 'VARIETA' && (
                        <div className="space-y-6">
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                                <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">{editingId ? 'Modifica Varietà' : 'Aggiungi Varietà'}</h3>
                                <form onSubmit={handleAddVariety} className="grid grid-cols-12 gap-3 items-end">
                                    <div className="col-span-3">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Grezzo</label>
                                        <select required className="w-full border border-slate-300 rounded px-3 py-2 text-sm bg-white" value={newVarietyRawId} onChange={e => { setNewVarietyRawId(e.target.value); setNewVarietySubtypeId(''); }}>
                                            <option value="">Seleziona...</option>
                                            {rawMaterials.map(rm => <option key={rm.id} value={rm.id}>{rm.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-3">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Tipologia (Opz.)</label>
                                        <select className="w-full border border-slate-300 rounded px-3 py-2 text-sm bg-white" value={newVarietySubtypeId} onChange={e => setNewVarietySubtypeId(e.target.value)} disabled={!newVarietyRawId}>
                                            <option value="">Globale</option>
                                            {subtypes.filter(st => st.rawMaterialId === newVarietyRawId).map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Codice</label>
                                        <input className="w-full border border-slate-300 rounded px-3 py-2 text-sm font-mono uppercase" placeholder="NAD" value={newVarietyCode} onChange={e => { setNewVarietyCode(e.target.value); setValidationError(null); }} required />
                                    </div>
                                    <div className="col-span-4">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Nome Varietà</label>
                                        <input className="w-full border border-slate-300 rounded px-3 py-2 text-sm" placeholder="Autumn Crisp..." value={newVarietyName} onChange={e => setNewVarietyName(e.target.value)} required />
                                    </div>
                                    <div className="col-span-12 flex justify-end gap-2">
                                        {editingId && <button type="button" onClick={cancelEdit} className="px-4 py-2 text-sm font-bold text-slate-500 bg-slate-100 rounded hover:bg-slate-200">Annulla</button>}
                                        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700">{editingId ? 'Salva Modifiche' : 'Aggiungi'}</button>
                                    </div>
                                </form>
                            </div>
                            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-4 bg-slate-50 border-b border-slate-200">
                                    <FilterBar />
                                </div>
                                <table className="w-full text-sm text-left"><thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200"><tr><th className="px-4 py-3 w-32">Codice</th><th className="px-4 py-3">Varietà</th><th className="px-4 py-3">Appartenenza</th><th className="px-4 py-3 w-32 text-right">Azioni</th></tr></thead><tbody className="divide-y divide-slate-100">{paginatedData.map((v: any) => (<tr key={v.id} className={`hover:bg-slate-50 ${editingId === v.id ? 'bg-blue-50' : ''}`}><td className="px-4 py-3 font-mono font-bold text-blue-600">{v.code}</td><td className="px-4 py-3 font-medium text-slate-800">{v.name}</td><td className="px-4 py-3 text-slate-600 text-xs">{rawMaterials.find(r => r.id === v.rawMaterialId)?.name || '-'} {v.subtypeId && <span className="text-[10px] bg-slate-100 px-1 rounded ml-2">{subtypes.find(s => s.id === v.subtypeId)?.name}</span>}</td><td className="px-4 py-3 text-right flex gap-2 justify-end"><button onClick={() => handleEditVariety(v)} className="text-slate-400 hover:text-blue-600 p-1"><Pencil className="w-4 h-4" /></button><button onClick={() => deleteVariety(v.id)} className="text-slate-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button></td></tr>))}</tbody></table>
                                {filteredData.length === 0 && <div className="p-10 text-center text-slate-400 text-sm">Nessun elemento corrispondente alla ricerca.</div>}
                                <Pagination />
                            </div>
                        </div>
                    )}
                    {activeTab === 'IMBALLAGGI' && (
                        <div className="space-y-6">
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                                <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">{editingId ? 'Modifica Imballaggio' : 'Aggiungi Imballaggio'}</h3>
                                <form onSubmit={handleAddPkg} className="flex gap-2">
                                    <input className="w-32 border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase" placeholder="C34" value={newPkgCode} onChange={e => { setNewPkgCode(e.target.value); setValidationError(null); }} required />
                                    <input className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Es. Cassetta 30x40..." value={newPkgName} onChange={e => setNewPkgName(e.target.value)} required />
                                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700">{editingId ? 'Aggiorna' : 'Aggiungi'}</button>
                                    {editingId && <button type="button" onClick={cancelEdit} className="p-2 text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>}
                                </form>
                            </div>
                            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-4 bg-slate-50 border-b border-slate-200">
                                    <FilterBar />
                                </div>
                                <table className="w-full text-sm text-left"><thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200"><tr><th className="px-4 py-3 w-32">Codice</th><th className="px-4 py-3">Tipo Imballaggio</th><th className="px-4 py-3 w-32 text-right">Azioni</th></tr></thead><tbody className="divide-y divide-slate-100">{paginatedData.map((p: any) => (<tr key={p.id} className={`hover:bg-slate-50 ${editingId === p.id ? 'bg-blue-50' : ''}`}><td className="px-4 py-3 font-mono font-bold text-blue-600">{p.code}</td><td className="px-4 py-3 font-medium text-slate-800">{p.name}</td><td className="px-4 py-3 text-right flex gap-2 justify-end"><button onClick={() => handleEditPkg(p)} className="text-slate-400 hover:text-blue-600 p-1"><Pencil className="w-4 h-4" /></button><button onClick={() => deletePackaging(p.id)} className="text-slate-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button></td></tr>))}</tbody></table>
                                {filteredData.length === 0 && <div className="p-10 text-center text-slate-400 text-sm">Nessun elemento corrispondente alla ricerca.</div>}
                                <Pagination />
                            </div>
                        </div>
                    )}
                    {activeTab === 'LAVORATI' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                            <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">{editingId ? 'Modifica Articolo' : 'Nuovo Articolo'}</h3>
                            <form onSubmit={handleAddPt} className="space-y-4">
                                <div className="grid grid-cols-12 gap-3">
                                    <div className="col-span-12 md:col-span-2">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Codice</label>
                                        <input required className="w-full border border-slate-300 rounded px-3 py-2 text-sm font-mono uppercase" placeholder="M12" value={ptForm.code} onChange={e => { setPtForm({...ptForm, code: e.target.value}); setValidationError(null); }} />
                                    </div>
                                    <div className="col-span-12 md:col-span-6">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Nome Articolo</label>
                                        <input required className="w-full border border-slate-300 rounded px-3 py-2 text-sm" placeholder="Mandarini 12x1kg Girsac" value={ptForm.name} onChange={e => setPtForm({...ptForm, name: e.target.value})} />
                                    </div>
                                    <div className="col-span-12 md:col-span-4">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Natura Prodotto</label>
                                        <select className="w-full border border-slate-300 rounded px-3 py-2 text-sm bg-white" value={ptForm.nature} onChange={e => setPtForm({...ptForm, nature: e.target.value as ProductNature})}>
                                            {Object.values(ProductNature).map(v => <option key={v} value={v}>{v}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-12 md:col-span-4">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Qualità (Categoria)</label>
                                        <select className="w-full border border-slate-300 rounded px-3 py-2 text-sm bg-white" value={ptForm.quality} onChange={e => setPtForm({...ptForm, quality: e.target.value as ProductQuality})}>
                                            {Object.values(ProductQuality).map(v => <option key={v} value={v}>{v}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-12 md:col-span-4">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Codice EAN</label>
                                        <input className="w-full border border-slate-300 rounded px-3 py-2 text-sm" placeholder="800..." value={ptForm.ean} onChange={e => setPtForm({...ptForm, ean: e.target.value})} />
                                    </div>
                                    <div className="col-span-12 md:col-span-2">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Peso</label>
                                        <select className="w-full border border-slate-300 rounded px-3 py-2 text-sm bg-white" value={ptForm.weightType} onChange={e => setPtForm({...ptForm, weightType: e.target.value as WeightType})}>
                                            <option value={WeightType.VARIABILE}>Variabile</option>
                                            <option value={WeightType.EGALIZZATO}>Egalizzato</option>
                                        </select>
                                    </div>
                                    <div className="col-span-12 md:col-span-2">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Peso Std</label>
                                        <input disabled={ptForm.weightType !== WeightType.EGALIZZATO} className="w-full border border-slate-300 rounded px-3 py-2 text-sm disabled:bg-slate-50" type="number" step="0.01" value={ptForm.standardWeight} onChange={e => setPtForm({...ptForm, standardWeight: e.target.value})} />
                                    </div>
                                </div>

                                <div className="border-t pt-4 bg-slate-50 -mx-4 px-4 pb-4 rounded-b-lg">
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-widest flex items-center gap-2"><Tag className="w-3 h-3"/> Vincoli</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Grezzo</label>
                                            <select className="w-full border border-slate-300 rounded px-3 py-1.5 text-xs bg-white" value={ptForm.rawMaterialId} onChange={e => setPtForm({...ptForm, rawMaterialId: e.target.value, subtypeId: '', varietyId: ''})}>
                                                <option value="">Qualsiasi</option>
                                                {rawMaterials.map(rm => <option key={rm.id} value={rm.id}>{rm.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Tipologia</label>
                                            <select disabled={!ptForm.rawMaterialId} className="w-full border border-slate-300 rounded px-3 py-1.5 text-xs bg-white disabled:opacity-50" value={ptForm.subtypeId} onChange={e => setPtForm({...ptForm, subtypeId: e.target.value})}>
                                                <option value="">Qualsiasi</option>
                                                {subtypes.filter(s => s.rawMaterialId === ptForm.rawMaterialId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Varietà</label>
                                            <select disabled={!ptForm.rawMaterialId} className="w-full border border-slate-300 rounded px-3 py-1.5 text-xs bg-white disabled:opacity-50" value={ptForm.varietyId} onChange={e => setPtForm({...ptForm, varietyId: e.target.value})}>
                                                <option value="">Qualsiasi</option>
                                                {varieties.filter(v => v.rawMaterialId === ptForm.rawMaterialId).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end pt-2 gap-2">
                                    {editingId && <button type="button" onClick={cancelEdit} className="px-6 py-2 rounded text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200">Annulla</button>}
                                    <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-bold hover:bg-blue-700 shadow-md">{editingId ? 'Aggiorna Articolo' : 'Salva'}</button>
                                </div>
                            </form>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-4 bg-slate-50 border-b border-slate-200">
                                <FilterBar />
                            </div>
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 w-32">Codice</th>
                                        <th className="px-4 py-3">Articolo / Qualità</th>
                                        <th className="px-4 py-3">Natura</th>
                                        <th className="px-4 py-3">Peso</th>
                                        <th className="px-4 py-3 text-right">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedData.map((pt: any) => (
                                        <tr key={pt.id} className={`hover:bg-slate-50 transition-colors ${editingId === pt.id ? 'bg-blue-50' : ''}`}>
                                            <td className="px-4 py-3 font-mono font-bold text-blue-600">{pt.code}</td>
                                            <td className="px-4 py-3">
                                                <div className="font-bold text-slate-800">{pt.name}</div>
                                                <div className="text-[10px] text-slate-400 flex items-center gap-1 font-bold uppercase tracking-wider">{pt.quality}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded inline-block ${pt.nature === ProductNature.FINITO ? 'bg-green-100 text-green-700' : pt.nature === ProductNature.SEMILAVORATO ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                                                    {pt.nature}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-600">
                                                {pt.weightType === WeightType.EGALIZZATO ? `${pt.standardWeight} Kg` : 'Variabile'}
                                            </td>
                                            <td className="px-4 py-3 text-right flex gap-2 justify-end">
                                                <button onClick={() => handleEditPt(pt)} className="text-slate-300 hover:text-blue-600 p-2"><Pencil className="w-4 h-4" /></button>
                                                <button onClick={() => deleteProductType(pt.id)} className="text-slate-300 hover:text-red-600 p-2"><Trash2 className="w-4 h-4" /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredData.length === 0 && <div className="p-10 text-center text-slate-400 text-sm">Nessun elemento corrispondente alla ricerca.</div>}
                            <Pagination />
                        </div>
                    </div>
                    )}
                    {activeTab === 'LOTTI' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                            <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><Barcode className="w-4 h-4"/>{editingId ? 'Modifica Lotto' : 'Registra Lotto'}</h3>
                            <form onSubmit={handleAddLot} className="space-y-4">
                                <div className="grid grid-cols-12 gap-3 items-end">
                                    <div className="col-span-12 md:col-span-2">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Sigla Lotto</label>
                                        <input required className="w-full border border-slate-300 rounded px-3 py-2 text-sm font-mono uppercase bg-yellow-50" placeholder="14002" value={lotForm.code} onChange={e => { setLotForm({...lotForm, code: e.target.value}); setValidationError(null); }} />
                                    </div>
                                    <div className="col-span-12 md:col-span-3">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Grezzo</label>
                                        <select required className="w-full border border-slate-300 rounded px-3 py-2 text-sm bg-white" value={lotForm.rawMaterialId} onChange={e => setLotForm({...lotForm, rawMaterialId: e.target.value, subtypeId: '', varietyId: ''})}>
                                            <option value="">Seleziona...</option>
                                            {rawMaterials.map(rm => <option key={rm.id} value={rm.id}>{rm.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-12 md:col-span-2">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Tipologia</label>
                                        <select 
                                            className="w-full border border-slate-300 rounded px-3 py-2 text-sm bg-white disabled:bg-slate-50" 
                                            value={lotForm.subtypeId} 
                                            onChange={e => setLotForm({...lotForm, subtypeId: e.target.value})} 
                                            disabled={!lotForm.rawMaterialId || isLotSubtypeLocked}
                                        >
                                            <option value="">Standard</option>
                                            {subtypes.filter(s => s.rawMaterialId === lotForm.rawMaterialId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-12 md:col-span-2">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Varietà</label>
                                        <select 
                                            className="w-full border border-slate-300 rounded px-3 py-2 text-sm bg-white disabled:bg-slate-50" 
                                            value={lotForm.varietyId} 
                                            onChange={e => {
                                                const vId = e.target.value;
                                                const v = varieties.find(x => x.id === vId);
                                                setLotForm(prev => ({
                                                    ...prev, 
                                                    varietyId: vId,
                                                    // Auto-select subtype if variety implies it
                                                    subtypeId: v?.subtypeId || prev.subtypeId
                                                }));
                                            }} 
                                            disabled={!lotForm.rawMaterialId}
                                        >
                                            <option value="">Nessuna</option>
                                            {availableLotVarieties.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-12 md:col-span-3">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Produttore</label>
                                        <input required className="w-full border border-slate-300 rounded px-3 py-2 text-sm" placeholder="Azienda Agricola..." value={lotForm.producer} onChange={e => setLotForm({...lotForm, producer: e.target.value})} />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-2 gap-2">
                                    {editingId && <button type="button" onClick={cancelEdit} className="px-6 py-2 rounded text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200">Annulla</button>}
                                    <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-bold hover:bg-blue-700 shadow-md">{editingId ? 'Aggiorna Lotto' : 'Salva'}</button>
                                </div>
                            </form>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-4 bg-slate-50 border-b border-slate-200">
                                <FilterBar />
                            </div>
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 w-32">Sigla Lotto</th>
                                        <th className="px-4 py-3">Descrizione Merce</th>
                                        <th className="px-4 py-3">Produttore</th>
                                        <th className="px-4 py-3 text-right">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedData.map((l: any) => {
                                        const raw = rawMaterials.find(r => r.id === l.rawMaterialId)?.name || '';
                                        const variety = varieties.find(v => v.id === l.varietyId)?.name || '';
                                        const subtype = subtypes.find(s => s.id === l.subtypeId)?.name || '';
                                        return (
                                        <tr key={l.id} className={`hover:bg-slate-50 transition-colors ${editingId === l.id ? 'bg-blue-50' : ''}`}>
                                            <td className="px-4 py-3 font-mono font-bold text-slate-800">{l.code}</td>
                                            <td className="px-4 py-3">
                                                <div className="font-bold text-slate-800">{raw} {variety}</div>
                                                {subtype && <div className="text-[10px] text-slate-500 uppercase tracking-wider">{subtype}</div>}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600 font-medium">
                                                {l.producer}
                                            </td>
                                            <td className="px-4 py-3 text-right flex gap-2 justify-end">
                                                <button onClick={() => handleEditLot(l)} className="text-slate-300 hover:text-blue-600 p-2"><Pencil className="w-4 h-4" /></button>
                                                <button onClick={() => deleteLot(l.id)} className="text-slate-300 hover:text-red-600 p-2"><Trash2 className="w-4 h-4" /></button></td>
                                        </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {filteredData.length === 0 && <div className="p-10 text-center text-slate-400 text-sm">Nessun elemento corrispondente alla ricerca.</div>}
                            <Pagination />
                        </div>
                    </div>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};
