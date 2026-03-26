namespace PlywoodCutter.Models;

public class CutPiece
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public string Label { get; set; } = "";
    public double Width { get; set; }
    public double Height { get; set; }
    public int Quantity { get; set; } = 1;
    public bool AllowRotation { get; set; } = true;
    public string Color { get; set; } = "#4A90D9";
}
