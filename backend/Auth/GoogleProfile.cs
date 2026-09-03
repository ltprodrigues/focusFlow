namespace backend.Auth;

public sealed record GoogleProfile(
    string Subject,
    string Email,
    string Name,
    string? PictureUrl);
