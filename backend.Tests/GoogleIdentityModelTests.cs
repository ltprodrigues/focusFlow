using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

public sealed class GoogleIdentityModelTests
{
    [Fact]
    public void User_HasUniqueFilteredGoogleSubjectIndex()
    {
        using var db = TestDbContextFactory.Create();
        var entity = db.Model.FindEntityType(typeof(User))!;
        var index = entity.GetIndexes().Single(candidate =>
            candidate.Properties.Select(property => property.Name)
                .SequenceEqual(["GoogleSubject"]));

        Assert.True(index.IsUnique);
        Assert.NotNull(index.GetFilter());
    }

    [Fact]
    public void User_HasUniqueEmailIndex()
    {
        using var db = TestDbContextFactory.Create();
        var entity = db.Model.FindEntityType(typeof(User))!;
        var index = entity.GetIndexes().Single(candidate =>
            candidate.Properties.Select(property => property.Name)
                .SequenceEqual(["Email"]));

        Assert.True(index.IsUnique);
    }

    [Fact]
    public void User_TimeZone_DefaultsToToronto()
    {
        Assert.Equal("America/Toronto", new User().TimeZone);
        using var db = TestDbContextFactory.Create();
        var property = db.Model.FindEntityType(typeof(User))!
            .FindProperty(nameof(User.TimeZone))!;
        Assert.Equal("America/Toronto", property.GetDefaultValue());
    }
}
