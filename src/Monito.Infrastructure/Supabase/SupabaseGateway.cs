namespace Monito.Infrastructure.Supabase;

public sealed class SupabaseGateway : ISupabaseGateway
{
    public bool IsConfigured => !string.IsNullOrWhiteSpace(Url) && !string.IsNullOrWhiteSpace(AnonKey);
    public string Url { get; }
    private string AnonKey { get; }

    public SupabaseGateway(IConfiguration configuration)
    {
        Url = configuration["Supabase:Url"] ?? string.Empty;
        AnonKey = configuration["Supabase:AnonKey"] ?? string.Empty;
    }
}
