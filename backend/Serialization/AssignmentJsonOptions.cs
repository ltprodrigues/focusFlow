using System.Text.Json;
using System.Text.Json.Serialization;

namespace backend.Serialization;

public static class AssignmentJsonOptions
{
    public static void Configure(JsonSerializerOptions options)
    {
        options.Converters.Add(new JsonStringEnumConverter());
    }
}
