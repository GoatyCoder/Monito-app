using Monito.Web.Services;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");

builder.Services.AddScoped(_ => new HttpClient { BaseAddress = new Uri("http://localhost:5180") });
builder.Services.AddScoped<ProductionApiClient>();

await builder.Build().RunAsync();
