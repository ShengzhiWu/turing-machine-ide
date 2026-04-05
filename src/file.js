// ── File I/O & project serialisation ────────────────────────────────
// 依赖：i18n.js（t()）以及全局变量
//   graph, tape, start_position, max_steps_input,
//   code_editor, code_editor_value, style_editor, result_table_style,
//   output_filter, tail_steps, example, codeModified, styleModified,
//   examples, language
// 依赖函数：normalizeTape(), parseStyleCode(), refresh_graph_embedding(), run_program()
//
// i18n.js 中需补充以下 key（供"未保存修改"弹窗使用）：
//   unsavedTitle   — 弹窗标题，例："未保存的修改" / "Unsaved Changes"
//   unsavedMessage      — 打开/拖入文件前
//   unsavedCloseMessage — 关闭窗口前
//   unsavedSave    — 保存按钮，例："保存" / "Save"
//   unsavedDiscard — 不保存按钮，例："不保存" / "Don't Save"
//   unsavedCancel  — 取消按钮，例："取消" / "Cancel"

// ── Title / dirty-state management ──────────────────────────────────

var _currentFilePath = null;   // 当前文件完整路径（用于 Ctrl+S 直接覆写），null 表示新建/未命名
var _currentFileName = null;   // 仅文件名部分（用于标题显示）
var _isDirty = false;          // 是否有未保存的修改

const APP_NAME = 'Turing Machine IDE';

function _sendTitle() {
    const { ipcRenderer } = require('electron');
    let title = APP_NAME;
    if (_currentFileName) {
        title += ' — ' + _currentFileName;
        if (_isDirty) title += ' ●';
    }
    ipcRenderer.send('set-title', title);
}

/** 标记有未保存修改（供外部调用） */
function markDirty() {
    if (_isDirty) return;
    _isDirty = true;
    _sendTitle();
}

/**
 * 保存/载入后清除修改标记。
 * @param {string|null} filePath  完整路径；传 null 表示清除路径（切换样例等场景）；
 *                                传 undefined 表示不更新路径（仅清除 dirty 标记）。
 */
function markClean(filePath) {
    if (filePath !== undefined) {
        _currentFilePath = filePath;
        _currentFileName = filePath ? filePath.split(/[\\/]/).pop() : null;
    }
    _isDirty = false;
    _sendTitle();
}

// ── 键盘快捷键 ───────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
    if ((e.key === 's' || e.key === 'S') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.shiftKey) {
            saveProjectAs();   // Ctrl+Shift+S → 另存为
        } else {
            saveProject();     // Ctrl+S → 保存（有路径则直接覆写）
        }
    }
    if ((e.key === 'o' || e.key === 'O') && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        openProject();         // Ctrl+O → 打开项目
    }
});

// ── Graph embedding helpers ──────────────────────────────────────────

function getGraphEmbedding() {
    if (typeof graph === 'undefined') return {};
    const result = {};
    graph.forEach(node => { result[node[0]] = [...node[1]]; });
    return result;
}

function applyGraphEmbedding(embedding) {
    if (typeof graph === 'undefined' || typeof embedding !== 'object' || Array.isArray(embedding)) return;
    graph.forEach(node => {
        if (embedding[node[0]]) node[1] = [...embedding[node[0]]];
    });
}

function getGraphPinnedState() {
    if (typeof graph === 'undefined') return {};
    const o = {};
    graph.forEach(node => { o[node[0]] = !!node._pinned; });
    return o;
}

/** @param {object|boolean[]|undefined} pinned  按节点 id 的布尔表，或与 graph 等长的布尔数组（旧格式） */
function applyGraphPinned(pinned) {
    if (typeof graph === 'undefined' || pinned == null) return;
    if (Array.isArray(pinned)) {
        graph.forEach((node, i) => {
            node._pinned = !!pinned[i];
        });
        return;
    }
    if (typeof pinned !== 'object') return;
    graph.forEach(node => {
        node._pinned = Object.prototype.hasOwnProperty.call(pinned, node[0])
            ? !!pinned[node[0]]
            : false;
    });
}

// ── Tape helper ──────────────────────────────────────────────────────

function getTapeInitial() {
    if (typeof tape === 'undefined') return [];
    const t = [...tape];
    while (t.length > 0 && t[t.length - 1] === '') t.pop();
    return t;
}

// ── JSON builders ────────────────────────────────────────────────────

async function buildProjectJSON() {  // 构建工程 JSON 对象
    const obj = {
        version: '1.0',
        code:      (typeof code_editor_value !== 'undefined') ? code_editor_value : '',
        style:     (typeof style_editor      !== 'undefined') ? style_editor.value : '',
        embedding: getGraphEmbedding(),
        "graph-pinned": getGraphPinnedState(),
        tape:      getTapeInitial(),
        "start-position": start_position,
        "max-steps": parseInt(max_steps_input.value),
        "output-filter": document.getElementById('result-filter-select').value,
        "tail-steps": parseInt(document.getElementById('tail-steps-select').value),
        "minimal-mode": document.getElementById('minimal-mode-checkbox').checked,
        "pixel-scale-x": parseInt(document.getElementById('pixel-scale-x-input').value),
        "pixel-scale-y": parseInt(document.getElementById('pixel-scale-y-input').value)
    };

    // ── 读取渲染设置（Electron 环境）────────────────────────────────
    try {
        const { ipcRenderer } = require('electron');
        const renderParams = await ipcRenderer.invoke('get-render-params');  // 获取渲染设置
        if (renderParams && typeof renderParams === 'object') {
            obj["render-settings"] = renderParams;
        }
    } catch (e) {
        // 非 Electron 环境或读取失败时静默跳过
        console.warn('[file.js] get-render-params failed, skipping render settings:', e);
    }

    return obj;
}

function buildEmbeddingJSON() {
    return {
        version: '1.0',
        embedding: getGraphEmbedding(),
    };
}

// ── Low-level file save / open (Electron IPC + browser fallback) ─────

/**
 * 弹出另存为对话框，保存成功后调用 markClean(完整路径)。
 * @param {object} obj        要序列化的 JSON 对象
 * @param {string} defaultName  对话框默认文件名
 */
async function saveJSONFileAs(obj, defaultName) {
    const json = JSON.stringify(obj, null, 2);

    try {
        const { ipcRenderer } = require('electron');
        const savedPath = await ipcRenderer.invoke('save-file', { defaultName, content: json });
        if (savedPath) markClean(savedPath);
        return;
    } catch (_) {}

    // Browser fallback: <a download>（无法拿到真实路径，仅清 dirty）
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = defaultName;
    a.click();
    URL.revokeObjectURL(url);
    markClean(undefined);  // 路径未知，仅清 dirty
}

/**
 * 直接覆写到指定路径，保存成功后调用 markClean。
 * @param {object} obj
 * @param {string} filePath  完整文件路径
 */
async function saveJSONFileToPath(obj, filePath) {
    const json = JSON.stringify(obj, null, 2);

    try {
        const { ipcRenderer } = require('electron');
        const ok = await ipcRenderer.invoke('save-file-to-path', { filePath, content: json });
        if (ok) markClean(filePath);
    } catch (_) {
        // 回退到另存为
        await saveJSONFileAs(obj, filePath.split(/[\\/]/).pop());
    }
}

function openJSONFile(callback) {
    // Electron nodeIntegration path
    try {
        const { ipcRenderer } = require('electron');
        ipcRenderer.invoke('open-file').then(result => {
            if (result) callback(JSON.parse(result.content), result.path);
        });
        return;
    } catch (_) {}

    // Electron legacy electronAPI path
    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.openFile) {
        window.electronAPI.openFile().then(result => {
            if (result) callback(JSON.parse(result), null);
        });
        return;
    }

    // Browser fallback: <input type=file>
    const input = document.createElement('input');
    input.type   = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', () => {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            try {
                callback(JSON.parse(e.target.result), null);  // 浏览器拿不到真实路径
            } catch(err) {
                alert('Failed to parse JSON: ' + err.message);
            }
        };
        reader.readAsText(file);
    });
    input.click();
}

// ── Menu actions: save / open / load example ─────────────────────────

/** 保存：有已知路径则直接覆写，否则弹另存为对话框 */
async function saveProject() {
    const obj = await buildProjectJSON();
    if (_currentFilePath) {
        await saveJSONFileToPath(obj, _currentFilePath);
    } else {
        await saveJSONFileAs(obj, 'project.json');
    }
}

/** 另存为：始终弹对话框，保存后更新当前路径 */
async function saveProjectAs() {
    const obj = await buildProjectJSON();
    await saveJSONFileAs(obj, _currentFileName || 'project.json');
}

function saveEmbedding() {
    saveJSONFileAs(buildEmbeddingJSON(), 'embedding.json');
}

async function openProject() {
    if (!(await _confirmUnsavedChanges())) return;
    openJSONFile((obj, fileName) => {
        loadProjectFromObject(obj, fileName);
    });
}

/**
 * 若有未保存修改则弹窗（与主进程 confirm-unsaved 一致）：保存 / 不保存 / 取消。
 * @param {string} [message]  不传则使用 t('unsavedMessage')（打开文件等场景）
 * @returns {Promise<boolean>}  true 表示可继续（无修改、已保存、或不保存）；false 表示取消
 */
async function _confirmUnsavedChanges(message) {
    const msg = message !== undefined && message !== null ? message : t('unsavedMessage');
    if (!_isDirty) return true;

    let choice = 'discard';  // 浏览器环境默认直接丢弃
    try {
        const { ipcRenderer } = require('electron');
        choice = await ipcRenderer.invoke('confirm-unsaved', {
            title:   t('unsavedTitle'),
            message: msg,
            save:    t('unsavedSave'),
            discard: t('unsavedDiscard'),
            cancel:  t('unsavedCancel'),
        });
    } catch (_) {
        // 非 Electron 环境：用 confirm 模拟（只有保留/丢弃两种结果）
        const ok = window.confirm(msg);
        choice = ok ? 'discard' : 'cancel';
    }

    if (choice === 'cancel') return false;
    if (choice === 'save') {
        await saveProject();
        if (_isDirty) return false;
    }
    return true;
}

async function loadProjectFromObject(obj, fileName) {
    if (!obj || !obj.version) { alert('Invalid project file.'); return; }

    // 恢复代码
    if (typeof obj.code === 'string') {
        code_editor.value = obj.code;
        code_editor_value = obj.code;
    }
    // 恢复样式代码
    if (typeof obj.style === 'string') {
        style_editor.value = obj.style;
        result_table_style = parseStyleCode(obj.style);
    }

    // 恢复图嵌入（先刷新图结构，再覆盖坐标与固定状态）
    refresh_graph_embedding(false, false);
    if (obj.embedding) applyGraphEmbedding(obj.embedding);
    if (obj["graph-pinned"] !== undefined) applyGraphPinned(obj["graph-pinned"]);

    // 恢复纸带
    start_position = 0;
    if (Array.isArray(obj.tape)) tape = normalizeTape([...obj.tape]);

    if (typeof obj["start-position"] === 'number') start_position = obj["start-position"];
    if (typeof obj["max-steps"] === 'number') max_steps_input.value = obj["max-steps"];
    if (obj["output-filter"] !== undefined) {
        const sel = document.getElementById('result-filter-select');
        const known = sel ? Array.from(sel.options).map(o => o.value) : [];
        output_filter = known.includes(obj["output-filter"]) ? obj["output-filter"] : "only-changes";
        if (sel) sel.value = output_filter;
    }
    if (typeof obj["tail-steps"] === 'number') {
        const sel = document.getElementById('tail-steps-select');
        const known = sel ? Array.from(sel.options).map(o => parseInt(o.value)) : [];
        tail_steps = known.includes(obj["tail-steps"]) ? obj["tail-steps"] : 1;
        if (sel) sel.value = tail_steps;
    }
    if (typeof obj["minimal-mode"] === 'boolean') document.getElementById('minimal-mode-checkbox').checked = obj["minimal-mode"];
    if (typeof obj["pixel-scale-x"] === 'number') document.getElementById('pixel-scale-x-input').value = obj["pixel-scale-x"];
    if (typeof obj["pixel-scale-y"] === 'number') document.getElementById('pixel-scale-y-input').value = obj["pixel-scale-y"];

    // ── 恢复渲染设置（旧文件中无此字段时静默跳过）──────────────────
    if (obj["render-settings"] !== undefined &&
        obj["render-settings"] !== null &&
        typeof obj["render-settings"] === 'object') {
        try {
            const { ipcRenderer } = require('electron');
            await ipcRenderer.invoke('set-render-params', obj["render-settings"]);
        } catch (e) {
            console.warn('[file.js] set-render-params failed, skipping render settings restore:', e);
        }
    }

    // 标记已保存，记录完整路径（供后续 Ctrl+S 直接覆写）
    markClean(fileName);  // fileName 可能是完整路径，也可能为 null（浏览器回退读取）

    // 重新运行
    run_program();
}

function loadExample(key) {
    const lang = (typeof language !== 'undefined') ? language : 'en';
    const ex = examples[key];
    example = key;  // 记录当前样例

    // 载入推荐最大步数
    if (ex["recommended-max-steps"])
        max_steps_input.value = ex["recommended-max-steps"];

    // 载入过滤器模式
    if (ex["output-filter"] !== undefined) {
        output_filter = ex["output-filter"];
        const sel = document.getElementById('result-filter-select');
        if (sel) sel.value = output_filter;
    }

    // 载入图灵机代码
    const code = ex['code'][lang] || ex['code']['en'];
    code_editor_value = code;
    code_editor.value = code;

    // 载入样式代码
    const styleCode = ex['style'][lang] || ex['style']['en'];
    style_editor.value = styleCode;
    result_table_style = parseStyleCode(styleCode);

    // 载入纸带初值
    start_position = 0;
    tape = normalizeTape([...ex['tapes'][0]]);

    // 刷新有向图（不沿用上一文件的节点固定状态）
    refresh_graph_embedding(false, false);

    // 若有预设嵌入坐标则应用
    if (ex['embedding'] !== undefined) {
        applyGraphEmbedding(ex['embedding']);
    }

    // 运行程序
    if (typeof run_program === 'function') run_program();

    // 重置修改标记
    codeModified = false;
    styleModified = false;

    // 切换样例视为新的未命名状态，清除已知文件路径
    markClean(null);
}

// ── Dirty 事件绑定（DOM 加载完成后执行）─────────────────────────────
// 监听所有会产生"未保存修改"的控件，触发时调用 markDirty()。
// file.js 在 index.html 里被 <script src> 引入，此时 DOM 已就绪，可直接绑定。

(function bindDirtyListeners() {
    // 1. 代码编辑器（CodeMirror 自定义元素，监听其 change 事件）
    //    index.html 里 code_editor 是 <colormap-editor> 同类自定义元素，
    //    用 'input' 兼容各种编辑器组件。
    const codeEl = document.getElementById('code-editor');
    if (codeEl) {
        codeEl.addEventListener('input',  markDirty);
        codeEl.addEventListener('change', markDirty);
    }

    // 2. 样式编辑器
    const styleEl = document.getElementById('style-textarea');
    if (styleEl) {
        styleEl.addEventListener('input',  markDirty);
        styleEl.addEventListener('change', markDirty);
    }

    // 3. 运行参数：最大步数、过滤模式、末尾步数、极简模式、缩放
    ['max-steps-input',
     'result-filter-select',
     'tail-steps-select',
     'minimal-mode-checkbox',
     'pixel-scale-x-input',
     'pixel-scale-y-input'
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', markDirty);
    });

    // 4. 纸带编辑：纸带单元格是动态生成的，用事件委托监听整个 tape-panel
    const tapePanel = document.getElementById('tape-panel');
    if (tapePanel) {
        tapePanel.addEventListener('input',  markDirty);
        tapePanel.addEventListener('change', markDirty);
    }

    // 5. 渲染设置变化（主进程通过 render-params-changed 转发到主窗口）
    try {
        const { ipcRenderer } = require('electron');
        ipcRenderer.on('render-params-changed', markDirty);
        // 6. 关闭主窗口前：与打开文件相同的未保存确认流程
        ipcRenderer.on('request-close-confirm', async () => {
            if (await _confirmUnsavedChanges(t('unsavedCloseMessage'))) {
                ipcRenderer.send('main-window-close-allowed');
            }
        });
    } catch (_) {
        // 纯浏览器：用原生离开页面前提示
        window.addEventListener('beforeunload', e => {
            if (!_isDirty) return;
            e.preventDefault();
            e.returnValue = '';
        });
    }
})();

// ── Drag & Drop: 将工程 JSON 文件拖入窗口直接打开 ─────────────────────
(function bindProjectDropOpen() {
    const dropOverlay = document.getElementById('file-drop-overlay');
    let dragDepth = 0;

    function _containsFiles(dt) {
        if (!dt || !dt.types) return false;
        return Array.from(dt.types).includes('Files');
    }

    function _setDropOverlayVisible(visible) {
        if (!dropOverlay) return;
        dropOverlay.classList.toggle('visible', !!visible);
    }

    function _isJsonName(name) {
        return typeof name === 'string' && /\.json$/i.test(name);
    }

    async function _loadDroppedFile(file) {
        let text = null;
        let fullPath = null;

        try {
            if (file && typeof file.path === 'string' && file.path) {
                const fs = require('fs');
                text = fs.readFileSync(file.path, 'utf8');
                fullPath = file.path;
            }
        } catch (_) {}

        if (text === null && file && typeof file.text === 'function') {
            text = await file.text();
        }

        if (typeof text !== 'string') {
            alert('Failed to read file.');
            return;
        }

        try {
            const obj = JSON.parse(text);
            await loadProjectFromObject(obj, fullPath);
        } catch (err) {
            alert('Failed to parse JSON: ' + err.message);
        }
    }

    window.addEventListener('dragenter', e => {
        if (!_containsFiles(e.dataTransfer)) return;
        dragDepth += 1;
        _setDropOverlayVisible(true);
    });

    window.addEventListener('dragover', e => {
        if (!_containsFiles(e.dataTransfer)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        _setDropOverlayVisible(true);
    });

    window.addEventListener('dragleave', e => {
        if (!_containsFiles(e.dataTransfer)) return;
        dragDepth = Math.max(0, dragDepth - 1);
        if (dragDepth === 0) _setDropOverlayVisible(false);
    });

    window.addEventListener('drop', async e => {
        if (!_containsFiles(e.dataTransfer)) return;
        e.preventDefault();
        dragDepth = 0;
        _setDropOverlayVisible(false);

        const files = e.dataTransfer.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        if (!_isJsonName(file.name)) {
            alert('Please drop a .json project file.');
            return;
        }

        if (!(await _confirmUnsavedChanges())) return;
        await _loadDroppedFile(file);
    });

    window.addEventListener('dragend', () => {
        dragDepth = 0;
        _setDropOverlayVisible(false);
    });
})();
