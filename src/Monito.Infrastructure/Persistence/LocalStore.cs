using Monito.Domain.Entities;

namespace Monito.Infrastructure.Persistence;

public sealed class LocalStore
{
    public List<Calibration> Calibrations { get; } = [];
    public List<ProductionProcess> Processes { get; } = [];
    public List<Pallet> Pallets { get; } = [];
}
