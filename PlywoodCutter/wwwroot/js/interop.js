const themeInterop = {
    get: () => localStorage.getItem("theme") ?? "dark",
    set(theme) {
        localStorage.setItem("theme", theme);
        document.documentElement.setAttribute("data-theme", theme);
    },
    init() {
        const t = localStorage.getItem("theme") ?? "dark";
        document.documentElement.setAttribute("data-theme", t);
        return t;
    },
    animate(isDark) {
        const btn = document.querySelector(".theme-toggle");
        if (!btn)
            return;
        btn.classList.remove("go-dark", "go-light");
        void btn.offsetWidth; // reflow to restart animation
        btn.classList.add(isDark ? "go-dark" : "go-light");
    },
};
const starsInterop = {
    _interval: null,
    start(trackEl) {
        const R = 11;
        const cx = 54;
        const cy = 16;
        function spawn() {
            const star = document.createElement("span");
            star.className = "toggle-star-rand";
            star.textContent = Math.random() > 0.5 ? "✦" : "·";
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * (R - 3);
            const x = cx + r * Math.cos(angle);
            const y = cy + r * Math.sin(angle);
            star.style.left = `${x}px`;
            star.style.top = `${y}px`;
            star.style.fontSize = `${Math.random() * 5 + 4}px`;
            trackEl.appendChild(star);
            setTimeout(() => star.remove(), 2200);
        }
        this._interval = setInterval(spawn, 900);
    },
    stop() {
        if (this._interval !== null) {
            clearInterval(this._interval);
            this._interval = null;
        }
    },
};
const downloadInterop = {
    saveSvg(filename, content) {
        const blob = new Blob([content], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 0);
    },
    async savePdfFromSelector(filename, selector, sheetW, sheetH) {
        const jsPDF = window.jspdf?.jsPDF;
        const svg2pdf = window.svg2pdf;
        if (!jsPDF || !svg2pdf) {
            console.error("jsPDF or svg2pdf not loaded");
            return;
        }
        const el = document.querySelector(selector);
        if (!el) {
            console.error("SVG not found:", selector);
            return;
        }
        const landscape = sheetW > sheetH;
        const pW = landscape ? sheetW : sheetW;
        const pH = landscape ? sheetH : sheetH;
        const doc = new jsPDF({ orientation: landscape ? "landscape" : "portrait", unit: "mm", format: [pW, pH] });
        await doc.svg(el, { x: 0, y: 0, width: pW, height: pH });
        doc.save(filename);
    },
    async savePdfAllSheets(filename, selector, sheetW, sheetH) {
        const jsPDF = window.jspdf?.jsPDF;
        if (!jsPDF) {
            console.error("jsPDF not loaded");
            return;
        }
        const elements = document.querySelectorAll(selector);
        if (!elements.length) {
            console.error("No SVGs found:", selector);
            return;
        }
        const landscape = sheetW > sheetH;
        const doc = new jsPDF({ orientation: landscape ? "landscape" : "portrait", unit: "mm", format: [sheetW, sheetH] });
        for (let i = 0; i < elements.length; i++) {
            if (i > 0)
                doc.addPage([sheetW, sheetH], landscape ? "landscape" : "portrait");
            await doc.svg(elements[i], { x: 0, y: 0, width: sheetW, height: sheetH });
        }
        doc.save(filename);
    },
};
const keyboardInterop = {
    _handler: null,
    _dotNetRef: null,
    init(dotNetRef) {
        this.dispose();
        this._dotNetRef = dotNetRef;
        this._handler = (e) => {
            const tag = e.target?.tagName;
            const inInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
            const ctrl = e.ctrlKey || e.metaKey;
            // Ctrl+Enter → calculate
            if (ctrl && e.key === "Enter") {
                e.preventDefault();
                dotNetRef.invokeMethodAsync("OnHotkey", "calculate");
                return;
            }
            // Enter in input → add piece
            if (e.key === "Enter" && inInput && !ctrl && !e.shiftKey) {
                e.preventDefault();
                dotNetRef.invokeMethodAsync("OnHotkey", "add");
                return;
            }
            // Ctrl+Z → undo (remove last piece)
            if (ctrl && e.key === "z" && !e.shiftKey) {
                if (inInput)
                    return; // let browser handle undo in inputs
                e.preventDefault();
                dotNetRef.invokeMethodAsync("OnHotkey", "undo");
                return;
            }
            // Escape → clear results
            if (e.key === "Escape") {
                e.preventDefault();
                dotNetRef.invokeMethodAsync("OnHotkey", "escape");
                return;
            }
            // Ctrl+S → export PDF
            if (ctrl && e.key === "s") {
                e.preventDefault();
                dotNetRef.invokeMethodAsync("OnHotkey", "export_pdf");
                return;
            }
        };
        document.addEventListener("keydown", this._handler);
    },
    dispose() {
        if (this._handler) {
            document.removeEventListener("keydown", this._handler);
            this._handler = null;
        }
        this._dotNetRef = null;
    },
};
// ── box3d readiness check ────────────────────────────────────────────────────
function box3dReady() {
    return typeof window.box3d !== "undefined";
}
window.themeInterop = themeInterop;
window.starsInterop = starsInterop;
window.downloadInterop = downloadInterop;
window.keyboardInterop = keyboardInterop;
window.box3dReady = box3dReady;
export {};
//# sourceMappingURL=interop.js.map