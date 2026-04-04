// ── Render Animation: dialog logic, frame generation, canvas drawing ────────

// Persisted render params (so the settings window remembers values between opens)
const _renderDefaultParams = {
    width: 1920, height: 1080,
    fps: 30,
    moveFrames: 10, pauseFrames: 5, halflife: 10,
    minTailContinuationFrames: 90,  // 停机后尾部至少延续的逻辑帧数（含衰减段）
    speedMultiplier: 1,  // 每 N 个逻辑帧输出 1 帧（含图像与音频时长）
    graphicScale: 1.0,
    /** 有向图适配：较短画布边的留白比例（与 drawGraphOnCanvas 中 margin 一致） */
    graphRelativeMargin: 0.1,
    renderImage: true, renderMusic: false,
    movementMode: 'tape',  // 'tape' = 纸带动机头固定；'head' = 机头动纸带固定
    tapeWrapLines: true,   // 仅机头动模式：多行绘制纸带
    maxCellsPerRow: 70,
    musicMode: 'major', musicRoot: 'C4', musicLoNote: 'C3', musicHiNote: 'C6',
    musicSeed: 0, samplesDir: '',
    outputPath: '',
};
let _lastRenderParams = Object.assign({}, _renderDefaultParams);  // 渲染设置

async function menuRenderAnimation() {  // 点击菜单->文件->渲染动画触发此函数
    const { ipcRenderer } = require('electron');

    // 计算运行历史，但不含纸带记录从而避免内存溢出
    const renderCode    = parseProgramCode(code_editor_value);
    const runOut = run_turing_machine(renderCode, tape, start_position, "start", parseInt(max_steps_input.value), "all", 0, false, false);
    const renderHistory = runOut.history;

    // 存储历史记录（无纸带副本，避免步数大时 OOM）；帧数统计用 steps / movements；图像序列导出时按需重放得到 endTape
    window._renderHistory = renderHistory;
    window._renderTapeSeed = {
        codeStr: code_editor_value,
        tape: [...tape],
        start_position,
    };
    window._renderRunStats = {
        steps: runOut.steps,
        movements: runOut.movements,
    };

    const cached = await ipcRenderer.invoke('get-render-params');
    const mergedParams = Object.assign({}, _lastRenderParams, cached || {});
    Object.assign(_lastRenderParams, mergedParams);
    const totalFrames = computeTotalFrames(window._renderRunStats, mergedParams);

    await ipcRenderer.invoke('open-render-settings', {  // 打开渲染设置面板
        params: mergedParams,
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
            lblMinTailContinuation: t('renderLabelMinTailContinuation'),
            lblTotalFrames:   t('renderLabelTotalFrames'),
            lblTotalDuration: t('renderLabelTotalDuration'),
            lblRenderImage:   t('renderLabelRenderImage'),
            lblGraphicScale:  t('renderLabelGraphicScale'),
            lblGraphRelativeMargin: t('renderLabelGraphRelativeMargin'),
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
            lblTapeWrapLines: t('renderTapeWrapLines'),
            lblMaxCellsPerRow: t('renderMaxCellsPerRow'),
            renderPreviewUnavailable: t('renderPreviewUnavailable'),
            durationHour:     t('renderDurationHour'),
            durationMinute:   t('renderDurationMinute'),
            durationSecond:   t('renderDurationSecond'),
        },
    });
}

/**
 * 停机后尾部逻辑帧数。高亮衰减段为 ⌈9×半衰期⌉ 逻辑帧；「最小延续」按导出/预览的输出帧计数，
 * 倍速抽样时乘以 stride，使尾部长度（秒）与倍速为 1 时一致。与 audio-render.js 保持一致。
 */
function tailContinuationFrameCount(renderParams) {
    const stride = Math.max(1, parseInt(renderParams.speedMultiplier, 10) || 1);
    const halflife = Math.max(1, parseInt(renderParams.halflife, 10) || 10);
    const decayTail = Math.ceil(9 * halflife);
    let minTail = parseInt(renderParams.minTailContinuationFrames, 10);
    if (!Number.isFinite(minTail) || minTail < 0) minTail = 90;
    return Math.max(decayTail, minTail * stride);
}

/**
 * 逻辑渲染帧总数（不含倍速抽样）。steps 为转移步数，movements 为 L/R 移动次数（与 run_turing_machine 一致）。
 */
function computeRawTotalFrames(steps, movements, renderParams) {
    const pause    = Math.max(0, renderParams.pauseFrames);
    const move     = Math.max(1, renderParams.moveFrames);
    const cooldown = tailContinuationFrameCount(renderParams);
    const still = steps - movements;
    return 1 + pause + movements * (move + pause) + still * Math.max(1, pause) + cooldown;
}

/** stats: { steps, movements }，来自 window._renderRunStats */
function computeTotalFrames(stats, renderParams) {
    const raw = computeRawTotalFrames(stats.steps, stats.movements, renderParams);
    if (raw === 0) return 0;
    const mult = Math.max(1, parseInt(renderParams.speedMultiplier, 10) || 1);
    const lastLogical = raw - 1;
    const lastEmittedD = Math.floor(lastLogical / mult) * mult;
    const needsFinalFrame = mult > 1 && lastEmittedD < lastLogical;
    return Math.ceil(raw / mult) + (needsFinalFrame ? 1 : 0);
}

// ── IPC listeners (from settings window via main process) ────────────
{
    const { ipcRenderer } = require('electron');

    let _renderSettingsPreviewTimer = null;
    function clearRenderSettingsPreviewTimer() {
        if (_renderSettingsPreviewTimer) {
            clearTimeout(_renderSettingsPreviewTimer);
            _renderSettingsPreviewTimer = null;
        }
    }
    function scheduleRenderSettingsPreview() {
        clearRenderSettingsPreviewTimer();
        _renderSettingsPreviewTimer = setTimeout(() => {
            _renderSettingsPreviewTimer = null;
            const url = getRenderFirstFramePreviewDataURL(_lastRenderParams);
            ipcRenderer.send('render-settings-preview-frame', url ? { dataURL: url } : { dataURL: null });
        }, 120);
    }

    /** markDocumentDirty：是否标工程未保存。opts：关窗时 skipPreview/skipTotalFrames 避免 JPEG 与无意义 IPC */
    function applyRenderParamsFromSettings(params, markDocumentDirty, opts) {
        opts = opts || {};
        Object.assign(_lastRenderParams, params);
        if (markDocumentDirty && typeof markDirty === 'function') markDirty();
        if (!opts.skipTotalFrames) {
            const n = computeTotalFrames(window._renderRunStats, _lastRenderParams);
            ipcRenderer.send('render-total-frames', n);
        }
        if (!opts.skipPreview) scheduleRenderSettingsPreview();
    }

    function renderParamsEqual(a, b) {
        if (a === b) return true;
        if (!a || !b) return false;
        for (const k of new Set([...Object.keys(a), ...Object.keys(b)]))
            if (a[k] !== b[k]) return false;
        return true;
    }

    ipcRenderer.on('render-params-changed', (e, params) => applyRenderParamsFromSettings(params, true));
    ipcRenderer.on('render-params-sync', (e, params) => applyRenderParamsFromSettings(params, false));
    ipcRenderer.on('render-settings-close-flush', (e, params) => {
        clearRenderSettingsPreviewTimer();
        applyRenderParamsFromSettings(params, !renderParamsEqual(_lastRenderParams, params), {
            skipPreview: true,
            skipTotalFrames: true,
        });
    });
    ipcRenderer.on('render-settings-closed', clearRenderSettingsPreviewTimer);

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
async function startRender(renderParams) {
    const { ipcRenderer } = require('electron');
    const fs      = require('fs');
    const pathMod = require('path');
    const history = window._renderHistory;
    if (!history) return;

    ipcRenderer.send('render-ui-lock', true);

    const renderGraph = buildRenderGraphSnapshot();
    const stride      = Math.max(1, parseInt(renderParams.speedMultiplier, 10) || 1);
    const stats = window._renderRunStats;
    let totalRaw      = stats ? computeRawTotalFrames(stats.steps, stats.movements || 0, renderParams) : 0;

    // ── Open preview window only when rendering images ────────────────
    if (renderParams.renderImage) {
        await ipcRenderer.invoke('open-render-preview', { width: renderParams.width, height: renderParams.height, strings: { renderRendering: t('renderRendering'), renderDone: t('renderDone') } });
    }

    const offCanvas = renderParams.renderImage ? document.createElement('canvas') : null;
    if (offCanvas) { offCanvas.width = renderParams.width; offCanvas.height = renderParams.height; }
    const ctx = offCanvas ? offCanvas.getContext('2d') : null;

    const nodeBrightness = {};
    const edgeBrightness = {};
    // 与「每逻辑帧乘以 0.5^(1/halflife)」共 stride 次等效的一次性因子
    const decayBatch = Math.pow(0.5, stride / renderParams.halflife);
    const batchNodeLit = new Set();
    const batchEdgeLit = new Set();
    let lastPreviewTime = 0;

    try {
        // ── Image render：O(步数) 建时间轴 + 仅输出 ceil(totalRaw/stride) 帧，不逐逻辑帧迭代 ──
        if (renderParams.renderImage && totalRaw > 0) {
            const timeline = buildRenderTimeline(history, renderParams);
            if (timeline.totalRaw !== totalRaw) {
                console.warn('[render] totalRaw mismatch', timeline.totalRaw, totalRaw);
                totalRaw = timeline.totalRaw;
            }
            const { segments, activations } = timeline;
            const lastLogical = totalRaw - 1;
            const lastStrideAlignedD = Math.floor(lastLogical / stride) * stride;
            const needsFinalFrame = stride > 1 && lastStrideAlignedD < lastLogical;
            const totalOut = Math.ceil(totalRaw / stride) + (needsFinalFrame ? 1 : 0);
            let outFi = 0;
            const tapeCache = window._renderTapeSeed ? _createTapeRenderCache(window._renderTapeSeed) : null;

            const writeOneOutputFrame = async (D) => {
                const frame = getFrameStateAt(segments, history, D);
                const hi = Math.min(frame.historyIndex, history.length - 1);
                const tapeNow = tapeCache ? _tapeAtHistoryIndexForRender(history, hi, tapeCache) : null;
                drawRenderFrame(ctx, renderParams, renderGraph, frame, nodeBrightness, edgeBrightness, tapeNow);

                const dataURL = offCanvas.toDataURL('image/png');
                const base64  = dataURL.slice(dataURL.indexOf(',') + 1);
                const pngBuf  = Buffer.from(base64, 'base64');
                const num = String(outFi).padStart(6, '0');
                fs.writeFileSync(pathMod.join(renderParams.outputPath, `frame_${num}.png`), pngBuf);
                outFi++;

                const now = Date.now();
                if (now - lastPreviewTime >= 150) {
                    lastPreviewTime = now;
                    ipcRenderer.send('render-preview-dataurl', dataURL);
                }

                const pct = (outFi / totalOut * 100).toFixed(1);
                ipcRenderer.send('render-progress', { pct, current: outFi, total: totalOut });

                if (outFi % 10 === 0) await new Promise(res => setImmediate(res));
            };

            for (let D = 0; D < totalRaw; D += stride) {
                const batchStart = D === 0 ? 0 : D - stride + 1;
                const batchEnd   = D;
                collectActivationsInRange(activations, batchStart, batchEnd, batchNodeLit, batchEdgeLit);
                applyBatchBrightness(
                    nodeBrightness, edgeBrightness,
                    batchNodeLit, batchEdgeLit, decayBatch);
                batchNodeLit.clear();
                batchEdgeLit.clear();

                await writeOneOutputFrame(D);
            }

            // 倍速抽样时最后一格可能落在停机前；补一帧逻辑末帧以显示最终停机状态（纸带/状态与 timeline 一致）
            if (needsFinalFrame) {
                const rem = lastLogical - lastStrideAlignedD;
                collectActivationsInRange(activations, lastStrideAlignedD + 1, lastLogical, batchNodeLit, batchEdgeLit);
                const decayRem = Math.pow(0.5, rem / renderParams.halflife);
                applyBatchBrightness(
                    nodeBrightness, edgeBrightness,
                    batchNodeLit, batchEdgeLit, decayRem);
                batchNodeLit.clear();
                batchEdgeLit.clear();
                await writeOneOutputFrame(lastLogical);
            }
        }

        // ── Audio bake ────────────────────────────────────────────────
        if (renderParams.renderMusic) {
            ipcRenderer.send('render-preview-status', 'Baking audio…');
            await new Promise(res => setImmediate(res));  // yield so status shows

            const { bakeAudio } = require('./src/audio-render.js');
            const stateNames = _getStateNames();
            const wavBuf = bakeAudio(history, renderParams, stateNames);
            const wavPath = pathMod.join(renderParams.outputPath, 'audio.wav');
            fs.writeFileSync(wavPath, wavBuf);
        }

        if (renderParams.renderImage) ipcRenderer.send('render-preview-status', t('renderDone') || 'Done');
        setTimeout(() => {
            if (renderParams.renderImage) ipcRenderer.send('close-render-preview');
            ipcRenderer.send('render-settings-close');
        }, renderParams.renderImage ? 800 : 0);

    } catch(e) {
        console.error('Render error', e);
        if (renderParams.renderImage) ipcRenderer.send('render-preview-status', 'Error: ' + e.message);
        alert('Render error: ' + e.message);
    } finally {
        ipcRenderer.send('render-ui-lock', false);
    }
}

/** 与打开渲染设置时同一份初始纸带/程序；用于导出帧时按需 run 到 history[idx] 对应的全局步号 */
function _createTapeRenderCache(seed) {
    const code = parseProgramCode(seed.codeStr);
    const r0 = run_turing_machine(code, [...seed.tape], seed.start_position, "start", 0, "heat-tail", 0, false, false);
    return {
        code,
        stepDone: 0,
        tape: r0.endTape,
        position: r0.endPosition,
        state: r0.endState,
    };
}

/**
 * 将模拟推进到 history[idx] 对应的全局步号（record[0]），返回该时刻的纸带（与 recordTape:true 时 [4] 一致）。
 * cache 在多次调用之间复用，按步号单调前进时均摊 O(1) 次转移/帧。
 */
function _tapeAtHistoryIndexForRender(history, idx, cache) {
    const row = history[idx];
    if (!row) return null;
    const targetStep = row[0];
    const seed = window._renderTapeSeed;
    if (!seed) return null;

    if (targetStep < cache.stepDone) {
        const r0 = run_turing_machine(cache.code, [...seed.tape], seed.start_position, "start", 0, "heat-tail", 0, false, false);
        cache.stepDone = 0;
        cache.tape = r0.endTape;
        cache.position = r0.endPosition;
        cache.state = r0.endState;
    }
    while (cache.stepDone < targetStep) {
        const delta = targetStep - cache.stepDone;
        const stateBefore = cache.state;
        const r = run_turing_machine(cache.code, [...cache.tape], cache.position, cache.state, delta, "all", 0, false, false);
        const chunkTrans = r.history.length - 1;
        if (chunkTrans === 0) {
            if (stateBefore === "end" || stateBefore === "error") {
                break;
            }
            console.warn("[render] tape replay: no progress toward step", targetStep);
            break;
        }
        cache.stepDone += chunkTrans;
        cache.tape = r.endTape;
        cache.position = r.endPosition;
        cache.state = r.endState;
    }
    return cache.tape;
}

// Collect all unique state names from current run history for note mapping
function _getStateNames() {
    const hist = window._renderHistory || [];
    const names = new Set();
    hist.forEach(entry => { if (entry[3]) names.add(entry[3]); });
    return [...names];
}

function cubicEase(t) {
    // Ease in-out cubic
    return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
}

// ── O(步数) 时间轴：用于大步长时避免逐逻辑帧迭代 ──
function buildRenderTimeline(history, renderParams) {
    const pause = Math.max(0, renderParams.pauseFrames);
    const move  = Math.max(1, renderParams.moveFrames);
    const cooldown = tailContinuationFrameCount(renderParams);
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

/**
 * 与导出第一输出帧一致：逻辑帧 0（暗帧），结点/边无高亮，纸带与机头为 history[0] 初始状态。
 * 按设置的分辨率绘制（线宽等为像素单位，与导出一致）；返回 JPEG data URL，失败或无历史时返回 null。
 */
function getRenderFirstFramePreviewDataURL(renderParams) {
    const history = window._renderHistory;
    if (!history || history.length === 0) return null;
    const timeline = buildRenderTimeline(history, renderParams);
    if (!timeline.segments.length) return null;
    const renderGraph = buildRenderGraphSnapshot();
    const frame = getFrameStateAt(timeline.segments, history, 0);
    const hi = Math.min(frame.historyIndex, history.length - 1);
    const tapeCache = window._renderTapeSeed ? _createTapeRenderCache(window._renderTapeSeed) : null;
    const tapeNow = tapeCache ? _tapeAtHistoryIndexForRender(history, hi, tapeCache) : null;
    const W = Math.max(1, renderParams.width);
    const H = Math.max(1, renderParams.height);
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    drawRenderFrame(ctx, renderParams, renderGraph, frame, {}, {}, tapeNow);
    try {
        return canvas.toDataURL('image/jpeg', 0.82);
    } catch (e) {
        return null;
    }
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

/**
 * 渲染布局：有向图占画布顶部到「最上一行纸带格子」上边缘之间；纸带自下而上紧贴画布底排布。
 * 返回 drawTapeOnCanvas 所需几何（不含依赖 ctx.measureText 的 headBoxW；headBoxW = 最长状态名宽 + 0.5*cellW）。
 */
function layoutRenderTapeGeometry(renderParams, tape, W, H) {
    const L = tape && Array.isArray(tape) ? tape.length : 0;
    const headMoving = renderParams.movementMode === 'head';
    const wrapLines = headMoving && renderParams.tapeWrapLines !== false;
    const maxPerRow = Math.max(1, parseInt(renderParams.maxCellsPerRow, 10) || 50);
    const numRows = wrapLines ? (L === 0 ? 1 : Math.ceil(L / maxPerRow)) : 1;
    const rowUnits = wrapLines ? numRows + 0.5 * Math.max(0, numRows - 1) : 1;

    const bottomPad = Math.round(H * 0.02);
    const minGraphH = Math.round(H * 0.10);
    const maxStack = Math.max(0, H - bottomPad - minGraphH);

    const cellH0 = Math.round(H * 0.062);
    const cellFontSize0 = Math.round(cellH0 * 0.52);
    const cellW0 = Math.max(Math.round(cellFontSize0 * 1.9), Math.round(W / 30));

    let shrink = 1;
    if (headMoving) {
        if (wrapLines) {
            shrink = Math.min(1, W / (maxPerRow * cellW0));
        } else if (L > 0) {
            shrink = Math.min(1, W / (L * cellW0));
        }
    }

    const cellHDesired = cellH0 * shrink;
    const cellH = Math.max(0, Math.min(cellHDesired, maxStack / rowUnits));
    const cellFontSize = Math.round(cellH * 0.52);
    const cellW = Math.max(Math.round(cellFontSize * 1.9), Math.round(W / 30)) * shrink;

    const stackH = cellH * rowUnits;
    const graphH = H - bottomPad - stackH;

    // 机头尺寸相对纸带格宽 cellW
    const headFontSize = Math.round(cellW * 0.5);  // 机头状态名字号
    const headBoxH = Math.round(cellW * 1);  // 机头高度

    return {
        graphH,
        bottomPad,
        stackH,
        cellW,
        cellH,
        cellFontSize,
        shrink,
        headBoxH,
        headFontSize,
        wrapLines,
        maxPerRow,
        numRows,
        headMoving,
    };
}

// ── Draw one render frame ─────────────────────────────────────────────
function drawRenderFrame(ctx, renderParams, snapGraph, frame, nodeBrightness, edgeBrightness, tapeForFrame) {
    const W = renderParams.width, H = renderParams.height;

    // ── Background ───────────────────────────────────────────────────
    ctx.fillStyle = 'hsl(0,0%,60%)';  // matches graph-panel background
    ctx.fillRect(0, 0, W, H);

    if (!tapeForFrame || !Array.isArray(tapeForFrame)) {
        drawGraphOnCanvas(ctx, snapGraph, W, H, nodeBrightness, edgeBrightness, renderParams);
        return;
    }

    const geom = layoutRenderTapeGeometry(renderParams, tapeForFrame, W, H);
    drawGraphOnCanvas(ctx, snapGraph, W, geom.graphH, nodeBrightness, edgeBrightness, renderParams);
    drawTapeOnCanvas(ctx, renderParams, tapeForFrame, frame.headPos, frame.currentState, W, H, geom);
}

function drawGraphOnCanvas(ctx, snapGraph, W, H, nodeBrightness, edgeBrightness, renderParams) {
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

    let graphRel = parseFloat(renderParams && renderParams.graphRelativeMargin);
    if (!Number.isFinite(graphRel) || graphRel < 0) graphRel = 0.1;
    graphRel = Math.min(graphRel, 0.49);
    const GRAPH_MARGIN_FACTOR = graphRel;
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

/** clipRow: null 表示整段纸带用全局格号对齐；否则只绘 [start,start+len)，且 tapeCenterOffset 对齐该行第 0 个局部格 */
function _drawTapeRowCells(ctx, tape, tapeTopY, tapeCenterY, cellW, cellH, cellFontSize, tapeCenterOffset, W, clipRow) {
    ctx.fillStyle = 'hsl(0,0%,98%)';
    ctx.fillRect(0, tapeTopY, W, cellH);
    ctx.font = `${cellFontSize}px 'Courier New', monospace`;

    const drawOneCell = (cx, ci) => {
        if (cx + cellW < 0 || cx > W) return;
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
    };

    if (clipRow && clipRow.len > 0) {
        for (let li = 0; li < clipRow.len; li++) {
            const ci = clipRow.start + li;
            const cx = tapeCenterOffset + li * cellW;
            drawOneCell(cx, ci);
        }
    } else if (!clipRow) {
        const startCell = Math.floor(-tapeCenterOffset / cellW) - 1;
        const endCell   = Math.ceil((W - tapeCenterOffset) / cellW) + 1;
        for (let ci = startCell; ci < endCell; ci++) {
            const cx = tapeCenterOffset + ci * cellW;
            drawOneCell(cx, ci);
        }
    }
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'alphabetic';
}

function _drawTapeReadHead(ctx, tipX, tipY, headBoxY, headBoxW, headBoxH, cellW, headFontSize, currentState) {
    const spikeTopY = headBoxY + headBoxH;
    const pentPointW = Math.round(cellW * 0.4);  // 机头针尖根部宽度
    const rectL = tipX - headBoxW / 2;
    const rectR = tipX + headBoxW / 2;
    const hr = Math.round(cellW * 0.2);  // 机头圆角
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

    const displayState = canonicalStateName(currentState) || '';
    ctx.fillStyle    = 'white';
    ctx.font         = `bold ${headFontSize}px system-ui, sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayState, tipX, headBoxY + headBoxH / 2);
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'alphabetic';
}

function drawTapeOnCanvas(ctx, renderParams, tape, headPos, currentState, W, H, geom) {
    if (!tape || !Array.isArray(tape) || !geom) return;

    const {
        graphH,
        bottomPad,
        cellW,
        cellH,
        cellFontSize,
        headBoxH,
        headFontSize,
        wrapLines,
        maxPerRow,
        numRows,
        headMoving,
    } = geom;

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
    const headBoxW = maxStateNameW + 0.6 * cellW;  // 机头宽度

    // ── 分行：自下而上；最上一行格顶 y === graphH ─────────────────────────
    if (wrapLines) {
        const L = tape.length;
        const gap = cellH * 0.5;
        const tapeBottomY = H - bottomPad;
        const tapeTopYs = [];
        for (let r = 0; r < numRows; r++)
            tapeTopYs[r] = tapeBottomY - cellH - (numRows - 1 - r) * (cellH + gap);

        const headIdx = L === 0 ? 0 : Math.max(0, Math.min(headPos, L - 1));
        const headRow = Math.min(Math.floor(headIdx / maxPerRow), numRows - 1);

        const tapeLeftX = Math.max(0, (W - maxPerRow * cellW) / 2);

        for (let r = 0; r < numRows; r++) {
            const rowStart = r * maxPerRow;
            const tapeCenterYR = tapeTopYs[r] + cellH / 2;
            _drawTapeRowCells(ctx, tape, tapeTopYs[r], tapeCenterYR, cellW, cellH, cellFontSize, tapeLeftX, W,
                { start: rowStart, len: maxPerRow });
        }

        const rowStart = headRow * maxPerRow;
        const tapeCenterY = tapeTopYs[headRow] + cellH / 2;
        const local = headIdx - rowStart;
        const headScreenX = tapeLeftX + local * cellW + cellW / 2;
        const headBoxY = tapeTopYs[headRow] - headBoxH;
        _drawTapeReadHead(ctx, headScreenX, tapeCenterY, headBoxY, headBoxW, headBoxH, cellW, headFontSize, currentState);
        return;
    }

    const tapeTopY = graphH;
    const tapeCenterY = graphH + Math.round(cellH / 2);
    const headBoxY = graphH - headBoxH;

    const tapeCenterOffset = headMoving
        ? W / 2 - (tape.length / 2) * cellW
        : W / 2 - headPos * cellW - cellW / 2;
    const headScreenX = headMoving
        ? tapeCenterOffset + headPos * cellW + cellW / 2
        : W / 2;

    _drawTapeRowCells(ctx, tape, tapeTopY, tapeCenterY, cellW, cellH, cellFontSize, tapeCenterOffset, W, null);
    _drawTapeReadHead(ctx, headScreenX, tapeCenterY, headBoxY, headBoxW, headBoxH, cellW, headFontSize, currentState);
}
