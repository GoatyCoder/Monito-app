import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  Calibration, Process, Pallet, CalibrationStatus, ProcessStatus,
  RawMaterial, RawMaterialSubtype, Variety, Packaging, ProductType,
  Lot, LabelLayout
} from '../types';
import { ToastMessage, ToastType } from '../components/ui/Toast';
import {
  canHardDeleteLot,
  canHardDeleteProductType,
  canHardDeleteSubtype,
  canHardDeleteVariety,
  normalizeCode,
  validateLotRelations,
  validateProductType,
  validateProductTypeRelations,
  validateRequiredCode,
  validateSubtypeRelations,
  validateUniqueCode,
  validateVarietyRelations,
} from './domain/registryValidation';

type RawMaterialInput = Omit<RawMaterial, 'id' | 'isDeleted' | 'deletedAt' | 'createdAt' | 'updatedAt'>;
type VarietyInput = Omit<Variety, 'id' | 'isDeleted' | 'deletedAt' | 'createdAt' | 'updatedAt'>;
type PackagingInput = Omit<Packaging, 'id' | 'isDeleted' | 'deletedAt' | 'createdAt' | 'updatedAt'>;
type ProductTypeInput = Omit<ProductType, 'id' | 'isDeleted' | 'deletedAt' | 'createdAt' | 'updatedAt'>;
type LotInput = Omit<Lot, 'id' | 'isDeleted' | 'deletedAt' | 'createdAt' | 'updatedAt'>;

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
  labelLayout: LabelLayout;
  toasts: ToastMessage[];

  addCalibration: (data: Omit<Calibration, 'id' | 'status' | 'incomingRawWeight'>) => void;
  updateCalibrationStatus: (id: string, status: CalibrationStatus) => void;
  addIncomingWeight: (id: string, weight: number) => void;
  duplicateCalibration: (oldId: string, newData: Omit<Calibration, 'id' | 'startDate' | 'status' | 'incomingRawWeight'>) => void;

  addProcess: (data: Omit<Process, 'id' | 'status' | 'startTime'>) => void;
  closeProcess: (id: string) => void;
  addPallet: (data: Omit<Pallet, 'id' | 'timestamp'>) => void;
  deletePallet: (id: string) => void;

  addRawMaterial: (data: RawMaterialInput) => boolean;
  updateRawMaterial: (id: string, data: RawMaterialInput) => boolean;
  deleteRawMaterial: (id: string) => void;
  hardDeleteRawMaterial: (id: string) => void;
  restoreRawMaterial: (id: string) => void;

  addSubtype: (name: string, rawMaterialId: string) => void;
  updateSubtype: (id: string, name: string, rawMaterialId: string) => void;
  deleteSubtype: (id: string) => void;
  hardDeleteSubtype: (id: string) => void;
  restoreSubtype: (id: string) => void;

  addVariety: (data: VarietyInput) => boolean;
  updateVariety: (id: string, data: VarietyInput) => boolean;
  deleteVariety: (id: string) => void;
  hardDeleteVariety: (id: string) => void;
  restoreVariety: (id: string) => void;

  addPackaging: (data: PackagingInput) => boolean;
  updatePackaging: (id: string, data: PackagingInput) => boolean;
  deletePackaging: (id: string) => void;
  hardDeletePackaging: (id: string) => void;
  restorePackaging: (id: string) => void;

  addProductType: (data: ProductTypeInput) => boolean;
  updateProductType: (id: string, data: ProductTypeInput) => boolean;
  deleteProductType: (id: string) => void;
  hardDeleteProductType: (id: string) => void;
  restoreProductType: (id: string) => void;

  addLot: (data: LotInput) => boolean;
  updateLot: (id: string, data: LotInput) => boolean;
  deleteLot: (id: string) => void;
  hardDeleteLot: (id: string) => void;
  restoreLot: (id: string) => void;

  saveLabelLayout: (layout: LabelLayout) => void;

  getProcessesByCalibration: (calibrationId: string) => Process[];
  getPalletsByProcess: (processId: string) => Pallet[];

  notify: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const STORAGE_KEY = 'monito_production_data_v2';
const LEGACY_STORAGE_KEY = 'monito_production_data_v1';
const STORAGE_SCHEMA_VERSION = 2;

type PersistedPayloadV2 = {
  schemaVersion: 2;
  data: {
    calibrations: Calibration[];
    processes: Process[];
    pallets: Pallet[];
    rawMaterials: RawMaterial[];
    subtypes: RawMaterialSubtype[];
    varieties: Variety[];
    packagings: Packaging[];
    productTypes: ProductType[];
    lots: Lot[];
    labelLayout: LabelLayout;
  }
};

const seedTimestamp = '2026-01-01T00:00:00.000Z';
const INITIAL_RAW_MATERIALS: RawMaterial[] = [
  { id: 'rm-1', code: 'MEL', name: 'Mele', calibers: [], isDeleted: false, createdAt: seedTimestamp, updatedAt: seedTimestamp },
  { id: 'rm-2', code: 'MND', name: 'Mandarini', calibers: ['1X', '1', '2', '3', '4', '5'], isDeleted: false, createdAt: seedTimestamp, updatedAt: seedTimestamp },
  { id: 'rm-3', code: 'UVA', name: 'Uva da Tavola', calibers: [], isDeleted: false, createdAt: seedTimestamp, updatedAt: seedTimestamp },
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

const nowIso = () => new Date().toISOString();
const genId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const withAudit = <T extends { id: string }>(item: T): T & { isDeleted: boolean; createdAt: string; updatedAt: string; deletedAt?: string } => {
  const createdAt = (item as any).createdAt || nowIso();
  return {
    ...item,
    isDeleted: Boolean((item as any).isDeleted),
    deletedAt: (item as any).deletedAt,
    createdAt,
    updatedAt: (item as any).updatedAt || createdAt,
  };
};

const migrateToV2 = (rawSaved: any): PersistedPayloadV2 => {
  const base = rawSaved?.schemaVersion === STORAGE_SCHEMA_VERSION ? rawSaved.data : rawSaved;
  const timestamp = nowIso();

  const rawMaterials = (base?.rawMaterials || INITIAL_RAW_MATERIALS).map((x: RawMaterial) => withAudit(x));
  const subtypes = (base?.subtypes || []).map((x: RawMaterialSubtype) => withAudit(x));
  const varieties = (base?.varieties || []).map((x: Variety) => withAudit(x));
  const packagings = (base?.packagings || []).map((x: Packaging) => withAudit(x));
  const productTypes = (base?.productTypes || []).map((x: ProductType) => withAudit(x));
  const lots = (base?.lots || []).map((x: any) => withAudit({ ...x, varietyId: x?.varietyId || '' } as Lot));

  return {
    schemaVersion: 2,
    data: {
      calibrations: base?.calibrations || [],
      processes: base?.processes || [],
      pallets: base?.pallets || [],
      rawMaterials,
      subtypes,
      varieties,
      packagings,
      productTypes,
      lots,
      labelLayout: base?.labelLayout || INITIAL_LABEL_LAYOUT,
    }
  };
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const loadStorage = (): PersistedPayloadV2 => {
    const primary = localStorage.getItem(STORAGE_KEY);
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    const raw = primary || legacy;
    if (!raw) return migrateToV2(undefined);

    try {
      const parsed = JSON.parse(raw);
      const migrated = migrateToV2(parsed);
      if (legacy && !primary) {
        localStorage.setItem(`${LEGACY_STORAGE_KEY}_backup_${Date.now()}`, raw);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    } catch {
      return migrateToV2(undefined);
    }
  };

  const [bootstrapped] = useState(() => loadStorage().data);

  const [calibrations, setCalibrations] = useState<Calibration[]>(bootstrapped.calibrations);
  const [processes, setProcesses] = useState<Process[]>(bootstrapped.processes);
  const [pallets, setPallets] = useState<Pallet[]>(bootstrapped.pallets);
  const [rawMaterialsState, setRawMaterialsState] = useState<RawMaterial[]>(bootstrapped.rawMaterials);
  const [subtypesState, setSubtypesState] = useState<RawMaterialSubtype[]>(bootstrapped.subtypes);
  const [varietiesState, setVarietiesState] = useState<Variety[]>(bootstrapped.varieties);
  const [packagingsState, setPackagingsState] = useState<Packaging[]>(bootstrapped.packagings);
  const [productTypesState, setProductTypesState] = useState<ProductType[]>(bootstrapped.productTypes);
  const [lotsState, setLotsState] = useState<Lot[]>(bootstrapped.lots);
  const [labelLayout, setLabelLayout] = useState<LabelLayout>(bootstrapped.labelLayout);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const rawMaterials = rawMaterialsState.filter(i => !i.isDeleted);
  const subtypes = subtypesState.filter(i => !i.isDeleted);
  const varieties = varietiesState.filter(i => !i.isDeleted);
  const packagings = packagingsState.filter(i => !i.isDeleted);
  const productTypes = productTypesState.filter(i => !i.isDeleted);
  const lots = lotsState.filter(i => !i.isDeleted);

  useEffect(() => {
    const payload: PersistedPayloadV2 = {
      schemaVersion: 2,
      data: {
        calibrations,
        processes,
        pallets,
        rawMaterials: rawMaterialsState,
        subtypes: subtypesState,
        varieties: varietiesState,
        packagings: packagingsState,
        productTypes: productTypesState,
        lots: lotsState,
        labelLayout,
      }
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [calibrations, processes, pallets, rawMaterialsState, subtypesState, varietiesState, packagingsState, productTypesState, lotsState, labelLayout]);

  const notify = useCallback((message: string, type: ToastType = 'INFO') => {
    setToasts(prev => [...prev, { id: Math.random().toString(36).slice(2, 10), message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addCalibration = (data: Omit<Calibration, 'id' | 'status' | 'incomingRawWeight'>) => {
    setCalibrations(prev => [{ ...data, id: genId('c'), status: CalibrationStatus.PROGRAMMED, incomingRawWeight: 0 }, ...prev]);
    notify(`Calibrazione ${data.rawMaterial} programmata`, 'SUCCESS');
  };

  const updateCalibrationStatus = (id: string, status: CalibrationStatus) => {
    setCalibrations(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    if (status === CalibrationStatus.CLOSED) {
      processes.filter(p => p.calibrationId === id && p.status === ProcessStatus.OPEN).forEach(p => closeProcess(p.id));
      notify('Calibrazione chiusa', 'INFO');
    } else {
      notify(`Calibrazione impostata su ${status}`, 'SUCCESS');
    }
  };

  const addIncomingWeight = (id: string, weight: number) => {
    if (!Number.isFinite(weight) || weight <= 0) {
      notify('Peso grezzo non valido', 'ERROR');
      return;
    }
    setCalibrations(prev => prev.map(c => c.id === id ? { ...c, incomingRawWeight: c.incomingRawWeight + weight } : c));
    notify(`Registrati +${weight} Kg di grezzo`, 'SUCCESS');
  };

  const duplicateCalibration = (oldId: string, newData: Omit<Calibration, 'id' | 'startDate' | 'status' | 'incomingRawWeight'>) => {
    updateCalibrationStatus(oldId, CalibrationStatus.CLOSED);
    const newCalId = genId('c');
    const newCal: Calibration = { ...newData, id: newCalId, startDate: nowIso(), status: CalibrationStatus.OPEN, incomingRawWeight: 0 };
    setCalibrations(prev => [newCal, ...prev]);
    const newProcesses = processes
      .filter(p => p.calibrationId === oldId && p.status === ProcessStatus.OPEN)
      .map(p => ({ ...p, id: genId('p'), calibrationId: newCalId, startTime: nowIso(), endTime: undefined, status: ProcessStatus.OPEN }));
    setProcesses(prev => [...prev, ...newProcesses]);
    notify('Cambio lotto effettuato con successo', 'SUCCESS');
  };

  const addProcess = (data: Omit<Process, 'id' | 'status' | 'startTime'>) => {
    const pt = productTypes.find(p => p.id === data.productTypeId);
    setProcesses(prev => [{ ...data, id: genId('p'), startTime: nowIso(), status: ProcessStatus.OPEN, weightType: pt?.weightType, standardWeight: pt?.standardWeight }, ...prev]);
    notify(`Lavorazione avviata su ${data.line}`, 'SUCCESS');
  };

  const closeProcess = (id: string) => {
    setProcesses(prev => prev.map(p => p.id === id ? { ...p, status: ProcessStatus.CLOSED, endTime: nowIso() } : p));
    notify('Lavorazione completata e chiusa', 'INFO');
  };

  const addPallet = (data: Omit<Pallet, 'id' | 'timestamp'>) => {
    setPallets(prev => [{ ...data, id: genId('pl'), timestamp: nowIso() }, ...prev]);
    notify(`Pedana registrata (${data.weight} Kg)`, 'SUCCESS');
  };

  const deletePallet = (id: string) => {
    setPallets(prev => prev.filter(p => p.id !== id));
    notify('Pedana eliminata', 'INFO');
  };

  const addRawMaterial = (data: RawMaterialInput) => {
    const required = validateRequiredCode(data.code, 'grezzo');
    if (!required.ok) return false;
    const unique = validateUniqueCode(rawMaterialsState, data.code);
    if (!unique.ok) return false;

    setRawMaterialsState(prev => [{ id: genId('rm'), ...data, code: normalizeCode(data.code), calibers: data.calibers || [], isDeleted: false, createdAt: nowIso(), updatedAt: nowIso() }, ...prev]);
    notify(`Grezzo "${data.name}" aggiunto`, 'SUCCESS');
    return true;
  };

  const updateRawMaterial = (id: string, data: RawMaterialInput) => {
    const required = validateRequiredCode(data.code, 'grezzo');
    if (!required.ok) return false;
    const unique = validateUniqueCode(rawMaterialsState, data.code, id);
    if (!unique.ok) return false;

    setRawMaterialsState(prev => prev.map(i => i.id === id ? { ...i, ...data, code: normalizeCode(data.code), updatedAt: nowIso() } : i));
    notify('Grezzo aggiornato', 'SUCCESS');
    return true;
  };

  const deleteRawMaterial = (id: string) => {
    const inUse = subtypesState.some(s => s.rawMaterialId === id && !s.isDeleted)
      || varietiesState.some(v => v.rawMaterialId === id && !v.isDeleted)
      || lotsState.some(l => l.rawMaterialId === id && !l.isDeleted)
      || calibrations.some(c => c.rawMaterialId === id && c.status !== CalibrationStatus.CLOSED);
    if (inUse) {
      notify('Grezzo in uso: impossibile eliminare', 'ERROR');
      return;
    }
    setRawMaterialsState(prev => prev.map(i => i.id === id ? { ...i, isDeleted: true, deletedAt: nowIso(), updatedAt: nowIso() } : i));
    notify('Grezzo archiviato', 'INFO');
  };

  const restoreRawMaterial = (id: string) => {
    setRawMaterialsState(prev => prev.map(i => i.id === id ? { ...i, isDeleted: false, deletedAt: undefined, updatedAt: nowIso() } : i));
    notify('Grezzo ripristinato', 'SUCCESS');
  };

  const hardDeleteRawMaterial = (id: string) => {
    const inUse = subtypesState.some(s => s.rawMaterialId === id && !s.isDeleted)
      || varietiesState.some(v => v.rawMaterialId === id && !v.isDeleted)
      || lotsState.some(l => l.rawMaterialId === id && !l.isDeleted)
      || calibrations.some(c => c.rawMaterialId === id);
    if (inUse) {
      notify('Hard delete non consentito: grezzo referenziato', 'ERROR');
      return;
    }
    setRawMaterialsState(prev => prev.filter(i => i.id !== id));
    notify('Grezzo eliminato definitivamente', 'INFO');
  };

  const addSubtype = (name: string, rawMaterialId: string) => {
    const relation = validateSubtypeRelations({ rawMaterialId }, { rawMaterials: rawMaterialsState });
    if (!relation.ok) return;

    setSubtypesState(prev => [{ id: genId('st'), name, rawMaterialId, isDeleted: false, createdAt: nowIso(), updatedAt: nowIso() }, ...prev]);
    notify(`Tipologia "${name}" aggiunta`, 'SUCCESS');
  };

  const updateSubtype = (id: string, name: string, rawMaterialId: string) => {
    const relation = validateSubtypeRelations({ rawMaterialId }, { rawMaterials: rawMaterialsState });
    if (!relation.ok) return;

    setSubtypesState(prev => prev.map(i => i.id === id ? { ...i, name, rawMaterialId, updatedAt: nowIso() } : i));
    notify('Tipologia aggiornata', 'SUCCESS');
  };

  const deleteSubtype = (id: string) => {
    const inUse = varietiesState.some(v => v.subtypeId === id && !v.isDeleted)
      || lotsState.some(l => l.subtypeId === id && !l.isDeleted)
      || calibrations.some(c => c.subtypeId === id && c.status !== CalibrationStatus.CLOSED);
    if (inUse) {
      notify('Tipologia in uso: impossibile eliminare', 'ERROR');
      return;
    }
    setSubtypesState(prev => prev.map(i => i.id === id ? { ...i, isDeleted: true, deletedAt: nowIso(), updatedAt: nowIso() } : i));
    notify('Tipologia archiviata', 'INFO');
  };

  const restoreSubtype = (id: string) => {
    setSubtypesState(prev => prev.map(i => i.id === id ? { ...i, isDeleted: false, deletedAt: undefined, updatedAt: nowIso() } : i));
    notify('Tipologia ripristinata', 'SUCCESS');
  };

  const hardDeleteSubtype = (id: string) => {
    const canDelete = canHardDeleteSubtype(id, {
      varieties: varietiesState,
      lots: lotsState,
      calibrations,
      productTypes: productTypesState,
    });
    if (!canDelete.ok) {
      notify('Hard delete non consentito: tipologia referenziata', 'ERROR');
      return;
    }
    setSubtypesState(prev => prev.filter(i => i.id !== id));
    notify('Tipologia eliminata definitivamente', 'INFO');
  };

  const addVariety = (data: VarietyInput) => {
    const required = validateRequiredCode(data.code, 'varietà');
    if (!required.ok) return false;
    const unique = validateUniqueCode(varietiesState, data.code);
    if (!unique.ok) return false;
    const relation = validateVarietyRelations(data, { rawMaterials: rawMaterialsState, subtypes: subtypesState });
    if (!relation.ok) return false;

    setVarietiesState(prev => [{ id: genId('v'), ...data, code: normalizeCode(data.code), isDeleted: false, createdAt: nowIso(), updatedAt: nowIso() }, ...prev]);
    notify(`Varietà "${data.name}" aggiunta`, 'SUCCESS');
    return true;
  };

  const updateVariety = (id: string, data: VarietyInput) => {
    const required = validateRequiredCode(data.code, 'varietà');
    if (!required.ok) return false;
    const unique = validateUniqueCode(varietiesState, data.code, id);
    if (!unique.ok) return false;
    const relation = validateVarietyRelations(data, { rawMaterials: rawMaterialsState, subtypes: subtypesState });
    if (!relation.ok) return false;

    setVarietiesState(prev => prev.map(i => i.id === id ? { ...i, ...data, code: normalizeCode(data.code), updatedAt: nowIso() } : i));
    notify('Varietà aggiornata', 'SUCCESS');
    return true;
  };

  const deleteVariety = (id: string) => {
    const inUse = lotsState.some(l => l.varietyId === id && !l.isDeleted)
      || calibrations.some(c => c.varietyId === id && c.status !== CalibrationStatus.CLOSED);
    if (inUse) {
      notify('Varietà in uso: impossibile eliminare', 'ERROR');
      return;
    }
    setVarietiesState(prev => prev.map(i => i.id === id ? { ...i, isDeleted: true, deletedAt: nowIso(), updatedAt: nowIso() } : i));
    notify('Varietà archiviata', 'INFO');
  };

  const restoreVariety = (id: string) => {
    setVarietiesState(prev => prev.map(i => i.id === id ? { ...i, isDeleted: false, deletedAt: undefined, updatedAt: nowIso() } : i));
    notify('Varietà ripristinata', 'SUCCESS');
  };

  const hardDeleteVariety = (id: string) => {
    const canDelete = canHardDeleteVariety(id, { lots: lotsState, calibrations, productTypes: productTypesState });
    if (!canDelete.ok) {
      notify('Hard delete non consentito: varietà referenziata', 'ERROR');
      return;
    }
    setVarietiesState(prev => prev.filter(i => i.id !== id));
    notify('Varietà eliminata definitivamente', 'INFO');
  };

  const addPackaging = (data: PackagingInput) => {
    const required = validateRequiredCode(data.code, 'imballaggio');
    if (!required.ok) return false;
    const unique = validateUniqueCode(packagingsState, data.code);
    if (!unique.ok) return false;

    setPackagingsState(prev => [{ id: genId('pkg'), ...data, code: normalizeCode(data.code), isDeleted: false, createdAt: nowIso(), updatedAt: nowIso() }, ...prev]);
    notify(`Imballaggio "${data.name}" aggiunto`, 'SUCCESS');
    return true;
  };

  const updatePackaging = (id: string, data: PackagingInput) => {
    const required = validateRequiredCode(data.code, 'imballaggio');
    if (!required.ok) return false;
    const unique = validateUniqueCode(packagingsState, data.code, id);
    if (!unique.ok) return false;

    setPackagingsState(prev => prev.map(i => i.id === id ? { ...i, ...data, code: normalizeCode(data.code), updatedAt: nowIso() } : i));
    notify('Imballaggio aggiornato', 'SUCCESS');
    return true;
  };

  const deletePackaging = (id: string) => {
    const inUse = processes.some(p => p.packagingId === id && p.status === ProcessStatus.OPEN);
    if (inUse) {
      notify('Imballaggio in uso: impossibile eliminare', 'ERROR');
      return;
    }
    setPackagingsState(prev => prev.map(i => i.id === id ? { ...i, isDeleted: true, deletedAt: nowIso(), updatedAt: nowIso() } : i));
    notify('Imballaggio archiviato', 'INFO');
  };

  const restorePackaging = (id: string) => {
    setPackagingsState(prev => prev.map(i => i.id === id ? { ...i, isDeleted: false, deletedAt: undefined, updatedAt: nowIso() } : i));
    notify('Imballaggio ripristinato', 'SUCCESS');
  };

  const hardDeletePackaging = (id: string) => {
    const inUse = processes.some(p => p.packagingId === id);
    if (inUse) {
      notify('Hard delete non consentito: imballaggio referenziato', 'ERROR');
      return;
    }
    setPackagingsState(prev => prev.filter(i => i.id !== id));
    notify('Imballaggio eliminato definitivamente', 'INFO');
  };

  const addProductType = (data: ProductTypeInput) => {
    const required = validateRequiredCode(data.code, 'lavorato');
    if (!required.ok) return false;
    const unique = validateUniqueCode(productTypesState, data.code);
    if (!unique.ok) return false;
    const valid = validateProductType(data);
    if (!valid.ok) return false;
    const relation = validateProductTypeRelations(data, { rawMaterials: rawMaterialsState, subtypes: subtypesState, varieties: varietiesState });
    if (!relation.ok) return false;

    setProductTypesState(prev => [{ ...data, id: genId('pt'), code: normalizeCode(data.code), isDeleted: false, createdAt: nowIso(), updatedAt: nowIso() }, ...prev]);
    notify(`Articolo "${data.name}" aggiunto`, 'SUCCESS');
    return true;
  };

  const updateProductType = (id: string, data: ProductTypeInput) => {
    const required = validateRequiredCode(data.code, 'lavorato');
    if (!required.ok) return false;
    const unique = validateUniqueCode(productTypesState, data.code, id);
    if (!unique.ok) return false;
    const valid = validateProductType(data);
    if (!valid.ok) return false;
    const relation = validateProductTypeRelations(data, { rawMaterials: rawMaterialsState, subtypes: subtypesState, varieties: varietiesState });
    if (!relation.ok) return false;

    setProductTypesState(prev => prev.map(i => i.id === id ? { ...i, ...data, code: normalizeCode(data.code), updatedAt: nowIso() } : i));
    notify('Articolo aggiornato', 'SUCCESS');
    return true;
  };

  const deleteProductType = (id: string) => {
    const inUse = processes.some(p => p.productTypeId === id && p.status === ProcessStatus.OPEN);
    if (inUse) {
      notify('Articolo in uso: impossibile eliminare', 'ERROR');
      return;
    }
    setProductTypesState(prev => prev.map(i => i.id === id ? { ...i, isDeleted: true, deletedAt: nowIso(), updatedAt: nowIso() } : i));
    notify('Articolo archiviato', 'INFO');
  };

  const restoreProductType = (id: string) => {
    setProductTypesState(prev => prev.map(i => i.id === id ? { ...i, isDeleted: false, deletedAt: undefined, updatedAt: nowIso() } : i));
    notify('Articolo ripristinato', 'SUCCESS');
  };

  const hardDeleteProductType = (id: string) => {
    const canDelete = canHardDeleteProductType(id, { processes });
    if (!canDelete.ok) {
      notify('Hard delete non consentito: articolo referenziato', 'ERROR');
      return;
    }
    setProductTypesState(prev => prev.filter(i => i.id !== id));
    notify('Articolo eliminato definitivamente', 'INFO');
  };

  const addLot = (data: LotInput) => {
    const lotCodeRequired = validateRequiredCode(data.code, 'lotto');
    if (!lotCodeRequired.ok) return false;
    const unique = validateUniqueCode(lotsState, data.code);
    if (!unique.ok) return false;
    const relation = validateLotRelations(data, { rawMaterials: rawMaterialsState, subtypes: subtypesState, varieties: varietiesState });
    if (!relation.ok) return false;

    setLotsState(prev => [{ ...data, id: genId('l'), code: normalizeCode(data.code), isDeleted: false, createdAt: nowIso(), updatedAt: nowIso() }, ...prev]);
    notify(`Lotto "${data.code}" aggiunto`, 'SUCCESS');
    return true;
  };

  const updateLot = (id: string, data: LotInput) => {
    const lotCodeRequired = validateRequiredCode(data.code, 'lotto');
    if (!lotCodeRequired.ok) return false;
    const unique = validateUniqueCode(lotsState, data.code, id);
    if (!unique.ok) return false;
    const relation = validateLotRelations(data, { rawMaterials: rawMaterialsState, subtypes: subtypesState, varieties: varietiesState });
    if (!relation.ok) return false;

    setLotsState(prev => prev.map(i => i.id === id ? { ...i, ...data, code: normalizeCode(data.code), updatedAt: nowIso() } : i));
    notify('Lotto aggiornato', 'SUCCESS');
    return true;
  };

  const deleteLot = (id: string) => {
    const inUse = calibrations.some(c => c.lotId === id && c.status !== CalibrationStatus.CLOSED);
    if (inUse) {
      notify('Lotto in uso: impossibile eliminare', 'ERROR');
      return;
    }
    setLotsState(prev => prev.map(i => i.id === id ? { ...i, isDeleted: true, deletedAt: nowIso(), updatedAt: nowIso() } : i));
    notify('Lotto archiviato', 'INFO');
  };

  const restoreLot = (id: string) => {
    setLotsState(prev => prev.map(i => i.id === id ? { ...i, isDeleted: false, deletedAt: undefined, updatedAt: nowIso() } : i));
    notify('Lotto ripristinato', 'SUCCESS');
  };

  const hardDeleteLot = (id: string) => {
    const canDelete = canHardDeleteLot(id, { calibrations });
    if (!canDelete.ok) {
      notify('Hard delete non consentito: lotto referenziato', 'ERROR');
      return;
    }
    setLotsState(prev => prev.filter(i => i.id !== id));
    notify('Lotto eliminato definitivamente', 'INFO');
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
      addRawMaterial, updateRawMaterial, deleteRawMaterial, hardDeleteRawMaterial, restoreRawMaterial,
      addSubtype, updateSubtype, deleteSubtype, hardDeleteSubtype, restoreSubtype,
      addVariety, updateVariety, deleteVariety, hardDeleteVariety, restoreVariety,
      addPackaging, updatePackaging, deletePackaging, hardDeletePackaging, restorePackaging,
      addProductType, updateProductType, deleteProductType, hardDeleteProductType, restoreProductType,
      addLot, updateLot, deleteLot, hardDeleteLot, restoreLot,
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
