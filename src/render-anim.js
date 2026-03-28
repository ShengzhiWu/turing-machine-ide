// ── Render Animation: dialog logic, frame generation, canvas drawing ────────

// Persisted render params (so the settings window remembers values between opens)
const _renderDefaultParams = {
    width: 1920, height: 1080,
    fps: 30,
    moveFrames: 10, pauseFrames: 5, halflife: 10,
    speedMultiplier: 1,  // 每 N 个逻辑帧输出 1 帧（含图像与音频时长）
    graphicScale: 1.0,
    renderImage: true, renderMusic: false,
    movementMode: 'tape',  // 'tape' = 纸带动机头固定；'head' = 机头动纸带固定
    musicMode: 'major', musicRoot: 'C4', musicLoNote: 'C3', musicHiNote: 'C6',
    musicSeed: 0, samplesDir: '',
    outputPath: '',
};
let _lastRenderParams = Object.assign({}, _renderDefaultParams);  // 渲染设置

function menuRenderAnimation() {  // 点击菜单->文件->渲染动画触发此函数
    const { ipcRenderer } = require('electron');

    // 计算运行历史
    const renderCode    = parseProgramCode(code_editor_value);
    const renderHistory = run_turing_machine(renderCode, tape, start_position, "start", parseInt(max_steps_input.value), "all", 0);  // TODO: 步数过高时这里会内存溢出

    // 存储历史记录
    window._renderHistory = renderHistory;

    const totalFrames = computeTotalFrames(renderHistory, _lastRenderParams);

    ipcRenderer.invoke('open-render-settings', {  // 打开渲染设置面板
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
            lblSpeedMultiplier: t('renderLabelSpeedMultiplier'),
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

function computeRawTotalFrames(history, renderParams) {  // 计算总帧数（不考虑倍速）
    // Matches iterateRenderFrames exactly.
    const pause    = Math.max(0, renderParams.pauseFrames);
    const move     = Math.max(1, renderParams.moveFrames);
    const cooldown = Math.ceil(9 * renderParams.halflife);  // 9倍半衰期，亮度衰减到最初的 2 ^ -9，这样即使是白色也会衰减到看不见。加这个是为了确保动画一直延续到所有高亮熄灭
    if (!history || history.length === 0) return 0;
    let total = 1 + pause;
    for (let i = 1; i < history.length; i++) {
        const posChanged = history[i][1] !== history[i-1][1];
        if (posChanged) {  // 移动了
            total += move;
            total += pause;
        } else {  // 没移动
            total += Math.max(1, pause);
        }
    }
    total += pause + cooldown;
    return total;
}

function computeTotalFrames(history, renderParams) {  // 计算总帧数（考虑倍速）
    const raw = computeRawTotalFrames(history, renderParams);
    if (raw === 0) return 0;
    const mult = Math.max(1, parseInt(renderParams.speedMultiplier, 10) || 1);
    return Math.ceil(raw / mult);
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

// 在输出帧边界应用高亮：本批内曾点亮的键置 1，否则乘以 decayBatch（等价于跨 stride 个逻辑帧的连乘衰减）。
function applyBatchBrightness(nodeBrightness, edgeBrightness, batchNodeLit, batchEdgeLit, decayBatch) {
    const nodeKeys = new Set([...Object.keys(nodeBrightness), ...batchNodeLit]);
    for (const k of nodeKeys) {
        if (batchNodeLit.has(k)) nodeBrightness[k] = 1;
        else nodeBrightness[k] = (nodeBrightness[k] || 0) * decayBatch;
    }
    const edgeKeys = new Set([...Object.keys(edgeBrightness), ...batchEdgeLit]);
    for (const k of edgeKeys) {
        if (batchEdgeLit.has(k)) edgeBrightness[k] = 1;
        else edgeBrightness[k] = (edgeBrightness[k] || 0) * decayBatch;
    }
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
    const stride      = Math.max(1, parseInt(p.speedMultiplier, 10) || 1);
    let totalRaw      = computeRawTotalFrames(history, p);

    // ── Open preview window only when rendering images ────────────────
    if (p.renderImage) {
        await ipcRenderer.invoke('open-render-preview', { width: p.width, height: p.height, strings: { renderRendering: t('renderRendering'), renderDone: t('renderDone') } });
    }

    const offCanvas = p.renderImage ? document.createElement('canvas') : null;
    if (offCanvas) { offCanvas.width = p.width; offCanvas.height = p.height; }
    const ctx = offCanvas ? offCanvas.getContext('2d') : null;

    const nodeBrightness = {};
    const edgeBrightness = {};
    // 与「每逻辑帧乘以 0.5^(1/halflife)」共 stride 次等效的一次性因子
    const decayBatch = Math.pow(0.5, stride / p.halflife);
    const batchNodeLit = new Set();
    const batchEdgeLit = new Set();
    let lastPreviewTime = 0;

    try {
        // ── Image render：O(步数) 建时间轴 + 仅输出 ceil(totalRaw/stride) 帧，不逐逻辑帧迭代 ──
        if (p.renderImage && totalRaw > 0) {
            const timeline = buildRenderTimeline(history, p);
            if (timeline.totalRaw !== totalRaw) {
                console.warn('[render] totalRaw mismatch', timeline.totalRaw, totalRaw);
                totalRaw = timeline.totalRaw;
            }
            const { segments, activations } = timeline;
            const totalOut = Math.ceil(totalRaw / stride);
            let outFi = 0;
            for (let D = 0; D < totalRaw; D += stride) {
                const batchStart = D === 0 ? 0 : D - stride + 1;
                const batchEnd   = D;
                collectActivationsInRange(activations, batchStart, batchEnd, batchNodeLit, batchEdgeLit);
                applyBatchBrightness(
                    nodeBrightness, edgeBrightness,
                    batchNodeLit, batchEdgeLit, decayBatch);
                batchNodeLit.clear();
                batchEdgeLit.clear();

                const frame = getFrameStateAt(segments, history, D);
                drawRenderFrame(ctx, p, renderGraph, frame, nodeBrightness, edgeBrightness);

                const dataURL = offCanvas.toDataURL('image/png');
                const base64  = dataURL.slice(dataURL.indexOf(',') + 1);
                const pngBuf  = Buffer.from(base64, 'base64');
                const num = String(outFi).padStart(6, '0');
                fs.writeFileSync(pathMod.join(p.outputPath, `frame_${num}.png`), pngBuf);
                outFi++;

                const now = Date.now();
                if (now - lastPreviewTime >= 150) {
                    lastPreviewTime = now;
                    ipcRenderer.send('render-preview-dataurl', dataURL);
                }

                const pct = (outFi / totalOut * 100).toFixed(1);
                ipcRenderer.send('render-progress', { pct, current: outFi, total: totalOut });

                if (outFi % 10 === 0) await new Promise(res => setTimeout(res, 0));
            }
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

// ── Iterate every logical render frame（顺序与 computeRawTotalFrames 一致）──────────
function* iterateRenderFrames(history, p) {
    if (history.length === 0) return;

    const pause = Math.max(0, p.pauseFrames);
    const move  = Math.max(1, p.moveFrames);

    function* yieldPause(count, headPos, histIdx, currentState, activateNode, activateEdge) {
        for (let i = 0; i < count; i++) {
            yield {
                headPos,
                historyIndex: histIdx,
                currentState,
                activateNode: i === 0 ? activateNode : null,
                activateEdge: i === 0 ? activateEdge : null,
            };
        }
    }

    const initial = history[0];
    yield {
        headPos:      initial[1],
        historyIndex: 0,
        currentState: initial[3],
        activateNode: null,
        activateEdge: null,
    };

    yield* yieldPause(pause, initial[1], 0, initial[3],
        canonicalStateName(initial[3]), null);

    for (let i = 1; i < history.length; i++) {
        const prev = history[i - 1];
        const curr = history[i];
        const prevPos    = prev[1];
        const currPos    = curr[1];
        const prevState  = prev[3];
        const currState  = curr[3];
        const edgeKey = prevState + '||' + currState;

        if (currPos !== prevPos) {
            for (let mf = 0; mf < move; mf++) {
                const t01   = (mf + 1) / move;
                const tEase = cubicEase(t01);
                const isLastMoveFrame = (mf === move - 1);
                yield {
                    headPos:      prevPos + (currPos - prevPos) * tEase,
                    historyIndex: isLastMoveFrame ? i : i - 1,
                    currentState: isLastMoveFrame ? currState : prevState,
                    activateNode: isLastMoveFrame ? canonicalStateName(currState) : null,
                    activateEdge: isLastMoveFrame ? edgeKey : null,
                };
            }
        }

        if (pause > 0) {
            yield* yieldPause(pause, currPos, i, currState,
                canonicalStateName(currState), edgeKey);
        } else if (currPos === prevPos) {
            yield {
                headPos:      currPos,
                historyIndex: i,
                currentState: currState,
                activateNode: canonicalStateName(currState),
                activateEdge: edgeKey,
            };
        }
    }

    const last = history[history.length - 1];
    yield* yieldPause(pause, last[1], history.length - 1, last[3],
        canonicalStateName(last[3]), null);

    const cooldown = Math.ceil(9 * p.halflife);
    for (let j = 0; j < cooldown; j++) {
        yield {
            headPos:      last[1],
            historyIndex: history.length - 1,
            currentState: last[3],
            activateNode: null,
            activateEdge: null,
        };
    }
}

function cubicEase(t) {
    // Ease in-out cubic
    return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
}

// ── O(步数) 时间轴：与 iterateRenderFrames 语义一致，用于大步长时避免逐逻辑帧迭代 ──
function buildRenderTimeline(history, p) {
    const pause = Math.max(0, p.pauseFrames);
    const move  = Math.max(1, p.moveFrames);
    const cooldown = Math.ceil(9 * p.halflife);
    const segments = [];
    const activations = [];

    if (!history || history.length === 0) {
        return { totalRaw: 0, segments, activations };
    }

    function addStatic(g0, len, headPos, histIdx, state) {
        if (len <= 0) return;
        segments.push({
            type: 'static', g0, len, headPos, histIdx, state,
        });
    }

    let g = 0;
    const initial = history[0];

    segments.push({ type: 'dark', g0: 0, len: 1 });
    g = 1;

    if (pause > 0) {
        activations.push({ g, node: canonicalStateName(initial[3]), edge: null });
        addStatic(g, pause, initial[1], 0, initial[3]);
        g += pause;
    }

    for (let i = 1; i < history.length; i++) {
        const prev      = history[i - 1];
        const curr      = history[i];
        const prevPos   = prev[1];
        const currPos   = curr[1];
        const prevState = prev[3];
        const currState = curr[3];
        const edgeKey   = prevState + '||' + currState;

        if (currPos !== prevPos) {
            activations.push({
                g: g + move - 1,
                node: canonicalStateName(currState),
                edge: edgeKey,
            });
            segments.push({
                type: 'move', g0: g, len: move, move,
                prevPos, currPos, i, prevState, currState,
            });
            g += move;
            if (pause > 0) {
                activations.push({ g, node: canonicalStateName(currState), edge: edgeKey });
                addStatic(g, pause, currPos, i, currState);
                g += pause;
            }
        } else {
            const hold = Math.max(1, pause);
            activations.push({ g, node: canonicalStateName(currState), edge: edgeKey });
            addStatic(g, hold, currPos, i, currState);
            g += hold;
        }
    }

    const last = history[history.length - 1];
    if (pause > 0) {
        activations.push({ g, node: canonicalStateName(last[3]), edge: null });
        addStatic(g, pause, last[1], history.length - 1, last[3]);
        g += pause;
    }
    if (cooldown > 0) {
        addStatic(g, cooldown, last[1], history.length - 1, last[3]);
        g += cooldown;
    }

    return { totalRaw: g, segments, activations };
}

function findSegmentForIndex(segments, g) {
    let lo = 0, hi = segments.length - 1;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const s = segments[mid];
        if (g < s.g0) hi = mid - 1;
        else if (g >= s.g0 + s.len) lo = mid + 1;
        else return s;
    }
    return null;
}

function getFrameStateAt(segments, history, g) {
    const seg = findSegmentForIndex(segments, g);
    if (!seg) throw new Error('getFrameStateAt: invalid frame index ' + g);
    const off = g - seg.g0;
    if (seg.type === 'dark') {
        const h = history[0];
        return {
            headPos: h[1], historyIndex: 0, currentState: h[3],
            activateNode: null, activateEdge: null,
        };
    }
    if (seg.type === 'static') {
        return {
            headPos: seg.headPos, historyIndex: seg.histIdx, currentState: seg.state,
            activateNode: null, activateEdge: null,
        };
    }
    if (seg.type === 'move') {
        const mf   = off;
        const t01  = (mf + 1) / seg.move;
        const tEase = cubicEase(t01);
        const isLast = mf === seg.move - 1;
        return {
            headPos: seg.prevPos + (seg.currPos - seg.prevPos) * tEase,
            historyIndex: isLast ? seg.i : seg.i - 1,
            currentState: isLast ? seg.currState : seg.prevState,
            activateNode: null, activateEdge: null,
        };
    }
    throw new Error('getFrameStateAt: unknown segment');
}

function collectActivationsInRange(activations, batchStart, batchEnd, batchNodeLit, batchEdgeLit) {
    batchNodeLit.clear();
    batchEdgeLit.clear();
    if (!activations.length || batchEnd < batchStart) return;
    let lo = 0, hi = activations.length;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (activations[mid].g < batchStart) lo = mid + 1;
        else hi = mid;
    }
    for (let i = lo; i < activations.length && activations[i].g <= batchEnd; i++) {
        const a = activations[i];
        if (a.node) batchNodeLit.add(a.node);
        if (a.edge) batchEdgeLit.add(a.edge);
    }
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
