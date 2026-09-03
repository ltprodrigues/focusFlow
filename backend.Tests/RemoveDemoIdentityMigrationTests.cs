using System.Reflection;
using backend.Migrations;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Migrations.Operations;

public sealed class RemoveDemoIdentityMigrationTests
{
    [Fact]
    public void Up_DeletesOnlyTheExactDemoIdentityBeforeFinalConstraints()
    {
        var migration = new RemoveDemoIdentity();
        var builder = new MigrationBuilder("Npgsql.EntityFrameworkCore.PostgreSQL");
        typeof(RemoveDemoIdentity)
            .GetMethod("Up", BindingFlags.Instance | BindingFlags.NonPublic)!
            .Invoke(migration, [builder]);

        var sql = string.Join("\n", builder.Operations
            .OfType<SqlOperation>()
            .Select(operation => operation.Sql));
        Assert.Contains("WHERE \"Id\" = 1 AND \"Email\" = 'demo@focusflow.local'", sql);
        Assert.Contains("DELETE FROM \"StudyTasks\"", sql);
        Assert.Contains("DELETE FROM \"Expenses\"", sql);
        Assert.Contains("DELETE FROM \"MonthlyBudgets\"", sql);
        Assert.DoesNotContain("DELETE FROM \"Users\";", sql);

        var googleSubject = Assert.Single(builder.Operations
            .OfType<AlterColumnOperation>(), operation => operation.Name == "GoogleSubject");
        Assert.False(googleSubject.IsNullable);
        Assert.Contains(builder.Operations.OfType<DropColumnOperation>(),
            operation => operation.Name == "PasswordHash" && operation.Table == "Users");
    }
}
