using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddAssignmentDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_StudyTasks_UserId",
                table: "StudyTasks");

            migrationBuilder.AddColumn<string>(
                name: "Course",
                table: "StudyTasks",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "StudyTasks",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Priority",
                table: "StudyTasks",
                type: "text",
                nullable: false,
                defaultValue: "Low");

            migrationBuilder.CreateIndex(
                name: "IX_StudyTasks_UserId_DueDate",
                table: "StudyTasks",
                columns: new[] { "UserId", "DueDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_StudyTasks_UserId_DueDate",
                table: "StudyTasks");

            migrationBuilder.DropColumn(
                name: "Course",
                table: "StudyTasks");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "StudyTasks");

            migrationBuilder.DropColumn(
                name: "Priority",
                table: "StudyTasks");

            migrationBuilder.CreateIndex(
                name: "IX_StudyTasks_UserId",
                table: "StudyTasks",
                column: "UserId");
        }
    }
}
