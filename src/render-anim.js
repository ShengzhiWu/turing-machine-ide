// ── Render Animation: dialog logic, frame generation, canvas drawing ────────

function menuRenderAnimation() {
    // Localise dialog text
    document.getElementById('render-dialog-title').textContent  = t('renderDialogTitle');
    document.getElementById('render-sec-size').textContent      = t('renderSecSize');
    document.getElementById('render-sec-timing').textContent    = t('renderSecTiming');
    document.getElementById('render-sec-output').textContent    = t('renderSecOutput');
    document.getElementById('render-label-width').textContent   = t('renderLabelWidth');
    document.getElementById('render-label-height').textContent  = t('renderLabelHeight');
    document.getElementById('render-label-move-frames').textContent  = t('renderLabelMoveFrames');
    document.getElementById('render-label-pause-frames').textContent = t('renderLabelPauseFrames');
    document.getElementById('render-label-halflife').textContent = t('renderLabelHalflife');
    document.getElementById('render-label-total-frames').textContent = t('renderLabelTotalFrames') + '0';
    document.getElementById('render-output-path').placeholder   = t('renderOutputPlaceholder');
    document.getElementById('render-browse-btn').textContent    = t('renderBrowse');
    document.getElementById('render-start-btn').textContent     = t('renderStart');
    document.getElementById('render-close-btn').textContent     = t('renderClose');

    // Compute run history (detailed mode = every step)
    const renderCode = parseProgramCode(code_editor_value);
    const renderHistory = run_turing_machine(renderCode, tape,
        parseInt(max_steps_input.value) || 3000, true);

    // Store on the overlay element for use by render functions
    const overlay = document.getElementById('render-overlay');
    overlay._renderHistory = renderHistory;
    overlay._renderCode    = renderCode;

    updateRenderTotalFrames(renderHistory);
    resetRenderProgress();

    overlay.classList.add('visible');
}

function getRenderParams() {
    return {
        width:       Math.max(1, parseInt(document.getElementById('render-width').value)  || 1920),
        height:      Math.max(1, parseInt(document.getElementById('render-height').value) || 1080),
        moveFrames:  Math.max(1, parseInt(document.getElementById('render-move-frames').value)  || 10),
        pauseFrames: Math.max(0, parseInt(document.getElementById('render-pause-frames').value) || 5),
        halflife:    Math.max(1, parseInt(document.getElementById('render-halflife').value) || 10),
        outputPath:  document.getElementById('render-output-path').value.trim(),
    };
}

function computeTotalFrames(history, p) {
    // Matches buildFrameSequence exactly.
    // history is the full run history array (or its length won't suffice — we need positions).
    const pause = Math.max(1, p.pauseFrames);
    const move  = Math.max(1, p.moveFrames);
    if (!history || history.length === 0) return 0;
    if (history.length === 1) return pause + pause;
    let total = pause;  // initial pause
    for (let i = 1; i < history.length; i++) {
        total += pause;  // post-transition pause
        if (history[i][1] !== history[i-1][1]) total += move;  // movement frames (skipped when pos unchanged)
    }
    total += pause;  // final pause
    return total;
}

function updateRenderTotalFrames(history) {
    const p = getRenderParams();
    const n = computeTotalFrames(history || [], p);
    document.getElementById('render-label-total-frames').textContent =
        t('renderLabelTotalFrames') + n;
    document.getElementById('render-frame-counter').textContent = '0 / ' + n;
}

function resetRenderProgress() {
    document.getElementById('render-progress-bar').style.width = '0%';
    const overlay = document.getElementById('render-overlay');
    const n = computeTotalFrames(overlay._renderHistory || [], getRenderParams());
    document.getElementById('render-frame-counter').textContent = '0 / ' + n;
}

// Wire up timing input changes → update total frames
['render-move-frames','render-pause-frames','render-halflife',
    'render-width','render-height'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
        const overlay = document.getElementById('render-overlay');
        if (overlay._renderHistory) updateRenderTotalFrames(overlay._renderHistory);
    });
});

// Browse button
document.getElementById('render-browse-btn').addEventListener('click', () => {
    if (typeof require !== 'undefined') {
        const { dialog } = require('electron').remote || require('@electron/remote') || {};
        if (dialog) {
            dialog.showOpenDialog({ title: t('renderBrowseTitle'), properties: ['openDirectory'] })
                .then(result => {
                    if (!result.canceled && result.filePaths.length > 0)
                        document.getElementById('render-output-path').value = result.filePaths[0];
                });
            return;
        }
        // Fallback: try ipcRenderer
        try {
            const { ipcRenderer } = require('electron');
            ipcRenderer.invoke('show-open-dialog', {
                title: t('renderBrowseTitle'),
                properties: ['openDirectory']
            }).then(result => {
                if (result && !result.canceled && result.filePaths.length > 0)
                    document.getElementById('render-output-path').value = result.filePaths[0];
            });
        } catch(e) { console.warn('No dialog API available', e); }
    }
});

// Close button
document.getElementById('render-close-btn').addEventListener('click', () => {
    if (!document.getElementById('render-overlay')._rendering)
        document.getElementById('render-overlay').classList.remove('visible');
});
document.getElementById('render-overlay').addEventListener('mousedown', function(e) {
    if (e.target === this && !this._rendering) this.classList.remove('visible');
});

// ── Main render function ──────────────────────────────────────────────
document.getElementById('render-start-btn').addEventListener('click', () => {
    const overlay = document.getElementById('render-overlay');
    if (overlay._rendering) return;
    const outputPath = document.getElementById('render-output-path').value.trim();
    if (!outputPath) { alert(t('renderOutputPlaceholder')); return; }

    overlay._rendering = true;
    document.getElementById('render-start-btn').disabled = true;
    document.getElementById('render-close-btn').disabled = true;

    const previewOverlay = document.getElementById('render-preview-overlay');
    const previewCanvas  = document.getElementById('render-preview-canvas');
    const previewLabel   = document.getElementById('render-preview-label');
    previewLabel.textContent = t('renderRendering');
    previewOverlay.classList.add('visible');

    const p = getRenderParams();
    const history = overlay._renderHistory;

    // Build the render graph snapshot (freeze current positions)
    const renderGraph = buildRenderGraphSnapshot();
    previewCanvas.width  = p.width;
    previewCanvas.height = p.height;
    // Scale preview canvas display
    const maxW = window.innerWidth  * 0.78;
    const maxH = window.innerHeight * 0.58;
    const scale = Math.min(1, maxW / p.width, maxH / p.height);
    previewCanvas.style.width  = Math.round(p.width  * scale) + 'px';
    previewCanvas.style.height = Math.round(p.height * scale) + 'px';

    const ctx = previewCanvas.getContext('2d');

    // Highlight brightness state: { nodeKey: brightness, edgeKey: brightness }
    const nodeBrightness = {};  // key = node[0] (state name)
    const edgeBrightness = {};  // key = "fromState|toState|edgeName"

    const decay = Math.pow(0.5, 1 / p.halflife);  // per-frame brightness multiplier

    const frames = buildFrameSequence(history, p);

    function saveFrame(blob, idx) {
        return new Promise((resolve, reject) => {
            if (typeof require !== 'undefined') {
                try {
                    const path = require('path');
                    const fs   = require('fs');
                    const num  = String(idx).padStart(6, '0');
                    const fp   = path.join(outputPath, `frame_${num}.png`);
                    const reader = new FileReader();
                    reader.onload = () => {
                        const buf = Buffer.from(reader.result);
                        fs.writeFileSync(fp, buf);
                        resolve();
                    };
                    reader.onerror = reject;
                    reader.readAsArrayBuffer(blob);
                } catch(e) { reject(e); }
            } else {
                // Browser: just skip saving (preview only)
                resolve();
            }
        });
    }

    async function renderLoop() {
        for (let fi = 0; fi < frames.length; fi++) {
            const frame = frames[fi];

            // Decay all brightnesses
            for (const k of Object.keys(nodeBrightness)) nodeBrightness[k] *= decay;
            for (const k of Object.keys(edgeBrightness)) edgeBrightness[k] *= decay;

            // Apply activations
            if (frame.activateNode) nodeBrightness[frame.activateNode] = 1.0;
            if (frame.activateEdge) edgeBrightness[frame.activateEdge] = 1.0;

            // Draw
            drawRenderFrame(ctx, p, renderGraph, frame, nodeBrightness, edgeBrightness);

            // Save
            await new Promise(res => previewCanvas.toBlob(async blob => {
                await saveFrame(blob, fi);
                res();
            }, 'image/png'));

            // Update progress
            const pct = ((fi + 1) / frames.length * 100).toFixed(1);
            document.getElementById('render-progress-bar').style.width = pct + '%';
            document.getElementById('render-frame-counter').textContent = (fi+1) + ' / ' + frames.length;

            // Yield to UI
            await new Promise(res => setTimeout(res, 0));
        }

        // Done
        previewLabel.textContent = t('renderDone');
        setTimeout(() => {
            previewOverlay.classList.remove('visible');
            overlay.classList.remove('visible');
            overlay._rendering = false;
            document.getElementById('render-start-btn').disabled = false;
            document.getElementById('render-close-btn').disabled = false;
            resetRenderProgress();
        }, 800);
    }

    renderLoop().catch(e => {
        console.error('Render error', e);
        overlay._rendering = false;
        document.getElementById('render-start-btn').disabled = false;
        document.getElementById('render-close-btn').disabled = false;
        previewOverlay.classList.remove('visible');
        alert('Render error: ' + e.message);
    });
});

// ── Build frame sequence ──────────────────────────────────────────────
function buildFrameSequence(history, p) {
    const frames = [];
    // history[i] = [step, position, prevState, state, tape]
    // history[0] = initial: step=0, position=0, prevState=undefined, state="start"

    if (history.length === 0) return frames;

    const pause = Math.max(1, p.pauseFrames);
    const move  = Math.max(1, p.moveFrames);

    const pushFrames = (count, headPos, histIdx, currentState, activateNode, activateEdge) => {
        for (let i = 0; i < count; i++) {
            frames.push({
                headPos,
                historyIndex: histIdx,
                currentState,
                activateNode: i === 0 ? activateNode : null,
                activateEdge: i === 0 ? activateEdge : null,
            });
        }
    };

    // Initial pause: head at position of history[0], state = history[0][3]
    const initial = history[0];
    pushFrames(pause, initial[1], 0, initial[3],
        canonicalStateName(initial[3]), null);

    for (let i = 1; i < history.length; i++) {
        const prev = history[i - 1];
        const curr = history[i];
        const prevPos    = prev[1];
        const currPos    = curr[1];
        const prevState  = prev[3];
        const currState  = curr[3];

        // Edge key for the transition prevState → currState
        const edgeKey = prevState + '||' + currState;

        // Post-transition pause: tape and state have already changed to curr's values.
        // Head is still at prevPos. Highlight the new state node and the taken edge.
        pushFrames(pause, prevPos, i, currState,
            canonicalStateName(currState), edgeKey);

        // Head movement: eased interpolation from prevPos to currPos
        // Skip if position didn't change (direction was N)
        if (currPos !== prevPos) {
            for (let mf = 0; mf < move; mf++) {
                const t01   = (mf + 1) / move;
                const tEase = cubicEase(t01);
                frames.push({
                    headPos:      prevPos + (currPos - prevPos) * tEase,
                    historyIndex: i,
                    currentState: currState,
                    activateNode: null,
                    activateEdge: null,
                });
            }
        }
    }

    // Final pause at the terminal position/state
    const last = history[history.length - 1];
    pushFrames(pause, last[1], history.length - 1, last[3],
        canonicalStateName(last[3]), null);

    return frames;
}

function cubicEase(t) {
    // Ease in-out cubic
    return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
}

function canonicalStateName(state) {
    // The runtime uses "end" and "error" as terminal states.
    // The graph creates nodes named "end_from_N" and "error_from_N" for these.
    // Map graph node names back to the runtime names for brightness lookup.
    if (!state) return state;
    if (state === 'end'   || /^end_from_\d+$/.test(state))   return 'end';
    if (state === 'error' || /^error_from_\d+$/.test(state)) return 'error';
    return state;
}

// ── Build a frozen snapshot of the graph for rendering ───────────────
function buildRenderGraphSnapshot() {
    if (typeof graph === 'undefined') return [];
    return graph.map(node => ({
        name:        node[0],
        pos:         [...node[1]],
        visible:     node[2],
        displayName: node._display_name || node[0],
        label:       (node[4] || ''),
        // Self-connection nodes have node[3] = parentIndex (int), not an array
        connections: Array.isArray(node[3]) ? node[3].map(conn => ({
            targetIndex: conn[0],
            edgeName:    conn[1],
            offset:      conn[3],
        })) : [],
    }));
}

// ── Draw one render frame ─────────────────────────────────────────────
function drawRenderFrame(ctx, p, snapGraph, frame, nodeBrightness, edgeBrightness) {
    const W = p.width, H = p.height;

    // Layout: top portion = graph (60%), bottom = tape area (40%)
    const graphH = Math.round(H * 0.60);
    const tapeAreaY = graphH;
    const tapeAreaH = H - graphH;

    // ── Background ───────────────────────────────────────────────────
    ctx.fillStyle = 'hsl(0,0%,60%)';  // matches graph-panel background
    ctx.fillRect(0, 0, W, graphH);

    ctx.fillStyle = 'hsl(0,0%,90%)';  // matches tape-panel background
    ctx.fillRect(0, tapeAreaY, W, tapeAreaH);

    // ── Draw Graph ───────────────────────────────────────────────────
    drawGraphOnCanvas(ctx, snapGraph, W, graphH, frame, nodeBrightness, edgeBrightness, p);
    // ── Divider ──────────────────────────────────────────────────────
    ctx.fillStyle = 'hsl(0,0%,22%)';
    ctx.fillRect(0, graphH - 1, W, 2);

    // ── Draw Tape ───────────────────────────────────────────────────
    const hist = document.getElementById('render-overlay')._renderHistory;
    const record = hist[Math.min(frame.historyIndex, hist.length - 1)];
    drawTapeOnCanvas(ctx, p, record, frame.headPos, frame.currentState,
        tapeAreaY, tapeAreaH, W);
}

function drawGraphOnCanvas(ctx, snapGraph, W, H, animFrame, nodeBrightness, edgeBrightness, renderParams) {
    if (!snapGraph || snapGraph.length === 0) return;

    // Compute coordinate transform: scale the live graph 'frame' to fit the render canvas graph area
    const graphPanel = document.getElementById('graph-panel');
    const gpW = graphPanel ? graphPanel.clientWidth  : 640;
    const gpH = graphPanel ? graphPanel.clientHeight : 400;
    const scaleX = W / gpW;
    const scaleY = H / gpH;
    const s = Math.min(scaleX, scaleY);
    const rf = {
        x:      frame.x * scaleX,
        y:      frame.y * scaleY,
        factor: frame.factor * s,
    };

    function toScreen(pos) {
        return [rf.x + pos[0] * rf.factor,
                rf.y + pos[1] * rf.factor];
    }

    const vr = vertex_r;  // reuse same constant
    const ahL = arrow_head_length;
    const ahW = arrow_head_width;

    // Draw connections
    snapGraph.forEach(node => {
        if (node.name.startsWith('self-connection')) return;
        const a = toScreen(node.pos);

        node.connections.forEach(conn => {
            const target = snapGraph[conn.targetIndex];
            if (!target) return;
            const b = toScreen(target.pos);
            const dom_fake = {};

            const v = vector_subtract(b, a);
            const l = vector_length(v);
            if (l < 1) return;
            const vn = vector_scale(1/l, v);
            const normal = [-vn[1], vn[0]];
            const c = vector_scale(vr, vn);

            // Edge brightness lookup.
            // History edge keys are "fromState||toState" using raw state names from the run.
            // For self-loops the graph target is a dummy 'self-connection-N' node;
            // the history records it as "X||X" (same state to same state).
            const isSelfLoop = target.name.startsWith('self-connection');
            const targetHistName = isSelfLoop ? node.name : target.name;
            const ek  = node.name + '||' + targetHistName;
            const ek2 = canonicalStateName(node.name) + '||' + canonicalStateName(targetHistName);
            const bright = Math.max(edgeBrightness[ek] || 0, edgeBrightness[ek2] || 0);
            const edgeColor = bright > 0.02
                ? `rgb(${Math.round(255*bright)},${Math.round(255*bright)},${Math.round(255*bright)})`
                : 'black';
            ctx.strokeStyle = edgeColor;
            ctx.fillStyle   = edgeColor;
            ctx.lineWidth   = 1.2;

            if (isSelfLoop) {
                // Self-loop
                const ang = self_connection_angle;
                const c1 = vector_rotate(c,  ang*0.5);
                const c2 = vector_rotate(c, -ang*0.5);
                const c3 = vector_scale(l/vr, c1);
                const c4 = vector_scale(l/vr, c2);
                const p1 = vector_plus(a, c1);
                const p2 = vector_plus(a, c2);
                const p3 = vector_plus(a, c3);
                const p4 = vector_plus(a, c4);
                ctx.beginPath();
                ctx.moveTo(p1[0], p1[1]);
                ctx.bezierCurveTo(p3[0], p3[1], p4[0], p4[1], p2[0], p2[1]);
                ctx.stroke();
                // Arrow
                drawArrowHead(ctx, p2, vector_scale(-1/vr, c2), ahL, ahW);
                // Text
                const tl = vector_plus(a, vector_scale(self_connection_text_distance_factor, v));
                ctx.fillStyle = edgeColor;
                ctx.font = '12px system-ui,sans-serif';
                ctx.fillText(conn.edgeName, tl[0]-3, tl[1]+4);
            } else {
                if (l > vr*2) {
                    const offset = conn.offset !== undefined ? conn.offset : 0;
                    const lc = Math.min(multiple_edges_shape_param2, l);
                    const c1 = vector_rotate(c,  multiple_edges_gap_angle*offset*0.5);
                    const c2 = vector_rotate(c, -multiple_edges_gap_angle*offset*0.5);
                    const p1 = vector_plus(a, c1);
                    const p2 = vector_subtract(b, c2);
                    const p3 = vector_plus(p1,  vector_scale(multiple_edges_shape_param1*lc/vr, c1));
                    const p4 = vector_subtract(p2, vector_scale(multiple_edges_shape_param1*lc/vr, c2));
                    const tl = vector_plus(vector_scale(0.5, vector_plus(p3, p4)),
                                            vector_scale(connection_text_offset*Math.sign(offset+0.1), normal));
                    ctx.beginPath();
                    ctx.moveTo(p1[0], p1[1]);
                    ctx.bezierCurveTo(p3[0], p3[1], p4[0], p4[1], p2[0], p2[1]);
                    ctx.stroke();
                    drawArrowHead(ctx, p2, vector_scale(1/vr, c2), ahL, ahW);
                    ctx.fillStyle = edgeColor;
                    ctx.font = '12px system-ui,sans-serif';
                    ctx.fillText(conn.edgeName, tl[0]-3, tl[1]+4);
                }
            }
        });
    });

    // Draw nodes
    snapGraph.forEach(node => {
        if (!node.visible || !node.name || node.name.startsWith('self-connection')) return;
        const p2 = toScreen(node.pos);

        const dn = node.displayName;
        const nodeColor = (dn==='start'||dn==='end'||dn==='error') ? 'yellow' : 'white';

        // Glow halo based on brightness
        const bright = nodeBrightness[dn] || nodeBrightness[node.name] || 0;
        if (bright > 0.02) {
            const glowR = vr + 8 + bright * 6;
            const grad = ctx.createRadialGradient(p2[0], p2[1], vr, p2[0], p2[1], glowR);
            grad.addColorStop(0, `rgba(255,255,255,${(bright * 0.8).toFixed(3)})`);
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.beginPath();
            ctx.arc(p2[0], p2[1], glowR, 0, Math.PI*2);
            ctx.fillStyle = grad;
            ctx.fill();
        }

        // Node circle
        ctx.beginPath();
        ctx.arc(p2[0], p2[1], vr, 0, Math.PI*2);
        ctx.fillStyle = nodeColor;
        ctx.fill();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Label (inside) and name (beside)
        ctx.fillStyle = 'black';
        ctx.font = '12px system-ui,sans-serif';
        if (node.label) ctx.fillText(node.label, p2[0]-3, p2[1]+4);
        ctx.fillText(dn, p2[0] + vertex_name_text_offset[0] - 3,
                            p2[1] + vertex_name_text_offset[1] + 4);
    });
}

function drawArrowHead(ctx, tip, dir, len, wid) {
    const root = vector_subtract(tip, vector_scale(len, dir));
    ctx.beginPath();
    ctx.moveTo(root[0] + dir[1]*wid*0.5, root[1] - dir[0]*wid*0.5);
    ctx.lineTo(tip[0], tip[1]);
    ctx.lineTo(root[0] - dir[1]*wid*0.5, root[1] + dir[0]*wid*0.5);
    ctx.closePath();
    ctx.fill();
}

function drawTapeOnCanvas(ctx, p, record, headPos, currentState, areaY, areaH, W) {
    if (!record) return;
    const tape = record[4];
    if (!tape) return;

    // ── Measure widest state name to size the read-head box ──────────
    const headFontSize = Math.max(12, Math.round(areaH * 0.11));
    ctx.font = `bold ${headFontSize}px system-ui, sans-serif`;
    let maxStateNameW = 0;
    if (typeof code !== 'undefined') {
        for (const st of Object.keys(code)) {
            const w = ctx.measureText(st).width;
            if (w > maxStateNameW) maxStateNameW = w;
        }
    }
    for (const name of ['start', 'end', 'error']) {
        const w = ctx.measureText(name).width;
        if (w > maxStateNameW) maxStateNameW = w;
    }
    const headPadX = headFontSize * 0.7;
    const headBoxW = Math.max(headFontSize * 2.2, maxStateNameW + headPadX * 2);
    const headBoxH = Math.round(areaH * 0.24);

    // ── Vertical layout ───────────────────────────────────────────────
    // Tape strip: cellH tall, centred at 78% down the tape area
    const cellH        = Math.round(areaH * 0.28);
    const cellFontSize = Math.max(10, Math.round(cellH * 0.52));
    const cellW        = Math.max(Math.round(cellFontSize * 1.9), Math.round(W / 30));
    const tapeCenterY  = areaY + Math.round(areaH * 0.78);
    const tapeTopY     = tapeCenterY - Math.round(cellH / 2);

    // Head box sits above the tape; pointer triangle bridges the gap
    const headBoxX = W / 2 - headBoxW / 2;
    const headBoxY = tapeTopY - headBoxH;   // head box bottom touches tape top

    // ── Tape background strip ─────────────────────────────────────────
    ctx.fillStyle = 'hsl(0,0%,98%)';
    ctx.fillRect(0, tapeTopY, W, cellH);

    // ── Tape cells ────────────────────────────────────────────────────
    // Cell at index headPos is horizontally centred at W/2
    const cellScreenX  = ci => W / 2 + (ci - headPos) * cellW;
    const visibleCells = Math.ceil(W / cellW) + 4;
    const startCell    = Math.round(headPos) - Math.floor(visibleCells / 2);
    const endCell      = startCell + visibleCells;

    ctx.font = `${cellFontSize}px 'Courier New', monospace`;
    for (let ci = startCell; ci < endCell; ci++) {
        const cx      = cellScreenX(ci);
        const cellVal = (ci >= 0 && ci < tape.length) ? tape[ci] : '';

        // Per-symbol styling from result_table_style
        let bgColor = null, fgColor = '#111';
        if (typeof result_table_style !== 'undefined' && result_table_style) {
            const sty = result_table_style[cellVal];
            if (sty) {
                if (sty.background) bgColor = sty.background;
                if (sty.foreground) fgColor  = sty.foreground;
            }
        }
        if (bgColor) {
            ctx.fillStyle = bgColor;
            ctx.fillRect(cx, tapeTopY, cellW, cellH);
        }
        ctx.strokeStyle = 'hsl(0,0%,60%)';
        ctx.lineWidth   = 1;
        ctx.strokeRect(cx + 0.5, tapeTopY + 0.5, cellW - 1, cellH - 1);
        ctx.fillStyle    = fgColor;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cellVal, cx + cellW / 2, tapeCenterY);
    }
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'alphabetic';

    // ── Read-head box (dark-grey rounded rect) ────────────────────────
    ctx.fillStyle = 'hsl(0,0%,22%)';
    const hr = Math.max(3, Math.round(headBoxH * 0.12));
    ctx.beginPath();
    ctx.moveTo(headBoxX + hr,            headBoxY);
    ctx.lineTo(headBoxX + headBoxW - hr, headBoxY);
    ctx.quadraticCurveTo(headBoxX + headBoxW, headBoxY,            headBoxX + headBoxW, headBoxY + hr);
    ctx.lineTo(headBoxX + headBoxW,      headBoxY + headBoxH - hr);
    ctx.quadraticCurveTo(headBoxX + headBoxW, headBoxY + headBoxH, headBoxX + headBoxW - hr, headBoxY + headBoxH);
    ctx.lineTo(headBoxX + hr,            headBoxY + headBoxH);
    ctx.quadraticCurveTo(headBoxX,       headBoxY + headBoxH,      headBoxX, headBoxY + headBoxH - hr);
    ctx.lineTo(headBoxX,                 headBoxY + hr);
    ctx.quadraticCurveTo(headBoxX,       headBoxY,                 headBoxX + hr, headBoxY);
    ctx.closePath();
    ctx.fill();

    // ── Pointer triangle: base at head-box bottom, tip at tape top ────
    const triW = Math.max(8, Math.round(headBoxW * 0.16));
    ctx.beginPath();
    ctx.moveTo(W / 2 - triW / 2, headBoxY + headBoxH);
    ctx.lineTo(W / 2 + triW / 2, headBoxY + headBoxH);
    ctx.lineTo(W / 2,            tapeTopY);
    ctx.closePath();
    ctx.fillStyle = 'hsl(0,0%,22%)';
    ctx.fill();

    // ── State name (white bold text inside head box) ──────────────────
    const displayState = canonicalStateName(currentState) || '';
    ctx.fillStyle    = 'white';
    ctx.font         = `bold ${headFontSize}px system-ui, sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayState, headBoxX + headBoxW / 2, headBoxY + headBoxH / 2);
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'alphabetic';
}

// ── menuRenderAnimation is already defined, register it ──────────────
