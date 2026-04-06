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
//   lang                界面语言（与主程序 language 一致）；不支持时回退 "en"
//
// Property（JS）：
//   el.value            读写编辑器内容
//   el.errorCount       只读，当前错误行数
//   el.lang             读写界面语言；不支持的值回退到 "en"，赋值后立即刷新 UI
//
// 事件（在元素上监听）：
//   "ready"             组件初始化完成，可以安全设置 value / lang
//   "cm-change"         内容变化时，detail: { value, errorCount }
//   "cm-errors"         错误数量变化时，detail: { errorCount, errors }
// ════════════════════════════════════════════════════════════

// ── 国际化（i18n）────────────────────────────────────────────────────────────

const _I18N = {
    zh: {
        fmtToken:      '记号',
        fmtFg:         '前景色',
        fmtBg:         '背景色',
        hint:          '💡 点击色块打开颜色选择器 \u00a0|\u00a0 颜色格式（CSS）：#rrggbb · rgb(r,g,b) · hsl(h,s%,l%) · red · transparent …',
        noErrors:      '无错误',
        errorCount:    n => `错误: ${n}`,
        errMissingP0:  '缺少第一元（token 名）',
        errMissingP1:  '缺少第二元（前景色）',
        errTooMany:    n => `最多三个元素，得到 ${n} 个`,
        errBadColorP1: c => `"${c}" 不是有效的 CSS 颜色`,
        errBadColorP2: c => `"${c}" 不是有效的 CSS 颜色`,
    },
    en: {
        fmtToken:      'Token',
        fmtFg:         'Foreground',
        fmtBg:         'Background',
        hint:          '💡 Click a swatch to open the color picker \u00a0|\u00a0 CSS formats: #rrggbb · rgb(r,g,b) · hsl(h,s%,l%) · red · transparent …',
        noErrors:      'No errors',
        errorCount:    n => `Errors: ${n}`,
        errMissingP0:  'Missing column 1 (token name)',
        errMissingP1:  'Missing column 2 (foreground color)',
        errTooMany:    n => `At most 3 columns, got ${n}`,
        errBadColorP1: c => `"${c}" is not a valid CSS color`,
        errBadColorP2: c => `"${c}" is not a valid CSS color`,
    },
    "zh-tw": {
        fmtToken:      "記號",
        fmtFg:         "前景色",
        fmtBg:         "背景色",
        hint:          "💡 點擊色塊打開顏色選擇器  |  顏色格式（CSS）：#rrggbb · rgb(r,g,b) · hsl(h,s%,l%) · red · transparent …",
        noErrors:      "無錯誤",
        errorCount:    (n) => "錯誤: " + n + "",
        errMissingP0:  "缺少第一元（token 名）",
        errMissingP1:  "缺少第二元（前景色）",
        errTooMany:    (n) => "最多三個元素，得到 " + n + " 個",
        errBadColorP1: (c) => "\"" + c + "\" 不是有效的 CSS 顏色",
        errBadColorP2: (c) => "\"" + c + "\" 不是有效的 CSS 顏色",
    },
    "ru": {
        fmtToken:      "Токен",
        fmtFg:         "Передний план",
        fmtBg:         "Фон",
        hint:          "💡 Щёлкните образец, чтобы открыть палитру  |  CSS: #rrggbb · rgb · hsl · red · transparent …",
        noErrors:      "Нет ошибок",
        errorCount:    (n) => "Ошибок: " + n + "",
        errMissingP0:  "Нет столбца 1 (имя токена)",
        errMissingP1:  "Нет столбца 2 (цвет переднего плана)",
        errTooMany:    (n) => "Не более 3 столбцов, получено " + n + "",
        errBadColorP1: (c) => "«" + c + "» не является допустимым цветом CSS",
        errBadColorP2: (c) => "«" + c + "» не является допустимым цветом CSS",
    },
    "fr": {
        fmtToken:      "Jeton",
        fmtFg:         "Premier plan",
        fmtBg:         "Arrière-plan",
        hint:          "💡 Cliquez sur un échantillon pour ouvrir le sélecteur  |  CSS : #rrggbb · rgb · hsl · red · transparent …",
        noErrors:      "Aucune erreur",
        errorCount:    (n) => "Erreurs : " + n + "",
        errMissingP0:  "Colonne 1 manquante (nom du jeton)",
        errMissingP1:  "Colonne 2 manquante (couleur d’avant-plan)",
        errTooMany:    (n) => "Au plus 3 colonnes, reçu " + n + "",
        errBadColorP1: (c) => "« " + c + " » n’est pas une couleur CSS valide",
        errBadColorP2: (c) => "« " + c + " » n’est pas une couleur CSS valide",
    },
    "de": {
        fmtToken:      "Token",
        fmtFg:         "Vordergrund",
        fmtBg:         "Hintergrund",
        hint:          "💡 Klicken Sie auf eine Farbfelder, um die Pipette zu öffnen  |  CSS: #rrggbb · rgb · hsl · red · transparent …",
        noErrors:      "Keine Fehler",
        errorCount:    (n) => "Fehler: " + n + "",
        errMissingP0:  "Spalte 1 fehlt (Tokenname)",
        errMissingP1:  "Spalte 2 fehlt (Vordergrundfarbe)",
        errTooMany:    (n) => "Höchstens 3 Spalten, erhalten " + n + "",
        errBadColorP1: (c) => "„" + c + "“ ist keine gültige CSS-Farbe",
        errBadColorP2: (c) => "„" + c + "“ ist keine gültige CSS-Farbe",
    },
    "it": {
        fmtToken:      "Token",
        fmtFg:         "Primo piano",
        fmtBg:         "Sfondo",
        hint:          "💡 Clic su un campione per il selettore colori  |  CSS: #rrggbb · rgb · hsl · red · transparent …",
        noErrors:      "Nessun errore",
        errorCount:    (n) => "Errori: " + n + "",
        errMissingP0:  "Manca la colonna 1 (nome token)",
        errMissingP1:  "Manca la colonna 2 (colore primo piano)",
        errTooMany:    (n) => "Al massimo 3 colonne, ricevute " + n + "",
        errBadColorP1: (c) => "«" + c + "» non è un colore CSS valido",
        errBadColorP2: (c) => "«" + c + "» non è un colore CSS valido",
    },
    "ja": {
        fmtToken:      "トークン",
        fmtFg:         "前景色",
        fmtBg:         "背景色",
        hint:          "💡 スウォッチをクリックでカラーピッカー  |  CSS: #rrggbb · rgb · hsl · red · transparent …",
        noErrors:      "エラーなし",
        errorCount:    (n) => "エラー: " + n + "",
        errMissingP0:  "第1列（トークン名）がありません",
        errMissingP1:  "第2列（前景色）がありません",
        errTooMany:    (n) => "最大3列ですが " + n + " 列あります",
        errBadColorP1: (c) => "「" + c + "」は有効な CSS 色ではありません",
        errBadColorP2: (c) => "「" + c + "」は有効な CSS 色ではありません",
    },
    "ko": {
        fmtToken:      "토큰",
        fmtFg:         "전경색",
        fmtBg:         "배경색",
        hint:          "💡 색 견본을 클릭하면 색 선택기  |  CSS: #rrggbb · rgb · hsl · red · transparent …",
        noErrors:      "오류 없음",
        errorCount:    (n) => "오류: " + n + "",
        errMissingP0:  "1열(토큰 이름) 없음",
        errMissingP1:  "2열(전경색) 없음",
        errTooMany:    (n) => "최대 3열인데 " + n + "열",
        errBadColorP1: (c) => "「" + c + "」는 유효한 CSS 색이 아닙니다",
        errBadColorP2: (c) => "「" + c + "」는 유효한 CSS 색이 아닙니다",
    },
    "es": {
        fmtToken:      "Token",
        fmtFg:         "Primer plano",
        fmtBg:         "Fondo",
        hint:          "💡 Pulse un muestrario para abrir el selector  |  CSS: #rrggbb · rgb · hsl · red · transparent …",
        noErrors:      "Sin errores",
        errorCount:    (n) => "Errores: " + n + "",
        errMissingP0:  "Falta la columna 1 (nombre del token)",
        errMissingP1:  "Falta la columna 2 (color de primer plano)",
        errTooMany:    (n) => "Como máximo 3 columnas, se obtuvieron " + n + "",
        errBadColorP1: (c) => "«" + c + "» no es un color CSS válido",
        errBadColorP2: (c) => "«" + c + "» no es un color CSS válido",
    },
    "hi": {
        fmtToken:      "टोकन",
        fmtFg:         "अग्रभूमि",
        fmtBg:         "पृष्ठभूमि",
        hint:          "💡 रंग नमूने पर क्लिक करें  |  CSS: #rrggbb · rgb · hsl · red · transparent …",
        noErrors:      "कोई त्रुटि नहीं",
        errorCount:    (n) => "त्रुटियाँ: " + n + "",
        errMissingP0:  "स्तंभ 1 गायब (टोकन नाम)",
        errMissingP1:  "स्तंभ 2 गायब (अग्रभूमि रंग)",
        errTooMany:    (n) => "अधिकतम 3 स्तंभ, मिले " + n + "",
        errBadColorP1: (c) => "«" + c + "» मान्य CSS रंग नहीं है",
        errBadColorP2: (c) => "«" + c + "» मान्य CSS रंग नहीं है",
    },
    "pt": {
        fmtToken:      "Token",
        fmtFg:         "Primeiro plano",
        fmtBg:         "Fundo",
        hint:          "💡 Clique numa amostra para abrir o seletor  |  CSS: #rrggbb · rgb · hsl · red · transparent …",
        noErrors:      "Sem erros",
        errorCount:    (n) => "Erros: " + n + "",
        errMissingP0:  "Falta a coluna 1 (nome do token)",
        errMissingP1:  "Falta a coluna 2 (cor de primeiro plano)",
        errTooMany:    (n) => "No máximo 3 colunas, obtidas " + n + "",
        errBadColorP1: (c) => "«" + c + "» não é uma cor CSS válida",
        errBadColorP2: (c) => "«" + c + "» não é uma cor CSS válida",
    },
    "id": {
        fmtToken:      "Token",
        fmtFg:         "Latar depan",
        fmtBg:         "Latar belakang",
        hint:          "💡 Klik swatch untuk pembilih warna  |  CSS: #rrggbb · rgb · hsl · red · transparent …",
        noErrors:      "Tidak ada kesalahan",
        errorCount:    (n) => "Kesalahan: " + n + "",
        errMissingP0:  "Kolom 1 hilang (nama token)",
        errMissingP1:  "Kolom 2 hilang (warna latar depan)",
        errTooMany:    (n) => "Paling banyak 3 kolom, didapat " + n + "",
        errBadColorP1: (c) => "\"" + c + "\" bukan warna CSS yang valid",
        errBadColorP2: (c) => "\"" + c + "\" bukan warna CSS yang valid",
    },
    "th": {
        fmtToken:      "โทเค็น",
        fmtFg:         "สีพื้นหน้า",
        fmtBg:         "สีพื้นหลัง",
        hint:          "💡 คลิกแผงสีเพื่อเปิดตัวเลือกสี  |  CSS: #rrggbb · rgb · hsl · red · transparent …",
        noErrors:      "ไม่มีข้อผิดพลาด",
        errorCount:    (n) => "ข้อผิดพลาด: " + n + "",
        errMissingP0:  "ไม่มีคอลัมน์ 1 (ชื่อโทเค็น)",
        errMissingP1:  "ไม่มีคอลัมน์ 2 (สีพื้นหน้า)",
        errTooMany:    (n) => "สูงสุด 3 คอลัมน์ ได้ " + n + "",
        errBadColorP1: (c) => "«" + c + "» ไม่ใช่สี CSS ที่ถูกต้อง",
        errBadColorP2: (c) => "«" + c + "» ไม่ใช่สี CSS ที่ถูกต้อง",
    },
    "vi": {
        fmtToken:      "Mã thẻ",
        fmtFg:         "Tiền cảnh",
        fmtBg:         "Hậu cảnh",
        hint:          "💡 Nhấn ô màu để mở bộ chọn  |  CSS: #rrggbb · rgb · hsl · red · transparent …",
        noErrors:      "Không lỗi",
        errorCount:    (n) => "Lỗi: " + n + "",
        errMissingP0:  "Thiếu cột 1 (tên token)",
        errMissingP1:  "Thiếu cột 2 (màu tiền cảnh)",
        errTooMany:    (n) => "Tối đa 3 cột, có " + n + "",
        errBadColorP1: (c) => "«" + c + "» không phải màu CSS hợp lệ",
        errBadColorP2: (c) => "«" + c + "» không phải màu CSS hợp lệ",
    },
    "eo": {
        fmtToken:      "Ĵetono",
        fmtFg:         "Antaŭfono",
        fmtBg:         "Fono",
        hint:          "💡 Alklaku kolorŝelon por la kolor_elektilo  |  CSS: #rrggbb · rgb · hsl · red · transparent …",
        noErrors:      "Neniuj eraroj",
        errorCount:    (n) => "Eraroj: " + n + "",
        errMissingP0:  "Mankas kolumno 1 (ĵetona nomo)",
        errMissingP1:  "Mankas kolumno 2 (antaŭfona koloro)",
        errTooMany:    (n) => "Maksimume 3 kolumnoj, ricevis " + n + "",
        errBadColorP1: (c) => "«" + c + "» ne estas valida CSS-koloro",
        errBadColorP2: (c) => "«" + c + "» ne estas valida CSS-koloro",
    },
};

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

function _parseLine(raw, t) {
    const noComment = raw.replace(/\/\/.*$/, '').replace(/"[^"]*"/g, s => ' '.repeat(s.length));
    const stripped  = noComment.trim();
    if (!stripped) return null;

    // 在原始行（去注释后）中定位各元素的起始偏移
    // splitTopLevel 保留了原始字符，可以通过扫描 noComment 找偏移
    function findParts(str) {
        const result = []; // { text, from, to }
        let depth = 0, cur = '', start = 0;
        for (let i = 0; i < str.length; i++) {
            const c = str[i];
            if      (c === '(')           { depth++; cur += c; }
            else if (c === ')')           { depth--; cur += c; }
            else if (c === ',' && !depth) {
                const t = cur.trim();
                if (t) {
                    const off = cur.indexOf(t);
                    result.push({ text: t, from: start + off, to: start + off + t.length });
                }
                cur = ''; start = i + 1;
            } else { cur += c; }
        }
        const t = cur.trim();
        if (t) {
            const off = cur.indexOf(t);
            result.push({ text: t, from: start + off, to: start + off + t.length });
        }
        return result;
    }

    const parts = findParts(noComment);
    if (!parts.length) return null;

    const [p0, p1, p2, ...rest] = parts;

    if (!p0)       return { error: true, msg: t.errMissingP0,           from: 0, to: raw.length };
    if (!p1)       return { error: true, msg: t.errMissingP1,           from: p0.to, to: raw.length };
    if (rest.length) return { error: true, msg: t.errTooMany(parts.length), from: rest[0].from, to: rest[rest.length-1].to };
    if (!_isCssColor(p1.text)) return { error: true, msg: t.errBadColorP1(p1.text), from: p1.from, to: p1.to };
    if (p2 && !_isCssColor(p2.text)) return { error: true, msg: t.errBadColorP2(p2.text), from: p2.from, to: p2.to };

    return { token: p0.text, fg: p1.text, bg: p2?.text || null };
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

const _DEFAULT_VALUE = "";

// ════════════════════════════════════════════════════════════
// 自定义元素
// ════════════════════════════════════════════════════════════

class ColormapEditor extends HTMLElement {
    static get observedAttributes() { return ['value', 'lang']; }

    constructor() {
        super();
        this._errorCount = 0;
        this._lastErrors = [];
        this._lineErrors = new Map();
        this._marks      = [];
        this._ruleCount  = 0;
        this._cm         = null;
        this._pendingValue = null;
        this._ready = false;  // 新增：标记是否已准备好
        this._lang  = 'en';   // 默认语言（不支持的语言也回退到此）
    }

    connectedCallback() {
        _registerMode();
        // 读取初始语言（attribute 优先于默认值）
        if (this.hasAttribute('lang')) {
            const l = this.getAttribute('lang');
            this._lang = _I18N[l] ? l : 'en';
        }
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
            
            // 新增：标记为已准备好并触发 ready 事件
            this._ready = true;
            this.dispatchEvent(new CustomEvent('ready', {
                bubbles: true,
                composed: true,
                detail: { editor: this }
            }));
        });
    }

    attributeChangedCallback(name, _old, val) {
        if (name === 'lang') {
            const resolved = _I18N[val] ? val : 'en';
            if (resolved !== this._lang) { this._lang = resolved; this._refreshUI(); }
            return;
        }
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
    
    // 新增：检查是否已准备好
    get ready() { return this._ready; }

    // ── 语言支持 ──────────────────────────────────────────────────────────────

    /** 当前语言代码（"zh" | "en"）*/
    get lang() { return this._lang; }
    set lang(v) {
        const resolved = _I18N[v] ? v : 'en';
        if (resolved === this._lang) return;
        this._lang = resolved;
        this.setAttribute('lang', resolved);   // 保持 attribute 同步
        this._refreshUI();
    }

    /** 返回当前语言的翻译对象 */
    get _t() { return _I18N[this._lang] || _I18N.en; }

    /** 用当前语言重新渲染所有静态文本节点 */
    _refreshUI() {
        if (!this._cm) return;          // 尚未初始化，_buildDOM 会用当前 _lang
        const t = this._t;

        // 格式栏文字
        if (this._fmtItems) {
            this._fmtItems.forEach(el => {
                const col = +el.dataset.col;
                el.textContent = col === 0 ? t.fmtToken : col === 1 ? t.fmtFg : t.fmtBg;
            });
        }

        // 底部提示
        if (this._statusHint)  this._statusHint.textContent  = t.hint;

        // 错误计数（重新渲染当前数值）
        this._updateCounter();
    }

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
    padding:0.1em 0.5em; border-radius:0.375em; transition:background-color 0.15s; color: #c8d0e0; }  /* 顶上提示行的文本样式 */
${sel} .cm-fmt-item.active {
    background-color:rgba(255,255,255,0.1); box-shadow:0 0 0 1px rgba(255,255,255,0.15); color:#c8d0e0; }
${sel} .cm-fmt-comma { color: #8f97aa; margin:0 0.15em; }  /* 顶上提示行的逗号样式 */

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
    font-size:1em; line-height:1.75;
    color: #707685;  /* 行号颜色 */
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
${sel} .cm-comma    { color:#8f97aa !important; }  /* 代码中的逗号样式 */
${sel} .cm-colorval { color:#c8d0e0 !important; }
${sel} .cm-error    { color:#f87171 !important; text-decoration:underline wavy; }

${sel} .codemirror-colorview { width:0.8em; height:0.8em; position:relative; top:-1px; }

${sel} .cm-info-bar {
    display:flex; justify-content:space-between; align-items:center;
    padding:0.5em 1.25em; background:#1a1d1e; color:#6a7080;
    font-size:0.8125em; border-top:1px solid rgba(255,255,255,0.06);
    flex-shrink:0; gap:1em; }
${sel} .cm-status-hint { color: rgb(168, 169, 184); flex:1; }  /* 提示文本颜色 */
${sel} .cm-error-count { padding:0.4em 0.75em; border-radius:2em; white-space:nowrap; flex-shrink:0; }
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
        const t0 = this._t;
        this._fmtBar.innerHTML = `
            <span class="cm-fmt-item" data-col="0">${t0.fmtToken}</span>
            <span class="cm-fmt-comma">,</span>
            <span class="cm-fmt-item" data-col="1">${t0.fmtFg}</span>
            <span class="cm-fmt-comma">,</span>
            <span class="cm-fmt-item" data-col="2">${t0.fmtBg}</span>`;
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
        const t1 = this._t;
        this._infoBar.innerHTML = `
            <span class="cm-status-hint">${t1.hint}</span>
            <span class="cm-error-count no-errors">${t1.noErrors}</span>`;
        this.appendChild(this._infoBar);
        this._errorCounter = this._infoBar.querySelector('.cm-error-count');
        this._statusHint   = this._infoBar.querySelector('.cm-status-hint');
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
            const r = _parseLine(raw, this._t);
            if (!r) return;
            if (r.error) { this._lineErrors.set(lineNo, { msg: r.msg, from: r.from, to: r.to }); return; }

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
        const t = this._t;
        this._errorCounter.textContent = n ? t.errorCount(n) : t.noErrors;
        this._errorCounter.className   = `cm-error-count ${n ? 'has-errors' : 'no-errors'}`;

        const errors = Array.from(this._lineErrors.entries()).map(([line, e]) => ({ line, msg: e.msg }));
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
            const err = this._lineErrors.get(pos.line);
            const tip = this._tooltip;
            if (err) {
                // 把出错字符范围转成像素矩形，判断鼠标是否在其中
                const startCoords = cm.charCoords({ line: pos.line, ch: err.from }, 'window');
                const endCoords   = cm.charCoords({ line: pos.line, ch: err.to   }, 'window');
                const inRange = e.clientX >= startCoords.left
                             && e.clientX <= endCoords.right
                             && e.clientY >= startCoords.top
                             && e.clientY <= startCoords.bottom;
                if (inRange) {
                    tip.textContent = err.msg;
                    tip.style.display = 'block';
                    tip.style.left = (e.clientX + 14) + 'px';
                    tip.style.top  = (e.clientY + 14) + 'px';
                    const rect = tip.getBoundingClientRect();
                    if (rect.right > window.innerWidth - 8)
                        tip.style.left = (e.clientX - rect.width - 8) + 'px';
                    return;
                }
            }
            tip.style.display = 'none';
        });
        wrapper.addEventListener('mouseleave', () => { this._tooltip.style.display = 'none'; });

        cm.on('blur', () => {
            this._fmtItems.forEach(el => el.classList.remove('active'));
        });
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
