using Microsoft.Extensions.DependencyInjection;
using Monito.Application.Abstractions;
using Monito.Application.UseCases;
using Monito.Domain.Repositories;
using Monito.Infrastructure.Persistence;
using Monito.Infrastructure.Supabase;

namespace Monito.Infrastructure.DependencyInjection;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddMonitoCore(this IServiceCollection services)
    {
        services.AddSingleton<LocalStore>();
        services.AddSingleton<IProductionRepository, InMemoryProductionRepository>();
        services.AddSingleton<IUnitOfWork, NoOpUnitOfWork>();
        services.AddSingleton<ISupabaseGateway, SupabaseGateway>();
        services.AddScoped<ProductionService>();
        return services;
    }
}
