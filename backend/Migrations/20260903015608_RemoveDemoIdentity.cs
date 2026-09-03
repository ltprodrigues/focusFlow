using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class RemoveDemoIdentity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DELETE FROM "StudyTasks"
                WHERE "UserId" IN (
                    SELECT "Id" FROM "Users"
                    WHERE "Id" = 1 AND "Email" = 'demo@focusflow.local'
                );
                """);
            migrationBuilder.Sql("""
                DELETE FROM "Expenses"
                WHERE "UserId" IN (
                    SELECT "Id" FROM "Users"
                    WHERE "Id" = 1 AND "Email" = 'demo@focusflow.local'
                );
                """);
            migrationBuilder.Sql("""
                DELETE FROM "MonthlyBudgets"
                WHERE "UserId" IN (
                    SELECT "Id" FROM "Users"
                    WHERE "Id" = 1 AND "Email" = 'demo@focusflow.local'
                );
                """);
            migrationBuilder.Sql("""
                DELETE FROM "Users"
                WHERE "Id" = 1 AND "Email" = 'demo@focusflow.local';
                """);

            migrationBuilder.DropIndex(
                name: "IX_Users_GoogleSubject",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "PasswordHash",
                table: "Users");

            migrationBuilder.AlterColumn<string>(
                name: "GoogleSubject",
                table: "Users",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(255)",
                oldMaxLength: 255,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_GoogleSubject",
                table: "Users",
                column: "GoogleSubject",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Users_GoogleSubject",
                table: "Users");

            migrationBuilder.AlterColumn<string>(
                name: "GoogleSubject",
                table: "Users",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(255)",
                oldMaxLength: 255);

            migrationBuilder.AddColumn<string>(
                name: "PasswordHash",
                table: "Users",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_Users_GoogleSubject",
                table: "Users",
                column: "GoogleSubject",
                unique: true,
                filter: "\"GoogleSubject\" IS NOT NULL");
        }
    }
}
