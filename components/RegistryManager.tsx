
import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../services/store';
import { Trash2, Tag, Scale, Boxes, Sparkles, Pencil, X, Hash, Search, ChevronLeft, ChevronRight, AlertCircle, Barcode, Printer, Plus, ArrowRight, Check, Star } from 'lucide-react';
import { WeightType, ProductQuality, ProductNature } from '../types';
import { LabelEditor } from './LabelEditor';

type Tab = 'GREZZI' | 'TIPOLOGIE' | 'VARIETA' | 'IMBALLAGGI' | 'LAVORATI' | 'LOTTI' | 'ETICHETTA';

const ITEMS_PER_PAGE = 10;

export const RegistryManager: React.FC = () => {
  const { 
    rawMaterials, addRawMaterial, updateRawMaterial, deleteRawMaterial,
    subtypes, addSubtype, updateSubtype, deleteSubtype,
    varieties, addVariety, updateVariety, deleteVariety,
    packagings, addPackaging, updatePackaging, deletePackaging,
    productTypes, addProductType, updateProductType, deleteProductType,
    lots, addLot, updateLot, deleteLot,
    labelLayouts, addLabelLayout, deleteLabelLayout, setDefaultLabelLayout
  } = useData();

  const [activeTab, setActiveTab] = useState<Tab>('GREZZI');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Label Template management
  const [editingLayoutId, setEditingLayoutId] = useState<string | null>(null);
  const [newLayoutName, setNewLayoutName] = useState('');

  // Filtering & Pagination State
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Input States
  const [newRawMaterial, setNewRawMaterial] = useState('');
  const [newRawCode, setNewRawCode] = useState('');
  const [newRawCalibers, setNewRawCalibers] = useState<string[]>([]);
  const [tempCaliberInput, setTempCaliberInput] = useState('');

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
    varietyId: '',
    labelLayoutId: ''
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
    setEditingLayoutId(null);
    setNewLayoutName('');
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
        weightType: WeightType.VARIABILE, standardWeight: '', rawMaterialId: '', subtypeId: '', varietyId: '', labelLayoutId: '' 
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

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const handleEditPt = (pt: any) => {
    setEditingId(pt.id);
    setPtForm({
        code: pt.code, name: pt.name, nature: pt.nature, quality: pt.quality, ean: pt.ean || '',
        weightType: pt.weightType, standardWeight: pt.standardWeight?.toString() || '',
        rawMaterialId: pt.rawMaterialId || '', subtypeId: pt.subtypeId || '', varietyId: pt.varietyId || '',
        labelLayoutId: pt.labelLayoutId || ''
    });
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
        varietyId: ptForm.varietyId || undefined,
        labelLayoutId: ptForm.labelLayoutId || undefined
    };
    const success = editingId ? updateProductType(editingId, payload) : addProductType(payload);
    if (!success) setValidationError(`Codice "${code}" già esistente!`);
    else cancelEdit();
  };

  const handleCreateLayout = () => {
      if (newLayoutName.trim()) {
          const layout = addLabelLayout(newLayoutName.trim());
          setEditingLayoutId(layout.id);
          setNewLayoutName('');
      }
  };

  // Fixed: Added missing handlers for Raw Materials registry
  const handleAddRawMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    const code = newRawCode.trim().toUpperCase();
    const data = {
      name: newRawMaterial.trim(),
      code,
      calibers: newRawCalibers
    };
    
    let success = false;
    if (editingId) {
      success = updateRawMaterial(editingId, data);
    } else {
      success = addRawMaterial(data);
    }

    if (!success) {
      setValidationError(`Codice "${code}" già esistente!`);
    } else {
      cancelEdit();
    }
  };

  const addCaliber = () => {
    if (tempCaliberInput.trim()) {
      setNewRawCalibers(prev => [...prev, tempCaliberInput.trim().toUpperCase()]);
      setTempCaliberInput('');
    }
  };

  const removeCaliber = (index: number) => {
    setNewRawCalibers(prev => prev.filter((_, i) => i !== index));
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
    </div>
  );

  const Pagination = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200">
        <div className="text-xs text-slate-500">
          Pagina <span className="font-bold text-slate-700">{currentPage}</span> di <span className="font-bold text-slate-700">{totalPages}</span>
        </div>
        <div className="flex gap-2">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
    );
  };

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
                <TabButton id="ETICHETTA" label="Etichette Layout" />
            </div>
        </div>

        <div className="flex-1 overflow-auto p-0 max-w-full mx-auto w-full">
            {activeTab === 'ETICHETTA' ? (
                editingLayoutId ? (
                    <LabelEditor layoutId={editingLayoutId} onClose={() => setEditingLayoutId(null)} />
                ) : (
                    <div className="p-8 max-w-4xl mx-auto space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Printer className="w-5 h-5 text-blue-600"/> Gestione Layout Etichette</h3>
                            <div className="flex gap-3 mb-6">
                                <input 
                                    className="flex-1 border border-slate-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500" 
                                    placeholder="Nome nuovo layout (es. Etichetta Ciliegie 1Kg)" 
                                    value={newLayoutName}
                                    onChange={e => setNewLayoutName(e.target.value)}
                                />
                                <button onClick={handleCreateLayout} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 shadow-md"><Plus className="w-5 h-5"/> Crea Layout</button>
                            </div>

                            <div className="grid gap-3">
                                {labelLayouts.map(layout => (
                                    <div key={layout.id} className={`p-4 rounded-lg border flex items-center justify-between transition-all ${layout.isDefault ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-full ${layout.isDefault ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                                <Printer className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800 flex items-center gap-2">
                                                    {layout.name}
                                                    {layout.isDefault && <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase tracking-tighter">Predefinito</span>}
                                                </div>
                                                <div className="text-xs text-slate-500">{layout.elements.length} elementi definiti</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {!layout.isDefault && (
                                                <button onClick={() => setDefaultLabelLayout(layout.id)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Imposta come predefinito"><Star className="w-5 h-5" /></button>
                                            )}
                                            <button onClick={() => setEditingLayoutId(layout.id)} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 shadow-sm"><Pencil className="w-4 h-4"/> Modifica</button>
                                            {!layout.isDefault && (
                                                <button onClick={() => deleteLabelLayout(layout.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            ) : (
                <div className="p-6 max-w-5xl mx-auto">
                    {/* Articoli Section */}
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
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Layout Etichetta</label>
                                        <select className="w-full border border-slate-300 rounded px-3 py-2 text-sm bg-white" value={ptForm.labelLayoutId} onChange={e => setPtForm({...ptForm, labelLayoutId: e.target.value})}>
                                            <option value="">Usa Predefinito</option>
                                            {labelLayouts.map(l => <option key={l.id} value={l.id}>{l.name} {l.isDefault ? '(Predefinito)' : ''}</option>)}
                                        </select>
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
                                        <th className="px-4 py-3">Etichetta</th>
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
                                                <div className="text-xs text-slate-500">
                                                    {pt.labelLayoutId ? (labelLayouts.find(l => l.id === pt.labelLayoutId)?.name || 'Layout Rimosso') : <span className="italic text-slate-400">Predefinito</span>}
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
                            <Pagination />
                        </div>
                    </div>
                    )}
                    {/* Grezzi Section */}
                    {activeTab === 'GREZZI' && (
                        <div className="space-y-6">
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                                <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">{editingId ? 'Modifica Grezzo' : 'Aggiungi Grezzo'}</h3>
                                <form onSubmit={handleAddRawMaterial} className="space-y-4">
                                    <div className="flex gap-2">
                                        <input className="w-32 border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase" placeholder="Codice (MND)" value={newRawCode} onChange={e => { setNewRawCode(e.target.value); setValidationError(null); }} required />
                                        <input className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nome (Es. Mandarini)" value={newRawMaterial} onChange={e => setNewRawMaterial(e.target.value)} required />
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase flex items-center gap-1"><Scale className="w-3 h-3"/> Scala Calibri (Opzionale)</label>
                                        <div className="flex gap-2 mb-2">
                                            <input className="w-32 border border-slate-300 rounded px-2 py-1.5 text-xs font-mono uppercase" placeholder="Es. 1X" value={tempCaliberInput} onChange={e => setTempCaliberInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCaliber())} />
                                            <button type="button" onClick={addCaliber} className="bg-slate-200 text-slate-600 px-3 py-1.5 rounded text-xs font-bold hover:bg-slate-300"><Plus className="w-3 h-3"/></button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {newRawCalibers.map((cal, idx) => (
                                                <div key={idx} className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded shadow-sm text-xs font-mono font-bold">
                                                    <span>{idx+1}.</span> <span className="text-blue-600">{cal}</span>
                                                    <button type="button" onClick={() => removeCaliber(idx)} className="text-slate-400 hover:text-red-500 ml-1"><X className="w-3 h-3"/></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        {editingId && <button type="button" onClick={cancelEdit} className="px-4 py-2 text-slate-500 bg-slate-100 rounded text-sm font-medium hover:bg-slate-200">Annulla</button>}
                                        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700">{editingId ? 'Aggiorna' : 'Aggiungi'}</button>
                                    </div>
                                </form>
                            </div>
                            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-4 bg-slate-50 border-b border-slate-200"><FilterBar /></div>
                                <table className="w-full text-sm text-left"><thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200"><tr><th className="px-4 py-3 w-32">Codice</th><th className="px-4 py-3">Nome Grezzo</th><th className="px-4 py-3">Calibri</th><th className="px-4 py-3 w-32 text-right">Azioni</th></tr></thead><tbody className="divide-y divide-slate-100">{paginatedData.map((rm: any) => (<tr key={rm.id} className={`hover:bg-slate-50 ${editingId === rm.id ? 'bg-blue-50' : ''}`}><td className="px-4 py-3 font-mono font-bold text-blue-600">{rm.code}</td><td className="px-4 py-3 font-medium text-slate-800">{rm.name}</td><td className="px-4 py-3 text-xs text-slate-500">{rm.calibers?.length ? <div className="flex gap-1 flex-wrap">{rm.calibers.map((c:string, i:number) => <span key={i} className="bg-slate-100 px-1 rounded border border-slate-200">{c}</span>)}</div> : '-'}</td><td className="px-4 py-3 text-right flex gap-2 justify-end"><button onClick={() => { setEditingId(rm.id); setNewRawMaterial(rm.name); setNewRawCode(rm.code); setNewRawCalibers(rm.calibers || []); }} className="text-slate-400 hover:text-blue-600 p-1"><Pencil className="w-4 h-4" /></button><button onClick={() => deleteRawMaterial(rm.id)} className="text-slate-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button></td></tr>))}</tbody></table>
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
