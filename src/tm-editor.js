// ════════════════════════════════════════════════════════════
// tm-editor.js — <tm-editor> 自定义元素
//
// 属性：
//   lang="zh" | "en"   语言（默认 en；不支持的语言回退到 en）
//   value               初始内容（attribute 或 property）
//
// Property（JS）：
//   el.value            读写编辑器内容
//   el.lang             读写语言
//   el.errorCount       只读，当前错误数
//
// 事件（在元素上监听）：
//   "tm-change"              内容变化时，detail: { value, errorCount, changedLines }
//                            changedLines: [{ line: number, content: string }, ...]
//   "tm-errors"              错误数量变化时，detail: { errorCount, errors }
//   "tm-run"                 用户按下 F5 时，detail: { value, errorCount }
//   "tm-cursor-line-change"  光标跨行时，detail: { line: number, content: string }
// ════════════════════════════════════════════════════════════

// ── 多语言文本 ──
const LOCALES = {
    zh: {
        formatLabels: ['状态', '记号', '修改后的记号', '移动', '新状态（可省略）'],
        statusHint:   '💡 每行一条五元组图灵机指令 | 用other表示其他的纸带记号 | 按F4刷新图 | 按F5执行程序',
        noErrors:     '无错误',
        errorCount:   n => `错误: ${n}`,
        placeholder:  '输入如: q0, "1", "X", R, q1  // 注释',
        errors: {
            state:       '状态名不能为空，至少需要一个非空字符',
            symbol:      '第2元必须是双引号括起的字符串（如 "0"）或关键字 other',
            write:       '第3元必须是双引号括起的字符串（如 "X"）或 N',
            move:        '第4元必须是 L（左移）、R（右移）或 N（不移动）',
            extra:       '超出五元组，多余的元素',
            missing:     '此处缺少元素',
            end_state:   '第1元不能是 end（end 是终止状态，不能作为当前状态发出转移规则）',
            error_state: '第1元不能是 error（error 是错误终止状态，不能作为当前状态发出转移规则）',
            start_new:   '第5元不能是 start（start 是初始状态，不能作为目标状态）',
            duplicate:   '与另一行的前两个元素（状态 + 记号）完全相同，图灵机中此组合只能有一条规则',
            fallback:    '语法错误',
        },
        hints: {
            move: { L: '（左移）', R: '（右移）', N_move: '（不动）', N_write: '（不修改）' },
        },
    },
    en: {
        formatLabels: ['State', 'Symbol', 'Write', 'Move', 'New state (optional)'],
        statusHint:   '💡 Each line is a quintuple Turing machine instruction | Use "other" for other tape symbols | Press F4 to refresh the graph | Press F5 to run the program',
        noErrors:     'No errors',
        errorCount:   n => `Errors: ${n}`,
        placeholder:  'e.g. q0, "1", "X", R, q1  // comment',
        errors: {
            state:       'State name cannot be empty',
            symbol:      'Element 2 must be a quoted string (e.g. "0") or the keyword "other"',
            write:       'Element 3 must be a quoted string (e.g. "X") or N (no write)',
            move:        'Element 4 must be L (left), R (right), or N (no move)',
            extra:       'Extra element beyond the quintuple',
            missing:     'Missing element here',
            end_state:   'Element 1 cannot be "end" (end is a terminal state and cannot issue transitions)',
            error_state: 'Element 1 cannot be "error" (error is a terminal state and cannot issue transitions)',
            start_new:   'Element 5 cannot be "start" (start is the initial state and cannot be a transition target)',
            duplicate:   'Another rule has the same (state, symbol) pair — only one rule per combination is allowed',
            fallback:    'Syntax error',
        },
        hints: {
            move: { L: '(left)', R: '(right)', N_move: '(no move)', N_write: '(no write)' },
        },
    },
};

// ── Shadow DOM 内的 CSS ──
const SHADOW_CSS = `
:host {
    display: block;
    width: 100%;
    height: 100%;
    font-size: 13px; /* 统一基准：外部改这一个值即可缩放整个编辑器 */
    font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace;
}
*, *::before, *::after { box-sizing: border-box; }

.editor-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: #1e2434;
    display: flex; flex-direction: column;
    border-radius: 1.5em; overflow: hidden;
    box-shadow: 0 20px 40px rgba(0,0,0,0.6), 0 0 0 2px #3d4459 inset;
}
.format-bar {
    background: #2a3145; padding: 0.75em 0.5em; border-bottom: 2px solid #0b0f1a;
    font-size: 1em; line-height: 1.7; display: flex; gap: 0.25em;
    color: #b7c4e0; user-select: none; flex-shrink: 0;
}
.format-item { padding: 0 0.25em; border-radius: 0.375em; transition: background-color 0.15s; }
.format-item.active { background-color: rgba(255,255,255,0.15); box-shadow: 0 0 0 1px rgba(255,255,255,0.2); }
.format-comma { color: #ffd966; font-weight: bold; margin: 0 0.25em; }

.code-wrapper { display: flex; flex: 1; min-height: 0; background: #171c2b; overflow: hidden; }
.line-numbers {
    background: #1a1f30; padding: 1.5em 0 1.5em 1em; text-align: right;
    color: #5d6b93; font-size: 1em; line-height: 1.7; user-select: none;
    border-right: 1px solid #2f384f; min-width: 3.75em; flex-shrink: 0; overflow: hidden;
}
.line-numbers div { padding-right: 0.75em; }
.editor-area { position: relative; flex-grow: 1; min-width: 0; overflow: hidden; }

pre.highlight-layer {
    position: absolute; top: 0; left: 0; margin: 0; padding: 1.5em 1.75em;
    font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace;
    font-size: 1em; line-height: 1.7; white-space: pre;
    pointer-events: none; overflow: visible; z-index: 1;
}
/* 每行高亮内容包在一个 block span 里，与 textarea 行对齐 */
pre.highlight-layer > span { display: block; }
textarea {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    padding: 1.5em 1.75em; margin: 0; border: none; background: transparent;
    color: transparent; caret-color: #f3f7ff;
    font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace;
    font-size: 1em; line-height: 1.7; white-space: pre;
    overflow: auto; resize: none; outline: none; z-index: 2;
    scrollbar-width: thin; scrollbar-color: #3d4a6b #171c2b;
}
textarea::selection { background: rgba(120,150,220,0.35); color: transparent; }
textarea::-webkit-scrollbar        { width: 8px; height: 8px; }
textarea::-webkit-scrollbar-track  { background: #171c2b; border-radius: 4px; }
textarea::-webkit-scrollbar-thumb  { background: #3d4a6b; border-radius: 4px; border: 2px solid #171c2b; }
textarea::-webkit-scrollbar-thumb:hover { background: #5a6a96; }
textarea::-webkit-scrollbar-corner { background: #171c2b; }

.token-pos-1, .format-pos-1 { color: #ffad66; }
.token-pos-2, .format-pos-2 { color: #73d0ff; }
.token-pos-3, .format-pos-3 { color: #c5a1ff; }
.token-pos-4, .format-pos-4 { color: #a3e0a1; }
.token-pos-5, .format-pos-5 { color: #ffa1c0; }
.token-keyword { color: #ffd966; }
.token-comma   { color: #ffd966; font-weight: bold; }
.token-comment { color: #6c7a9e; font-style: italic; }
.token-plain   { color: #d1dbf0; }
.token-error   { text-decoration: red wavy underline; text-decoration-skip-ink: none; text-underline-position: under; }
.token-match   { background: rgba(200,200,200,0.18); }

.suggestions {
    position: fixed; background: #262e42; border: 1px solid #4e5a7c;
    border-radius: 0.875em; box-shadow: 0 12px 28px rgba(0,0,0,0.7);
    max-height: 15em; overflow-y: auto; z-index: 9000;
    font-size: 0.9375em; min-width: 11em; padding: 0.5em 0; display: none;
    font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace;
    scrollbar-width: thin; scrollbar-color: #3d4a6b #262e42;
}
.suggestions::-webkit-scrollbar       { width: 6px; }
.suggestions::-webkit-scrollbar-track { background: #262e42; }
.suggestions::-webkit-scrollbar-thumb { background: #3d4a6b; border-radius: 3px; }
.suggestions div {
    padding: 0.625em 1.25em; color: #eef4ff; cursor: pointer;
    transition: background 0.1s; border-left: 3px solid transparent;
}
.suggestions div:hover, .suggestions div.selected { background: #3d4a6b; }

.error-tooltip {
    position: fixed; background: #44232e; border: 1px solid #ff6b7c;
    border-radius: 0.625em; padding: 0.5em 1em; color: #ffd6dc; font-size: 0.875em;
    max-width: 26em; box-shadow: 0 8px 20px rgba(0,0,0,0.6);
    z-index: 9999; pointer-events: none; display: none;
    font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace;
}
.info-bar {
    display: flex; justify-content: space-between; padding: 0.625em 1.5em;
    background: #1b2132; color: #a0b0d0; font-size: 0.8125em;
    border-top: 1px solid #2f384f; flex-shrink: 0;
}
.error-count { padding: 0.25em 0.75em; border-radius: 2em; }
.error-count.has-errors { background: #44232e; color: #ffa7b5; border-left: 3px solid #ff4d6d; }
.error-count.no-errors  { background: #1e3a2a; color: #7ee8a2; border-left: 3px solid #3ecf6e; }
`;

// ── 语法常量 ──
const ELEM_COLORS    = ['#ffad66', '#73d0ff', '#c5a1ff', '#a3e0a1', '#ffa1c0'];
const STATE_KEYWORDS = ['start', 'end', 'error'];

// ── 纯函数：解析 / 验证 / 高亮（不依赖 DOM） ──

function escapeHtml(s) {
    return s.replace(/[&<>"]/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[m]));
}

function lineStartOf(text, cursor) {
    let i = cursor;
    while (i > 0 && text[i - 1] !== '\n') i--;
    return i;
}

function parseLine(line) {
    let commentIdx = -1, inStr = false;
    for (let i = 0; i < line.length - 1; i++) {
        if (line[i] === '"') inStr = !inStr;
        if (!inStr && line[i] === '/' && line[i+1] === '/') { commentIdx = i; break; }
    }
    const code        = commentIdx === -1 ? line : line.slice(0, commentIdx);
    const commentPart = commentIdx === -1 ? ''   : line.slice(commentIdx);
    const elements = [];
    let cur = '', start = 0;
    inStr = false;
    for (let i = 0; i < code.length; i++) {
        if (code[i] === '"') inStr = !inStr;
        if (code[i] === ',' && !inStr) {
            elements.push({ raw: cur, trimmed: cur.trim(), start, end: i });
            cur = ''; start = i + 1;
        } else cur += code[i];
    }
    if (elements.length > 0 || cur.trim() !== '')
        elements.push({ raw: cur, trimmed: cur.trim(), start, end: code.length });
    return { elements, code, commentPart, commentIdx };
}

function checkElement(i, t) {
    if (i >= 5)                                         return 'extra';
    if ((i === 0 || i === 4) && t === '')               return 'state';
    if (i === 0 && t === 'end')                         return 'end_state';
    if (i === 0 && t === 'error')                       return 'error_state';
    if (i === 4 && t === 'start')                       return 'start_new';
    if (i === 1 && !/^".*"$/.test(t) && t !== 'other') return 'symbol';
    if (i === 2 && !/^".*"$/.test(t) && t !== 'N')     return 'write';
    if (i === 3 && !['L','R','N'].includes(t))          return 'move';
    return null;
}

function collectValues(text, indices, initial) {
    const s = new Set(initial);
    for (const line of text.split('\n')) {
        const { elements: el } = parseLine(line);
        for (const idx of indices) if (el[idx]?.trimmed) s.add(el[idx].trimmed);
    }
    return [...s];
}
const collectStates  = text => collectValues(text, [0, 4], STATE_KEYWORDS);
const collectSymbols = text => collectValues(text, [1, 2], ['""']).filter(t => /^".*"$/.test(t));

function highlightLine(lineIdx, line, allErrors, extraErrors = []) {
    const { elements, code, commentPart, commentIdx } = parseLine(line);
    if (code.trim() === '' && !commentPart) return '<span class="token-plain"> </span>';

    const lineErrors = [];
    for (let i = 0; i < elements.length; i++) {
        const el = elements[i], type = checkElement(i, el.trimmed);
        if (!type) continue;
        if (el.trimmed === '') {
            lineErrors.push({ lineIdx, charStart: el.start, charEnd: Math.max(el.end, el.start + 1), type });
        } else {
            const ts = el.raw.indexOf(el.trimmed);
            lineErrors.push({ lineIdx, charStart: el.start + ts, charEnd: el.start + ts + el.trimmed.length, type });
        }
    }

    let missingTrailing = false;
    if (elements.length > 0 && elements.length < 4) {
        const last = elements[elements.length - 1];
        const ts = last.trimmed ? last.raw.indexOf(last.trimmed) : 0;
        const errStart = last.trimmed ? last.start + ts + last.trimmed.length : last.start;
        const codeEnd  = commentIdx !== -1 ? commentIdx : code.length;
        if (errStart < codeEnd) {
            lineErrors.push({ lineIdx, charStart: errStart, charEnd: codeEnd, type: 'missing' });
        } else {
            lineErrors.push({ lineIdx, charStart: code.length, charEnd: code.length + 1, type: 'missing' });
            missingTrailing = true;
        }
    }

    lineErrors.push(...extraErrors);
    allErrors.push(...lineErrors);

    const isError = pos => lineErrors.some(e => pos >= e.charStart && pos < e.charEnd);
    let html = '', elemIdx = 0, inStr = false;
    for (let i = 0; i < code.length; i++) {
        const ch = code[i];
        if (ch === '"') inStr = !inStr;
        if (ch === ',' && !inStr) { html += `<span class="token-comma">${escapeHtml(ch)}</span>`; elemIdx++; continue; }
        let cls = elemIdx < 5 ? `token-pos-${elemIdx + 1}` : 'token-plain';
        if ((elemIdx === 0 || elemIdx === 4) && elements[elemIdx]) {
            const el = elements[elemIdx];
            if (STATE_KEYWORDS.includes(el.trimmed)) {
                const ks = el.start + el.raw.indexOf(el.trimmed);
                if (i >= ks && i < ks + el.trimmed.length) cls = 'token-keyword';
            }
        }
        const el4 = [0,1,2,4].includes(elemIdx) ? elements[elemIdx] : null;
        const ts4 = el4?.trimmed ? el4.raw.indexOf(el4.trimmed) : -1;
        const inTrimmed = ts4 >= 0 && i >= el4.start + ts4 && i < el4.start + ts4 + el4.trimmed.length;
        html += `<span class="${cls}${isError(i) ? ' token-error' : ''}"${
            inTrimmed ? ` data-token="${escapeHtml(el4.trimmed)}"` : ''
        }>${escapeHtml(ch)}</span>`;
    }
    if (missingTrailing) html += `<span class="token-plain token-error"> </span>`;
    if (commentPart) html += `<span class="token-comment">${escapeHtml(commentPart)}</span>`;
    return html || '<span class="token-plain"> </span>';
}

// 计算 duplicate 映射（纯数据，不生成 HTML）
// 返回 Map<lineIdx, {charStart, charEnd}>
function computeDupLines(lines, parsed) {
    const seen = new Map(), dupLines = new Map();
    const dupEnd = i => parsed[i].code.slice(0,
        parsed[i].commentIdx !== -1 ? parsed[i].commentIdx : parsed[i].code.length).trimEnd().length;
    for (let i = 0; i < lines.length; i++) {
        const el = parsed[i].elements;
        if (el.length < 2 || !el[0].trimmed || !el[1].trimmed) continue;
        const key = el[0].trimmed + '\x00' + el[1].trimmed;
        if (seen.has(key)) {
            const first = seen.get(key);
            if (!dupLines.has(first)) dupLines.set(first, { charStart: 0, charEnd: dupEnd(first) });
            dupLines.set(i, { charStart: 0, charEnd: dupEnd(i) });
        } else seen.set(key, i);
    }
    return dupLines;
}

// 将 dupLines Map 序列化为字符串，用于快速比较某行的 duplicate 状态是否变化
function dupKey(dupLines, i) {
    const d = dupLines.get(i);
    return d ? `${d.charStart}:${d.charEnd}` : '';
}


function getElementInfo(text, cursor) {
    const ls = lineStartOf(text, cursor);
    let elemIdx = 0, elemStart = ls, inStr = false;
    for (let i = ls; i < cursor; i++) {
        if (text[i] === '"') inStr = !inStr;
        if (text[i] === ',' && !inStr) { elemIdx++; elemStart = i + 1; }
    }
    const raw = text.slice(elemStart, cursor);
    const leadingSpaces = raw.length - raw.trimStart().length;
    return { elemIdx, elemStart, leadingSpaces, prefix: raw.trimStart() };
}

// ════════════════════════════════════════════════════════════
// 自定义元素类
// ════════════════════════════════════════════════════════════

class TmEditor extends HTMLElement {
    static get observedAttributes() { return ['lang', 'value']; }

    constructor() {
        super();
        this._shadow = this.attachShadow({ mode: 'open' });
        this._lang = 'en';
        this._errorCount = 0;
        this._lastErrors = [];
        // 补全状态
        this._currentSuggestions = [];
        this._selectedIdx = 0;
        this._suggestRange = { start: -1, end: -1 };
        this._wholeLine = false;
        this._lastMouseEvent = null;
        // 存储错误位置供 tooltip 使用
        this._errorPositions = [];
        this._textLines = [];
        // 增量渲染缓存
        this._prevLines = [];
        this._prevDup   = new Map();
        // 光标行追踪
        this._currentCursorLine = -1;
    }

    connectedCallback() {
        this._render();
        this._bindEvents();
        // 读取 attribute 初始值
        if (this.hasAttribute('value')) this._textarea.value = this.getAttribute('value');
        if (this.hasAttribute('lang'))  this._lang = LOCALES[this.getAttribute('lang')] ? this.getAttribute('lang') : 'en';
        this._applyLang();
        this._syncHighlight();
    }

    disconnectedCallback() {
        // 清理 fixed 定位的 overlay（它们在 shadow root 里，随元素一起销毁，无需额外处理）
    }

    attributeChangedCallback(name, _old, val) {
        if (!this._textarea) return; // 还未 connectedCallback
        if (name === 'lang') {
            this._lang = LOCALES[val] ? val : 'en';
            this._applyLang();
            this._resetCache();
            this._syncHighlight();
        }
        if (name === 'value') {
            this._textarea.value = val ?? '';
            this._resetCache();
            this._syncHighlight();
        }
    }

    // ── 公开 API ──

    get value() { return this._textarea?.value ?? ''; }
    set value(v) {
        if (this._textarea) { this._textarea.value = v; this._resetCache(); this._syncHighlight(); }
        else this.setAttribute('value', v);
    }

    get lang() { return this._lang; }
    set lang(v) { this.setAttribute('lang', LOCALES[v] ? v : 'en'); }

    get errorCount() { return this._errorCount; }

    // ── 内部：渲染 Shadow DOM ──

    _render() {
        const root = this._shadow;
        root.innerHTML = `
<style>${SHADOW_CSS}</style>
<div class="editor-container">
    <div class="format-bar" part="format-bar">
        <span class="format-item format-pos-1" data-fmt="0"></span>
        <span class="format-comma">,</span>
        <span class="format-item format-pos-2" data-fmt="1"></span>
        <span class="format-comma">,</span>
        <span class="format-item format-pos-3" data-fmt="2"></span>
        <span class="format-comma">,</span>
        <span class="format-item format-pos-4" data-fmt="3"></span>
        <span class="format-comma">,</span>
        <span class="format-item format-pos-5" data-fmt="4"></span>
    </div>
    <div class="code-wrapper">
        <div class="line-numbers" part="line-numbers"></div>
        <div class="editor-area">
            <pre class="highlight-layer"></pre>
            <textarea spellcheck="false"></textarea>
        </div>
    </div>
    <div class="info-bar" part="info-bar">
        <span class="status-hint"></span>
        <span class="error-count no-errors" style="margin-left: 1em; display: flex; align-items: center; justify-content: center; white-space: nowrap; /* 关键属性：禁止文本换行 */"></span>
    </div>
</div>
<div class="suggestions"></div>
<div class="error-tooltip"></div>
`;
        // 缓存常用 DOM 引用
        this._textarea     = root.querySelector('textarea');
        this._hlLayer      = root.querySelector('.highlight-layer');
        this._suggestBox   = root.querySelector('.suggestions');
        this._errorTooltip = root.querySelector('.error-tooltip');
        this._lineNumbers  = root.querySelector('.line-numbers');
        this._errorCounter = root.querySelector('.error-count');
        this._statusHint   = root.querySelector('.status-hint');
        this._fmtItems     = root.querySelectorAll('[data-fmt]');
    }

    // ── 内部：应用语言 ──

    _applyLang() {
        const L = LOCALES[this._lang] || LOCALES.zh;
        this._fmtItems.forEach((el, i) => { el.textContent = L.formatLabels[i]; });
        this._statusHint.textContent = L.statusHint;
        this._textarea.placeholder   = L.placeholder;
        // 刷新错误计数文字
        this._updateErrorCounter(this._errorCount);
    }

    _t(key) { return (LOCALES[this._lang] || LOCALES.zh).errors[key] || (LOCALES[this._lang] || LOCALES.zh).errors.fallback; }

    _hint(item, elemIdx) {
        const m = (LOCALES[this._lang] || LOCALES.zh).hints.move;
        if (item === 'N') return elemIdx === 3 ? m.N_move : m.N_write;
        return m[item] || '';
    }

    // ── 内部：渲染与同步 ──

    // 清空增量缓存，下次 _syncHighlight 时全量重渲
    _resetCache() {
        this._prevLines = [];
        this._prevDup   = new Map();
        this._hlLayer.innerHTML = '';
    }

    _syncScroll() {
        const ta = this._textarea;
        this._hlLayer.style.top  = -ta.scrollTop  + 'px';
        this._hlLayer.style.left = -ta.scrollLeft + 'px';
        this._lineNumbers.scrollTop = ta.scrollTop;
    }

    _syncHighlight() {
        const ta = this._textarea;
        const newLines  = ta.value.split('\n');
        const newParsed = newLines.map(l => parseLine(l));
        const newDup    = computeDupLines(newLines, newParsed);
        const oldLines  = this._prevLines;
        const oldDup    = this._prevDup;

        // ── 逐行增量更新高亮层 ──
        const allErrors = [];
        const changedLines = [];   // 收集本次变化的行
        const layer = this._hlLayer;
        const oldChildCount = layer.children.length;
        const n = newLines.length;

        for (let i = 0; i < n; i++) {
            const lineChanged = oldLines[i] !== newLines[i];
            const dupChanged  = dupKey(newDup, i) !== dupKey(oldDup, i);
            if (lineChanged) changedLines.push({ line: i, content: newLines[i] });

            if (lineChanged || dupChanged) {
                const extra = newDup.has(i) ? [{ lineIdx: i, ...newDup.get(i), type: 'duplicate' }] : [];
                const html  = highlightLine(i, newLines[i], allErrors, extra);
                if (i < oldChildCount) {
                    // 替换已有节点（用 innerHTML 赋值比 replaceChild 快）
                    layer.children[i].innerHTML = html;
                } else {
                    const span = document.createElement('span');
                    span.innerHTML = html;
                    layer.appendChild(span);
                }
            } else {
                // 行未变化：复用旧节点，但仍需收集其错误到 allErrors
                const extra = newDup.has(i) ? [{ lineIdx: i, ...newDup.get(i), type: 'duplicate' }] : [];
                highlightLine(i, newLines[i], allErrors, extra);
            }
        }
        // 删除多余的旧行节点
        while (layer.children.length > n) layer.removeChild(layer.lastChild);

        this._prevLines = newLines;
        this._prevDup   = newDup;
        this._syncScroll();

        // ── 行号（只在行数变化时重建） ──
        if (n !== oldLines.length) {
            this._lineNumbers.innerHTML = Array.from({ length: n }, (_, i) => `<div>${i+1}</div>`).join('');
        }
        this._lineNumbers.scrollTop = ta.scrollTop;

        this._errorPositions = allErrors;
        this._textLines = newLines;

        const prevCount = this._errorCount;
        this._errorCount = allErrors.length;
        this._updateErrorCounter(this._errorCount);
        if (this._errorCount !== prevCount || JSON.stringify(allErrors) !== JSON.stringify(this._lastErrors)) {
            this._lastErrors = allErrors;
            this.dispatchEvent(new CustomEvent('tm-errors', {
                bubbles: true, composed: true,
                detail: { errorCount: this._errorCount, errors: allErrors }
            }));
        }

        this._updateFormatBar();
        this._refreshErrorTooltip();
        this._updateMatchHighlight();

        // 若行数减少，旧的末尾行视为被删除（内容变为空），可按需加入 changedLines
        // 此处仅记录新内容存在的行变化（删除的行已不存在于 newLines 中）

        this.dispatchEvent(new CustomEvent('tm-change', {
            bubbles: true, composed: true,
            detail: { value: ta.value, errorCount: this._errorCount, changedLines }
        }));
    }

    _updateErrorCounter(n) {
        const L = LOCALES[this._lang] || LOCALES.zh;
        this._errorCounter.textContent = n ? L.errorCount(n) : L.noErrors;
        this._errorCounter.className   = `error-count ${n ? 'has-errors' : 'no-errors'}`;
    }

    _updateFormatBar() {
        // 无焦点时不高亮任何一项
        if (this._shadow.activeElement !== this._textarea) {
            this._fmtItems.forEach(el => el.classList.remove('active'));
            return;
        }
        const { value: text, selectionStart: cursor } = this._textarea;
        const ls = lineStartOf(text, cursor);
        let elemIdx = 0, inStr = false;
        for (let i = ls; i < cursor; i++) {
            if (text[i] === '"') inStr = !inStr;
            if (text[i] === ',' && !inStr) elemIdx++;
        }
        this._fmtItems.forEach((el, i) => el.classList.toggle('active', i === elemIdx));
    }

    _updateMatchHighlight() {
        this._hlLayer.querySelectorAll('.token-match').forEach(el => el.classList.remove('token-match'));
        const { value: text, selectionStart: cursor, selectionEnd } = this._textarea;
        if (cursor !== selectionEnd) return;
        const { elemIdx } = getElementInfo(text, cursor);
        if (![0, 1, 2, 4].includes(elemIdx)) return;
        const ls = lineStartOf(text, cursor);
        let le = cursor; while (le < text.length && text[le] !== '\n') le++;
        const { elements } = parseLine(text.slice(ls, le));
        const curElem = elements[elemIdx];
        if (!curElem?.trimmed) return;
        const ts = curElem.raw.indexOf(curElem.trimmed);
        const cs = curElem.start + ts, ce = cs + curElem.trimmed.length;
        if (cursor - ls < cs || cursor - ls > ce) return;
        this._hlLayer.querySelectorAll(`[data-token="${CSS.escape(curElem.trimmed)}"]`)
                     .forEach(el => el.classList.add('token-match'));
    }

    // ── 内部：错误提示 ──

    _refreshErrorTooltip() {
        const e = this._lastMouseEvent;
        if (!e || !this._errorPositions.length) { this._errorTooltip.style.display = 'none'; return; }
        const ta = this._textarea;
        const rect  = ta.getBoundingClientRect();
        const lineH = parseFloat(getComputedStyle(ta).lineHeight) || 27.2;
        const charW = parseFloat(getComputedStyle(ta).fontSize) * 0.601;
        const lineIdx = Math.floor((e.clientY - rect.top  + ta.scrollTop  - 24) / lineH);
        const charIdx = Math.round((e.clientX - rect.left + ta.scrollLeft - 28) / charW);
        if (lineIdx < 0 || lineIdx >= this._textLines.length) { this._errorTooltip.style.display = 'none'; return; }
        const err = this._errorPositions.find(ep =>
            ep.lineIdx === lineIdx && charIdx >= ep.charStart && charIdx < ep.charEnd + 2);
        if (err) {
            this._errorTooltip.textContent = this._t(err.type);
            this._errorTooltip.style.display = 'block';
            this._errorTooltip.style.left = (e.clientX + 16) + 'px';
            this._errorTooltip.style.top  = (e.clientY + 16) + 'px';
        } else {
            this._errorTooltip.style.display = 'none';
        }
    }

    // ── 内部：补全 ──

    _triggerAutocomplete() {
        const ta = this._textarea;
        if (ta.selectionStart !== ta.selectionEnd) { this._hideSuggestions(); return; }
        const { value: text, selectionStart: cursor } = ta;
        const { elemIdx, elemStart, leadingSpaces, prefix } = getElementInfo(text, cursor);
        const ls = lineStartOf(text, cursor);
        let le = cursor; while (le < text.length && text[le] !== '\n') le++;
        if (text.slice(ls, le).replace(/\/\/.*$/, '').trim() === '') { this._hideSuggestions(); return; }

        let candidates;
        if (elemIdx === 0 || elemIdx === 4) {
            candidates = collectStates(text);
            if (elemIdx === 0) candidates = candidates.filter(c => c !== 'end' && c !== 'error');
            if (elemIdx === 4) candidates = candidates.filter(c => c !== 'start');
        } else if (elemIdx === 1) candidates = [...collectSymbols(text), 'other'];
        else if   (elemIdx === 2) candidates = [...collectSymbols(text), 'N'];
        else if   (elemIdx === 3) candidates = ['L', 'R', 'N'];
        else { this._hideSuggestions(); return; }

        const { elements } = parseLine(text.slice(ls, le));
        const fullValue = elements[elemIdx]?.trimmed ?? '';
        if (prefix) candidates = candidates.filter(c => c.startsWith(prefix) && c !== fullValue);
        if (!candidates.length) { this._hideSuggestions(); return; }

        this._currentSuggestions = candidates;
        this._selectedIdx = 0;
        this._suggestRange = { start: elemStart + leadingSpaces, end: cursor };
        this._showSuggestions(elemIdx);
    }

    _showSuggestions(elemIdx) {
        const color = ELEM_COLORS[elemIdx] || '#ffb86b';
        this._suggestBox.innerHTML = this._currentSuggestions.map((item, i) => {
            const hint = this._hint(item, elemIdx);
            const hintHtml = hint ? ` <span style="color:#5d6b93;font-size:0.8125em">${hint}</span>` : '';
            return `<div class="${i === 0 ? 'selected' : ''}" data-index="${i}"
                style="border-left-color:${i === 0 ? color : 'transparent'}">${escapeHtml(item)}${hintHtml}</div>`;
        }).join('');
        this._suggestBox.style.display = 'block';
        this._positionSuggestions();
    }

    _updateSuggestionHighlight(elemIdx) {
        const color = ELEM_COLORS[elemIdx] || '#ffb86b';
        this._suggestBox.querySelectorAll('div').forEach((el, i) => {
            el.classList.toggle('selected', i === this._selectedIdx);
            el.style.borderLeftColor = i === this._selectedIdx ? color : 'transparent';
        });
    }

    _positionSuggestions() {
        const ta = this._textarea;
        const cs = getComputedStyle(ta), r = ta.getBoundingClientRect();
        const mirror = document.createElement('div');
        mirror.style.cssText = `position:fixed;visibility:hidden;white-space:pre;pointer-events:none;width:auto;` +
            `font:${cs.font};padding:${cs.padding};line-height:${cs.lineHeight};` +
            `top:${r.top - ta.scrollTop}px;left:${r.left - ta.scrollLeft}px;`;
        mirror.textContent = ta.value.slice(0, ta.selectionStart);
        const caret = document.createElement('span');
        caret.textContent = '|';
        mirror.appendChild(caret);
        // mirror 必须挂在 document.body 才能正确测量（shadow 内 fixed 坐标系相同）
        document.body.appendChild(mirror);
        const cr = caret.getBoundingClientRect();
        document.body.removeChild(mirror);
        // 用实际渲染高度代替写死的 px 值
        const boxH = this._suggestBox.getBoundingClientRect().height;
        let left = cr.left, top = cr.bottom + 4;
        if (left + this._suggestBox.offsetWidth > window.innerWidth  - 8) left = window.innerWidth  - this._suggestBox.offsetWidth - 8;
        if (top  + boxH > window.innerHeight - 8) top  = cr.top - boxH - 4;
        this._suggestBox.style.left = left + 'px';
        this._suggestBox.style.top  = top  + 'px';
    }

    _hideSuggestions() { this._suggestBox.style.display = 'none'; this._currentSuggestions = []; }

    _applySuggestion(item) {
        const { start, end } = this._suggestRange;
        if (start === -1) return;
        const val = this._textarea.value;
        this._textarea.value = val.slice(0, start) + item + val.slice(end);
        this._textarea.setSelectionRange(start + item.length, start + item.length);
        this._syncHighlight();
        this._hideSuggestions();
    }

    // ── 内部：检测光标是否跨行，若跨行则触发 tm-cursor-line-change ──

    _checkCursorLine() {
        const ta = this._textarea;
        const pos = ta.selectionStart;
        const lines = ta.value.split('\n');
        // 计算当前光标所在行号（0-based）
        let lineIdx = 0, counted = 0;
        for (let i = 0; i < lines.length; i++) {
            counted += lines[i].length + 1; // +1 for '\n'
            if (pos < counted) { lineIdx = i; break; }
        }
        if (lineIdx !== this._currentCursorLine) {
            this._currentCursorLine = lineIdx;
            this.dispatchEvent(new CustomEvent('tm-cursor-line-change', {
                bubbles: true, composed: true,
                detail: { line: lineIdx, content: lines[lineIdx] ?? '' }
            }));
        }
    }

    // ── 内部：事件绑定（connectedCallback 调用一次） ──

    _bindEvents() {
        const ta = this._textarea, sb = this._suggestBox;

        ta.addEventListener('input', e => {
            this._syncHighlight();
            const isNewline = e.inputType === 'insertLineBreak' || e.inputType === 'insertParagraph';
            if (!isNewline) this._triggerAutocomplete();
            this._checkCursorLine();
        });

        ta.addEventListener('scroll', () => {
            this._syncScroll();
            if (sb.style.display === 'block') this._positionSuggestions();
        });

        ta.addEventListener('mousemove',  e => { this._lastMouseEvent = e; this._refreshErrorTooltip(); });
        ta.addEventListener('mouseleave', () => { this._lastMouseEvent = null; this._errorTooltip.style.display = 'none'; });

        ta.addEventListener('click',  () => { this._updateFormatBar(); this._hideSuggestions(); this._updateMatchHighlight(); this._checkCursorLine(); });
        ta.addEventListener('blur',   () => { setTimeout(() => { if (this._shadow.activeElement !== sb) { this._hideSuggestions(); this._updateFormatBar(); } }, 150); });

        ta.addEventListener('keyup', e => {
            if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && sb.style.display === 'block') return;
            if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)) {
                this._updateFormatBar(); this._hideSuggestions(); this._updateMatchHighlight();
                this._checkCursorLine();
            }
        });

        ta.addEventListener('keydown', e => {
            if (e.key === 'F4') {
                e.preventDefault();
                this.dispatchEvent(new CustomEvent('tm-refresh-graph', {
                    bubbles: true,
                    composed: true,
                    detail: { value: this.value, errorCount: this._errorCount },
                }));
                return;
            }
            if (e.key === 'F5') {
                e.preventDefault();
                this.dispatchEvent(new CustomEvent('tm-run', {
                    bubbles: true,
                    composed: true,
                    detail: { value: this.value, errorCount: this._errorCount },
                }));
                return;
            }

            const ctrl = e.ctrlKey || e.metaKey;

            if (ctrl && e.key === '/') {
                e.preventDefault();
                const val = ta.value, pos = ta.selectionStart;
                const ls = lineStartOf(val, pos);
                let le = pos; while (le < val.length && val[le] !== '\n') le++;
                const line = val.slice(ls, le);
                const newLine = /^\s*\/\//.test(line)
                    ? line.replace(/^(\s*)\/\/ ?/, '$1')
                    : line.replace(/^(\s*)/, '$1// ');
                ta.value = val.slice(0, ls) + newLine + val.slice(le);
                ta.setSelectionRange(ls + Math.max(0, (pos - ls) + newLine.length - line.length),
                                     ls + Math.max(0, (pos - ls) + newLine.length - line.length));
                this._syncHighlight();
                return;
            }

            if (ctrl && (e.key === 'c' || e.key === 'x') && ta.selectionStart === ta.selectionEnd) {
                e.preventDefault();
                const val = ta.value, pos = ta.selectionStart;
                const ls = lineStartOf(val, pos);
                let le = pos; while (le < val.length && val[le] !== '\n') le++;
                navigator.clipboard.writeText(val.slice(ls, le < val.length ? le + 1 : le)).catch(() => {});
                this._wholeLine = true;
                if (e.key === 'x') {
                    const rs = (le === val.length && ls > 0) ? ls - 1 : ls;
                    const re = le < val.length ? le + 1 : le;
                    ta.value = val.slice(0, rs) + val.slice(re);
                    const np = Math.min(rs, ta.value.length);
                    ta.setSelectionRange(np, np);
                    this._syncHighlight();
                }
                return;
            }

            if (ctrl && e.key === 'v' && this._wholeLine) {
                e.preventDefault();
                navigator.clipboard.readText().then(clip => {
                    const insert = clip.endsWith('\n') ? clip : clip + '\n';
                    const val = ta.value, pos = ta.selectionStart;
                    const ls = lineStartOf(val, pos);
                    ta.value = val.slice(0, ls) + insert + val.slice(ls);
                    ta.setSelectionRange(ls, ls);
                    this._syncHighlight();
                }).catch(() => {});
                this._wholeLine = false;
                return;
            }

            if (!ctrl) this._wholeLine = false;

            if (sb.style.display !== 'block') return;
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                this._selectedIdx = e.key === 'ArrowDown'
                    ? (this._selectedIdx + 1) % this._currentSuggestions.length
                    : (this._selectedIdx - 1 + this._currentSuggestions.length) % this._currentSuggestions.length;
                this._updateSuggestionHighlight(getElementInfo(ta.value, ta.selectionStart).elemIdx);
            } else if ((e.key === 'Enter' || e.key === 'Tab') && this._currentSuggestions.length) {
                e.preventDefault();
                this._applySuggestion(this._currentSuggestions[this._selectedIdx]);
            } else if (e.key === 'Escape') {
                this._hideSuggestions();
            }
        });

        sb.addEventListener('mousedown', e => e.preventDefault());
        sb.addEventListener('click', e => {
            const el = e.target.closest('div[data-index]');
            if (el) this._applySuggestion(this._currentSuggestions[+el.dataset.index]);
        });
    }
}

customElements.define('tm-editor', TmEditor);
