namespace PlywoodCutter.Models;

public record Sheet
{
    public required int Index { get; init; }
    public required double Width { get; init; }
    public required double Height { get; init; }
    public List<PlacedPiece> PlacedPieces { get; init; } = [];

    public double UsedArea => PlacedPieces.Sum(p => p.Width * p.Height);
    public double TotalArea => Width * Height;
    public double Efficiency => TotalArea > 0 ? UsedArea / TotalArea * 100 : 0;
}
