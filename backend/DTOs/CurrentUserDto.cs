namespace backend.DTOs;

public sealed record CurrentUserDto(
    int Id,
    string Name,
    string Email,
    string? PictureUrl,
    string TimeZone,
    string AntiforgeryToken);
