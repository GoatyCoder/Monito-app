import { Calibration, Pallet, Process } from '../../../types';
import { AggregateRoot } from '../AggregateRoot';

export type LotPropagationResult = {
  calibrations: Calibration[];
  processes: Process[];
  pallets: Pallet[];
  affectedCalibrationCount: number;
  affectedProcessCount: number;
};

export class ProductionAggregateRoot extends AggregateRoot {
  constructor(
    lotId: string,
    private calibrations: Calibration[],
    private processes: Process[],
    private pallets: Pallet[]
  ) {
    super(lotId);
  }

  propagateLotCode(newLotCode: string): LotPropagationResult {
    const relatedCalibrationIds = this.calibrations.filter(c => c.lotId === this.id).map(c => c.id);
    const relatedProcessIds = this.processes
      .filter(p => relatedCalibrationIds.includes(p.calibrationId))
      .map(p => p.id);

    this.calibrations = this.calibrations.map(c => c.lotId === this.id ? { ...c, lotCode: newLotCode } : c);
    this.processes = this.processes.map(p => relatedCalibrationIds.includes(p.calibrationId) ? { ...p, lotCode: newLotCode } : p);
    this.pallets = this.pallets.map(pl => relatedProcessIds.includes(pl.processId) ? { ...pl, lotCode: newLotCode } : pl);

    this.incrementVersion();
    this.addDomainEvent({
      type: 'LOT_CODE_PROPAGATED',
      occurredAt: new Date().toISOString(),
      payload: {
        lotId: this.id,
        newLotCode,
        affectedCalibrationCount: relatedCalibrationIds.length,
        affectedProcessCount: relatedProcessIds.length,
        version: this.getVersion(),
      },
    });

    return {
      calibrations: this.calibrations,
      processes: this.processes,
      pallets: this.pallets,
      affectedCalibrationCount: relatedCalibrationIds.length,
      affectedProcessCount: relatedProcessIds.length,
    };
  }
}
