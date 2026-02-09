using System.Net.Http.Json;

namespace Monito.Web.Services;

public sealed class ProductionApiClient
{
    private readonly HttpClient _httpClient;

    public ProductionApiClient(HttpClient httpClient) => _httpClient = httpClient;

    public async Task<List<CalibrationVm>> GetCalibrationsAsync(CancellationToken ct = default)
    {
        return await _httpClient.GetFromJsonAsync<List<CalibrationVm>>("/api/calibrations", ct) ?? [];
    }

    public async Task CreateCalibrationAsync(NewCalibrationVm request, CancellationToken ct = default)
    {
        var payload = new
        {
            request.LotCode,
            request.RawMaterial,
            request.Variety,
            request.Producer,
            StartDateUtc = DateTime.UtcNow,
            request.IncomingRawWeightKg
        };

        var response = await _httpClient.PostAsJsonAsync("/api/calibrations", payload, ct);
        response.EnsureSuccessStatusCode();
    }
}

public sealed class CalibrationVm
{
    public Guid Id { get; set; }
    public string LotCode { get; set; } = string.Empty;
    public string RawMaterial { get; set; } = string.Empty;
    public string Variety { get; set; } = string.Empty;
    public string Producer { get; set; } = string.Empty;
}

public sealed class NewCalibrationVm
{
    public string LotCode { get; set; } = string.Empty;
    public string RawMaterial { get; set; } = string.Empty;
    public string Variety { get; set; } = string.Empty;
    public string Producer { get; set; } = string.Empty;
    public decimal IncomingRawWeightKg { get; set; } = 100;
}
