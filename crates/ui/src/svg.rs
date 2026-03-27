use std::fmt::Write;

use cutter_core::models::*;

pub const PIECE_COLORS: [&str; 10] = [
    "#4A90D9", "#E67E22", "#27AE60", "#9B59B6", "#E74C3C",
    "#1ABC9C", "#F39C12", "#2980B9", "#8E44AD", "#16A085",
];

pub fn piece_color(index: usize) -> &'static str {
    PIECE_COLORS[index % PIECE_COLORS.len()]
}

pub fn truncate(s: &str, max_chars: usize) -> String {
    if max_chars == 0 {
        return String::new();
    }
    let chars: Vec<char> = s.chars().collect();
    if chars.len() <= max_chars {
        s.to_string()
    } else {
        let mut result: String = chars[..max_chars].iter().collect();
        result.push('\u{2026}');
        result
    }
}

pub fn efficiency_class(e: f64) -> &'static str {
    if e >= 80.0 { "eff-good" }
    else if e >= 55.0 { "eff-ok" }
    else { "eff-poor" }
}

// Helper: write! with `#` in HTML attributes needs escaping via concatenation
macro_rules! svg_write {
    ($dst:expr, $($arg:tt)*) => {
        write!($dst, $($arg)*).unwrap()
    };
}

/// Render a single sheet as standalone SVG string.
pub fn render_sheet_svg(sheet: &Sheet, max_w: f64, max_h: f64) -> String {
    let scale = (max_w / sheet.width).min(max_h / sheet.height);
    let svg_w = sheet.width * scale;
    let svg_h = sheet.height * scale;
    let c_bg = "#f5f0e8";
    let c_border = "#8B7355";
    let c_grain = "#d4c9a8";
    let c_white = "#fff";
    let c_dim = "#8B7355";

    let mut svg = String::with_capacity(4096);

    // Header
    svg_write!(svg,
        "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"{svg_w:.0}\" height=\"{svg_h:.0}\" viewBox=\"0 0 {svg_w:.0} {svg_h:.0}\">"
    );

    // Sheet background
    svg_write!(svg,
        "<rect width=\"{svg_w:.0}\" height=\"{svg_h:.0}\" fill=\"{c_bg}\" stroke=\"{c_border}\" stroke-width=\"2\"/>"
    );

    // Wood grain lines
    for g in 1..10 {
        let gy = svg_h * g as f64 / 10.0;
        svg_write!(svg,
            "<line x1=\"0\" y1=\"{gy:.1}\" x2=\"{svg_w:.0}\" y2=\"{gy:.1}\" stroke=\"{c_grain}\" stroke-width=\"0.5\"/>"
        );
    }

    // Placed pieces
    for (i, pp) in sheet.placed_pieces.iter().enumerate() {
        let x = pp.x * scale;
        let y = pp.y * scale;
        let w = pp.width * scale;
        let h = pp.height * scale;
        let color = &pp.color;
        let label = pp.label.trim();
        let dims = format!("{:.0}\u{00d7}{:.0}", pp.width, pp.height);
        let piece_idx = i + 1;

        // Piece rect
        svg_write!(svg,
            "<rect x=\"{x:.1}\" y=\"{y:.1}\" width=\"{w:.1}\" height=\"{h:.1}\" fill=\"{color}\" fill-opacity=\"0.82\" stroke=\"{c_white}\" stroke-width=\"0.1\"/>"
        );

        // Badge background
        let badge_w = if piece_idx >= 10 { 16.0 } else { 12.0 };
        let badge_h = 13.0;
        let bx = x + 3.0;
        let by = y + 3.0;
        svg_write!(svg,
            "<rect x=\"{bx:.1}\" y=\"{by:.1}\" width=\"{badge_w:.0}\" height=\"{badge_h:.0}\" rx=\"3\" fill=\"rgba(0,0,0,0.35)\"/>"
        );

        // Badge number
        let tx = bx + badge_w / 2.0;
        let ty = by + badge_h / 2.0;
        svg_write!(svg,
            "<text x=\"{tx:.1}\" y=\"{ty:.1}\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-size=\"8\" font-weight=\"700\" fill=\"{c_white}\">{piece_idx}</text>"
        );

        // Rotation indicator
        if pp.is_rotated {
            let rx = x + w - 6.0;
            let ry = y + 12.0;
            svg_write!(svg,
                "<text x=\"{rx:.1}\" y=\"{ry:.1}\" font-size=\"10\" fill=\"{c_white}\" opacity=\"0.9\">\u{21bb}</text>"
            );
        }

        // Label and dimensions
        if w > 40.0 && h > 22.0 {
            let has_label = !label.is_empty();
            let dims_y = if has_label { y + h / 2.0 + 9.0 } else { y + h / 2.0 };
            let cx = x + w / 2.0;

            if has_label {
                let font_size = 13.0_f64.min(w / 6.0);
                let max_chars = (w / 7.0) as usize;
                let truncated = truncate(label, max_chars);
                let ly = y + h / 2.0 - 5.0;
                svg_write!(svg,
                    "<text x=\"{cx:.1}\" y=\"{ly:.1}\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-size=\"{font_size:.0}\" font-weight=\"600\" fill=\"{c_white}\">{truncated}</text>"
                );
            }

            let font_size = 11.0_f64.min(w / 7.0);
            svg_write!(svg,
                "<text x=\"{cx:.1}\" y=\"{dims_y:.1}\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-size=\"{font_size:.0}\" fill=\"{c_white}\" opacity=\"0.85\">{dims}</text>"
            );
        }
    }

    // Bottom dimension label
    let bx = svg_w / 2.0;
    let by = svg_h - 4.0;
    let sw = sheet.width;
    svg_write!(svg,
        "<text x=\"{bx:.0}\" y=\"{by:.0}\" text-anchor=\"middle\" font-size=\"11\" fill=\"{c_dim}\">{sw:.0} мм</text>"
    );

    // Left dimension label
    let ly = svg_h / 2.0;
    let sh = sheet.height;
    svg_write!(svg,
        "<text x=\"4\" y=\"{ly:.0}\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-size=\"11\" fill=\"{c_dim}\" transform=\"rotate(-90,4,{ly:.0})\">{sh:.0} мм</text>"
    );

    svg.push_str("</svg>");
    svg
}

/// Render all sheets from a CuttingResult as a complete SVG document.
pub fn render_result_svg(result: &CuttingResult, max_w: f64, max_h: f64) -> String {
    let mut output = String::new();
    for sheet in &result.sheets {
        if !output.is_empty() {
            output.push('\n');
        }
        output.push_str(&render_sheet_svg(sheet, max_w, max_h));
    }
    output
}
