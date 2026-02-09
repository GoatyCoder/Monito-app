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
