using Monito.Domain.Common;
using Monito.Domain.Enums;

namespace Monito.Domain.Entities;

public sealed class ProductionProcess : AuditableEntity
{
    public Guid CalibrationId { get; private set; }
    public string Line { get; private set; } = string.Empty;
    public string ProductType { get; private set; } = string.Empty;
    public string Packaging { get; private set; } = string.Empty;
    public string Caliber { get; private set; } = string.Empty;
    public WeightType WeightType { get; private set; }
    public decimal? StandardWeightKg { get; private set; }
    public ProcessStatus Status { get; private set; } = ProcessStatus.Open;

    private ProductionProcess() { }

    public static ProductionProcess Create(Guid calibrationId, string line, string productType, string packaging, string caliber, WeightType weightType, decimal? standardWeightKg)
    {
        if (calibrationId == Guid.Empty) throw new ArgumentException("Calibration is required.");
        if (weightType == WeightType.Equalized && (!standardWeightKg.HasValue || standardWeightKg <= 0))
            throw new ArgumentException("Standard weight is required for equalized processes.");

        return new ProductionProcess
        {
            CalibrationId = calibrationId,
            Line = line.Trim(),
            ProductType = productType.Trim(),
            Packaging = packaging.Trim(),
            Caliber = caliber.Trim(),
            WeightType = weightType,
            StandardWeightKg = standardWeightKg,
            Status = ProcessStatus.Open
        };
    }
}
