using Monito.Application.Abstractions;

namespace Monito.Infrastructure.Persistence;

public sealed class NoOpUnitOfWork : IUnitOfWork
{
    public Task SaveChangesAsync(CancellationToken ct = default) => Task.CompletedTask;
}
