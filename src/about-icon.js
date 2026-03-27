(() => {
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const BACK_FACE_COLOR = 'rgb(238, 238, 238)';
    const PADDING = 8;  // 边距
    const BASE_AMPLITUDE_X = 0.5;  // 振幅
    const BASE_AMPLITUDE_Y = 1.5;  // 振幅
    const SPATIAL_FREQUENCY = 0.075  // 空间频率
    const SPEED_X = 5;  // x方向速度
    const SPEED_Y = 3;  // y方向速度

    let initialized = false;

    function createPerlin2D() {
        const permutation = new Uint8Array(256);
        for (let i = 0; i < 256; i++) permutation[i] = i;
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = permutation[i];
            permutation[i] = permutation[j];
            permutation[j] = tmp;
        }

        const p = new Uint8Array(512);
        for (let i = 0; i < 512; i++) p[i] = permutation[i & 255];

        function fade(t) {
            return t * t * t * (t * (t * 6 - 15) + 10);
        }

        function lerp(a, b, t) {
            return a + t * (b - a);
        }

        function grad(hash, x, y) {
            const h = hash & 7;
            const u = h < 4 ? x : y;
            const v = h < 4 ? y : x;
            return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
        }

        return function noise(x, y) {
            const X = Math.floor(x) & 255;
            const Y = Math.floor(y) & 255;
            const xf = x - Math.floor(x);
            const yf = y - Math.floor(y);
            const u = fade(xf);
            const v = fade(yf);

            const aa = p[X + p[Y]];
            const ab = p[X + p[Y + 1]];
            const ba = p[X + 1 + p[Y]];
            const bb = p[X + 1 + p[Y + 1]];

            const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
            const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
            return lerp(x1, x2, v);
        };
    }

    function randomFaceColors(gridCount) {
        const palette = [
            'rgb(231, 76, 60)',   // red
            'rgb(241, 196, 15)',  // yellow
            'rgb(46, 204, 113)',  // green
            'rgb(52, 69, 219)',  // blue
        ];
        const colors = [];
        for (let i = 0; i < gridCount; i++) {
            colors.push(palette[Math.floor(Math.random() * palette.length)]);
        }
        return colors;
    }

    function mapToViewBox(v, bounds) {
        const usable = 100 - PADDING * 2;
        const nx = (v[0] - bounds.minX) / Math.max(1e-6, bounds.width);
        const ny = (v[1] - bounds.minY) / Math.max(1e-6, bounds.height);
        const px = PADDING + nx * usable;
        const py = PADDING + (1 - ny) * usable;
        return [px, py];
    }

    async function initAboutTapeIcon() {
        if (initialized) return;
        const svg = document.getElementById('about-tape-icon');
        if (!svg) return;
        initialized = true;

        let mesh;
        try {
            const response = await fetch('src/icon-tape.json');
            mesh = await response.json();
        } catch (err) {
            try {
                if (typeof require === 'function') {
                    const fs = require('fs');
                    const path = require('path');
                    const filePath = path.join(process.cwd(), 'src', 'icon-tape.json');
                    mesh = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                }
            } catch (_) {
                initialized = false;
                return;
            }
        }

        const vertices = Array.isArray(mesh.vertices) ? mesh.vertices : [];
        const faces = Array.isArray(mesh.faces) ? mesh.faces : [];
        const normals = Array.isArray(mesh.normals) ? mesh.normals : [];
        const gridIds = Array.isArray(mesh['grid-ids']) ? mesh['grid-ids'] : [];
        const centerWeights = Array.isArray(mesh['normalized-distance-to-center'])
            ? mesh['normalized-distance-to-center']
            : [];

        if (vertices.length === 0 || faces.length === 0) return;

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const v of vertices) {
            if (!Array.isArray(v) || v.length < 2) continue;
            minX = Math.min(minX, v[0]);
            minY = Math.min(minY, v[1]);
            maxX = Math.max(maxX, v[0]);
            maxY = Math.max(maxY, v[1]);
        }
        const bounds = { minX, minY, width: maxX - minX, height: maxY - minY };

        let maxGridId = 0;
        for (const id of gridIds) {
            if (Number.isFinite(id)) maxGridId = Math.max(maxGridId, id);
        }
        const faceColors = randomFaceColors(maxGridId + 1);

        const polygons = [];
        for (let i = 0; i < faces.length; i++) {
            const poly = document.createElementNS(SVG_NS, 'polygon');
            const normal = Number(normals[i]) || 0;
            const isFront = normal > 0;
            if (isFront) {
                const gid = Number.isFinite(gridIds[i]) ? gridIds[i] : 0;
                const color = faceColors[Math.max(0, Math.min(faceColors.length - 1, gid))];
                poly.setAttribute('fill', color);
                poly.setAttribute('stroke', color);
                poly.setAttribute('stroke-width', '0.3');
            } else {
                poly.setAttribute('fill', BACK_FACE_COLOR);
                poly.setAttribute('stroke', BACK_FACE_COLOR);
                poly.setAttribute('stroke-width', '0.15');
            }
            svg.appendChild(poly);
            polygons.push(poly);
        }

        // ── Read/Write head overlay ─────────────────────────────────────
        // Per requirement:
        // - grid (0,0) is the visual center; head tip should be placed at the same
        //   mapped position as other mesh geometry.
        // - "tip points down" means towards +y in SVG coordinates.
        const originInViewBox = mapToViewBox([0, 0], bounds);
        const headGroup = document.createElementNS(SVG_NS, 'g');
        headGroup.setAttribute('transform', `translate(${originInViewBox[0].toFixed(2)} ${originInViewBox[1].toFixed(2)})`);
        svg.appendChild(headGroup);

        const headFill = 'rgb(66, 66, 66)';  // 读写头颜色
        const shadowId = `about-head-shadow-${Math.random().toString(36).slice(2, 8)}`;
        const shadowR = 10; // 机头针尖阴影半径

        const defs = document.createElementNS(SVG_NS, 'defs');
        const grad = document.createElementNS(SVG_NS, 'radialGradient');
        grad.setAttribute('id', shadowId);
        grad.setAttribute('gradientUnits', 'userSpaceOnUse');
        grad.setAttribute('cx', '0');
        grad.setAttribute('cy', '0');
        grad.setAttribute('r', String(shadowR));

        const stop0 = document.createElementNS(SVG_NS, 'stop');
        stop0.setAttribute('offset', '0%');
        stop0.setAttribute('stop-color', 'black');
        stop0.setAttribute('stop-opacity', '0.26');

        const stop1 = document.createElementNS(SVG_NS, 'stop');
        stop1.setAttribute('offset', '100%');
        stop1.setAttribute('stop-color', 'black');
        stop1.setAttribute('stop-opacity', '0');

        grad.appendChild(stop0);
        grad.appendChild(stop1);
        defs.appendChild(grad);
        headGroup.appendChild(defs);

        const shadow = document.createElementNS(SVG_NS, 'circle');
        shadow.setAttribute('cx', '0');
        shadow.setAttribute('cy', '0');
        shadow.setAttribute('r', String(shadowR));
        shadow.setAttribute('fill', `url(#${shadowId})`);
        shadow.setAttribute('pointer-events', 'none');
        headGroup.appendChild(shadow);

        // Triangle (local coords, SVG y-down): base at y = -triH, tip at (0,0).
        const triH = 16;
        const triW = 16;
        const tri = document.createElementNS(SVG_NS, 'polygon');
        tri.setAttribute('fill', headFill);
        tri.setAttribute(
            'points',
            [
                `0,0`,
                `${(-triW / 2).toFixed(2)},${(-triH).toFixed(2)}`,
                `${(triW / 2).toFixed(2)},${(-triH).toFixed(2)}`,
            ].join(' ')
        );
        headGroup.appendChild(tri);

        // Rounded rectangle centered at the triangle base midpoint (0, -triH).
        const rectW = 23;  // 读写头尺寸
        const rectH = 16;
        const rect = document.createElementNS(SVG_NS, 'rect');
        rect.setAttribute('fill', headFill);
        rect.setAttribute('x', (-rectW / 2).toFixed(2));
        rect.setAttribute('y', (-triH - rectH / 2).toFixed(2));
        rect.setAttribute('width', rectW.toFixed(2));
        rect.setAttribute('height', rectH.toFixed(2));
        rect.setAttribute('rx', '4');
        rect.setAttribute('ry', '4');
        headGroup.appendChild(rect);

        const label = document.createElementNS(SVG_NS, 'text');
        label.textContent = 'T';
        label.setAttribute('x', '0');
        label.setAttribute('y', (-triH).toFixed(2));
        label.setAttribute('fill', '#eee');
        label.setAttribute('text-anchor', 'middle');
        // Use dy for robust vertical centering across SVG renderers.
        label.setAttribute('dy', '0.42em');
        label.setAttribute('font-family', 'system-ui, sans-serif');
        label.setAttribute('font-weight', '600');
        label.setAttribute('font-size', '9');
        headGroup.appendChild(label);

        const noise = createPerlin2D();
        const movedVertices = new Array(vertices.length);
        const start = performance.now();

        function render(now) {
            const t = (now - start) * 0.001;

            for (let i = 0; i < vertices.length; i++) {
                const base = vertices[i];
                let w = Number(centerWeights[i]) || 0;
                w = w * (2 - w);  // 权重非线性映射
                const nx = noise((base[0] - t * SPEED_X) * SPATIAL_FREQUENCY, (base[1] - t * SPEED_Y) * SPATIAL_FREQUENCY);
                const ny = noise((base[0] - t * SPEED_X) * SPATIAL_FREQUENCY + 19.37, (base[1] - t * SPEED_Y) * SPATIAL_FREQUENCY + 7.31);
                const dx = nx * BASE_AMPLITUDE_X * w;
                const dy = ny * BASE_AMPLITUDE_Y * w;
                movedVertices[i] = [base[0] + dx, base[1] + dy];
            }

            for (let i = 0; i < faces.length; i++) {
                const face = faces[i];
                const pts = [];
                for (let j = 0; j < face.length; j++) {
                    const idx = face[j];
                    const mv = movedVertices[idx];
                    if (!mv) continue;
                    const p = mapToViewBox(mv, bounds);
                    pts.push(`${p[0].toFixed(2)},${p[1].toFixed(2)}`);
                }
                polygons[i].setAttribute('points', pts.join(' '));
            }

            requestAnimationFrame(render);
        }

        requestAnimationFrame(render);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAboutTapeIcon, { once: true });
    } else {
        initAboutTapeIcon();
    }
})();
