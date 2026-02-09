using Monito.Application.Abstractions;
using Monito.Application.Dtos;
using Monito.Domain.Entities;
using Monito.Domain.Repositories;

namespace Monito.Application.UseCases;

public sealed class ProductionService
{
    private readonly IProductionRepository _repository;
    private readonly IUnitOfWork _unitOfWork;

    public ProductionService(IProductionRepository repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyList<CalibrationSummaryDto>> GetCalibrationsAsync(CancellationToken ct = default)
    {
        var data = await _repository.GetCalibrationsAsync(ct);
        return data.Select(c => new CalibrationSummaryDto(c.Id, c.LotCode, c.RawMaterial, c.Variety, c.Producer, c.StartDateUtc, c.Status)).ToList();
    }

    public async Task<CalibrationSummaryDto> CreateCalibrationAsync(CreateCalibrationRequest request, CancellationToken ct = default)
    {
        var calibration = Calibration.Create(request.LotCode, request.RawMaterial, request.Variety, request.Producer, request.StartDateUtc, request.IncomingRawWeightKg);
        await _repository.AddCalibrationAsync(calibration, ct);
        await _unitOfWork.SaveChangesAsync(ct);
        return new CalibrationSummaryDto(calibration.Id, calibration.LotCode, calibration.RawMaterial, calibration.Variety, calibration.Producer, calibration.StartDateUtc, calibration.Status);
    }

    public async Task<ProcessSummaryDto> CreateProcessAsync(CreateProcessRequest request, CancellationToken ct = default)
    {
        var parent = await _repository.GetCalibrationAsync(request.CalibrationId, ct);
        if (parent is null) throw new InvalidOperationException("Calibration not found.");

        var process = ProductionProcess.Create(request.CalibrationId, request.Line, request.ProductType, request.Packaging, request.Caliber, request.WeightType, request.StandardWeightKg);
        await _repository.AddProcessAsync(process, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        return new ProcessSummaryDto(process.Id, process.CalibrationId, process.Line, process.ProductType, process.Packaging, process.Caliber, process.Status);
    }

    public async Task<PalletSummaryDto> CreatePalletAsync(CreatePalletRequest request, CancellationToken ct = default)
    {
        var pallet = Pallet.Create(request.ProcessId, request.CaseCount, request.WeightKg, request.Notes);
        await _repository.AddPalletAsync(pallet, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        return new PalletSummaryDto(pallet.Id, pallet.ProcessId, pallet.CaseCount, pallet.WeightKg, pallet.Notes, pallet.CreatedAtUtc);
    }
}
