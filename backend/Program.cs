using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Serialization;
using backend.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(options => AssignmentJsonOptions.Configure(options.JsonSerializerOptions));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddScoped<ICurrentUserService, DemoCurrentUserService>();

const string DevelopmentCorsPolicy = "DevelopmentFrontend";
if (builder.Environment.IsDevelopment())
{
    var frontendOrigin = builder.Configuration["Cors:Origins:0"]
        ?? throw new InvalidOperationException("Cors:Origins:0 must be configured in Development.");

    builder.Services.AddCors(options =>
        options.AddPolicy(DevelopmentCorsPolicy, policy =>
            policy.WithOrigins(frontendOrigin)
                .AllowAnyHeader()
                .AllowAnyMethod()));
}

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    await using var scope = app.Services.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await db.Database.MigrateAsync();
    var demoUserId = app.Configuration.GetValue<int>("DemoUser:Id");
    await DevelopmentDataSeeder.SeedAsync(db, demoUserId);

    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseCors(DevelopmentCorsPolicy);
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();

public partial class Program;
