namespace PlywoodCutter.Helpers;

public static class SvgHelpers
{
    public static readonly string[] PieceColors =
    [
        "#4A90D9", "#E67E22", "#27AE60", "#9B59B6", "#E74C3C",
        "#1ABC9C", "#F39C12", "#2980B9", "#8E44AD", "#16A085"
    ];

    public static string Truncate(string s, int maxChars) => maxChars switch
    {
        <= 0 => "",
        _ when s.Length <= maxChars => s,
        _ => $"{s[..maxChars]}\u2026"
    };

    public static string EfficiencyClass(double e) => e switch
    {
        >= 80 => "eff-good",
        >= 55 => "eff-ok",
        _ => "eff-poor"
    };
}
