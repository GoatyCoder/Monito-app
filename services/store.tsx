import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Calibration, Process, Pallet, CalibrationStatus, ProcessStatus,
  RawMaterial, RawMaterialSubtype, Variety, Packaging, ProductType,
  WeightType, ProductQuality, ProductNature, Lot, LabelLayout
} from '../types';
import { ToastMessage, ToastType } from '../components/ui/Toast';

// Funzione helper per recuperare variabili d'ambiente in modo cross-platform
const getEnvVar = (name: string): string => {
  // 1. Prova import.meta.env (Standard Vite)
  const metaEnv = (import.meta as any).env;
  if (metaEnv && metaEnv[name]) return metaEnv[name];

  // 2. Prova process.env (Standard Node/Environments)
  if (typeof process !== 'undefined' && process.env && process.env[name]) {
    return process.env[name] as string;
  }

  return '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

// Inizializzazione client Supabase
const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey) 
  : null as any;

interface DataContextType {
  calibrations: Calibration[];
  processes: Process[];
  pallets: Pallet[];
  rawMaterials: RawMaterial[];
  subtypes: RawMaterialSubtype[];
  varieties: Variety[];
  packagings: Packaging[];
  productTypes: ProductType[];
  lots: Lot[];
  labelLayouts: LabelLayout[];
  toasts: ToastMessage[];
  loading: boolean;

  addCalibration: (data: any) => Promise<void>;
  updateCalibrationStatus: (id: string, status: CalibrationStatus) => Promise<void>;
  addIncomingWeight: (id: string, weight: number) => Promise<void>;
  addProcess: (data: any) => Promise<void>;
  closeProcess: (id: string) => Promise<void>;
  addPallet: (data: any) => Promise<void>;
  deletePallet: (id: string) => Promise<void>;

  addRawMaterial: (data: any) => Promise<boolean>;
  updateRawMaterial: (id: string, data: any) => Promise<boolean>;
  deleteRawMaterial: (id: string) => Promise<void>;
  
  addSubtype: (name: string, rawMaterialId: string) => Promise<void>;
  addVariety: (data: any) => Promise<boolean>;
  addPackaging: (data: any) => Promise<boolean>;
  addProductType: (data: any) => Promise<boolean>;
  addLot: (data: any) => Promise<boolean>;

  addLabelLayout: (name: string) => Promise<LabelLayout | null>;
  updateLabelLayout: (id: string, layout: Partial<LabelLayout>) => Promise<void>;
  setDefaultLabelLayout: (id: string) => Promise<void>;

  getProcessesByCalibration: (calibrationId: string) => Process[];
  getPalletsByProcess: (processId: string) => Pallet[];
  notify: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [calibrations, setCalibrations] = useState<Calibration[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [subtypes, setSubtypes] = useState<RawMaterialSubtype[]>([]);
  const [varieties, setVarieties] = useState<Variety[]>([]);
  const [packagings, setPackagings] = useState<Packaging[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [labelLayouts, setLabelLayouts] = useState<LabelLayout[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!supabase) {
        console.error("Supabase client not initialized. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.");
        setLoading(false);
        return;
    }
    setLoading(true);
    try {
      const [rm, st, vr, pk, pt, lt, ll, cl, pr, pl] = await Promise.all([
        supabase.from('raw_materials').select('*'),
        supabase.from('subtypes').select('*'),
        supabase.from('varieties').select('*'),
        supabase.from('packagings').select('*'),
        supabase.from('product_types').select('*'),
        supabase.from('lots').select('*'),
        supabase.from('label_layouts').select('*'),
        supabase.from('calibrations').select('*').order('start_date', { ascending: false }),
        supabase.from('processes').select('*'),
        supabase.from('pallets').select('*')
      ]);

      setRawMaterials(rm.data || []);
      setSubtypes(st.data || []);
      setVarieties(vr.data || []);
      setPackagings(pk.data || []);
      setProductTypes(pt.data || []);
      setLots(lt.data || []);
      setLabelLayouts(ll.data || []);
      setCalibrations(cl.data || []);
      setProcesses(pr.data || []);
      setPallets(pl.data || []);
    } catch (error) {
      console.error("Errore fetch:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const notify = useCallback((message: string, type: ToastType = 'INFO') => {
    setToasts(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // --- Mutazioni ---

  const addCalibration = async (data: any) => {
    if(!supabase) return;
    const { data: res, error } = await supabase.from('calibrations').insert([{
      ...data,
      status: CalibrationStatus.PROGRAMMED,
      incoming_raw_weight: 0
    }]).select();
    if (!error && res) {
      setCalibrations(prev => [res[0], ...prev]);
      notify("Calibrazione salvata su Cloud", "SUCCESS");
    }
  };

  const updateCalibrationStatus = async (id: string, status: CalibrationStatus) => {
    if(!supabase) return;
    const { error } = await supabase.from('calibrations').update({ status }).eq('id', id);
    if (!error) {
      setCalibrations(prev => prev.map(c => c.id === id ? { ...c, status } : c));
      notify(`Stato aggiornato: ${status}`, "INFO");
    }
  };

  const addIncomingWeight = async (id: string, weight: number) => {
    if(!supabase) return;
    const current = calibrations.find(c => c.id === id)?.incomingRawWeight || 0;
    const { error } = await supabase.from('calibrations').update({ incoming_raw_weight: current + weight }).eq('id', id);
    if (!error) {
      setCalibrations(prev => prev.map(c => c.id === id ? { ...c, incomingRawWeight: current + weight } : c));
    }
  };

  const addProcess = async (data: any) => {
    if(!supabase) return;
    const { data: res, error } = await supabase.from('processes').insert([{
      ...data,
      start_time: new Date().toISOString(),
      status: ProcessStatus.OPEN
    }]).select();
    if (!error && res) {
      setProcesses(prev => [res[0], ...prev]);
    }
  };

  const closeProcess = async (id: string) => {
    if(!supabase) return;
    const { error } = await supabase.from('processes').update({ 
      status: ProcessStatus.CLOSED, 
      end_time: new Date().toISOString() 
    }).eq('id', id);
    if (!error) {
      setProcesses(prev => prev.map(p => p.id === id ? { ...p, status: ProcessStatus.CLOSED } : p));
    }
  };

  const addPallet = async (data: any) => {
    if(!supabase) return;
    const { data: res, error } = await supabase.from('pallets').insert([data]).select();
    if (!error && res) {
      setPallets(prev => [res[0], ...prev]);
      notify("Pedana registrata", "SUCCESS");
    }
  };

  const deletePallet = async (id: string) => {
    if(!supabase) return;
    const { error } = await supabase.from('pallets').delete().eq('id', id);
    if (!error) setPallets(prev => prev.filter(p => p.id !== id));
  };

  const addRawMaterial = async (data: any) => {
    if(!supabase) return false;
    const { data: res, error } = await supabase.from('raw_materials').insert([data]).select();
    if (!error && res) {
      setRawMaterials(prev => [res[0], ...prev]);
      return true;
    }
    return false;
  };

  const updateRawMaterial = async (id: string, data: any) => {
    if(!supabase) return false;
    const { error } = await supabase.from('raw_materials').update(data).eq('id', id);
    if (!error) {
      setRawMaterials(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
      return true;
    }
    return false;
  };

  const deleteRawMaterial = async (id: string) => {
    if(!supabase) return;
    await supabase.from('raw_materials').delete().eq('id', id);
    setRawMaterials(prev => prev.filter(r => r.id !== id));
  };

  const addSubtype = async (name: string, raw_material_id: string) => {
    if(!supabase) return;
    const { data: res } = await supabase.from('subtypes').insert([{ name, raw_material_id }]).select();
    if (res) setSubtypes(prev => [res[0], ...prev]);
  };

  const addVariety = async (data: any) => {
    if(!supabase) return false;
    const { data: res } = await supabase.from('varieties').insert([data]).select();
    if (res) { setVarieties(prev => [res[0], ...prev]); return true; }
    return false;
  };

  const addPackaging = async (data: any) => {
    if(!supabase) return false;
    const { data: res } = await supabase.from('packagings').insert([data]).select();
    if (res) { setPackagings(prev => [res[0], ...prev]); return true; }
    return false;
  };

  const addProductType = async (data: any) => {
    if(!supabase) return false;
    const { data: res } = await supabase.from('product_types').insert([data]).select();
    if (res) { setProductTypes(prev => [res[0], ...prev]); return true; }
    return false;
  };

  const addLot = async (data: any) => {
    if(!supabase) return false;
    const { data: res } = await supabase.from('lots').insert([data]).select();
    if (res) { setLots(prev => [res[0], ...prev]); return true; }
    return false;
  };

  const addLabelLayout = async (name: string) => {
    if(!supabase) return null;
    const { data: res } = await supabase.from('label_layouts').insert([{
        name, is_default: labelLayouts.length === 0, width: 400, height: 600, elements: []
    }]).select();
    if (res) {
        setLabelLayouts(prev => [...prev, res[0]]);
        return res[0];
    }
    return null;
  };

  const updateLabelLayout = async (id: string, updates: Partial<LabelLayout>) => {
    if(!supabase) return;
    const { error } = await supabase.from('label_layouts').update(updates).eq('id', id);
    if (!error) setLabelLayouts(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const setDefaultLabelLayout = async (id: string) => {
    if(!supabase) return;
    await supabase.from('label_layouts').update({ is_default: false }).neq('id', id);
    await supabase.from('label_layouts').update({ is_default: true }).eq('id', id);
    setLabelLayouts(prev => prev.map(l => ({ ...l, is_default: l.id === id })));
  };

  const getProcessesByCalibration = useCallback((id: string) => processes.filter(p => (p as any).calibration_id === id || p.calibrationId === id), [processes]);
  const getPalletsByProcess = useCallback((id: string) => pallets.filter(p => (p as any).process_id === id || p.processId === id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()), [pallets]);

  return (
    <DataContext.Provider value={{
      calibrations, processes, pallets, rawMaterials, subtypes, varieties, packagings, productTypes, lots, labelLayouts, toasts, loading,
      addCalibration, updateCalibrationStatus, addIncomingWeight, addProcess, closeProcess, addPallet, deletePallet,
      addRawMaterial, updateRawMaterial, deleteRawMaterial, addSubtype, addVariety, addPackaging, addProductType, addLot,
      addLabelLayout, updateLabelLayout, setDefaultLabelLayout,
      getProcessesByCalibration, getPalletsByProcess, notify, removeToast
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};