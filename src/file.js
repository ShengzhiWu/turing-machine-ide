// ── File I/O & project serialisation ────────────────────────────────
// 依赖：i18n.js（t()）以及全局变量
//   graph, tape, start_position, max_steps_input,
//   code_editor, code_editor_value, style_editor, result_table_style,
//   output_filter, tail_steps, example, codeModified, styleModified,
//   examples, language
// 依赖函数：normalizeTape(), parseStyleCode(), refresh_graph_embedding(), run_program()

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

// ── Tape helper ──────────────────────────────────────────────────────

function getTapeInitial() {
    if (typeof tape === 'undefined') return [];
    const t = [...tape];
    while (t.length > 0 && t[t.length - 1] === '') t.pop();
    return t;
}

// ── JSON builders ────────────────────────────────────────────────────

/**
 * 构建工程 JSON 对象。
 * 若 electronAPI.getRenderParams 可用，会异步读取渲染设置并合并进去；
 * 否则仍正常返回（不含渲染设置字段）。
 * 返回值：Promise<object>
 */
async function buildProjectJSON() {
    const obj = {
        version: '1.0',
        code:      (typeof code_editor_value !== 'undefined') ? code_editor_value : '',
        style:     (typeof style_editor      !== 'undefined') ? style_editor.value : '',
        embedding: getGraphEmbedding(),
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
        const renderParams = await ipcRenderer.invoke('get-render-params');
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

function saveJSONFile(obj, defaultName) {
    const json = JSON.stringify(obj, null, 2);

    // Electron IPC path
    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.saveFile) {
        window.electronAPI.saveFile({ defaultName, content: json });
        return;
    }

    // Browser fallback: <a download>
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = defaultName;
    a.click();
    URL.revokeObjectURL(url);
}

function openJSONFile(callback) {
    // Electron IPC path
    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.openFile) {
        window.electronAPI.openFile().then(result => {
            if (result) callback(JSON.parse(result));
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
                callback(JSON.parse(e.target.result));
            } catch(err) {
                alert('Failed to parse JSON: ' + err.message);
            }
        };
        reader.readAsText(file);
    });
    input.click();
}

// ── Menu actions: save / open / load example ─────────────────────────

async function saveProject() {
    const obj = await buildProjectJSON();
    saveJSONFile(obj, 'project.json');
}

function menuSaveEmbedding() {
    saveJSONFile(buildEmbeddingJSON(), 'embedding.json');
}

function openProject() {
    openJSONFile(async obj => {
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

        // 恢复图嵌入（先刷新图结构，再覆盖坐标）
        refresh_graph_embedding();
        if (obj.embedding) applyGraphEmbedding(obj.embedding);

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

        // 重新运行
        run_program();
    });
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

    // 刷新有向图
    refresh_graph_embedding();

    // 若有预设嵌入坐标则应用
    if (ex['embedding'] !== undefined) {
        applyGraphEmbedding(ex['embedding']);
    }

    // 运行程序
    if (typeof run_program === 'function') run_program();

    // 重置修改标记
    codeModified = false;
    styleModified = false;
}
