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
    /** 在有向图区域右下角叠加当前逻辑步号（来自运行历史） */
    showStepNumber: true,
    renderImage: true, renderMusic: true,
    movementMode: 'tape',  // 'tape' | 'head' | 'headRecenter'
    /** headRecenter：纸带滚动锚点逼近真实机头位置的半衰期（逻辑帧）；越大纸带越慢、机头仍可立即对准格 */
    recenterHalflifeFrames: 60,
    /** 机头动 / 缓慢回中：机头水平中心移出画面时平移纸带，使中心落在 [0,W] 内（贴边） */
    headClampInFrame: false,
    tapeWrapLines: true,   // 仅「纸带固定机头动」模式：多行绘制纸带
    maxCellsFirstRow: 40,  // 首行最大格数（格更大，便于看清纸带开头）
    maxCellsOtherRows: 70, // 其余行最大格数
    /** 分行时间距 = 该系数 × 相邻两行格高的平均值 */
    tapeWrapLineGapAvg: 0.3,
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
            lblShowStepNumber: t('renderLabelShowStepNumber'),
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
            renderMovementModeHeadRecenter: t('renderMovementModeHeadRecenter'),
            lblRecenterHalflifeFrames: t('renderLabelRecenterHalflifeFrames'),
            lblHeadClampInFrame: t('renderLabelHeadClampInFrame'),
            lblTapeWrapLines: t('renderTapeWrapLines'),
            lblMaxCellsFirstRow: t('renderCellsFirstRow'),
            lblMaxCellsOtherRows: t('renderCellsOtherRows'),
            lblRelativeLineSpacing: t('renderLabelRelativeLineSpacing'),
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

    ipcRenderer.on('render-params-changed', (_e, params) => applyRenderParamsFromSettings(params, true));
    ipcRenderer.on('render-params-sync', (_e, params) => applyRenderParamsFromSettings(params, false));
    ipcRenderer.on('render-settings-close-flush', (_e, params) => {
        clearRenderSettingsPreviewTimer();
        applyRenderParamsFromSettings(params, !renderParamsEqual(_lastRenderParams, params), {
            skipPreview: true,
            skipTotalFrames: true,
        });
    });
    ipcRenderer.on('render-settings-closed', clearRenderSettingsPreviewTimer);

    // Settings window clicked Render
    ipcRenderer.on('render-start', (_event, params) => {
        Object.assign(_lastRenderParams, params);
        startRender(params);
    });

    // Settings window requested audio preview
    ipcRenderer.on('render-music-preview', (_event, params) => {
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
            const isHeadRecenter = renderParams.movementMode === 'headRecenter';
            const recenterHL = Math.max(1, parseInt(renderParams.recenterHalflifeFrames, 10) || 60);
            const recenterAlpha = isHeadRecenter ? 1 - Math.pow(0.5, 1 / recenterHL) : 0;
            /** 摄像机/纸带滚动锚点：按半衰期逼近真实 headPos（单位：格） */
            let cameraPos = getFrameStateAt(segments, history, 0).headPos;  // 摄像机位置（单位：格子）
            let lastRecenterUpdatedG = 0;

            const writeOneOutputFrame = async (D) => {
                // Ensure cameraPos is advanced for this frame (including停机后的 static/cooldown 段)
                if (isHeadRecenter) {
                    const targetG = D | 0;
                    // Update using intermediate logical frames to match original behavior.
                    while (lastRecenterUpdatedG < targetG) {
                        lastRecenterUpdatedG++;
                        const fr = getFrameStateAt(segments, history, lastRecenterUpdatedG);
                        cameraPos += recenterAlpha * (fr.headPos - cameraPos);
                    }
                }
                const frame = getFrameStateAt(segments, history, D);
                const hi = Math.min(frame.historyIndex, history.length - 1);
                const tapeNow = tapeCache ? _tapeAtHistoryIndexForRender(history, hi, tapeCache) : null;

                // Clamp cameraPos so the head center stays within the frame (in cell units).
                if (isHeadRecenter && renderParams.headClampInFrame && tapeNow) {
                    const W = Math.max(1, renderParams.width);
                    const H = Math.max(1, renderParams.height);
                    const geom = layoutRenderTapeGeometry(renderParams, tapeNow, W, H);
                    const cw = geom.cellW;
                    if (cw > 0) {
                        const halfCells = (W / 2) / cw;
                        const d = cameraPos - frame.headPos;
                        if (Math.abs(d) > halfCells) {
                            cameraPos = frame.headPos + Math.sign(d || 1) * halfCells;
                        }
                    }
                }
                const drawFrame = isHeadRecenter
                    ? Object.assign({}, frame, { cameraPos })
                    : frame;
                drawRenderFrame(ctx, renderParams, renderGraph, drawFrame, nodeBrightness, edgeBrightness, tapeNow);

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
 * 不构建完整时间轴（buildRenderTimeline 为 O(步数)，预览只需 history[0] + seed 上 0 步纸带）。
 */
function getRenderFirstFramePreviewDataURL(renderParams) {
    const history = window._renderHistory;
    if (!history || history.length === 0) return null;
    const h0 = history[0];
    const frame = {
        headPos: h0[1], historyIndex: 0, currentState: h0[3],
        activateNode: null, activateEdge: null,
    };
    const renderGraph = buildRenderGraphSnapshot();
    const tapeCache = window._renderTapeSeed ? _createTapeRenderCache(window._renderTapeSeed) : null;
    const tapeNow = tapeCache ? tapeCache.tape : null;
    const W = Math.max(1, renderParams.width);
    const H = Math.max(1, renderParams.height);
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    let drawFrame = frame;
    if (renderParams.movementMode === 'headRecenter') {
        drawFrame = Object.assign({}, frame, { cameraPos: frame.headPos });
    }
    drawRenderFrame(ctx, renderParams, renderGraph, drawFrame, {}, {}, tapeNow);
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
            headPos: seg.prevPos + (seg.currPos - seg.prevPos) * tEase,  // 机头位置（单位：格子）
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
        selfLoopAnchorIndex: (node[0].startsWith('self-connection') && typeof node[3] === 'number') ? node[3] : null  // 自环虚拟点指向父状态在 graph / snapGraph 中的下标，供边界框等从虚拟点反查真实点
    }));
}

/** 解析首行/其余行格数上限并生成拆行定义（L===0 仍一行占位） */
function _tapeWrapRowDefsFromParams(renderParams, L) {
    const legacyRaw = renderParams.maxCellsPerRow;
    const legacy = legacyRaw != null && legacyRaw !== ''
        ? Math.max(1, parseInt(legacyRaw, 10) || 50) : null;
    let mf = parseInt(renderParams.maxCellsFirstRow, 10);
    let mo = parseInt(renderParams.maxCellsOtherRows, 10);
    if (!Number.isFinite(mf) || mf < 1) mf = legacy != null ? legacy : 40;
    if (!Number.isFinite(mo) || mo < 1) mo = legacy != null ? legacy : 70;
    if (L === 0) return { mf, mo, rows: [{ start: 0, cap: mf }] };
    const rows = [];
    for (let pos = 0; pos < L;) {
        const cap = rows.length === 0 ? mf : mo;
        rows.push({ start: pos, cap });
        pos += cap;
    }
    return { mf, mo, rows };
}

function _tapeCellFontSize(cellH, cellW) {
    return Math.max(6, Math.min(Math.round(cellH * 0.52), Math.floor(cellW / 1.9)));
}

/** 行间竖向空隙 = gapAvg×(h_r+h_{r+1})/2，与行高成比例；缩放 λ 后总栈高 = λ × 未缩放栈高 */
function _tapeWrappedStackSum(hList, gapAvg) {
    let s = 0;
    const g = Number.isFinite(gapAvg) && gapAvg >= 0 ? gapAvg : 0.3;
    for (let r = 0; r < hList.length; r++) {
        s += hList[r];
        if (r < hList.length - 1) s += g * (hList[r] + hList[r + 1]) / 2;
    }
    return s;
}

function _tapeWrapLineGapAvgFromParams(renderParams) {
    let v = parseFloat(renderParams.tapeWrapLineGapAvg);
    if (!Number.isFinite(v) || v < 0) v = 0.3;
    return Math.min(v, 4);
}

function _measureTapeHeadLabelMaxWidth(ctx, boldPx) {
    ctx.font = `bold ${boldPx}px system-ui, sans-serif`;
    let m = 0;
    if (typeof code !== 'undefined') {
        for (const st of Object.keys(code)) {
            const w = ctx.measureText(st).width;
            if (w > m) m = w;
        }
    }
    for (const name of ['start', 'end', 'error']) {
        const w = ctx.measureText(name).width;
        if (w > m) m = w;
    }
    return m;
}

/**
 * 渲染布局：有向图占画布顶部到「最上一行纸带格子」上边缘之间；纸带自下而上紧贴画布底排布。
 * 返回 drawTapeOnCanvas 所需几何（不含依赖 ctx.measureText 的 headBoxW；headBoxW = 最长状态名宽 + 0.6*cellW）。
 */
function layoutRenderTapeGeometry(renderParams, tape, W, H) {
    const L = tape.length;
    const headMoving = renderParams.movementMode === 'head';
    const wrapLines = headMoving && renderParams.tapeWrapLines !== false;
    const wrapPack = wrapLines ? _tapeWrapRowDefsFromParams(renderParams, L) : null;
    const rowDefs = wrapPack ? wrapPack.rows : null;
    const numRows = rowDefs ? rowDefs.length : 1;
    const mo = wrapPack ? wrapPack.mo : 1;

    const bottomPad = Math.round(H * 0.02);
    const minGraphH = Math.round(H * 0.10);
    const maxStack = Math.max(0, H - bottomPad - minGraphH);

    const cellH0 = Math.round(H * 0.062);
    const cellFontSize0 = Math.round(cellH0 * 0.52);
    const cellW0 = Math.max(Math.round(cellFontSize0 * 1.9), Math.round(W / 30));

    let shrink = 1;
    if (headMoving) {
        if (wrapLines) shrink = Math.min(1, W / (mo * cellW0));
        else if (L > 0) shrink = Math.min(1, W / (L * cellW0));
    }

    if (wrapLines && rowDefs && numRows > 0) {
        const lineGapAvg = _tapeWrapLineGapAvgFromParams(renderParams);
        const ratio = (cellH0 * shrink) / (W / mo);
        const hIdeal = rowDefs.map(rd => ratio * (W / rd.cap));
        const stackIdeal = _tapeWrappedStackSum(hIdeal, lineGapAvg);
        const lambda = stackIdeal > 0 ? Math.min(1, maxStack / stackIdeal) : 1;
        const cellHList = hIdeal.map(h => h * lambda);
        const cellWList = rowDefs.map(rd => W / rd.cap);
        const cellFontList = cellHList.map((ch, r) => _tapeCellFontSize(ch, cellWList[r]));
        const stackH = lambda * stackIdeal;
        const graphH = H - bottomPad - stackH;
        const tapeBottomY = H - bottomPad;
        const tapeTopYs = [];
        let nextBottom = tapeBottomY;
        for (let r = numRows - 1; r >= 0; r--) {
            tapeTopYs[r] = nextBottom - cellHList[r];
            nextBottom = tapeTopYs[r];
            if (r > 0) nextBottom -= lineGapAvg * (cellHList[r - 1] + cellHList[r]) / 2;
        }
        const cw0 = cellWList[0];
        return {
            graphH,
            bottomPad,
            stackH,
            cellW: cw0,
            cellH: cellHList[0],
            cellFontSize: cellFontList[0],
            shrink,
            headBoxH: Math.round(cw0),
            headFontSize: Math.round(cw0 * 0.5),
            wrapLines,
            numRows,
            headMoving,
            wrapRows: rowDefs.map((rd, r) => ({
                start: rd.start,
                cap: rd.cap,
                cellW: cellWList[r],
                cellH: cellHList[r],
                cellFontSize: cellFontList[r],
                tapeTopY: tapeTopYs[r],
            })),
        };
    }

    const rowUnits = 1;
    const cellHDesired = cellH0 * shrink;
    const cellH = Math.max(0, Math.min(cellHDesired, maxStack / rowUnits));
    let cellFontSize = Math.round(cellH * 0.52);
    let cellW = Math.max(Math.round(cellFontSize * 1.9), Math.round(W / 30)) * shrink;

    if (headMoving) {
        if (L > 0) cellW = W / L;
        cellFontSize = _tapeCellFontSize(cellH, cellW);
    }

    const stackH = cellH * rowUnits;
    const graphH = H - bottomPad - stackH;

    const headFontSize = Math.round(cellW * 0.5);
    const headBoxH = Math.round(cellW * 1);

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
        numRows,
        headMoving,
        wrapRows: null,  // 非分行路径不使用
    };
}

/**
 * 视觉分组渲染到画布：几何与 graph.js 的 updateGraphVisualGroupRects 一致（圆盘并集、对数 pad），
 * 颜色为 hsla(hue,50%,52%,0.26) / hsla(hue,65%,28%,0.45)，组名为白字；须先于边、节点绘制。
 */
function drawRenderGraphGroupsOnCanvas(ctx, snapGraph, toScreen, vr, gs) {
    if (typeof graphVisualGroups === 'undefined' || !graphVisualGroups.length) return;
    const floor = typeof graph_group_pad_floor !== 'undefined' ? graph_group_pad_floor : 5;
    const logA = typeof graph_group_pad_log_a !== 'undefined' ? graph_group_pad_log_a : 45;
    const logB = typeof graph_group_pad_log_b !== 'undefined' ? graph_group_pad_log_b : 8;

    const nameToNode = new Map();
    snapGraph.forEach(n => {
        if (n && n.name) nameToNode.set(n.name, n);
    });

    const padForCount = n => Math.max(floor, logA - logB * Math.log(n)) * gs;
    const rx = 14 * gs;

    graphVisualGroups.forEach((g, gi) => {
        const mems = g.members instanceof Set ? g.members : (Array.isArray(g.members) ? g.members : []);
        let uminX = Infinity, uminY = Infinity, umaxX = -Infinity, umaxY = -Infinity;
        let cnt = 0;
        const consider = rawName => {
            const node = nameToNode.get(rawName);
            if (!node || !node.visible || !node.name || node.name.startsWith('self-connection')) return;
            const p = toScreen(node.pos);
            cnt++;
            uminX = Math.min(uminX, p[0] - vr);
            umaxX = Math.max(umaxX, p[0] + vr);
            uminY = Math.min(uminY, p[1] - vr);
            umaxY = Math.max(umaxY, p[1] + vr);
        };
        mems.forEach(consider);
        if (cnt === 0) return;

        let hue = g.hue;
        if (typeof hue !== 'number' || !Number.isFinite(hue))
            hue = (gi * 47) % 360;

        const pad = padForCount(cnt);
        const gx = uminX - pad;
        const gy = uminY - pad;
        const gw = umaxX - uminX + 2 * pad;
        const gh = umaxY - uminY + 2 * pad;
        const titleCx = (uminX + umaxX) * 0.5;
        const rCorner = Math.min(rx, gw / 2, gh / 2);

        ctx.save();
        ctx.fillStyle = `hsla(${hue}, 50%, 52%, 0.26)`;
        ctx.strokeStyle = `hsla(${hue}, 65%, 28%, 0.45)`;
        ctx.lineWidth = 1.2 * gs;
        _renderCanvasRoundRectPath(ctx, gx, gy, gw, gh, rCorner);
        ctx.fill();
        ctx.stroke();

        const nm = (g.name && String(g.name).trim()) ? String(g.name).trim() : '';
        if (nm) {
            ctx.fillStyle = '#ffffff';
            ctx.font = `600 ${Math.max(1, Math.round(11 * gs))}px system-ui,sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(nm, titleCx, gy - 6 * gs);
        }
        ctx.restore();
    });
}

function _renderCanvasRoundRectPath(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, w, h, r);
        return;
    }
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function cubicBezierPoint2D(p0, p1, p2, p3, t) {  // 三次贝塞尔 B(t)采样。起点P0，终点P3，控制点 P1、P2（与 canvas bezierCurveTo 一致）。用于自环尺寸估计
    const u = 1 - t;
    const uu = u * u, tt = t * t;
    const b0 = uu * u, b1 = 3 * uu * t, b2 = 3 * u * tt, b3 = tt * t;
    return [
        b0 * p0[0] + b1 * p1[0] + b2 * p2[0] + b3 * p3[0],
        b0 * p0[1] + b1 * p1[1] + b2 * p2[1] + b3 * p3[1],
    ];
}

// ── Draw one render frame ─────────────────────────────────────────────
function drawRenderFrame(ctx, renderParams, snapGraph, frame, nodeBrightness, edgeBrightness, tapeForFrame) {
    const W = renderParams.width, H = renderParams.height;

    // ── Background ───────────────────────────────────────────────────
    ctx.fillStyle = 'hsl(0,0%,60%)';  // matches graph-panel background
    ctx.fillRect(0, 0, W, H);

    const hist = window._renderHistory;
    let logicalStep;
    if (hist && frame && frame.historyIndex < hist.length) {
        const row = hist[frame.historyIndex];
        if (row && row.length > 0) logicalStep = row[0];
    }

    if (!tapeForFrame || !Array.isArray(tapeForFrame)) {
        drawGraphOnCanvas(ctx, snapGraph, W, H, nodeBrightness, edgeBrightness, renderParams, logicalStep);
        return;
    }

    const geom = layoutRenderTapeGeometry(renderParams, tapeForFrame, W, H);
    drawGraphOnCanvas(ctx, snapGraph, W, geom.graphH, nodeBrightness, edgeBrightness, renderParams, logicalStep);
    const smoothTapeCameraPos = (renderParams.movementMode === 'headRecenter')
        ? frame.cameraPos
        : undefined;
    drawTapeOnCanvas(ctx, renderParams, tapeForFrame, frame.headPos, frame.currentState, W, H, geom, smoothTapeCameraPos);
}

function drawGraphOnCanvas(ctx, snapGraph, W, H, nodeBrightness, edgeBrightness, renderParams, logicalStep) {
    if (!snapGraph || snapGraph.length === 0) return;

    const pointsForCalculatingBoundingBox = [];  // 用于计算边界框的点的数组
    snapGraph.forEach(node => {  // 遍历所有点（包括普通点和用于绘制自环的虚拟点）
        if (node.name.startsWith('self-connection')) {  // 是自环虚拟点
            const pi = node.selfLoopAnchorIndex;
            const parent = pi != null ? snapGraph[pi] : null;
            const a = parent.pos;
            const b = node.pos;
            const v = vector_subtract(b, a);
            const ang = self_connection_angle;
            const c1 = vector_rotate(v, ang * 0.5);
            const c2 = vector_rotate(v, -ang * 0.5);
            const p1 = vector_plus(a, c1);
            const p2 = vector_plus(a, c2);
            pointsForCalculatingBoundingBox.push(  // 采样三个点加进数组
                cubicBezierPoint2D(a, p1, p2, a, 0.25),
                cubicBezierPoint2D(a, p1, p2, a, 0.5),
                cubicBezierPoint2D(a, p1, p2, a, 0.75)
            );
            return;
        }
        else  // 是普通点
            pointsForCalculatingBoundingBox.push(node.pos);  // 直接加进数组
    });

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    pointsForCalculatingBoundingBox.forEach(p => {
        minX = Math.min(minX, p[0]);
        minY = Math.min(minY, p[1]);
        maxX = Math.max(maxX, p[0]);
        maxY = Math.max(maxY, p[1]);
    });

    let graphRel = parseFloat(renderParams.graphRelativeMargin);
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

    const gs  = renderParams.graphicScale ? renderParams.graphicScale : 1.0;
    const vr  = vertex_r * gs;          // scaled node radius
    const ahL = arrow_head_length * gs; // scaled arrowhead length
    const ahW = arrow_head_width  * gs; // scaled arrowhead width
    const fontSize   = Math.round(12 * gs);
    const lineWidth  = 1.2 * gs;

    drawRenderGraphGroupsOnCanvas(ctx, snapGraph, toScreen, vr, gs);

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

    // 绘制步编号
    if (renderParams.showStepNumber && logicalStep !== undefined && logicalStep !== null) {
        const pad = Math.max(8, Math.round(Math.min(W, H) * 0.018));
        const fontPx = Math.max(14, Math.round(Math.min(W, H) * 0.038));  // 步数文本字号
        const text = String(logicalStep);
        ctx.save();
        ctx.font = `400 ${fontPx}px system-ui, sans-serif`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = '#000';
        ctx.fillText(text, W - pad, H - pad);
        ctx.restore();
    }
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
function _drawTapeRowCells(ctx, tape, tapeTopY, tapeCenterY, cellW, cellH, cellFontSize, tapeCenterOffset, W, clipRow, horizontalShift = 0, extraHPad = 0) {
    const effOff = tapeCenterOffset + horizontalShift;
    const pad = Math.min(W * 2, Math.ceil(Math.abs(effOff)) + Math.ceil(cellW) * 6 + extraHPad);
    ctx.fillStyle = 'hsl(0,0%,98%)';
    ctx.fillRect(-pad, tapeTopY, W + 2 * pad, cellH);
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
            const cx = effOff + li * cellW;
            drawOneCell(cx, ci);
        }
    } else if (!clipRow) {
        const startCell = Math.floor(-effOff / cellW) - 1;
        const endCell   = Math.ceil((W - effOff) / cellW) + 1;
        for (let ci = startCell; ci < endCell; ci++) {
            const cx = effOff + ci * cellW;
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

function drawTapeOnCanvas(ctx, renderParams, tape, headPos, currentState, W, H, geom, smoothTapeCameraPos) {
    if (!geom) return;

    const { graphH, cellW, cellH, cellFontSize, headBoxH, headFontSize, wrapLines, headMoving, wrapRows } = geom;
    const L = tape.length;
    const headIdx = L === 0 ? 0 : Math.max(0, Math.min(headPos, L - 1));

    let headCellW, headBH, headFs, tapeCenterY, headScreenX, headBoxY;

    if (wrapLines && wrapRows && wrapRows.length > 0) {
        let headRow = wrapRows.length - 1;
        for (let r = 0; r < wrapRows.length; r++) {
            const { start, cap } = wrapRows[r];
            if (headIdx >= start && headIdx < start + cap) {
                headRow = r;
                break;
            }
        }
        const hr = wrapRows[headRow];
        for (const row of wrapRows) {
            const yc = row.tapeTopY + row.cellH / 2;
            _drawTapeRowCells(ctx, tape, row.tapeTopY, yc, row.cellW, row.cellH, row.cellFontSize, 0, W,
                { start: row.start, len: row.cap }, 0, 0);
        }
        headCellW = hr.cellW;
        headFs = Math.round(headCellW * 0.5);
        headBH = Math.round(headCellW * 1);
        tapeCenterY = hr.tapeTopY + hr.cellH / 2;
        headScreenX = (headIdx - hr.start) * headCellW + headCellW / 2;
        headBoxY = hr.tapeTopY - headBH;
    } else {
        const tapeTopY = graphH;
        tapeCenterY = graphH + Math.round(cellH / 2);
        headBoxY = graphH - headBoxH;
        const isHeadRecenter = renderParams.movementMode === 'headRecenter';
        const tapeHp = isHeadRecenter && smoothTapeCameraPos != null ? smoothTapeCameraPos : headPos;
        let tapeCenterOffset = headMoving
            ? W / 2 - (tape.length / 2) * cellW
            : W / 2 - tapeHp * cellW - cellW / 2;
        headScreenX = headMoving
            ? tapeCenterOffset + headPos * cellW + cellW / 2
            : (isHeadRecenter ? tapeCenterOffset + headPos * cellW + cellW / 2 : W / 2);
        const lagPad = isHeadRecenter && smoothTapeCameraPos != null
            ? Math.ceil(Math.abs(headPos - smoothTapeCameraPos) * cellW) + Math.ceil(cellW * 2)
            : 0;
        _drawTapeRowCells(ctx, tape, tapeTopY, tapeCenterY, cellW, cellH, cellFontSize, tapeCenterOffset, W, null, 0, lagPad);
        headCellW = cellW;
        headFs = headFontSize;
        headBH = headBoxH;
    }

    const headBoxW = _measureTapeHeadLabelMaxWidth(ctx, headFs) + 0.6 * headCellW;
    _drawTapeReadHead(ctx, headScreenX, tapeCenterY, headBoxY, headBoxW, headBH, headCellW, headFs, currentState);
}
