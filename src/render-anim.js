// ── Render Animation: dialog logic, frame generation, canvas drawing ────────

// Persisted render params (so the settings window remembers values between opens)
const _renderDefaultParams = {
    width: 1920, height: 1080,
    fps: 30,
    moveFrames: 10, pauseFrames: 5, halflife: 10,
    graphicScale: 1.0,
    renderImage: true, renderMusic: false,
    movementMode: 'tape',  // 'tape' = 纸带动机头固定；'head' = 机头动纸带固定
    musicMode: 'major', musicRoot: 'C4', musicLoNote: 'C3', musicHiNote: 'C6',
    musicSeed: 0, samplesDir: '',
    outputPath: '',
};
let _lastRenderParams = Object.assign({}, _renderDefaultParams);

function menuRenderAnimation() {
    const { ipcRenderer } = require('electron');

    // Compute run history
    const renderCode    = parseProgramCode(code_editor_value);
    const renderHistory = run_turing_machine(renderCode, tape, parseInt(max_steps_input.value), "all", start_position, 0);

    // Stash history on a module-level variable for use during render
    window._renderHistory = renderHistory;
    window._renderCode    = renderCode;

    const totalFrames = computeTotalFrames(renderHistory, _lastRenderParams);

    ipcRenderer.invoke('open-render-settings', {
        params: _lastRenderParams,
        totalFrames,
        strings: {
            secSize:          t('renderSecSize'),
            secTiming:        t('renderSecTiming'),
            secStyle:         t('renderSecStyle'),
            secMusic:         t('renderSecMusic'),
            secOutput:        t('renderSecOutput'),
            lblWidth:         t('renderLabelWidth'),
            lblHeight:        t('renderLabelHeight'),
            lblFps:           t('renderLabelFps'),
            lblMoveFrames:    t('renderLabelMoveFrames'),
            lblPauseFrames:   t('renderLabelPauseFrames'),
            lblHalflife:      t('renderLabelHalflife'),
            lblTotalFrames:   t('renderLabelTotalFrames'),
            lblTotalDuration: t('renderLabelTotalDuration'),
            lblRenderImage:   t('renderLabelRenderImage'),
            lblGraphicScale:  t('renderLabelGraphicScale'),
            lblRenderMusic:   t('renderLabelRenderMusic'),
            lblMusicMode:     t('renderLabelMusicMode'),
            lblMusicRoot:     t('renderLabelMusicRoot'),
            lblMusicLo:       t('renderLabelMusicLo'),
            lblMusicHi:       t('renderLabelMusicHi'),
            lblMusicSeed:     t('renderLabelMusicSeed'),
            lblMusicSamples:  t('renderLabelMusicSamples'),
            btnMusicPreview:  t('renderBtnMusicPreview'),
            btnStart:         t('renderStart'),
            btnBrowse:        t('renderBrowse'),
            outputPlaceholder:       t('renderOutputPlaceholder'),
            browseTitle:             t('renderBrowseTitle'),
            musicBrowseTitle:        t('renderMusicBrowseTitle'),
            musicSamplesPlaceholder: t('renderMusicSamplesPlaceholder'),
            musicBaking:      t('renderMusicBaking'),
            musicPlaying:     t('renderMusicPlaying'),
            musicDecodeError: t('renderMusicDecodeError'),
            alertNoOutput:    t('renderAlertNoOutput'),
            alertNothingEnabled: t('renderAlertNothingEnabled'),
            renderSettingsTitle:     t('renderSettingsTitle'),
            renderMusicModeMajor:    t('renderMusicModeMajor'),
            renderMusicModeMinor:    t('renderMusicModeMinor'),
            renderRendering:  t('renderRendering'),
            renderDone:       t('renderDone'),
            renderMovementModeTape:  t('renderMovementModeTape'),
            renderMovementModeHead:  t('renderMovementModeHead'),
            durationHour:     t('renderDurationHour'),
            durationMinute:   t('renderDurationMinute'),
            durationSecond:   t('renderDurationSecond'),
        },
    });
}

function getRenderParams() {
    // Return last-known params (updated via IPC from settings window)
    return Object.assign({}, _lastRenderParams);
}

function computeTotalFrames(history, p) {
    // Matches buildFrameSequence exactly.
    const pause    = Math.max(0, p.pauseFrames);
    const move     = Math.max(1, p.moveFrames);
    const cooldown = Math.ceil(9 * p.halflife);
    if (!history || history.length === 0) return 0;
    // 1 dark frame + initial pause (>=0) + transitions + final pause + cooldown
    let total = 1 + pause;
    for (let i = 1; i < history.length; i++) {
        const posChanged = history[i][1] !== history[i-1][1];
        if (posChanged) {
            total += move;
            // When pause=0, the last movement frame carries the highlight; no extra frame.
            total += pause;
        } else {
            // No movement frames.
            if (pause > 0) {
                total += pause;
            } else {
                // pause=0 and no movement: one explicit landing frame is inserted.
                total += 1;
            }
        }
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
        await ipcRenderer.invoke('open-render-preview', { width: p.width, height: p.height, strings: { renderRendering: t('renderRendering'), renderDone: t('renderDone') } });
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

    const pause = Math.max(0, p.pauseFrames);
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
                // On the last movement frame, fire activateNode/activateEdge so the
                // highlight is always triggered even when pauseFrames = 0.
                const isLastMoveFrame = (mf === move - 1);
                frames.push({
                    headPos:      prevPos + (currPos - prevPos) * tEase,
                    historyIndex: isLastMoveFrame ? i : i - 1,
                    currentState: isLastMoveFrame ? currState : prevState,
                    activateNode: isLastMoveFrame ? canonicalStateName(currState) : null,
                    activateEdge: isLastMoveFrame ? edgeKey : null,
                });
            }
        }

        // Post-arrival pause: head is at currPos, tape and state flip to curr's values.
        // Highlight the new state node and the taken edge.
        // When pauseFrames = 0, skip pushFrames (count = 0, no frames added).
        // But if there were also no movement frames (position unchanged), we still need
        // at least one landing frame to fire the highlight — insert it explicitly.
        if (pause > 0) {
            pushFrames(pause, currPos, i, currState,
                canonicalStateName(currState), edgeKey);
        } else if (currPos === prevPos) {
            // No movement frames AND no pause frames: fire highlight in a single frame.
            frames.push({
                headPos:      currPos,
                historyIndex: i,
                currentState: currState,
                activateNode: canonicalStateName(currState),
                activateEdge: edgeKey,
            });
        }
        // (If pause=0 but movement frames existed, the last movement frame already
        //  carried the highlight above — nothing more needed here.)
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
                    // 起止点：旋转角度决定从节点边缘的出发方向（曲线自然散开）
                    const c1 = vector_rotate(c,  multiple_edges_gap_angle * offset * 0.5);
                    const c2 = vector_rotate(c, -multiple_edges_gap_angle * offset * 0.5);
                    const p1 = vector_plus(a, c1);
                    const p2 = vector_subtract(b, c2);
                    // 控制点：切线分量（l*param1）保证曲线流畅，叠加法线固定偏移保证间距均匀
                    const normalOffset = vector_scale(multiple_edges_gap * gs * offset, normal);
                    const p3 = vector_plus(vector_plus(p1, vector_scale(multiple_edges_shape_param1 * l, vn)), normalOffset);
                    const p4 = vector_plus(vector_subtract(p2, vector_scale(multiple_edges_shape_param1 * l, vn)), normalOffset);
                    // 标签：曲线中点沿法线偏移
                    const mid = vector_scale(0.5, vector_plus(p3, p4));
                    const tl = vector_plus(mid,
                        vector_scale(connection_text_offset * gs * Math.sign(offset + 0.1), normal));
                    // 箭头方向用 p4→p2 的实际切线
                    const arrowDir = (() => { const d = vector_subtract(p2, p4); const dl = vector_length(d); return dl > 0 ? vector_scale(1/dl, d) : vn; })();
                    ctx.beginPath();
                    ctx.moveTo(p1[0], p1[1]);
                    ctx.bezierCurveTo(p3[0], p3[1], p4[0], p4[1], p2[0], p2[1]);
                    ctx.stroke();
                    drawArrowHead(ctx, p2, arrowDir, ahL, ahW);
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

    // movementMode: 'tape' (default) = head fixed at screen center, tape scrolls
    //               'head'           = tape origin fixed at screen center, head moves
    const headMoving = (p.movementMode === 'head');

    // ── Vertical layout & shrink factor ──────────────────────────────
    const cellH0        = Math.round(areaH * 0.28);
    const cellFontSize0 = Math.max(10, Math.round(cellH0 * 0.52));
    const cellW0        = Math.max(Math.round(cellFontSize0 * 1.9), Math.round(W / 30));

    // In head-moving mode, shrink everything uniformly if the tape's meaningful
    // content is wider than the canvas. Never upscale (shrink ≤ 1).
    const shrink = (headMoving && tape.length > 0)
        ? Math.min(1, W / (tape.length * cellW0))
        : 1;

    const cellW        = cellW0        * shrink;
    const cellH        = cellH0        * shrink;
    const cellFontSize = Math.max(6, cellFontSize0 * shrink);

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
    const headBoxW = Math.max(headFontSize * 2.2, maxStateNameW + headPadX * 2) * shrink;
    const headBoxH = Math.round(areaH * 0.24) * shrink;
    const headFontSizeScaled = headFontSize * shrink;
    const tapeCenterY  = areaY + Math.round(areaH * 0.78);
    const tapeTopY     = tapeCenterY - Math.round(cellH / 2);
    const headBoxY     = tapeTopY - headBoxH;

    // ── Compute screen X positions depending on movement mode ─────────
    // In 'tape' mode: cell at headPos is centred at W/2 (head box stays centred)
    //   cellScreenX(ci) = W/2 - headPos*cellW - cellW/2 + ci*cellW
    //   → cellScreenX(headPos) = W/2 - cellW/2  (left edge), centre = W/2 ✓
    // In 'head' mode: tape[0..length-1] centred on screen, head moves
    //   left edge of ci=0: W/2 - tape.length/2*cellW
    //   → total tape width = tape.length*cellW, centred at W/2 ✓
    const tapeCenterOffset = headMoving
        ? W / 2 - (tape.length / 2) * cellW      // left edge of cell 0
        : W / 2 - headPos * cellW - cellW / 2;   // left edge of cell headPos → centre W/2
    const cellScreenX = ci => tapeCenterOffset + ci * cellW;
    const headScreenX = headMoving
        ? tapeCenterOffset + headPos * cellW + cellW / 2
        : W / 2;

    // ── Tape background strip ─────────────────────────────────────────
    ctx.fillStyle = 'hsl(0,0%,98%)';
    ctx.fillRect(0, tapeTopY, W, cellH);

    // ── Tape cells ────────────────────────────────────────────────────
    // Always render the full visible range so cells outside the meaningful
    // content still show grid lines instead of a blank strip.
    const startCell = Math.floor(-tapeCenterOffset / cellW) - 1;
    const endCell   = Math.ceil((W - tapeCenterOffset) / cellW) + 1;

    ctx.font = `${cellFontSize}px 'Courier New', monospace`;
    for (let ci = startCell; ci < endCell; ci++) {
        const cx      = cellScreenX(ci);
        if (cx + cellW < 0 || cx > W) continue;
        const cellVal = (ci >= 0 && ci < tape.length) ? tape[ci] : '';

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
        if (cellVal !== '') {
            ctx.fillStyle    = fgColor;
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(cellVal, cx + cellW / 2, tapeCenterY);
        }
    }
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'alphabetic';

    // ── Read-head: pentagon ───────────────────────────────────────────
    const tipX      = headScreenX;
    const tipY      = tapeCenterY;
    const spikeTopY = headBoxY + headBoxH;
    const pentPointW = Math.max(8 * shrink, Math.round(headBoxW * 0.30));
    const rectL = tipX - headBoxW / 2;
    const rectR = tipX + headBoxW / 2;
    const hr = Math.max(3 * shrink, Math.round(headBoxH * 0.18));
    ctx.fillStyle = 'hsl(0,0%,22%)';
    ctx.beginPath();
    ctx.moveTo(rectL + hr, headBoxY);
    ctx.lineTo(rectR - hr, headBoxY);
    ctx.quadraticCurveTo(rectR, headBoxY, rectR, headBoxY + hr);
    ctx.lineTo(rectR, spikeTopY);
    ctx.lineTo(tipX + pentPointW / 2, spikeTopY);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(tipX - pentPointW / 2, spikeTopY);
    ctx.lineTo(rectL, spikeTopY);
    ctx.lineTo(rectL, headBoxY + hr);
    ctx.quadraticCurveTo(rectL, headBoxY, rectL + hr, headBoxY);
    ctx.closePath();
    ctx.fill();

    // ── State name inside head box ────────────────────────────────────
    const displayState = canonicalStateName(currentState) || '';
    ctx.fillStyle    = 'white';
    ctx.font         = `bold ${headFontSizeScaled}px system-ui, sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayState, tipX, headBoxY + headBoxH / 2);
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'alphabetic';
}

// ── menuRenderAnimation is already defined, register it ──────────────
