
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { 
  Calibration, Process, Pallet, CalibrationStatus, ProcessStatus,
  RawMaterial, RawMaterialSubtype, Variety, Packaging, ProductType,
  WeightType, ProductQuality, ProductNature, Lot, LabelLayout
} from '../types';
import { ToastMessage, ToastType } from '../components/ui/Toast';

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
  labelLayout: LabelLayout; // NEW
  toasts: ToastMessage[];

  addCalibration: (data: Omit<Calibration, 'id' | 'status' | 'incomingRawWeight'>) => void;
  updateCalibrationStatus: (id: string, status: CalibrationStatus) => void;
  addIncomingWeight: (id: string, weight: number) => void;
  duplicateCalibration: (oldId: string, newData: any) => void;
  
  addProcess: (data: Omit<Process, 'id' | 'status' | 'startTime'>) => void;
  closeProcess: (id: string) => void;
  addPallet: (data: Omit<Pallet, 'id' | 'timestamp'>) => void;
  deletePallet: (id: string) => void;

  addRawMaterial: (data: Omit<RawMaterial, 'id'>) => boolean;
  updateRawMaterial: (id: string, data: Omit<RawMaterial, 'id'>) => boolean;
  deleteRawMaterial: (id: string) => void;
  
  addSubtype: (name: string, rawMaterialId: string) => void;
  updateSubtype: (id: string, name: string, rawMaterialId: string) => void;
  deleteSubtype: (id: string) => void;
  
  addVariety: (data: Omit<Variety, 'id'>) => boolean;
  updateVariety: (id: string, data: Omit<Variety, 'id'>) => boolean;
  deleteVariety: (id: string) => void;
  
  addPackaging: (data: Omit<Packaging, 'id'>) => boolean;
  updatePackaging: (id: string, data: Omit<Packaging, 'id'>) => boolean;
  deletePackaging: (id: string) => void;
  
  addProductType: (data: Omit<ProductType, 'id'>) => boolean;
  updateProductType: (id: string, data: Omit<ProductType, 'id'>) => boolean;
  deleteProductType: (id: string) => void;

  addLot: (data: Omit<Lot, 'id'>) => boolean;
  updateLot: (id: string, data: Omit<Lot, 'id'>) => boolean;
  deleteLot: (id: string) => void;

  saveLabelLayout: (layout: LabelLayout) => void; // NEW

  getProcessesByCalibration: (calibrationId: string) => Process[];
  getPalletsByProcess: (processId: string) => Pallet[];
  
  notify: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Storage Key
const STORAGE_KEY = 'monito_production_data_v1';

// --- Initial Mock Data ---
const INITIAL_RAW_MATERIALS: RawMaterial[] = [
  { id: 'rm-1', code: 'MEL', name: 'Mele', calibers: [] },
  { id: 'rm-2', code: 'MND', name: 'Mandarini', calibers: ['1X', '1', '2', '3', '4', '5'] },
  { id: 'rm-3', code: 'UVA', name: 'Uva da Tavola', calibers: [] },
];

const INITIAL_LABEL_LAYOUT: LabelLayout = {
  width: 100,
  height: 100,
  elements: [
    { id: 'le-1', type: 'companyInfo', label: 'MONITO FRUIT LTD', x: 0, y: 10, width: 380, height: 30, fontSize: 18, isBold: true, textAlign: 'center' },
    { id: 'le-2', type: 'productType', label: 'Prodotto', x: 20, y: 60, width: 340, height: 40, fontSize: 24, isBold: true, textAlign: 'left' },
    { id: 'le-3', type: 'variety', label: 'Varietà', x: 20, y: 110, width: 340, height: 30, fontSize: 16, isBold: false, textAlign: 'left' },
    { id: 'le-4', type: 'lotCode', label: 'Lotto', x: 20, y: 160, width: 150, height: 30, fontSize: 14, isBold: true, textAlign: 'left' },
    { id: 'le-5', type: 'weight', label: 'Peso', x: 200, y: 250, width: 160, height: 60, fontSize: 40, isBold: true, textAlign: 'right' },
    { id: 'le-6', type: 'palletId', label: 'ID Pedana', x: 20, y: 340, width: 340, height: 20, fontSize: 10, isBold: false, textAlign: 'center' },
  ]
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial state from LocalStorage
  const getInitialState = (key: string, defaultValue: any) => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultValue;
    try {
      const parsed = JSON.parse(saved);
      return parsed[key] || defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const [calibrations, setCalibrations] = useState<Calibration[]>(() => getInitialState('calibrations', []));
  const [processes, setProcesses] = useState<Process[]>(() => getInitialState('processes', []));
  const [pallets, setPallets] = useState<Pallet[]>(() => getInitialState('pallets', []));
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>(() => getInitialState('rawMaterials', INITIAL_RAW_MATERIALS));
  const [subtypes, setSubtypes] = useState<RawMaterialSubtype[]>(() => getInitialState('subtypes', []));
  const [varieties, setVarieties] = useState<Variety[]>(() => getInitialState('varieties', []));
  const [packagings, setPackagings] = useState<Packaging[]>(() => getInitialState('packagings', []));
  const [productTypes, setProductTypes] = useState<ProductType[]>(() => getInitialState('productTypes', []));
  const [lots, setLots] = useState<Lot[]>(() => getInitialState('lots', []));
  const [labelLayout, setLabelLayout] = useState<LabelLayout>(() => getInitialState('labelLayout', INITIAL_LABEL_LAYOUT));
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Auto-save to LocalStorage on change
  useEffect(() => {
    const dataToSave = { calibrations, processes, pallets, rawMaterials, subtypes, varieties, packagings, productTypes, lots, labelLayout };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [calibrations, processes, pallets, rawMaterials, subtypes, varieties, packagings, productTypes, lots, labelLayout]);

  // Notifications logic
  const notify = useCallback((message: string, type: ToastType = 'INFO') => {
    setToasts(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addCalibration = (data: Omit<Calibration, 'id' | 'status' | 'incomingRawWeight'>) => {
    setCalibrations(prev => [{ ...data, id: `c-${Date.now()}`, status: CalibrationStatus.PROGRAMMED, incomingRawWeight: 0 }, ...prev]);
    notify(`Calibrazione ${data.rawMaterial} programmata`, 'SUCCESS');
  };

  const updateCalibrationStatus = (id: string, status: CalibrationStatus) => {
    setCalibrations(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    if (status === CalibrationStatus.CLOSED) {
      processes.filter(p => p.calibrationId === id && p.status === ProcessStatus.OPEN).forEach(p => closeProcess(p.id));
      notify(`Calibrazione chiusa`, 'INFO');
    } else {
      notify(`Calibrazione impostata su ${status}`, 'SUCCESS');
    }
  };

  const addIncomingWeight = (id: string, weight: number) => {
    setCalibrations(prev => prev.map(c => c.id === id ? { ...c, incomingRawWeight: c.incomingRawWeight + weight } : c));
    notify(`Registrati +${weight} Kg di grezzo`, 'SUCCESS');
  };

  const duplicateCalibration = (oldId: string, newData: any) => {
    updateCalibrationStatus(oldId, CalibrationStatus.CLOSED);
    const newCalId = `c-${Date.now()}`;
    const newCal: Calibration = { ...newData, id: newCalId, startDate: new Date().toISOString(), status: CalibrationStatus.OPEN, incomingRawWeight: 0 };
    setCalibrations(prev => [newCal, ...prev]);
    const newProcesses = processes.filter(p => p.calibrationId === oldId && p.status === ProcessStatus.OPEN).map(p => ({
      ...p, id: `p-${Date.now()}-${Math.random()}`, calibrationId: newCalId, startTime: new Date().toISOString(), endTime: undefined, status: ProcessStatus.OPEN
    }));
    setProcesses(prev => [...prev, ...newProcesses]);
    notify(`Cambio lotto effettuato con successo`, 'SUCCESS');
  };

  const addProcess = (data: Omit<Process, 'id' | 'status' | 'startTime'>) => {
    const pt = productTypes.find(p => p.id === data.productTypeId);
    setProcesses(prev => [{ ...data, id: `p-${Date.now()}`, startTime: new Date().toISOString(), status: ProcessStatus.OPEN, weightType: pt?.weightType, standardWeight: pt?.standardWeight }, ...prev]);
    notify(`Lavorazione avviata su ${data.line}`, 'SUCCESS');
  };

  const closeProcess = (id: string) => {
    setProcesses(prev => prev.map(p => p.id === id ? { ...p, status: ProcessStatus.CLOSED, endTime: new Date().toISOString() } : p));
    notify(`Lavorazione completata e chiusa`, 'INFO');
  };

  const addPallet = (data: Omit<Pallet, 'id' | 'timestamp'>) => {
    setPallets(prev => [{ ...data, id: `pl-${Date.now()}`, timestamp: new Date().toISOString() }, ...prev]);
    notify(`Pedana registrata (${data.weight} Kg)`, 'SUCCESS');
  };

  const deletePallet = (id: string) => {
    setPallets(prev => prev.filter(p => p.id !== id));
    notify(`Pedana eliminata`, 'INFO');
  };

  const addRawMaterial = (data: Omit<RawMaterial, 'id'>) => {
    if (rawMaterials.some(r => r.code.toUpperCase() === data.code.toUpperCase())) return false;
    // Initialize calibers as empty array if not provided
    setRawMaterials(prev => [{ id: `rm-${Date.now()}`, calibers: [], ...data }, ...prev]);
    notify(`Grezzo "${data.name}" aggiunto`, 'SUCCESS');
    return true;
  };

  const updateRawMaterial = (id: string, data: Omit<RawMaterial, 'id'>) => {
    if (rawMaterials.some(r => r.code.toUpperCase() === data.code.toUpperCase() && r.id !== id)) return false;
    setRawMaterials(prev => prev.map(i => i.id === id ? { ...i, ...data } : i));
    notify(`Grezzo aggiornato`, 'SUCCESS');
    return true;
  };

  const deleteRawMaterial = (id: string) => {
    setRawMaterials(prev => prev.filter(i => i.id !== id));
    notify(`Grezzo rimosso`, 'INFO');
  };
  
  const addSubtype = (name: string, rawMaterialId: string) => {
    setSubtypes(prev => [{ id: `st-${Date.now()}`, name, rawMaterialId }, ...prev]);
    notify(`Tipologia "${name}" aggiunta`, 'SUCCESS');
  };

  const updateSubtype = (id: string, name: string, rawMaterialId: string) => {
    setSubtypes(prev => prev.map(i => i.id === id ? { ...i, name, rawMaterialId } : i));
    notify(`Tipologia aggiornata`, 'SUCCESS');
  };

  const deleteSubtype = (id: string) => {
    setSubtypes(prev => prev.filter(i => i.id !== id));
    notify(`Tipologia rimossa`, 'INFO');
  };
  
  const addVariety = (data: Omit<Variety, 'id'>) => {
    if (varieties.some(v => v.code.toUpperCase() === data.code.toUpperCase())) return false;
    setVarieties(prev => [{ id: `v-${Date.now()}`, ...data }, ...prev]);
    notify(`Varietà "${data.name}" aggiunta`, 'SUCCESS');
    return true;
  };

  const updateVariety = (id: string, data: Omit<Variety, 'id'>) => {
    if (varieties.some(v => v.code.toUpperCase() === data.code.toUpperCase() && v.id !== id)) return false;
    setVarieties(prev => prev.map(i => i.id === id ? { ...i, ...data } : i));
    notify(`Varietà aggiornata`, 'SUCCESS');
    return true;
  };

  const deleteVariety = (id: string) => {
    setVarieties(prev => prev.filter(i => i.id !== id));
    notify(`Varietà rimossa`, 'INFO');
  };
  
  const addPackaging = (data: Omit<Packaging, 'id'>) => {
    if (packagings.some(p => p.code.toUpperCase() === data.code.toUpperCase())) return false;
    setPackagings(prev => [{ id: `pkg-${Date.now()}`, ...data }, ...prev]);
    notify(`Imballaggio "${data.name}" aggiunto`, 'SUCCESS');
    return true;
  };

  const updatePackaging = (id: string, data: Omit<Packaging, 'id'>) => {
    if (packagings.some(p => p.code.toUpperCase() === data.code.toUpperCase() && p.id !== id)) return false;
    setPackagings(prev => prev.map(i => i.id === id ? { ...i, ...data } : i));
    notify(`Imballaggio aggiornato`, 'SUCCESS');
    return true;
  };

  const deletePackaging = (id: string) => {
    setPackagings(prev => prev.filter(i => i.id !== id));
    notify(`Imballaggio rimosso`, 'INFO');
  };
  
  const addProductType = (data: Omit<ProductType, 'id'>) => {
    if (productTypes.some(pt => pt.code.toUpperCase() === data.code.toUpperCase())) return false;
    setProductTypes(prev => [{ ...data, id: `pt-${Date.now()}` }, ...prev]);
    notify(`Articolo "${data.name}" aggiunto`, 'SUCCESS');
    return true;
  };

  const updateProductType = (id: string, data: Omit<ProductType, 'id'>) => {
    if (productTypes.some(pt => pt.code.toUpperCase() === data.code.toUpperCase() && pt.id !== id)) return false;
    setProductTypes(prev => prev.map(i => i.id === id ? { ...i, ...data } : i));
    notify(`Articolo aggiornato`, 'SUCCESS');
    return true;
  };

  const deleteProductType = (id: string) => {
    setProductTypes(prev => prev.filter(i => i.id !== id));
    notify(`Articolo rimosso`, 'INFO');
  };

  const addLot = (data: Omit<Lot, 'id'>) => {
    if (lots.some(l => l.code.toUpperCase() === data.code.toUpperCase())) return false;
    setLots(prev => [{ ...data, id: `l-${Date.now()}` }, ...prev]);
    notify(`Lotto "${data.code}" aggiunto`, 'SUCCESS');
    return true;
  };

  const updateLot = (id: string, data: Omit<Lot, 'id'>) => {
    if (lots.some(l => l.code.toUpperCase() === data.code.toUpperCase() && l.id !== id)) return false;
    setLots(prev => prev.map(i => i.id === id ? { ...i, ...data } : i));
    notify(`Lotto aggiornato`, 'SUCCESS');
    return true;
  };

  const deleteLot = (id: string) => {
    setLots(prev => prev.filter(i => i.id !== id));
    notify(`Lotto rimosso`, 'INFO');
  };

  const saveLabelLayout = (layout: LabelLayout) => {
      setLabelLayout(layout);
      notify('Layout etichetta salvato', 'SUCCESS');
  };

  const getProcessesByCalibration = useCallback((id: string) => processes.filter(p => p.calibrationId === id), [processes]);
  const getPalletsByProcess = useCallback((id: string) => pallets.filter(p => p.processId === id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()), [pallets]);

  return (
    <DataContext.Provider value={{
      calibrations, processes, pallets, rawMaterials, subtypes, varieties, packagings, productTypes, lots, labelLayout, toasts,
      addCalibration, updateCalibrationStatus, addIncomingWeight, duplicateCalibration, addProcess, closeProcess, addPallet, deletePallet,
      addRawMaterial, updateRawMaterial, deleteRawMaterial, 
      addSubtype, updateSubtype, deleteSubtype, 
      addVariety, updateVariety, deleteVariety, 
      addPackaging, updatePackaging, deletePackaging, 
      addProductType, updateProductType, deleteProductType,
      addLot, updateLot, deleteLot,
      saveLabelLayout,
      getProcessesByCalibration, getPalletsByProcess,
      notify, removeToast
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
