import { Calibration, Lot, Packaging, Process, ProductType, RawMaterial, RawMaterialSubtype, Variety, WeightType } from '../../types';

export type ValidationResult = { ok: true } | { ok: false; code: string; message: string; field?: string };

export const ok = (): ValidationResult => ({ ok: true });

export const normalizeCode = (value: string) => value.trim().toUpperCase();

export const validateRequiredCode = (value: string, entityLabel: string): ValidationResult => {
  const normalized = normalizeCode(value);
  if (!normalized) {
    return { ok: false, code: 'REQUIRED_CODE', message: `Codice obbligatorio per ${entityLabel}`, field: 'code' };
  }
  return ok();
};

export const validateUniqueCode = <T extends { id: string; code: string; isDeleted: boolean }>(
  items: T[],
  code: string,
  currentId?: string
): ValidationResult => {
  const normalized = normalizeCode(code);
  const exists = items.some(i => !i.isDeleted && i.code.toUpperCase() === normalized && i.id !== currentId);
  if (exists) return { ok: false, code: 'DUPLICATE_CODE', message: `Codice "${normalized}" già esistente`, field: 'code' };
  return ok();
};

export const validateLotRelations = (
  lot: Pick<Lot, 'rawMaterialId' | 'subtypeId' | 'varietyId'>,
  refs: { rawMaterials: RawMaterial[]; subtypes: RawMaterialSubtype[]; varieties: Variety[] }
): ValidationResult => {
  if (!lot.rawMaterialId) return { ok: false, code: 'LOT_RAW_REQUIRED', message: 'Grezzo obbligatorio', field: 'rawMaterialId' };
  if (!lot.varietyId) return { ok: false, code: 'LOT_VARIETY_REQUIRED', message: 'Varietà obbligatoria per il lotto', field: 'varietyId' };

  const raw = refs.rawMaterials.find(r => r.id === lot.rawMaterialId && !r.isDeleted);
  if (!raw) return { ok: false, code: 'LOT_RAW_INVALID', message: 'Grezzo non valido o eliminato', field: 'rawMaterialId' };

  if (lot.subtypeId) {
    const st = refs.subtypes.find(s => s.id === lot.subtypeId && !s.isDeleted);
    if (!st || st.rawMaterialId !== lot.rawMaterialId) {
      return { ok: false, code: 'LOT_SUBTYPE_INVALID', message: 'Tipologia non coerente con il grezzo', field: 'subtypeId' };
    }
  }

  const v = refs.varieties.find(x => x.id === lot.varietyId && !x.isDeleted);
  if (!v || v.rawMaterialId !== lot.rawMaterialId) {
    return { ok: false, code: 'LOT_VARIETY_INVALID', message: 'Varietà non coerente con il grezzo', field: 'varietyId' };
  }

  if (v.subtypeId && lot.subtypeId && v.subtypeId !== lot.subtypeId) {
    return { ok: false, code: 'LOT_VARIETY_SUBTYPE_MISMATCH', message: 'Varietà non coerente con la tipologia', field: 'varietyId' };
  }

  return ok();
};

export const validateProductType = (data: Pick<ProductType, 'weightType' | 'standardWeight'>): ValidationResult => {
  if (data.weightType === WeightType.EGALIZZATO && (!data.standardWeight || data.standardWeight <= 0)) {
    return { ok: false, code: 'PRODUCT_STANDARD_WEIGHT_REQUIRED', message: 'Peso standard obbligatorio e > 0 per peso egalizzato', field: 'standardWeight' };
  }
  return ok();
};

export const validateSubtypeRelations = (
  subtype: Pick<RawMaterialSubtype, 'rawMaterialId'>,
  refs: { rawMaterials: RawMaterial[] }
): ValidationResult => {
  if (!subtype.rawMaterialId) {
    return { ok: false, code: 'SUBTYPE_RAW_REQUIRED', message: 'Grezzo obbligatorio per la tipologia', field: 'rawMaterialId' };
  }

  const rawExists = refs.rawMaterials.some(r => r.id === subtype.rawMaterialId && !r.isDeleted);
  if (!rawExists) {
    return { ok: false, code: 'SUBTYPE_RAW_INVALID', message: 'Grezzo non valido o eliminato', field: 'rawMaterialId' };
  }

  return ok();
};

export const validateVarietyRelations = (
  variety: Pick<Variety, 'rawMaterialId' | 'subtypeId'>,
  refs: { rawMaterials: RawMaterial[]; subtypes: RawMaterialSubtype[] }
): ValidationResult => {
  if (!variety.rawMaterialId) {
    return { ok: false, code: 'VARIETY_RAW_REQUIRED', message: 'Grezzo obbligatorio per la varietà', field: 'rawMaterialId' };
  }

  const rawExists = refs.rawMaterials.some(r => r.id === variety.rawMaterialId && !r.isDeleted);
  if (!rawExists) {
    return { ok: false, code: 'VARIETY_RAW_INVALID', message: 'Grezzo non valido o eliminato', field: 'rawMaterialId' };
  }

  if (variety.subtypeId) {
    const subtype = refs.subtypes.find(s => s.id === variety.subtypeId && !s.isDeleted);
    if (!subtype || subtype.rawMaterialId !== variety.rawMaterialId) {
      return { ok: false, code: 'VARIETY_SUBTYPE_INVALID', message: 'Tipologia non coerente con il grezzo selezionato', field: 'subtypeId' };
    }
  }

  return ok();
};

export const validateProductTypeRelations = (
  productType: Pick<ProductType, 'rawMaterialId' | 'subtypeId' | 'varietyId'>,
  refs: { rawMaterials: RawMaterial[]; subtypes: RawMaterialSubtype[]; varieties: Variety[] }
): ValidationResult => {
  const { rawMaterialId, subtypeId, varietyId } = productType;

  const raw = rawMaterialId
    ? refs.rawMaterials.find(r => r.id === rawMaterialId && !r.isDeleted)
    : undefined;
  if (rawMaterialId && !raw) {
    return { ok: false, code: 'PRODUCT_RAW_INVALID', message: 'Grezzo non valido o eliminato', field: 'rawMaterialId' };
  }

  const subtype = subtypeId
    ? refs.subtypes.find(s => s.id === subtypeId && !s.isDeleted)
    : undefined;
  if (subtypeId && !subtype) {
    return { ok: false, code: 'PRODUCT_SUBTYPE_INVALID', message: 'Tipologia non valida o eliminata', field: 'subtypeId' };
  }
  if (raw && subtype && subtype.rawMaterialId !== raw.id) {
    return { ok: false, code: 'PRODUCT_SUBTYPE_RAW_MISMATCH', message: 'Tipologia non coerente con il grezzo selezionato', field: 'subtypeId' };
  }

  const variety = varietyId
    ? refs.varieties.find(v => v.id === varietyId && !v.isDeleted)
    : undefined;
  if (varietyId && !variety) {
    return { ok: false, code: 'PRODUCT_VARIETY_INVALID', message: 'Varietà non valida o eliminata', field: 'varietyId' };
  }
  if (raw && variety && variety.rawMaterialId !== raw.id) {
    return { ok: false, code: 'PRODUCT_VARIETY_RAW_MISMATCH', message: 'Varietà non coerente con il grezzo selezionato', field: 'varietyId' };
  }
  if (subtype && variety && variety.subtypeId && variety.subtypeId !== subtype.id) {
    return { ok: false, code: 'PRODUCT_VARIETY_SUBTYPE_MISMATCH', message: 'Varietà non coerente con la tipologia selezionata', field: 'varietyId' };
  }

  return ok();
};

export const canHardDeleteRawMaterial = (
  id: string,
  refs: { subtypes: RawMaterialSubtype[]; varieties: Variety[]; lots: Lot[] }
): ValidationResult => {
  const used = refs.subtypes.some(s => s.rawMaterialId === id && !s.isDeleted)
    || refs.varieties.some(v => v.rawMaterialId === id && !v.isDeleted)
    || refs.lots.some(l => l.rawMaterialId === id && !l.isDeleted);
  if (used) return { ok: false, code: 'RAW_MATERIAL_IN_USE', message: 'Impossibile eliminare definitivamente: anagrafica in uso' };
  return ok();
};

export const canHardDeletePackaging = (id: string, refs: { productTypes: ProductType[] }): ValidationResult => {
  const used = refs.productTypes.some(pt => !pt.isDeleted && (pt.name || '').includes(id));
  if (used) return { ok: false, code: 'PACKAGING_IN_USE', message: 'Impossibile eliminare definitivamente: imballaggio in uso' };
  return ok();
};

export const canHardDeleteProductType = (id: string, refs: { processes: Process[] }): ValidationResult => {
  const used = refs.processes.some(p => p.productTypeId === id);
  if (used) return { ok: false, code: 'PRODUCT_TYPE_IN_USE', message: 'Impossibile eliminare definitivamente: articolo in uso' };
  return ok();
};

export const canHardDeleteLot = (id: string, refs: { calibrations: Calibration[] }): ValidationResult => {
  const used = refs.calibrations.some(c => c.lotId === id);
  if (used) return { ok: false, code: 'LOT_IN_USE', message: 'Impossibile eliminare definitivamente: lotto in uso' };
  return ok();
};

export const canHardDeleteSubtype = (
  id: string,
  refs: { varieties: Variety[]; lots: Lot[]; calibrations: Calibration[]; productTypes: ProductType[] }
): ValidationResult => {
  const used = refs.varieties.some(v => v.subtypeId === id)
    || refs.lots.some(l => l.subtypeId === id)
    || refs.calibrations.some(c => c.subtypeId === id)
    || refs.productTypes.some(pt => pt.subtypeId === id);
  if (used) return { ok: false, code: 'SUBTYPE_IN_USE', message: 'Impossibile eliminare definitivamente: tipologia in uso' };
  return ok();
};

export const canHardDeleteVariety = (
  id: string,
  refs: { lots: Lot[]; calibrations: Calibration[]; productTypes: ProductType[] }
): ValidationResult => {
  const used = refs.lots.some(l => l.varietyId === id)
    || refs.calibrations.some(c => c.varietyId === id)
    || refs.productTypes.some(pt => pt.varietyId === id);
  if (used) return { ok: false, code: 'VARIETY_IN_USE', message: 'Impossibile eliminare definitivamente: varietà in uso' };
  return ok();
};
