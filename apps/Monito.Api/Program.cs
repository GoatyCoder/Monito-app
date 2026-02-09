using Monito.Application.Dtos;
using Monito.Application.UseCases;
using Monito.Infrastructure.DependencyInjection;
using Monito.Infrastructure.Supabase;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyHeader().AllowAnyMethod().AllowAnyOrigin());
});

builder.Services.AddMonitoCore();

var app = builder.Build();
app.UseCors();

app.MapGet("/health", (ISupabaseGateway supabase) => Results.Ok(new
{
    status = "ok",
    mode = supabase.IsConfigured ? "supabase-ready" : "local-inmemory"
}));

app.MapGet("/api/calibrations", async (ProductionService service, CancellationToken ct) =>
{
    var data = await service.GetCalibrationsAsync(ct);
    return Results.Ok(data);
});

app.MapPost("/api/calibrations", async (CreateCalibrationRequest request, ProductionService service, CancellationToken ct) =>
{
    var created = await service.CreateCalibrationAsync(request, ct);
    return Results.Created($"/api/calibrations/{created.Id}", created);
});

app.MapPost("/api/processes", async (CreateProcessRequest request, ProductionService service, CancellationToken ct) =>
{
    var created = await service.CreateProcessAsync(request, ct);
    return Results.Created($"/api/processes/{created.Id}", created);
});

app.MapPost("/api/pallets", async (CreatePalletRequest request, ProductionService service, CancellationToken ct) =>
{
    var created = await service.CreatePalletAsync(request, ct);
    return Results.Created($"/api/pallets/{created.Id}", created);
});

app.Run();
