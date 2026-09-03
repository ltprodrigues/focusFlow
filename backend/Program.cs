using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Serialization;
using backend.Services;
using backend.Auth;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(options => AssignmentJsonOptions.Configure(options.JsonSerializerOptions));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var googleClientId = builder.Configuration["Authentication:Google:ClientId"];
var googleClientSecret = builder.Configuration["Authentication:Google:ClientSecret"];
if (!builder.Environment.IsEnvironment("Testing")
    && (string.IsNullOrWhiteSpace(googleClientId) || string.IsNullOrWhiteSpace(googleClientSecret)))
{
    throw new InvalidOperationException(
        "Google authentication is not configured. Set Authentication:Google:ClientId and ClientSecret with User Secrets or environment variables.");
}

builder.Services.AddScoped<IGoogleProfileService, GoogleProfileService>();
builder.Services.AddScoped<GoogleAuthEvents>();
builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = CookieAuthenticationDefaults.AuthenticationScheme;
        options.DefaultSignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = GoogleDefaults.AuthenticationScheme;
    })
    .AddCookie(options =>
    {
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
            ? CookieSecurePolicy.SameAsRequest
            : CookieSecurePolicy.Always;
        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
    })
    .AddGoogle(options =>
    {
        options.ClientId = googleClientId ?? "focusflow-testing-client";
        options.ClientSecret = googleClientSecret ?? "focusflow-testing-secret";
        options.CallbackPath = builder.Configuration["Authentication:Google:CallbackPath"]
            ?? "/signin-google";
        options.EventsType = typeof(GoogleAuthEvents);
        options.SaveTokens = false;
    });

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddScoped<ICurrentUserService, DemoCurrentUserService>();
builder.Services.AddScoped<IFinanceSummaryService, FinanceSummaryService>();

const string DevelopmentCorsPolicy = "DevelopmentFrontend";
if (builder.Environment.IsDevelopment())
{
    var frontendOrigin = builder.Configuration["Cors:Origins:0"]
        ?? throw new InvalidOperationException("Cors:Origins:0 must be configured in Development.");

    builder.Services.AddCors(options =>
        options.AddPolicy(DevelopmentCorsPolicy, policy =>
            policy.WithOrigins(frontendOrigin)
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials()));
}

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    await using var scope = app.Services.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await db.Database.MigrateAsync();
    var demoUserId = app.Configuration.GetValue<int>("DemoUser:Id");
    var demoTimeZone = builder.Configuration["DemoUser:TimeZone"] ?? "America/Toronto";
    await DevelopmentDataSeeder.SeedAsync(db, demoUserId, timeZoneId: demoTimeZone);

    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseCors(DevelopmentCorsPolicy);
}

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

public partial class Program;
