using Monito.Domain.Entities;

namespace Monito.Domain.Repositories;

public interface IProductionRepository
{
    Task<IReadOnlyList<Calibration>> GetCalibrationsAsync(CancellationToken ct = default);
    Task<Calibration?> GetCalibrationAsync(Guid id, CancellationToken ct = default);
    Task AddCalibrationAsync(Calibration calibration, CancellationToken ct = default);

    Task<IReadOnlyList<ProductionProcess>> GetProcessesByCalibrationAsync(Guid calibrationId, CancellationToken ct = default);
    Task AddProcessAsync(ProductionProcess process, CancellationToken ct = default);

    Task<IReadOnlyList<Pallet>> GetPalletsByProcessAsync(Guid processId, CancellationToken ct = default);
    Task AddPalletAsync(Pallet pallet, CancellationToken ct = default);
}
