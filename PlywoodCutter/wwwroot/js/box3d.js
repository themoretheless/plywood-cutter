import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
// ── State ────────────────────────────────────────────────────────────────────
let scene = null;
let camera = null;
let renderer = null;
let controls = null;
let panelGroup = null;
let guidesGroup = null;
let labelsGroup = null;
let resizeObs = null;
let animFrameId = 0;
// ── API ──────────────────────────────────────────────────────────────────────
const box3d = {
    init(elId) {
        const c = document.getElementById(elId);
        if (!c)
            return;
        const w = c.clientWidth || 600;
        const h = c.clientHeight || 450;
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1e1e2e);
        camera = new THREE.PerspectiveCamera(38, w / h, 1, 20000);
        camera.up.set(0, 0, 1);
        camera.position.set(700, -550, 500);
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        c.appendChild(renderer.domElement);
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.12;
        controls.target.set(150, 100, 150);
        controls.update();
        scene.add(new THREE.AmbientLight(0xffffff, 0.5));
        const d1 = new THREE.DirectionalLight(0xffffff, 0.8);
        d1.position.set(400, -500, 600);
        scene.add(d1);
        const d2 = new THREE.DirectionalLight(0xffffff, 0.3);
        d2.position.set(-300, 400, -200);
        scene.add(d2);
        panelGroup = new THREE.Group();
        guidesGroup = new THREE.Group();
        labelsGroup = new THREE.Group();
        scene.add(panelGroup);
        scene.add(guidesGroup);
        scene.add(labelsGroup);
        const cam = camera;
        const ctrl = controls;
        const rend = renderer;
        const sc = scene;
        const lg = labelsGroup;
        (function loop() {
            animFrameId = requestAnimationFrame(loop);
            ctrl.update();
            lg.children.forEach((s) => s.quaternion.copy(cam.quaternion));
            rend.render(sc, cam);
        })();
        resizeObs = new ResizeObserver(() => {
            const rw = c.clientWidth;
            const rh = c.clientHeight;
            if (rw > 0 && rh > 0) {
                cam.aspect = rw / rh;
                cam.updateProjectionMatrix();
                rend.setSize(rw, rh);
            }
        });
        resizeObs.observe(c);
    },
    update(json, cx, cy, cz) {
        if (!panelGroup || !guidesGroup || !labelsGroup || !controls)
            return;
        clearGroup(panelGroup);
        clearGroup(guidesGroup);
        clearGroup(labelsGroup);
        let data;
        try {
            data = JSON.parse(json);
        }
        catch {
            return;
        }
        for (const p of data.panels) {
            const mesh = buildPanel(p);
            if (mesh)
                panelGroup.add(mesh);
        }
        if (data.guides) {
            const gMat = new THREE.LineDashedMaterial({
                color: 0xaaaaaa,
                dashSize: 4,
                gapSize: 4,
                transparent: true,
                opacity: 0.5,
            });
            for (const g of data.guides) {
                const gGeo = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(g[0], g[1], g[2]),
                    new THREE.Vector3(g[3], g[4], g[5]),
                ]);
                const line = new THREE.LineSegments(gGeo, gMat);
                line.computeLineDistances();
                guidesGroup.add(line);
            }
        }
        if (data.labels) {
            for (const lb of data.labels) {
                const sprite = makeLabel(lb.text, lb.color ?? "#cccccc", lb.sub);
                sprite.position.set(lb.x, lb.y, lb.z);
                labelsGroup.add(sprite);
            }
        }
        controls.target.set(cx, cy, cz);
        controls.update();
    },
    dispose() {
        if (animFrameId)
            cancelAnimationFrame(animFrameId);
        if (resizeObs)
            resizeObs.disconnect();
        if (renderer) {
            renderer.dispose();
            renderer.domElement?.remove();
        }
        scene = camera = renderer = controls = null;
        panelGroup = guidesGroup = labelsGroup = null;
        resizeObs = null;
    },
};
// ── Helpers ──────────────────────────────────────────────────────────────────
function clearGroup(g) {
    while (g.children.length) {
        const c = g.children[0];
        g.remove(c);
        disposeObj(c);
    }
}
function makeLabel(text, color, sub) {
    const canvas = document.createElement("canvas");
    const sz = 256;
    canvas.width = sz;
    canvas.height = sub ? 80 : 48;
    const ctx = canvas.getContext("2d");
    ctx.textAlign = "center";
    ctx.font = "bold 26px sans-serif";
    ctx.fillStyle = color;
    ctx.fillText(text, sz / 2, sub ? 24 : 28);
    if (sub) {
        ctx.font = "20px sans-serif";
        ctx.fillStyle = "#999";
        ctx.fillText(sub, sz / 2, 56);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthTest: false,
        depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(110, sub ? 34 : 20, 1);
    sprite.renderOrder = 999;
    return sprite;
}
function disposeObj(obj) {
    if ("children" in obj) {
        obj.children.forEach(disposeObj);
    }
    if ("geometry" in obj && obj.geometry) {
        obj.geometry.dispose();
    }
    if ("material" in obj) {
        const mat = obj.material;
        if (Array.isArray(mat)) {
            mat.forEach((m) => m.dispose());
        }
        else if (mat) {
            mat.dispose();
        }
    }
}
function buildPanel(p) {
    const pts = p.c;
    const n = p.n;
    const T = p.t;
    const col = p.col;
    const ec = p.ec;
    const holes = p.h;
    const ax = Math.abs(n[0]);
    const ay = Math.abs(n[1]);
    const az = Math.abs(n[2]);
    let drop, u, v;
    if (az >= ax && az >= ay) {
        drop = 2;
        u = 0;
        v = 1;
    }
    else if (ax >= ay) {
        drop = 0;
        u = 1;
        v = 2;
    }
    else {
        drop = 1;
        u = 0;
        v = 2;
    }
    const base = pts[0][drop];
    const shape = new THREE.Shape();
    shape.moveTo(pts[0][u], pts[0][v]);
    for (let i = 1; i < pts.length; i++) {
        shape.lineTo(pts[i][u], pts[i][v]);
    }
    if (holes) {
        for (const hole of holes) {
            const hp = new THREE.Path();
            hp.moveTo(hole[0][u], hole[0][v]);
            for (let i = 1; i < hole.length; i++) {
                hp.lineTo(hole[i][u], hole[i][v]);
            }
            shape.holes.push(hp);
        }
    }
    const geo = new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: false });
    const pos = geo.attributes.position;
    const sign = n[drop] > 0 ? 1 : -1;
    for (let i = 0; i < pos.count; i++) {
        const lu = pos.getX(i);
        const lv = pos.getY(i);
        const lw = pos.getZ(i);
        const coords = [0, 0, 0];
        coords[u] = lu;
        coords[v] = lv;
        coords[drop] = base + sign * lw;
        pos.setXYZ(i, coords[0], coords[1], coords[2]);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    const mat = new THREE.MeshPhongMaterial({
        color: new THREE.Color(col),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const eg = new THREE.EdgesGeometry(geo, 15);
    const em = new THREE.LineBasicMaterial({
        color: new THREE.Color(ec),
        transparent: true,
        opacity: 0.65,
    });
    mesh.add(new THREE.LineSegments(eg, em));
    return mesh;
}
window.box3d = box3d;
//# sourceMappingURL=box3d.js.map