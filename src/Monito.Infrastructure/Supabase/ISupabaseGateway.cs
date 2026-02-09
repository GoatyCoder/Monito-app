namespace Monito.Infrastructure.Supabase;

public interface ISupabaseGateway
{
    bool IsConfigured { get; }
    string Url { get; }
}
