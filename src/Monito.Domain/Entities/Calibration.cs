using Monito.Domain.Common;
using Monito.Domain.Enums;

namespace Monito.Domain.Entities;

public sealed class Calibration : AuditableEntity
{
    public string LotCode { get; private set; } = string.Empty;
    public string RawMaterial { get; private set; } = string.Empty;
    public string Variety { get; private set; } = string.Empty;
    public string Producer { get; private set; } = string.Empty;
    public DateTime StartDateUtc { get; private set; } = DateTime.UtcNow;
    public CalibrationStatus Status { get; private set; } = CalibrationStatus.Programmed;
    public decimal IncomingRawWeightKg { get; private set; }

    private Calibration() { }

    public static Calibration Create(string lotCode, string rawMaterial, string variety, string producer, DateTime startDateUtc, decimal incomingRawWeightKg)
    {
        if (string.IsNullOrWhiteSpace(variety)) throw new ArgumentException("Variety is required.");
        if (incomingRawWeightKg <= 0) throw new ArgumentException("Incoming raw weight must be greater than zero.");

        return new Calibration
        {
            LotCode = lotCode.Trim().ToUpperInvariant(),
            RawMaterial = rawMaterial.Trim(),
            Variety = variety.Trim(),
            Producer = producer.Trim(),
            StartDateUtc = startDateUtc,
            IncomingRawWeightKg = incomingRawWeightKg,
            Status = CalibrationStatus.Open
        };
    }

    public void Close()
    {
        Status = CalibrationStatus.Closed;
        Touch();
    }
}
