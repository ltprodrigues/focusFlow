using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Serialization;
using backend.Services;
using backend.Auth;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using backend.Filters;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddScoped<AntiforgeryValidationFilter>();
builder.Services.AddControllers(options =>
    options.Filters.AddService<AntiforgeryValidationFilter>())
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
        options.Cookie.Name = "FocusFlow.Session";
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
        options.Events.OnRedirectToAccessDenied = context =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
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
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<IFinanceSummaryService, FinanceSummaryService>();
builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-FocusFlow-CSRF";
    options.Cookie.Name = "FocusFlow.Antiforgery";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
        ? CookieSecurePolicy.SameAsRequest
        : CookieSecurePolicy.Always;
});

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
    if (app.Configuration.GetValue<bool>("Database:ApplyMigrationsOnStartup"))
    {
        await using var scope = app.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await db.Database.MigrateAsync();
    }

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
