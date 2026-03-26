namespace PlywoodCutter.Models;

public record PlacedPiece
{
    public required CutPiece Source { get; init; }
    public required double X { get; init; }
    public required double Y { get; init; }
    public required double Width { get; init; }
    public required double Height { get; init; }
    public bool IsRotated { get; init; }
}
