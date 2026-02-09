using Monito.Domain.Entities;
using Monito.Domain.Repositories;

namespace Monito.Infrastructure.Persistence;

public sealed class InMemoryProductionRepository : IProductionRepository
{
    private readonly LocalStore _store;

    public InMemoryProductionRepository(LocalStore store) => _store = store;

    public Task<IReadOnlyList<Calibration>> GetCalibrationsAsync(CancellationToken ct = default) =>
        Task.FromResult((IReadOnlyList<Calibration>)_store.Calibrations.Where(x => !x.IsDeleted).ToList());

    public Task<Calibration?> GetCalibrationAsync(Guid id, CancellationToken ct = default) =>
        Task.FromResult(_store.Calibrations.FirstOrDefault(c => c.Id == id && !c.IsDeleted));

    public Task AddCalibrationAsync(Calibration calibration, CancellationToken ct = default)
    {
        _store.Calibrations.Add(calibration);
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<ProductionProcess>> GetProcessesByCalibrationAsync(Guid calibrationId, CancellationToken ct = default) =>
        Task.FromResult((IReadOnlyList<ProductionProcess>)_store.Processes.Where(p => p.CalibrationId == calibrationId && !p.IsDeleted).ToList());

    public Task AddProcessAsync(ProductionProcess process, CancellationToken ct = default)
    {
        _store.Processes.Add(process);
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<Pallet>> GetPalletsByProcessAsync(Guid processId, CancellationToken ct = default) =>
        Task.FromResult((IReadOnlyList<Pallet>)_store.Pallets.Where(p => p.ProcessId == processId && !p.IsDeleted).ToList());

    public Task AddPalletAsync(Pallet pallet, CancellationToken ct = default)
    {
        _store.Pallets.Add(pallet);
        return Task.CompletedTask;
    }
}
