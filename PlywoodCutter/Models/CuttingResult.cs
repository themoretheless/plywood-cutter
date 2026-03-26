using PlywoodCutter.Services;

namespace PlywoodCutter.Models;

public record CuttingResult
{
    public List<Sheet> Sheets { get; init; } = [];
    public int TotalSheets => Sheets.Count;
    public double TotalUsedArea => Sheets.Sum(s => s.UsedArea);
    public double TotalArea => Sheets.Sum(s => s.TotalArea);
    public double OverallEfficiency => TotalArea > 0 ? TotalUsedArea / TotalArea * 100 : 0;
    public List<string> UnplacedPieces { get; init; } = [];
    public CuttingStrategy Strategy { get; set; }
    public CuttingStrategy? AutoPickedStrategy { get; set; }
}
