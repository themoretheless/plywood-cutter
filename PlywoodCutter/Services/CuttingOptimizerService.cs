using PlywoodCutter.Models;

namespace PlywoodCutter.Services;

public enum FitHeuristic
{
    BestArea,
    BestShortSide,
    BestLongSide,
}

public enum SortOrder
{
    AreaDesc,
    MaxSideDesc,
    PerimeterDesc,
}

public enum CuttingStrategy
{
    Auto,
    BestArea_AreaDesc,
    BestArea_MaxSideDesc,
    BestArea_PerimeterDesc,
    BestShortSide_AreaDesc,
    BestShortSide_MaxSideDesc,
    BestShortSide_PerimeterDesc,
    BestLongSide_AreaDesc,
    BestLongSide_MaxSideDesc,
    BestLongSide_PerimeterDesc,
}

/// <summary>
/// Guillotine 2D bin-packing with multiple heuristics.
/// Auto mode tries all combinations and returns the best result.
/// </summary>
public class CuttingOptimizerService
{
    private record FreeRect(double X, double Y, double W, double H);

    private static readonly (FitHeuristic Fit, SortOrder Sort)[] AllStrategies =
    [
        (FitHeuristic.BestArea, SortOrder.AreaDesc),
        (FitHeuristic.BestArea, SortOrder.MaxSideDesc),
        (FitHeuristic.BestArea, SortOrder.PerimeterDesc),
        (FitHeuristic.BestShortSide, SortOrder.AreaDesc),
        (FitHeuristic.BestShortSide, SortOrder.MaxSideDesc),
        (FitHeuristic.BestShortSide, SortOrder.PerimeterDesc),
        (FitHeuristic.BestLongSide, SortOrder.AreaDesc),
        (FitHeuristic.BestLongSide, SortOrder.MaxSideDesc),
        (FitHeuristic.BestLongSide, SortOrder.PerimeterDesc),
    ];

    /// <summary>
    /// Original signature preserved for backward compatibility (used by LaserCut page).
    /// </summary>
    public CuttingResult Optimize(double sheetWidth, double sheetHeight, IEnumerable<CutPiece> pieces, double kerf = 0)
        => Optimize(sheetWidth, sheetHeight, pieces, kerf, CuttingStrategy.Auto);

    public CuttingResult Optimize(double sheetWidth, double sheetHeight, IEnumerable<CutPiece> pieces, double kerf, CuttingStrategy strategy)
    {
        var pieceList = pieces.ToList();
        if (pieceList is []) return new CuttingResult();

        if (strategy == CuttingStrategy.Auto)
            return RunAutoStrategy(sheetWidth, sheetHeight, pieceList, kerf);

        var (fit, sort) = Decompose(strategy);
        return RunSingle(sheetWidth, sheetHeight, pieceList, kerf, fit, sort);
    }

    private CuttingResult RunAutoStrategy(double sheetWidth, double sheetHeight, List<CutPiece> pieces, double kerf)
    {
        CuttingResult? best = null;
        CuttingStrategy bestStrategy = CuttingStrategy.Auto;

        foreach (var (fit, sort) in AllStrategies)
        {
            var result = RunSingle(sheetWidth, sheetHeight, pieces, kerf, fit, sort);
            if (best is null || IsBetter(result, best))
            {
                best = result;
                bestStrategy = result.Strategy;
            }
        }

        best!.AutoPickedStrategy = bestStrategy;
        best.Strategy = CuttingStrategy.Auto;
        return best;
    }

    private static bool IsBetter(CuttingResult candidate, CuttingResult current)
    {
        // Fewer unplaced pieces is always better
        if (candidate.UnplacedPieces.Count != current.UnplacedPieces.Count)
            return candidate.UnplacedPieces.Count < current.UnplacedPieces.Count;

        // Fewer sheets is better
        if (candidate.TotalSheets != current.TotalSheets)
            return candidate.TotalSheets < current.TotalSheets;

        // Higher efficiency is better
        return candidate.OverallEfficiency > current.OverallEfficiency;
    }

    private static (FitHeuristic, SortOrder) Decompose(CuttingStrategy s) => s switch
    {
        CuttingStrategy.BestArea_AreaDesc => (FitHeuristic.BestArea, SortOrder.AreaDesc),
        CuttingStrategy.BestArea_MaxSideDesc => (FitHeuristic.BestArea, SortOrder.MaxSideDesc),
        CuttingStrategy.BestArea_PerimeterDesc => (FitHeuristic.BestArea, SortOrder.PerimeterDesc),
        CuttingStrategy.BestShortSide_AreaDesc => (FitHeuristic.BestShortSide, SortOrder.AreaDesc),
        CuttingStrategy.BestShortSide_MaxSideDesc => (FitHeuristic.BestShortSide, SortOrder.MaxSideDesc),
        CuttingStrategy.BestShortSide_PerimeterDesc => (FitHeuristic.BestShortSide, SortOrder.PerimeterDesc),
        CuttingStrategy.BestLongSide_AreaDesc => (FitHeuristic.BestLongSide, SortOrder.AreaDesc),
        CuttingStrategy.BestLongSide_MaxSideDesc => (FitHeuristic.BestLongSide, SortOrder.MaxSideDesc),
        CuttingStrategy.BestLongSide_PerimeterDesc => (FitHeuristic.BestLongSide, SortOrder.PerimeterDesc),
        _ => (FitHeuristic.BestArea, SortOrder.AreaDesc),
    };

    private static CuttingStrategy Compose(FitHeuristic fit, SortOrder sort) => (fit, sort) switch
    {
        (FitHeuristic.BestArea, SortOrder.AreaDesc) => CuttingStrategy.BestArea_AreaDesc,
        (FitHeuristic.BestArea, SortOrder.MaxSideDesc) => CuttingStrategy.BestArea_MaxSideDesc,
        (FitHeuristic.BestArea, SortOrder.PerimeterDesc) => CuttingStrategy.BestArea_PerimeterDesc,
        (FitHeuristic.BestShortSide, SortOrder.AreaDesc) => CuttingStrategy.BestShortSide_AreaDesc,
        (FitHeuristic.BestShortSide, SortOrder.MaxSideDesc) => CuttingStrategy.BestShortSide_MaxSideDesc,
        (FitHeuristic.BestShortSide, SortOrder.PerimeterDesc) => CuttingStrategy.BestShortSide_PerimeterDesc,
        (FitHeuristic.BestLongSide, SortOrder.AreaDesc) => CuttingStrategy.BestLongSide_AreaDesc,
        (FitHeuristic.BestLongSide, SortOrder.MaxSideDesc) => CuttingStrategy.BestLongSide_MaxSideDesc,
        (FitHeuristic.BestLongSide, SortOrder.PerimeterDesc) => CuttingStrategy.BestLongSide_PerimeterDesc,
        _ => CuttingStrategy.BestArea_AreaDesc,
    };

    private CuttingResult RunSingle(double sheetWidth, double sheetHeight, List<CutPiece> pieces, double kerf,
        FitHeuristic heuristic, SortOrder sortOrder)
    {
        var result = new CuttingResult { Strategy = Compose(heuristic, sortOrder) };

        var queue = pieces
            .SelectMany(p => Enumerable.Range(0, p.Quantity).Select(_ => p))
            .OrderBy(p => p, new PieceSorter(sortOrder))
            .ToList();

        if (queue is []) return result;

        List<List<FreeRect>> sheetFreeRects = [];

        foreach (var piece in queue)
        {
            if (TryPlaceOnExistingSheet(result, sheetFreeRects, piece, kerf, heuristic))
                continue;

            if (!FitsOnBlankSheet(piece, sheetWidth, sheetHeight))
            {
                var label = string.IsNullOrWhiteSpace(piece.Label) ? "Деталь" : piece.Label;
                result.UnplacedPieces.Add($"{label} ({piece.Width}×{piece.Height})");
                continue;
            }

            OpenNewSheetAndPlace(result, sheetFreeRects, piece, sheetWidth, sheetHeight, kerf, heuristic);
        }

        return result;
    }

    private bool TryPlaceOnExistingSheet(CuttingResult result, List<List<FreeRect>> sheetFreeRects,
        CutPiece piece, double kerf, FitHeuristic heuristic)
    {
        for (var si = 0; si < sheetFreeRects.Count; si++)
        {
            if (FindBestFit(sheetFreeRects[si], piece, kerf, heuristic) is not (FreeRect fit, var rotated))
                continue;

            PlacePiece(result.Sheets[si], sheetFreeRects[si], fit, piece, rotated, kerf);
            return true;
        }
        return false;
    }

    private static bool FitsOnBlankSheet(CutPiece piece, double sheetWidth, double sheetHeight) =>
        (piece.Width <= sheetWidth && piece.Height <= sheetHeight) ||
        (piece.AllowRotation && piece.Height <= sheetWidth && piece.Width <= sheetHeight);

    private void OpenNewSheetAndPlace(CuttingResult result, List<List<FreeRect>> sheetFreeRects,
        CutPiece piece, double sheetWidth, double sheetHeight, double kerf, FitHeuristic heuristic)
    {
        List<FreeRect> freeRects = [new(0, 0, sheetWidth, sheetHeight)];
        sheetFreeRects.Add(freeRects);

        var sheet = new Sheet
        {
            Index = result.Sheets.Count,
            Width = sheetWidth,
            Height = sheetHeight
        };
        result.Sheets.Add(sheet);

        if (FindBestFit(freeRects, piece, kerf, heuristic) is not (FreeRect fit, var rotated))
        {
            result.UnplacedPieces.Add($"{piece.Label} ({piece.Width}×{piece.Height})");
            return;
        }

        PlacePiece(sheet, freeRects, fit, piece, rotated, kerf);
    }

    private static void PlacePiece(Sheet sheet, List<FreeRect> freeRects, FreeRect fit,
        CutPiece piece, bool rotated, double kerf)
    {
        var (pw, ph) = rotated ? (piece.Height, piece.Width) : (piece.Width, piece.Height);

        sheet.PlacedPieces.Add(new PlacedPiece
        {
            Source = piece,
            X = fit.X,
            Y = fit.Y,
            Width = pw,
            Height = ph,
            IsRotated = rotated
        });

        SplitFreeRect(freeRects, fit, pw + kerf, ph + kerf);
    }

    private static (FreeRect rect, bool rotated)? FindBestFit(List<FreeRect> freeRects, CutPiece piece,
        double kerf, FitHeuristic heuristic)
    {
        FreeRect? best = null;
        var bestRotated = false;
        var bestScore = double.MaxValue;

        foreach (var fr in freeRects)
        {
            if (piece.Width + kerf <= fr.W && piece.Height + kerf <= fr.H)
            {
                var score = Score(fr, piece.Width, piece.Height, heuristic);
                if (score < bestScore)
                    (bestScore, best, bestRotated) = (score, fr, false);
            }

            if (piece.AllowRotation && piece.Height + kerf <= fr.W && piece.Width + kerf <= fr.H)
            {
                var score = Score(fr, piece.Height, piece.Width, heuristic);
                if (score < bestScore)
                    (bestScore, best, bestRotated) = (score, fr, true);
            }
        }

        return best is not null ? (best, bestRotated) : null;
    }

    private static double Score(FreeRect fr, double pw, double ph, FitHeuristic heuristic) => heuristic switch
    {
        FitHeuristic.BestArea => fr.W * fr.H - pw * ph,
        FitHeuristic.BestShortSide => Math.Min(fr.W - pw, fr.H - ph),
        FitHeuristic.BestLongSide => Math.Max(fr.W - pw, fr.H - ph),
        _ => fr.W * fr.H - pw * ph,
    };

    private static void SplitFreeRect(List<FreeRect> freeRects, FreeRect used, double pw, double ph)
    {
        freeRects.Remove(used);

        var rightW = used.W - pw;
        var bottomH = used.H - ph;

        if (rightW < bottomH)
        {
            if (rightW > 0) freeRects.Add(new(used.X + pw, used.Y, rightW, ph));
            if (bottomH > 0) freeRects.Add(new(used.X, used.Y + ph, used.W, bottomH));
        }
        else
        {
            if (bottomH > 0) freeRects.Add(new(used.X, used.Y + ph, pw, bottomH));
            if (rightW > 0) freeRects.Add(new(used.X + pw, used.Y, rightW, used.H));
        }
    }

    private sealed class PieceSorter(SortOrder order) : IComparer<CutPiece>
    {
        public int Compare(CutPiece? a, CutPiece? b)
        {
            if (a is null || b is null) return 0;
            return order switch
            {
                SortOrder.AreaDesc => (b.Width * b.Height).CompareTo(a.Width * a.Height),
                SortOrder.MaxSideDesc => Math.Max(b.Width, b.Height).CompareTo(Math.Max(a.Width, a.Height)),
                SortOrder.PerimeterDesc => (b.Width + b.Height).CompareTo(a.Width + a.Height),
                _ => 0,
            };
        }
    }
}
