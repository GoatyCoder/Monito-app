using Monito.Domain.Enums;

namespace Monito.Application.Dtos;

public sealed record CreateCalibrationRequest(
    string LotCode,
    string RawMaterial,
    string Variety,
    string Producer,
    DateTime StartDateUtc,
    decimal IncomingRawWeightKg);

public sealed record CreateProcessRequest(
    Guid CalibrationId,
    string Line,
    string ProductType,
    string Packaging,
    string Caliber,
    WeightType WeightType,
    decimal? StandardWeightKg);

public sealed record CreatePalletRequest(Guid ProcessId, int CaseCount, decimal WeightKg, string? Notes);

public sealed record CalibrationSummaryDto(Guid Id, string LotCode, string RawMaterial, string Variety, string Producer, DateTime StartDateUtc, CalibrationStatus Status);

public sealed record ProcessSummaryDto(Guid Id, Guid CalibrationId, string Line, string ProductType, string Packaging, string Caliber, ProcessStatus Status);

public sealed record PalletSummaryDto(Guid Id, Guid ProcessId, int CaseCount, decimal WeightKg, string? Notes, DateTime CreatedAtUtc);
