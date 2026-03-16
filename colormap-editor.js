// ════════════════════════════════════════════════════════════
// colormap-editor.js — <colormap-editor> 自定义元素
//
// 依赖（需在 HTML 中提前加载）：
//   codemirror.min.css
//   codemirror-colorpicker.css
//   codemirror.min.js
//   codemirror-colorpicker.js
//
// 属性：
//   value               初始内容（attribute 或 property）
//
// Property（JS）：
//   el.value            读写编辑器内容
//   el.errorCount       只读，当前错误行数
//
// 事件（在元素上监听）：
//   "cm-change"         内容变化时，detail: { value, errorCount }
//   "cm-errors"         错误数量变化时，detail: { errorCount, errors }
// ════════════════════════════════════════════════════════════

// ── CSS 颜色关键字 ────────────────────────────────────────────────────────────

const _CSS_KW = new Set("aliceblue,antiquewhite,aqua,aquamarine,azure,beige,bisque,black,blanchedalmond,blue,blueviolet,brown,burlywood,cadetblue,chartreuse,chocolate,coral,cornflowerblue,cornsilk,crimson,cyan,darkblue,darkcyan,darkgoldenrod,darkgray,darkgreen,darkgrey,darkkhaki,darkmagenta,darkolivegreen,darkorange,darkorchid,darkred,darksalmon,darkseagreen,darkslateblue,darkslategray,darkslategrey,darkturquoise,darkviolet,deeppink,deepskyblue,dimgray,dimgrey,dodgerblue,firebrick,floralwhite,forestgreen,fuchsia,gainsboro,ghostwhite,gold,goldenrod,gray,green,greenyellow,grey,honeydew,hotpink,indianred,indigo,ivory,khaki,lavender,lavenderblush,lawngreen,lemonchiffon,lightblue,lightcoral,lightcyan,lightgoldenrodyellow,lightgray,lightgreen,lightgrey,lightpink,lightsalmon,lightseagreen,lightskyblue,lightslategray,lightslategrey,lightsteelblue,lightyellow,lime,limegreen,linen,magenta,maroon,mediumaquamarine,mediumblue,mediumorchid,mediumpurple,mediumseagreen,mediumslateblue,mediumspringgreen,mediumturquoise,mediumvioletred,midnightblue,mintcream,mistyrose,moccasin,navajowhite,navy,oldlace,olive,olivedrab,orange,orangered,orchid,palegoldenrod,palegreen,paleturquoise,palevioletred,papayawhip,peachpuff,peru,pink,plum,powderblue,purple,rebeccapurple,red,rosybrown,royalblue,saddlebrown,salmon,sandybrown,seagreen,seashell,sienna,silver,skyblue,slateblue,slategray,slategrey,snow,springgreen,steelblue,tan,teal,thistle,tomato,turquoise,violet,wheat,white,whitesmoke,yellow,yellowgreen,transparent".split(","));

function _isCssColor(s) {
    s = s.trim();
    return _CSS_KW.has(s.toLowerCase())
        || /^#[0-9a-fA-F]{3,8}$/.test(s)
        || /^rgba?\s*\([^)]+\)$/i.test(s)
        || /^hsla?\s*\([^)]+\)$/i.test(s);
}

function _splitTopLevel(str) {
    const parts = [];
    let depth = 0, cur = '';
    for (const c of str) {
        if      (c === '(')           { depth++; cur += c; }
        else if (c === ')')           { depth--; cur += c; }
        else if (c === ',' && !depth) { parts.push(cur.trim()); cur = ''; }
        else                          { cur += c; }
    }
    if (cur.trim()) parts.push(cur.trim());
    return parts;
}

function _parseLine(raw) {
    const noComment = raw.replace(/\/\/.*$/, '').replace(/"[^"]*"/g, '').trim();
    if (!noComment) return null;
    const parts = _splitTopLevel(noComment);
    const [token, fg, bg, ...rest] = parts;
    if (!token)                   return { error: true, msg: '缺少第一元（token 名）' };
    if (!fg)                      return { error: true, msg: '缺少第二元（前景色）' };
    if (rest.length)               return { error: true, msg: `最多三个元素，得到 ${parts.length} 个` };
    if (!_isCssColor(fg))          return { error: true, msg: `"${fg}" 不是有效的 CSS 颜色` };
    if (bg && !_isCssColor(bg))    return { error: true, msg: `"${bg}" 不是有效的 CSS 颜色` };
    return { token, fg, bg: bg || null };
}

// ── 注册 CodeMirror 语法模式（全局只需一次）──────────────────────────────────

function _registerMode() {
    if (!window.CodeMirror || CodeMirror.modes['colormap']) return;
    CodeMirror.defineMode('colormap', () => ({
        startState: () => ({ col: 0 }),
        token(stream, state) {
            if (stream.sol()) state.col = 0;
            if (stream.eatSpace()) return null;
            if (stream.match('//')) { stream.skipToEnd(); return 'comment'; }
            if (stream.peek() === '"') {
                stream.next();
                while (!stream.eol() && stream.peek() !== '"') stream.next();
                if (!stream.eol()) stream.next();
                return 'comment';
            }
            if (stream.peek() === ',') { stream.next(); state.col++; return 'comma'; }
            const fn = stream.string.slice(stream.pos).match(/^(rgba?|hsla?)\s*\([^)]*\)/i);
            if (fn) {
                for (let i = 0; i < fn[0].length; i++) stream.next();
                return state.col ? 'colorval' : null;
            }
            if (stream.peek() === '#') { stream.next(); stream.eatWhile(/[0-9a-fA-F]/); return 'colorval'; }
            const start = stream.pos;
            if (stream.eatWhile(/[^\s,"]/)) {
                if (!state.col) return null;
                return _isCssColor(stream.string.slice(start, stream.pos)) ? 'colorval' : 'error';
            }
            stream.next(); return 'error';
        }
    }));
}

// ── 内置默认示例内容 ─────────────────────────────────────────────────────────

const _DEFAULT_VALUE = `P, white, red
Q, white, green
R, white, blue
A, white, gray
0', brown
0~, brown
1', brown
1~, brown`;

// ════════════════════════════════════════════════════════════
// 自定义元素
// ════════════════════════════════════════════════════════════

class ColormapEditor extends HTMLElement {
    static get observedAttributes() { return ['value']; }

    constructor() {
        super();
        this._errorCount = 0;
        this._lastErrors = [];
        this._lineErrors = new Map();
        this._marks      = [];
        this._ruleCount  = 0;
        this._cm         = null;
        this._pendingValue = null;
    }

    connectedCallback() {
        _registerMode();
        this._buildDOM();
        // 延迟一帧，确保元素已进入布局，CodeMirror 能正确读取尺寸
        requestAnimationFrame(() => {
            this._initCodeMirror();
            // 优先级：JS property setter 保存的值 > value attribute > 组件内置默认值
            if (this._pendingValue !== null) {
                this._cm.setValue(this._pendingValue);
                this._pendingValue = null;
            } else if (this.hasAttribute('value')) {
                this._cm.setValue(this.getAttribute('value'));
            } else {
                this._cm.setValue(_DEFAULT_VALUE);
            }
            this._applyMarks();
            this._bindEvents();
            this._cm.refresh();
        });
    }

    attributeChangedCallback(name, _old, val) {
        if (name !== 'value') return;
        if (this._cm) {
            this._cm.setValue(val ?? '');
            this._applyMarks();
        } else {
            this._pendingValue = val ?? '';
        }
    }

    get value() { return this._cm ? this._cm.getValue() : (this._pendingValue ?? ''); }
    set value(v) {
        if (this._cm) { this._cm.setValue(v); this._applyMarks(); }
        else this._pendingValue = v;
    }

    get errorCount() { return this._errorCount; }

    // ── 构建普通 DOM（不用 Shadow DOM，避免 CodeMirror CSS 隔离问题）────────

    _buildDOM() {
        // 用普通 DOM，样式通过 <style> 注入页面（scoped by 属性选择器）
        const uid = 'cme-' + Math.random().toString(36).slice(2, 8);
        this.setAttribute('data-cme', uid);
        const sel = `colormap-editor[data-cme="${uid}"]`;

        // 注入作用域样式
        const style = document.createElement('style');
        style.textContent = `
${sel} { display:flex; flex-direction:column; background:#151718;
    border-radius:1.5em; overflow:hidden; font-size:13px; height:100%;
    font-family:'JetBrains Mono','Fira Code','Cascadia Code',Consolas,'Courier New',monospace;
    box-shadow:0 20px 40px rgba(0,0,0,0.6), 0 0 0 2px #2a2d2f inset; }
${sel} *, ${sel} *::before, ${sel} *::after { box-sizing:border-box; }

${sel} .cm-format-bar {
    background:#1e2122; padding:0.6em 1em; border-bottom:2px solid #0d0e0f;
    font-size:1em; line-height:1.7; display:flex; gap:0.2em;
    color:#8a95a8; user-select:none; flex-shrink:0; }
${sel} .cm-fmt-item {
    padding:0.1em 0.5em; border-radius:0.375em; transition:background-color 0.15s; color:#8a95a8; }
${sel} .cm-fmt-item.active {
    background-color:rgba(255,255,255,0.1); box-shadow:0 0 0 1px rgba(255,255,255,0.15); color:#c8d0e0; }
${sel} .cm-fmt-comma { color:#3d4455; margin:0 0.15em; }

/* 外层：纵向滚动容器，包裹行号+代码整体 */
${sel} .cm-host {
    flex:1; min-height:0;
    overflow:auto;
    scrollbar-width:thin; scrollbar-color:#2e3a55 #151718; }
${sel} .cm-host::-webkit-scrollbar        { width:8px; height:8px; }
${sel} .cm-host::-webkit-scrollbar-track  { background:#151718; }
${sel} .cm-host::-webkit-scrollbar-thumb  { background:#2e3a55; border-radius:4px; border:2px solid #151718; }
${sel} .cm-host::-webkit-scrollbar-thumb:hover { background:#4a5a80; }
${sel} .cm-host::-webkit-scrollbar-corner { background:#151718; }

/* 行号+代码并排，整体宽度由代码内容撑开 */
${sel} .cm-body {
    display:inline-flex; flex-direction:row; min-width:100%; align-items:flex-start; }

/* 行号列：sticky 固定在横向滚动的左侧 */
${sel} .cm-gutters {
    flex-shrink:0; position:sticky; left:0; z-index:2;
    background:#1a1d1e;
    border-right:1px solid rgba(255,255,255,0.07);
    padding:0.4em 0; min-width:3em;
    font-size:1em; line-height:1.75; color:#4a5060;
    text-align:right; user-select:none; align-self:stretch; }
${sel} .cm-gutters div { padding:0 0.6em; }

/* CodeMirror 容器：自由伸展 */
${sel} .cm-scroll-x { flex:1; min-width:0; }
${sel} .cm-scroll-x::-webkit-scrollbar        { height:8px; }
${sel} .cm-scroll-x::-webkit-scrollbar-track  { background:#151718; }
${sel} .cm-scroll-x::-webkit-scrollbar-thumb  { background:#2e3a55; border-radius:4px; border:2px solid #151718; }
${sel} .cm-scroll-x::-webkit-scrollbar-thumb:hover { background:#4a5a80; }

/* CodeMirror：自由伸展，隐藏内置行号和滚动条 */
${sel} .CodeMirror {
    font-family:'JetBrains Mono','Fira Code','Cascadia Code',Consolas,'Courier New',monospace !important;
    font-size:1em; font-weight:normal; font-style:normal;
    height:auto; width:max-content; min-width:100%;
    background:#151718; color:#c8d0e0; line-height:1.75; }
${sel} .CodeMirror-scroll { overflow:hidden !important; margin:0 !important; padding:0 !important; }
${sel} .CodeMirror-sizer  { min-height:unset !important; }
${sel} .CodeMirror-gutters { display:none !important; }
${sel} .CodeMirror-lines  { padding-left:0.4em; }
${sel} .CodeMirror-vscrollbar,
${sel} .CodeMirror-hscrollbar,
${sel} .CodeMirror-scrollbar-filler { display:none !important; }
${sel} .CodeMirror-cursor { border-left:2px solid #f3f7ff !important; }
${sel} .CodeMirror-selected { background:rgba(120,150,220,0.25) !important; }
${sel} .CodeMirror-activeline-background { background:rgba(255,255,255,0.03) !important; }

${sel} .cm-comment,${sel} .cm-comma,${sel} .cm-colorval,${sel} .cm-error {
    font-family:'JetBrains Mono','Fira Code','Cascadia Code',Consolas,'Courier New',monospace !important;
    font-weight:normal !important; font-style:normal !important; }
${sel} .cm-comment  { color:#5a6680 !important; }
${sel} .cm-comma    { color:#3d4455 !important; }
${sel} .cm-colorval { color:#c8d0e0 !important; }
${sel} .cm-error    { color:#f87171 !important; text-decoration:underline wavy; }

${sel} .codemirror-colorview { width:0.8em; height:0.8em; position:relative; top:-1px; }

${sel} .cm-info-bar {
    display:flex; justify-content:space-between; align-items:center;
    padding:0.5em 1.25em; background:#1a1d1e; color:#6a7080;
    font-size:0.8125em; border-top:1px solid rgba(255,255,255,0.06);
    flex-shrink:0; gap:1em; }
${sel} .cm-status-hint { color:#5a6476; flex:1; }
${sel} .cm-error-count { padding:0.2em 0.75em; border-radius:2em; white-space:nowrap; flex-shrink:0; }
${sel} .cm-error-count.no-errors  { background:#1b2e22; color:#7ee8a2; border-left:3px solid #3ecf6e; }
${sel} .cm-error-count.has-errors { background:#2e1a1a; color:#ffa7b5; border-left:3px solid #ff4d6d; }
`;
        document.head.appendChild(style);
        this._injectedStyle = style;

        // 错误 tooltip（fixed，挂在 body）
        this._tooltip = document.createElement('div');
        this._tooltip.style.cssText = `
            position:fixed; display:none;
            background:#2a1a1a; border:1px solid #7f2020; border-radius:0.5em;
            padding:0.4em 0.85em; color:#ffaaaa;
            font-family:'JetBrains Mono','Fira Code','Cascadia Code',Consolas,'Courier New',monospace;
            font-size:12px; font-weight:normal; font-style:normal;
            line-height:1.5; pointer-events:none; z-index:9998;
            max-width:28em; box-shadow:0 4px 16px rgba(0,0,0,0.6);`;
        document.body.appendChild(this._tooltip);

        // 格式栏
        this._fmtBar = document.createElement('div');
        this._fmtBar.className = 'cm-format-bar';
        this._fmtBar.innerHTML = `
            <span class="cm-fmt-item" data-col="0">记号</span>
            <span class="cm-fmt-comma">,</span>
            <span class="cm-fmt-item" data-col="1">前景色</span>
            <span class="cm-fmt-comma">,</span>
            <span class="cm-fmt-item" data-col="2">背景色</span>`;
        this.appendChild(this._fmtBar);
        this._fmtItems = this._fmtBar.querySelectorAll('[data-col]');

        // 外层容器（纵向滚动）
        this._cmHost = document.createElement('div');
        this._cmHost.className = 'cm-host';

        // 行号+代码并排层
        this._cmBody = document.createElement('div');
        this._cmBody.className = 'cm-body';

        // 自绘行号列
        this._gutters = document.createElement('div');
        this._gutters.className = 'cm-gutters';
        this._cmBody.appendChild(this._gutters);

        // 横向滚动层
        this._scrollX = document.createElement('div');
        this._scrollX.className = 'cm-scroll-x';
        this._cmBody.appendChild(this._scrollX);

        this._cmHost.appendChild(this._cmBody);
        this.appendChild(this._cmHost);

        // 动态 markText 样式
        this._dynStyle = document.createElement('style');
        document.head.appendChild(this._dynStyle);

        // 信息栏
        this._infoBar = document.createElement('div');
        this._infoBar.className = 'cm-info-bar';
        this._infoBar.innerHTML = `
            <span class="cm-status-hint">💡 悬停红色波浪线查看错误 · 点击色块打开颜色选择器 &nbsp;|&nbsp; 颜色格式：#rgb · #rrggbb · #rrggbbaa · rgb(r,g,b) · rgba(r,g,b,a) · hsl(h,s%,l%) · hsla(h,s%,l%,a) · red · crimson…</span>
            <span class="cm-error-count no-errors">无错误</span>`;
        this.appendChild(this._infoBar);
        this._errorCounter = this._infoBar.querySelector('.cm-error-count');
    }

    // ── 初始化 CodeMirror ─────────────────────────────────────────────────────

    _initCodeMirror() {
        const ta = document.createElement('textarea');
        this._scrollX.appendChild(ta);

        this._cm = CodeMirror.fromTextArea(ta, {
            mode:         'colormap',
            lineNumbers:  false,
            autofocus:    false,
            lineWrapping: false,
            colorpicker: {
                mode: 'edit',
                excluded_token: [],
                onChange: () => setTimeout(() => this._applyMarks(), 0),
            },
        });

        // CodeMirror 在光标移动时会通过 curOp.scrollTop 强制修改内部滚动位置。
        // 我们用外部容器做滚动，必须阻止这个行为。
        // 拦截 cursorActivity，在每次操作结束前把 scrollTop/scrollLeft 清掉。
        this._cm.on('cursorActivity', () => {
            const op = this._cm.curOp;
            if (op) {
                op.scrollTop  = null;
                op.scrollLeft = null;
                op.scrollToPos = null;
            }
        });
        this._cm.on('scrollCursorIntoView', (cm, e) => { e.preventDefault(); });
    }

    // ── markText：第一元颜色 ──────────────────────────────────────────────────

    _applyMarks() {
        const cm = this._cm;
        this._marks.forEach(m => m.clear());
        this._marks = [];

        const sheet = this._dynStyle.sheet;
        while (sheet && sheet.cssRules.length) sheet.deleteRule(0);
        this._ruleCount = 0;
        this._lineErrors.clear();

        const lines = cm.getValue().split('\n');

        lines.forEach((raw, lineNo) => {
            const r = _parseLine(raw);
            if (!r) return;
            if (r.error) { this._lineErrors.set(lineNo, r.msg); return; }

            let i = 0;
            while (i < raw.length && (raw[i] === ' ' || raw[i] === '\t')) i++;
            if (i >= raw.length || raw[i] === '"' || raw.slice(i, i + 2) === '//') return;
            const from = i;
            while (i < raw.length && raw[i] !== ',' && raw[i] !== '"') i++;
            let to = i;
            while (to > from && raw[to - 1] <= ' ') to--;
            if (to <= from) return;

            const cls = `_ctok${this._ruleCount++}`;
            let decl = `color:${r.fg}!important;`;
            if (r.bg) decl += `background:${r.bg}!important;border-radius:3px;padding:0 2px;`;
            if (sheet) sheet.insertRule(`.${cls}{${decl}}`, sheet.cssRules.length);

            this._marks.push(cm.markText(
                { line: lineNo, ch: from },
                { line: lineNo, ch: to },
                { className: cls }
            ));
        });

        // 同步自绘行号
        this._gutters.innerHTML = lines
            .map((_, i) => `<div>${i + 1}</div>`)
            .join('');

        this._updateCounter();
    }

    _updateCounter() {
        const n = this._lineErrors.size;
        const prevCount = this._errorCount;
        this._errorCount = n;
        this._errorCounter.textContent = n ? `错误: ${n}` : '无错误';
        this._errorCounter.className   = `cm-error-count ${n ? 'has-errors' : 'no-errors'}`;

        const errors = Array.from(this._lineErrors.entries()).map(([line, msg]) => ({ line, msg }));
        if (n !== prevCount || JSON.stringify(errors) !== JSON.stringify(this._lastErrors)) {
            this._lastErrors = errors;
            this.dispatchEvent(new CustomEvent('cm-errors', {
                bubbles: true, composed: true,
                detail: { errorCount: n, errors }
            }));
        }
        this.dispatchEvent(new CustomEvent('cm-change', {
            bubbles: true, composed: true,
            detail: { value: this._cm.getValue(), errorCount: n }
        }));
    }

    // ── 事件绑定 ──────────────────────────────────────────────────────────────

    _bindEvents() {
        const cm = this._cm;
        cm.on('change', () => this._applyMarks());
        cm.on('cursorActivity', () => this._updateFormatBar());

        const wrapper = cm.getWrapperElement();
        wrapper.addEventListener('mousemove', e => {
            const pos = cm.coordsChar({ left: e.clientX, top: e.clientY }, 'window');
            const msg = this._lineErrors.get(pos.line);
            const tip = this._tooltip;
            if (msg) {
                tip.textContent = msg;
                tip.style.display = 'block';
                tip.style.left = (e.clientX + 14) + 'px';
                tip.style.top  = (e.clientY + 14) + 'px';
                const rect = tip.getBoundingClientRect();
                if (rect.right > window.innerWidth - 8)
                    tip.style.left = (e.clientX - rect.width - 8) + 'px';
            } else {
                tip.style.display = 'none';
            }
        });
        wrapper.addEventListener('mouseleave', () => { this._tooltip.style.display = 'none'; });
    }

    _updateFormatBar() {
        const cm     = this._cm;
        const cursor = cm.getCursor();
        const line   = cm.getLine(cursor.line) || '';
        let col = 0, depth = 0;
        for (let i = 0; i < cursor.ch && i < line.length; i++) {
            const c = line[i];
            if      (c === '(') depth++;
            else if (c === ')') depth--;
            else if (c === ',' && !depth) col++;
        }
        this._fmtItems.forEach(el => el.classList.toggle('active', +el.dataset.col === col));
    }

    disconnectedCallback() {
        this._injectedStyle?.remove();
        this._dynStyle?.remove();
        this._tooltip?.remove();
    }
}

customElements.define('colormap-editor', ColormapEditor);
