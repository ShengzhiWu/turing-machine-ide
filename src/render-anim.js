// ── Render Animation: dialog logic, frame generation, canvas drawing ────────

// Persisted render params (so the settings window remembers values between opens)
const _renderDefaultParams = {
    width: 1920, height: 1080,
    fps: 30,
    moveFrames: 10, pauseFrames: 5, halflife: 10,
    graphicScale: 1.0,
    renderImage: true, renderMusic: false,
    musicMode: 'major', musicRoot: 'C4', musicLoNote: 'C3', musicHiNote: 'C6',
    musicSeed: 0, samplesDir: '',
    outputPath: '',
};
let _lastRenderParams = Object.assign({}, _renderDefaultParams);

function menuRenderAnimation() {
    const { ipcRenderer } = require('electron');

    // Compute run history
    const renderCode    = parseProgramCode(code_editor_value);
    const renderHistory = run_turing_machine(renderCode, tape, parseInt(max_steps_input.value), true, start_position);

    // Stash history on a module-level variable for use during render
    window._renderHistory = renderHistory;
    window._renderCode    = renderCode;

    const totalFrames = computeTotalFrames(renderHistory, _lastRenderParams);

    ipcRenderer.invoke('open-render-settings', {
        params: _lastRenderParams,
        totalFrames,
        strings: {
            title:            t('renderDialogTitle'),
            secSize:          t('renderSecSize'),
            secTiming:        t('renderSecTiming'),
            secStyle:         t('renderSecStyle') || 'Visual Style',
            secOutput:        t('renderSecOutput'),
            lblWidth:         t('renderLabelWidth'),
            lblHeight:        t('renderLabelHeight'),
            lblMoveFrames:    t('renderLabelMoveFrames'),
            lblPauseFrames:   t('renderLabelPauseFrames'),
            lblHalflife:      t('renderLabelHalflife'),
            lblGraphicScale:  t('renderLabelGraphicScale') || 'Graphic scale',
            btnStart:         t('renderStart'),
            btnClose:         t('renderClose'),
            btnBrowse:        t('renderBrowse'),
            outputPlaceholder: t('renderOutputPlaceholder'),
        },
    });
}

function getRenderParams() {
    // Return last-known params (updated via IPC from settings window)
    return Object.assign({}, _lastRenderParams);
}

function computeTotalFrames(history, p) {
    // Matches buildFrameSequence exactly.
    const pause    = Math.max(1, p.pauseFrames);
    const move     = Math.max(1, p.moveFrames);
    const cooldown = Math.ceil(9 * p.halflife);
    if (!history || history.length === 0) return 0;
    // 1 dark frame + initial pause + transitions + final pause + cooldown
    let total = 1 + pause;
    for (let i = 1; i < history.length; i++) {
        if (history[i][1] !== history[i-1][1]) total += move;
        total += pause;
    }
    total += pause + cooldown;
    return total;
}

// ── IPC listeners (from settings window via main process) ────────────
{
    const { ipcRenderer } = require('electron');

    // Settings window changed params → recompute total frames and send back
    ipcRenderer.on('render-params-changed', (event, params) => {
        Object.assign(_lastRenderParams, params);
        const n = computeTotalFrames(window._renderHistory || [], _lastRenderParams);
        ipcRenderer.send('render-total-frames', n);
    });

    // Settings window closed without rendering
    ipcRenderer.on('render-settings-closed', () => {
        // nothing to clean up in main window for now
    });

    // Settings window clicked Render
    ipcRenderer.on('render-start', (event, params) => {
        Object.assign(_lastRenderParams, params);
        startRender(params);
    });

    // Settings window requested audio preview
    ipcRenderer.on('render-music-preview', (event, params) => {
        Object.assign(_lastRenderParams, params);
        try {
            const { bakeAudio } = require('./src/audio-render.js');
            const stateNames = _getStateNames();
            const wavBuf = bakeAudio(window._renderHistory || [], params, stateNames);
            ipcRenderer.send('render-music-preview-result', {
                wavBase64: wavBuf.toString('base64')
            });
        } catch(e) {
            ipcRenderer.send('render-music-preview-result', { error: e.message });
        }
    });
}

// ── Main render function ──────────────────────────────────────────────
async function startRender(p) {
    const { ipcRenderer } = require('electron');
    const fs      = require('fs');
    const pathMod = require('path');
    const history = window._renderHistory;
    if (!history) return;

    ipcRenderer.send('render-ui-lock', true);

    const renderGraph = buildRenderGraphSnapshot();
    const frames      = buildFrameSequence(history, p);
    const totalSteps  = frames.length;

    // ── Open preview window only when rendering images ────────────────
    if (p.renderImage) {
        await ipcRenderer.invoke('open-render-preview', { width: p.width, height: p.height });
    }

    const offCanvas = p.renderImage ? document.createElement('canvas') : null;
    if (offCanvas) { offCanvas.width = p.width; offCanvas.height = p.height; }
    const ctx = offCanvas ? offCanvas.getContext('2d') : null;

    const nodeBrightness = {};
    const edgeBrightness = {};
    const decay = Math.pow(0.5, 1 / p.halflife);
    let lastPreviewTime = 0;

    try {
        // ── Image render loop ─────────────────────────────────────────
        for (let fi = 0; fi < frames.length; fi++) {
            const frame = frames[fi];

            for (const k of Object.keys(nodeBrightness)) nodeBrightness[k] *= decay;
            for (const k of Object.keys(edgeBrightness)) edgeBrightness[k] *= decay;
            if (frame.activateNode) nodeBrightness[frame.activateNode] = 1.0;
            if (frame.activateEdge) edgeBrightness[frame.activateEdge] = 1.0;

            if (p.renderImage) {
                drawRenderFrame(ctx, p, renderGraph, frame, nodeBrightness, edgeBrightness);

                const dataURL = offCanvas.toDataURL('image/png');
                const base64  = dataURL.slice(dataURL.indexOf(',') + 1);
                const pngBuf  = Buffer.from(base64, 'base64');
                const num = String(fi).padStart(6, '0');
                fs.writeFileSync(pathMod.join(p.outputPath, `frame_${num}.png`), pngBuf);

                const now = Date.now();
                if (now - lastPreviewTime >= 150) {
                    lastPreviewTime = now;
                    ipcRenderer.send('render-preview-dataurl', dataURL);
                }
            }

            const pct = ((fi + 1) / totalSteps * 100).toFixed(1);
            ipcRenderer.send('render-progress', { pct, current: fi + 1, total: totalSteps });

            if (fi % 10 === 0) await new Promise(res => setTimeout(res, 0));
        }

        // ── Audio bake ────────────────────────────────────────────────
        if (p.renderMusic) {
            ipcRenderer.send('render-preview-status', 'Baking audio…');
            await new Promise(res => setTimeout(res, 0));  // yield so status shows

            const { bakeAudio } = require('./src/audio-render.js');
            const stateNames = _getStateNames();
            const wavBuf = bakeAudio(history, p, stateNames);
            const wavPath = pathMod.join(p.outputPath, 'audio.wav');
            fs.writeFileSync(wavPath, wavBuf);
        }

        if (p.renderImage) ipcRenderer.send('render-preview-status', t('renderDone') || 'Done');
        setTimeout(() => {
            if (p.renderImage) ipcRenderer.send('close-render-preview');
            ipcRenderer.send('render-settings-close');
        }, p.renderImage ? 800 : 0);

    } catch(e) {
        console.error('Render error', e);
        if (p.renderImage) ipcRenderer.send('render-preview-status', 'Error: ' + e.message);
        alert('Render error: ' + e.message);
    } finally {
        ipcRenderer.send('render-ui-lock', false);
    }
}

// Collect all unique state names from current run history for note mapping
function _getStateNames() {
    const hist = window._renderHistory || [];
    const names = new Set();
    hist.forEach(entry => { if (entry[3]) names.add(entry[3]); });
    return [...names];
}

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

    // ── Frame 0: one dark frame before anything lights up ────────────
    const initial = history[0];
    frames.push({
        headPos:      initial[1],
        historyIndex: 0,
        currentState: initial[3],
        activateNode: null,
        activateEdge: null,
    });

    // Initial pause: head at position of history[0], start node lights up
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

        // Head movement: animate from prevPos to currPos.
        // During movement the tape and state still show the PREVIOUS step's values,
        // so the tape write and state change appear to happen once the head has landed.
        // Skip movement frames if position didn't change (direction was N).
        if (currPos !== prevPos) {
            for (let mf = 0; mf < move; mf++) {
                const t01   = (mf + 1) / move;
                const tEase = cubicEase(t01);
                frames.push({
                    headPos:      prevPos + (currPos - prevPos) * tEase,
                    historyIndex: i - 1,   // still show old tape while head is in flight
                    currentState: prevState,
                    activateNode: null,
                    activateEdge: null,
                });
            }
        }

        // Post-arrival pause: head is at currPos, tape and state flip to curr's values.
        // Highlight the new state node and the taken edge.
        pushFrames(pause, currPos, i, currState,
            canonicalStateName(currState), edgeKey);
    }

    // Final pause at the terminal position/state
    const last = history[history.length - 1];
    pushFrames(pause, last[1], history.length - 1, last[3],
        canonicalStateName(last[3]), null);

    // Cooldown: continue rendering until glow fully fades.
    // After 9 half-lives, brightness = 1/2^9 < 0.002, visually black.
    const cooldown = Math.ceil(9 * p.halflife);
    for (let i = 0; i < cooldown; i++) {
        frames.push({
            headPos:      last[1],
            historyIndex: history.length - 1,
            currentState: last[3],
            activateNode: null,
            activateEdge: null,
        });
    }

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

    // Layout: graph area takes most of the frame; tape strip is compact at the bottom.
    // tapeAreaH is computed to just fit: top-padding + headBox + tape strip + bottom-padding.
    // We use a fixed fraction that keeps it tight. Approx 22% of total height.
    const graphH    = Math.round(H * 0.78);
    const tapeAreaY = graphH;
    const tapeAreaH = H - graphH;

    // ── Background ───────────────────────────────────────────────────
    ctx.fillStyle = 'hsl(0,0%,60%)';  // matches graph-panel background
    ctx.fillRect(0, 0, W, H);  // fill whole frame with graph color; tape area has no separate bg

    // ── Draw Graph ───────────────────────────────────────────────────
    drawGraphOnCanvas(ctx, snapGraph, W, graphH, frame, nodeBrightness, edgeBrightness, p);

    // ── Draw Tape ───────────────────────────────────────────────────
    const hist = window._renderHistory;
    const record = hist[Math.min(frame.historyIndex, hist.length - 1)];
    drawTapeOnCanvas(ctx, p, record, frame.headPos, frame.currentState,
        tapeAreaY, tapeAreaH, W);
}

function drawGraphOnCanvas(ctx, snapGraph, W, H, animFrame, nodeBrightness, edgeBrightness, renderParams) {
    if (!snapGraph || snapGraph.length === 0) return;

    // Compute bounding box of ALL nodes (including hidden self-connection helper nodes),
    // so that self-loop curves anchored to those positions don't extend outside the frame.
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    snapGraph.forEach(node => {
        if (!node.name) return;
        minX = Math.min(minX, node.pos[0]);
        minY = Math.min(minY, node.pos[1]);
        maxX = Math.max(maxX, node.pos[0]);
        maxY = Math.max(maxY, node.pos[1]);
    });

    // GRAPH_MARGIN: blank space (in graph-space units × fitFactor) around the node bounding box.
    // Increase this value to add more whitespace around the graph in the rendered output.
    const GRAPH_MARGIN_FACTOR = 0.18;  // fraction of the smaller canvas dimension used as margin
    const rf = (() => {
        if (!isFinite(minX) || maxX === minX || maxY === minY) {
            // Fallback: use live frame transform
            const graphPanel = document.getElementById('graph-panel');
            const gpW = graphPanel ? graphPanel.clientWidth  : 640;
            const gpH = graphPanel ? graphPanel.clientHeight : 400;
            const scaleX = W / gpW;
            const scaleY = H / gpH;
            const s = Math.min(scaleX, scaleY);
            return { x: frame.x * scaleX, y: frame.y * scaleY, factor: frame.factor * s };
        }
        const margin = Math.min(W, H) * GRAPH_MARGIN_FACTOR;
        const drawW = W - margin * 2;
        const drawH = H - margin * 2;
        const graphSpanX = maxX - minX;
        const graphSpanY = maxY - minY;
        const fitFactor = Math.min(drawW / graphSpanX, drawH / graphSpanY);
        // Center the graph in the area
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        return {
            x: W / 2 - centerX * fitFactor,
            y: H / 2 - centerY * fitFactor,
            factor: fitFactor,
        };
    })();

    function toScreen(pos) {
        return [rf.x + pos[0] * rf.factor,
                rf.y + pos[1] * rf.factor];
    }

    const gs  = (renderParams && renderParams.graphicScale) ? renderParams.graphicScale : 1.0;
    const vr  = vertex_r * gs;          // scaled node radius
    const ahL = arrow_head_length * gs; // scaled arrowhead length
    const ahW = arrow_head_width  * gs; // scaled arrowhead width
    const fontSize   = Math.round(12 * gs);
    const lineWidth  = 1.2 * gs;

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
            ctx.lineWidth   = lineWidth;

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
                ctx.font = `${fontSize}px system-ui,sans-serif`;
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
                    ctx.font = `${fontSize}px system-ui,sans-serif`;
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
            const glowR = vr + (8 + bright * 6) * gs;
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
        ctx.lineWidth = gs;
        ctx.stroke();

        // Label (inside) and name (beside)
        ctx.fillStyle = 'black';
        ctx.font = `${fontSize}px system-ui,sans-serif`;
        if (node.label) ctx.fillText(node.label, p2[0]-3*gs, p2[1]+4*gs);
        ctx.fillText(dn, p2[0] + vertex_name_text_offset[0]*gs - 3,
                            p2[1] + vertex_name_text_offset[1]*gs + 4);
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

    // Head box sits above the tape; pentagon tip points down to cell center
    const headBoxY = tapeTopY - headBoxH;   // head box top

    // ── Tape background strip ─────────────────────────────────────────
    ctx.fillStyle = 'hsl(0,0%,98%)';
    ctx.fillRect(0, tapeTopY, W, cellH);

    // ── Tape cells ────────────────────────────────────────────────────
    // Cell at index headPos is horizontally centred at W/2
    // cx is the LEFT edge of cell ci; the center of cell headPos is at W/2
    const cellScreenX  = ci => W / 2 - cellW / 2 + (ci - headPos) * cellW;
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

    // ── Read-head: pentagon (rectangle body + downward spike at bottom) ──
    // The rect body sits above the tape. The spike tip points DOWN into the tape strip,
    // touching the vertical center of the tape cell (tapeCenterY).
    const tipX      = W / 2;
    const tipY      = tapeCenterY;                    // spike tip at tape cell center
    const spikeTopY = headBoxY + headBoxH;            // where the rect bottom / spike base is
    const pentPointW = Math.max(8, Math.round(headBoxW * 0.30));
    const rectL = tipX - headBoxW / 2;
    const rectR = tipX + headBoxW / 2;
    const hr = Math.max(3, Math.round(headBoxH * 0.18));
    ctx.fillStyle = 'hsl(0,0%,22%)';
    ctx.beginPath();
    ctx.moveTo(rectL + hr, headBoxY);
    ctx.lineTo(rectR - hr, headBoxY);
    ctx.quadraticCurveTo(rectR, headBoxY, rectR, headBoxY + hr);
    ctx.lineTo(rectR, spikeTopY);
    // Right shoulder of spike
    ctx.lineTo(tipX + pentPointW / 2, spikeTopY);
    // Spike tip
    ctx.lineTo(tipX, tipY);
    // Left shoulder of spike
    ctx.lineTo(tipX - pentPointW / 2, spikeTopY);
    ctx.lineTo(rectL, spikeTopY);
    ctx.lineTo(rectL, headBoxY + hr);
    ctx.quadraticCurveTo(rectL, headBoxY, rectL + hr, headBoxY);
    ctx.closePath();
    ctx.fill();

    // ── State name (white bold text inside head box) ──────────────────
    const displayState = canonicalStateName(currentState) || '';
    ctx.fillStyle    = 'white';
    ctx.font         = `bold ${headFontSize}px system-ui, sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayState, tipX, headBoxY + headBoxH / 2);
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'alphabetic';
}

// ── menuRenderAnimation is already defined, register it ──────────────
