import { AuditEvent, Calibration, Pallet, Process, UserRole } from '../../types';
import { ProductionAggregateRoot } from './aggregates/ProductionAggregateRoot';

export type CreatePalletInput = {
  data: Omit<Pallet, 'id' | 'timestamp'>;
  process?: Process;
  calibration?: Calibration;
  nowIso: string;
  palletId: string;
  auditId: string;
  actorRole: UserRole;
};

export type CreatePalletOutput = {
  pallet: Pallet;
  auditEvent: AuditEvent;
};

export const createPalletUseCase = (input: CreatePalletInput): CreatePalletOutput => {
  const { data, process, calibration, nowIso, palletId, auditId, actorRole } = input;

  const pallet: Pallet = {
    ...data,
    id: palletId,
    timestamp: nowIso,
    lotCode: process?.lotCode || calibration?.lotCode,
    rawMaterial: process?.rawMaterial || calibration?.rawMaterial,
    variety: process?.variety || calibration?.variety,
    producer: process?.producer || calibration?.producer,
    productType: process?.productType,
    packaging: process?.packaging,
    line: process?.line,
    caliber: process?.caliber,
  };

  const auditEvent: AuditEvent = {
    id: auditId,
    timestamp: nowIso,
    action: 'PALLET_CREATED',
    entity: 'pallet',
    entityId: pallet.id,
    actorRole,
    message: `Registrata pedana ${pallet.id}`,
    metadata: {
      processId: pallet.processId,
      lotCode: pallet.lotCode,
      weight: pallet.weight,
    },
  };

  return { pallet, auditEvent };
};



export type UpdateCalibrationSnapshotsInput = {
  calibrationId: string;
  data: Partial<Pick<Calibration, 'lotId' | 'lotCode' | 'rawMaterialId' | 'subtypeId' | 'varietyId' | 'rawMaterial' | 'subtype' | 'variety' | 'producer' | 'startDate' | 'note'>>;
  calibrations: Calibration[];
  processes: Process[];
  pallets: Pallet[];
  lots: { id: string; code: string }[];
  propagateToLinkedOperationalSnapshots?: boolean;
};

export type UpdateCalibrationSnapshotsOutput = {
  calibrations: Calibration[];
  processes: Process[];
  pallets: Pallet[];
  updatedCalibration?: Calibration;
  affectedProcessCount: number;
  affectedPalletCount: number;
};

export const updateCalibrationSnapshotsUseCase = (
  input: UpdateCalibrationSnapshotsInput
): UpdateCalibrationSnapshotsOutput => {
  const { calibrationId, data, calibrations, processes, pallets, lots, propagateToLinkedOperationalSnapshots } = input;

  const current = calibrations.find(c => c.id === calibrationId);
  if (!current) {
    return { calibrations, processes, pallets, affectedProcessCount: 0, affectedPalletCount: 0 };
  }

  const lotFromRegistry = data.lotId ? lots.find(l => l.id === data.lotId)?.code : undefined;
  const resolvedLotCode = data.lotCode ?? (data.lotId !== undefined ? lotFromRegistry : current.lotCode);
  const resolvedRawMaterial = data.rawMaterial ?? current.rawMaterial;
  const resolvedSubtype = data.subtype ?? current.subtype;
  const resolvedVariety = data.variety ?? current.variety;
  const resolvedProducer = data.producer ?? current.producer;

  const updatedCalibration: Calibration = { ...current, ...data, lotCode: resolvedLotCode };
  const nextCalibrations = calibrations.map(c => c.id === calibrationId ? updatedCalibration : c);

  if (!propagateToLinkedOperationalSnapshots) {
    return {
      calibrations: nextCalibrations,
      processes,
      pallets,
      updatedCalibration,
      affectedProcessCount: 0,
      affectedPalletCount: 0,
    };
  }

  const relatedProcessIds = new Set(processes.filter(p => p.calibrationId === calibrationId).map(p => p.id));
  const nextProcesses = processes.map(p => p.calibrationId === calibrationId
    ? {
        ...p,
        lotCode: resolvedLotCode,
        rawMaterial: resolvedRawMaterial,
        subtype: resolvedSubtype,
        variety: resolvedVariety,
        producer: resolvedProducer,
      }
    : p);

  const nextPallets = pallets.map(pl => relatedProcessIds.has(pl.processId)
    ? {
        ...pl,
        lotCode: resolvedLotCode,
        rawMaterial: resolvedRawMaterial,
        variety: resolvedVariety,
        producer: resolvedProducer,
      }
    : pl);

  return {
    calibrations: nextCalibrations,
    processes: nextProcesses,
    pallets: nextPallets,
    updatedCalibration,
    affectedProcessCount: relatedProcessIds.size,
    affectedPalletCount: pallets.filter(pl => relatedProcessIds.has(pl.processId)).length,
  };
};
export type PropagateLotCodeInput = {
  lotId: string;
  newLotCode: string;
  calibrations: Calibration[];
  processes: Process[];
  pallets: Pallet[];
};

export type PropagateLotCodeOutput = {
  calibrations: Calibration[];
  processes: Process[];
  pallets: Pallet[];
  affectedCalibrationCount: number;
  affectedProcessCount: number;
};

export const propagateLotCodeToOperationalSnapshots = (
  input: PropagateLotCodeInput
): PropagateLotCodeOutput => {
  const { lotId, newLotCode, calibrations, processes, pallets } = input;
  const aggregate = new ProductionAggregateRoot(lotId, calibrations, processes, pallets);
  return aggregate.propagateLotCode(newLotCode);
};
