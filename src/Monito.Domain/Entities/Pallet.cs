using Monito.Domain.Common;

namespace Monito.Domain.Entities;

public sealed class Pallet : AuditableEntity
{
    public Guid ProcessId { get; private set; }
    public int CaseCount { get; private set; }
    public decimal WeightKg { get; private set; }
    public string? Notes { get; private set; }

    private Pallet() { }

    public static Pallet Create(Guid processId, int caseCount, decimal weightKg, string? notes)
    {
        if (processId == Guid.Empty) throw new ArgumentException("Process is required.");
        if (caseCount <= 0) throw new ArgumentException("Case count must be greater than zero.");
        if (weightKg <= 0) throw new ArgumentException("Weight must be greater than zero.");

        return new Pallet
        {
            ProcessId = processId,
            CaseCount = caseCount,
            WeightKg = weightKg,
            Notes = notes
        };
    }
}
