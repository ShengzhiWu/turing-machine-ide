// ── Menu bar, i18n, file I/O, language switching ───────────────────────────

const MENU_I18N = {
    zh: {
        file:           '文件',
        edit:           '编辑',
        help:           '帮助',
        preferences:    '偏好',
        language:       '语言',
        langZh:         '中文',
        langEn:         'English',
        examples:       '样例',
        openProject:    '打开工程',
        saveProject:    '保存工程',
        saveEmbedding:  '保存图嵌入',
        about:          '关于',
        aboutTitle:     'Turing Machine IDE',
        aboutVersion:   '版本 1.0',
        aboutBody:      `<p>这是一款基于 Electron 的图灵机程序编写与调试工具。</p>
                            <p>您可以在左侧代码面板中编写图灵机程序，在中间面板中查看状态转移图，在右侧面板中观察纸带的运行历史。</p>
                            <p><b>开发者：</b>武圣智<br>
                            <b>许可证：</b>MIT</p>`,
        closeBtn:       '关闭',
        saveDialogTitle:'保存工程',
        embedDialogTitle:'保存图嵌入',
        openDialogTitle: '打开工程',
        maxSteps:       '最大步数',
        runBtnTitle:    '运行程序 (F5)',
        refreshBtnTitle:'重置图嵌入',
        renderAnim:              '渲染动画…',
        renderDialogTitle:       '渲染动画',
        renderSecSize:           '尺寸',
        renderSecTiming:         '节奏',
        renderSecStyle:          '视觉样式',
        renderSecMusic:          '音乐',
        renderSecOutput:         '输出路径',
        renderLabelWidth:        '宽度',
        renderLabelHeight:       '高度',
        renderLabelFps:          '帧率（fps）',
        renderLabelMoveFrames:   '机头移动帧数',
        renderLabelPauseFrames:  '停顿帧数',
        renderLabelHalflife:     '高亮半衰期（帧）',
        renderLabelTotalFrames:  '总帧数：',
        renderLabelRenderImage:  '渲染图像帧',
        renderLabelGraphicScale: '图形缩放',
        renderLabelRenderMusic:  '导出音频',
        renderLabelMusicMode:    '音阶',
        renderLabelMusicRoot:    '根音',
        renderLabelMusicLo:      '最低音（范围）',
        renderLabelMusicHi:      '最高音（范围）',
        renderLabelMusicSeed:    '随机种子',
        renderLabelMusicSamples: '钢琴采样文件夹',
        renderBtnMusicPreview:   '▶ 试听',
        renderBrowse:            '…',
        renderStart:             '渲染',
        renderClose:             '关闭',
        renderOutputPlaceholder:       '选择输出文件夹',
        renderBrowseTitle:             '选择输出文件夹',
        renderMusicBrowseTitle:        '选择钢琴采样文件夹',
        renderMusicSamplesPlaceholder: '（留空则使用合成器）',
        renderMusicBaking:       '生成中…',
        renderMusicPlaying:      '播放中…',
        renderMusicDecodeError:  '解码错误',
        renderAlertNoOutput:     '请选择输出文件夹。',
        renderAlertNothingEnabled: '请至少启用以下选项之一：渲染图像帧 或 导出音频。',
        renderSettingsTitle:     '渲染设置',
        renderMusicModeMajor:    '大调',
        renderMusicModeMinor:    '小调（自然）',
        renderRendering:         '渲染中…',
        renderDone:              '渲染完成',
        // ── 新增 ──
        detailedOutput:          '仅记录纸带有变化的步',
        minimalMode:             '极简模式',
        pixelScaleX:             '横向缩放',
        pixelScaleY:             '纵向缩放',
        saveTableData:           '保存表格数据',
        saveAsImage:             '保存为图片',
    },
    en: {
        file:           'File',
        edit:           'Edit',
        help:           'Help',
        preferences:    'Preferences',
        language:       'Language',
        langZh:         '中文',
        langEn:         'English',
        examples:       'Examples',
        openProject:    'Open Project',
        saveProject:    'Save Project',
        saveEmbedding:  'Save Graph Embedding',
        about:          'About',
        aboutTitle:     'Turing Machine IDE',
        aboutVersion:   'Version 1.0',
        aboutBody:      `<p>A Turing machine programming and debugging tool built with Electron.</p>
                            <p>Write your Turing machine program in the code panel on the left, inspect the state-transition graph in the centre, and trace the tape history on the right.</p>
                            <p><b>Developer:</b>Shengzhi Wu<br>
                            <b>License:</b> MIT</p>`,
        closeBtn:       'Close',
        saveDialogTitle:'Save Project',
        embedDialogTitle:'Save Graph Embedding',
        openDialogTitle: 'Open Project',
        maxSteps:       'Max steps',
        runBtnTitle:    'Run Program (F5)',
        refreshBtnTitle:'Initialize Graph Embedding',
        renderAnim:              'Render Animation…',
        renderDialogTitle:       'Render Animation',
        renderSecSize:           'Size',
        renderSecTiming:         'Timing',
        renderSecStyle:          'Visual Style',
        renderSecMusic:          'Music',
        renderSecOutput:         'Output Path',
        renderLabelWidth:        'Width',
        renderLabelHeight:       'Height',
        renderLabelFps:          'Frame rate (fps)',
        renderLabelMoveFrames:   'Move frames',
        renderLabelPauseFrames:  'Pause frames',
        renderLabelHalflife:     'Highlight half-life (frames)',
        renderLabelTotalFrames:  'Total frames: ',
        renderLabelRenderImage:  'Render image frames',
        renderLabelGraphicScale: 'Graphic scale',
        renderLabelRenderMusic:  'Export audio',
        renderLabelMusicMode:    'Scale',
        renderLabelMusicRoot:    'Root note',
        renderLabelMusicLo:      'Low note (range)',
        renderLabelMusicHi:      'High note (range)',
        renderLabelMusicSeed:    'Random seed',
        renderLabelMusicSamples: 'Piano samples folder',
        renderBtnMusicPreview:   '▶ Preview',
        renderBrowse:            '…',
        renderStart:             'Render',
        renderClose:             'Close',
        renderOutputPlaceholder:       'Select output folder',
        renderBrowseTitle:             'Select output folder',
        renderMusicBrowseTitle:        'Select Piano Samples Folder',
        renderMusicSamplesPlaceholder: '(leave blank to use synth)',
        renderMusicBaking:       'Baking…',
        renderMusicPlaying:      'Playing…',
        renderMusicDecodeError:  'Decode error',
        renderAlertNoOutput:     'Please choose an output folder.',
        renderAlertNothingEnabled: 'Please enable at least one of: Render image frames or Export audio.',
        renderSettingsTitle:     'Render Settings',
        renderMusicModeMajor:    'Major',
        renderMusicModeMinor:    'Minor (natural)',
        renderRendering:         'Rendering…',
        renderDone:              'Done',
        // ── 新增 ──
        detailedOutput:          'Record only steps where tape changes',
        minimalMode:             'Minimal mode',
        pixelScaleX:             'H scale',
        pixelScaleY:             'V scale',
        saveTableData:           'Save table data',
        saveAsImage:             'Save as image',
    }
};

function t(key) {
    const lang = (typeof language !== 'undefined') ? language : 'en';
    return (MENU_I18N[lang] || MENU_I18N['en'])[key] || MENU_I18N['en'][key] || key;
}

// ── Menu bar rendering ───────────────────────────────────────────────
function buildMenuBar() {
    const bar = document.getElementById('menu-bar');
    bar.innerHTML = '';

    const menus = [
        {
            label: t('file'),
            items: [
                { label: t('openProject'),   action: menuOpenProject },
                { label: t('saveProject'),   action: menuSaveProject },
                { label: t('saveEmbedding'), action: menuSaveEmbedding },
                'separator',
                { label: t('renderAnim'),    action: menuRenderAnimation },
                'separator',
                {
                    label: t('examples'),
                    submenu: (() => {
                        // 将 examples 按 category 组织成嵌套树
                        // category 形如 "A/B/"，以 "/" 分割，忽略末尾空段
                        // category 缺失或为空字符串则放在顶层
                        function insertIntoTree(node, pathSegments, leafItem) {
                            if (pathSegments.length === 0) {
                                node.items.push(leafItem);
                                return;
                            }
                            const seg = pathSegments[0];
                            let child = node.children[seg];
                            if (!child) {
                                child = { items: [], children: {}, childOrder: [] };
                                node.children[seg] = child;
                                node.childOrder.push(seg);
                            }
                            insertIntoTree(child, pathSegments.slice(1), leafItem);
                        }

                        function treeToSubmenu(node) {
                            const result = [];
                            // 先输出分类子菜单（字典序）
                            for (const seg of [...node.childOrder].sort((a, b) => a.localeCompare(b))) {
                                result.push({
                                    label: seg,
                                    submenu: treeToSubmenu(node.children[seg])
                                });
                            }
                            // 再输出本层的叶子项（字典序）
                            for (const item of [...node.items].sort((a, b) => a.label.localeCompare(b.label))) {
                                result.push(item);
                            }
                            return result;
                        }

                        const root = { items: [], children: {}, childOrder: [] };
                        for (const key of Object.keys(examples)) {
                            const ex = examples[key];
                            const leafItem = {
                                label: (ex['name'][language] || ex['name']['en']),
                                action: () => menuLoadExample(key)
                            };
                            const rawCategory = ex['category']
                                ? (ex['category'][language] || ex['category']['en'] || '')
                                : '';
                            // 按 "/" 分割，过滤空段
                            const segments = rawCategory.split('/').filter(s => s !== '');
                            insertIntoTree(root, segments, leafItem);
                        }

                        return treeToSubmenu(root);
                    })()
                },
                'separator',
                {
                    label: t('preferences'),
                    submenu: [
                        {
                            label: t('language'),
                            submenu: [
                                {
                                    label: t('langZh'),
                                    checked: () => language === 'zh',
                                    action: () => switchLanguage('zh')
                                },
                                {
                                    label: t('langEn'),
                                    checked: () => language === 'en',
                                    action: () => switchLanguage('en')
                                },
                            ]
                        },
                    ]
                },
            ]
        },
        {
            label: t('edit'),
            items: []  // 暂时空着
        },
        {
            label: t('help'),
            items: [
                { label: t('about'), action: menuAbout },
            ]
        }
    ];

    function buildMenuItems(items, container, isSubmenu = false) {
        items.forEach(entry => {
            if (entry === 'separator') {
                const sep = document.createElement('hr');
                sep.className = 'menu-dropdown-separator';
                container.appendChild(sep);
                return;
            }
            const di = document.createElement('div');
            if (entry.submenu) {
                di.className = (isSubmenu ? 'menu-submenu-item' : 'menu-dropdown-item') + ' has-submenu';
                di.appendChild(Object.assign(document.createElement('span'), { textContent: entry.label }));
                const sub = document.createElement('div');
                sub.className = 'menu-submenu';
                buildMenuItems(entry.submenu, sub, true);
                di.appendChild(sub);
            } else {
                di.className = isSubmenu ? 'menu-submenu-item' : 'menu-dropdown-item';
                if (isSubmenu) {
                    const check = Object.assign(document.createElement('span'), {
                        className: 'checkmark',
                        textContent: entry.checked && entry.checked() ? '✓' : ''
                    });
                    di.appendChild(check);
                }
                di.appendChild(Object.assign(document.createElement('span'), { textContent: entry.label }));
                di.addEventListener('mousedown', e => {
                    e.preventDefault(); e.stopPropagation();
                    closeAllMenus();
                    entry.action();
                });
            }
            container.appendChild(di);
        });
    }

    menus.forEach(menu => {
        const item = document.createElement('div');
        item.className = 'menu-item';
        item.textContent = menu.label;

        if (menu.items.length > 0) {
            const dropdown = document.createElement('div');
            dropdown.className = 'menu-dropdown';

            buildMenuItems(menu.items, dropdown);

            item.appendChild(dropdown);
        }

        item.addEventListener('mousedown', e => {
            e.preventDefault();
            const wasActive = item.classList.contains('active');
            closeAllMenus();
            if (!wasActive) item.classList.add('active');
        });

        bar.appendChild(item);
    });

    // Click outside → close
    document.addEventListener('mousedown', e => {
        if (!bar.contains(e.target)) closeAllMenus();
    });
}

function closeAllMenus() {
    document.querySelectorAll('.menu-item.active').forEach(el => el.classList.remove('active'));
}

// ── About dialog ─────────────────────────────────────────────────────
function menuAbout() {
    document.getElementById('about-title').textContent   = t('aboutTitle');
    document.getElementById('about-version-line').textContent = t('aboutVersion');
    document.getElementById('about-body').innerHTML      = t('aboutBody');
    document.getElementById('about-close-btn').textContent = t('closeBtn');
    document.getElementById('about-overlay').classList.add('visible');
}

function closeAbout() {
    document.getElementById('about-overlay').classList.remove('visible');
}

// Close about dialog when clicking outside
document.getElementById('about-overlay').addEventListener('mousedown', function(e) {
    if (e.target === this) closeAbout();
});

// ── JSON project serialisation ───────────────────────────────────────

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

function getTapeInitial() {
    if (typeof tape === 'undefined') return [];
    const t = [...tape];
    while (t.length > 0 && t[t.length - 1] === '') t.pop();
    return t;
}

function buildProjectJSON() {
    return {
        version: '1.0',
        code:      (typeof code_editor_value !== 'undefined') ? code_editor_value : '',
        style:     (typeof style_editor      !== 'undefined') ? style_editor.value : '',
        embedding: getGraphEmbedding(),
        tape:      getTapeInitial(),
        "start-position": start_position,  // 机头起始位置
        "max-steps": parseInt(max_steps_input.value),  // 最大步数
        "output-filter": document.getElementById('only-changes-checkbox').checked ? 'only-changes' : 'all',  // 结果记录过滤器
        "minimal-mode": document.getElementById('minimal-mode-checkbox').checked,  // 极简模式
        "pixel-scale-x": parseInt(document.getElementById('pixel-scale-x-input').value), // 横向缩放
        "pixel-scale-y": parseInt(document.getElementById('pixel-scale-y-input').value) // 纵向缩放
    };
}

function buildEmbeddingJSON() {
    return {
        version: '1.0',
        embedding: getGraphEmbedding(),
    };
}

// ── File save / open via Electron dialog or fallback ────────────────
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

// ── Menu actions ─────────────────────────────────────────────────────
function menuSaveProject() {
    saveJSONFile(buildProjectJSON(), 'project.json');
}

function menuSaveEmbedding() {
    saveJSONFile(buildEmbeddingJSON(), 'embedding.json');
}

function menuOpenProject() {
    openJSONFile(obj => {
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
            detailed_output = obj["output-filter"] !== 'only-changes';
            document.getElementById('only-changes-checkbox').checked = !detailed_output;
        }
        if (typeof obj["minimal-mode"] === 'boolean') document.getElementById('minimal-mode-checkbox').checked = obj["minimal-mode"];
        if (typeof obj["pixel-scale-x"] === 'number') document.getElementById('pixel-scale-x-input').value = obj["pixel-scale-x"];
        if (typeof obj["pixel-scale-y"] === 'number') document.getElementById('pixel-scale-y-input').value = obj["pixel-scale-y"];


        // 重新运行
        run_program();
    });
}

function menuLoadExample(key) {
    const lang = (typeof language !== 'undefined') ? language : 'en';
    const ex = examples[key];
    example = key;  // 记录当前样例

    // 载入推荐步数
    if (ex["recommended-max-steps"])
        max_steps_input.value = ex["recommended-max-steps"];

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

// ── Language switching ────────────────────────────────────────────────
function applyLanguageToUI() {
    const runBtn = document.getElementById('run-btn');
    if (runBtn) runBtn.title = ' ' + t('runBtnTitle');

    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) refreshBtn.title = t('refreshBtnTitle');

    const maxStepsLabel = document.getElementById('max-steps-label');
    if (maxStepsLabel) maxStepsLabel.textContent = t('maxSteps');

    // ── 新增控件的文案 ──
    const detailedOutputLabel = document.getElementById('detailed-output-label');
    if (detailedOutputLabel) detailedOutputLabel.textContent = t('detailedOutput');

    const minimalModeLabel = document.getElementById('minimal-mode-label');
    if (minimalModeLabel) minimalModeLabel.textContent = t('minimalMode');

    const pixelScaleXLabel = document.getElementById('pixel-scale-x-label');
    if (pixelScaleXLabel) pixelScaleXLabel.textContent = t('pixelScaleX');

    const pixelScaleYLabel = document.getElementById('pixel-scale-y-label');
    if (pixelScaleYLabel) pixelScaleYLabel.textContent = t('pixelScaleY');

    const saveTableLabel = document.getElementById('save-table-label');
    if (saveTableLabel) saveTableLabel.textContent = t('saveTableData');

    const saveImageLabel = document.getElementById('save-image-label');
    if (saveImageLabel) saveImageLabel.textContent = t('saveAsImage');

    if (typeof code_editor !== 'undefined') code_editor.lang = language;
    if (typeof style_editor !== 'undefined') style_editor.lang = language;
}

function switchLanguage(lang) {
    language = lang;

    // 若用户未修改过代码，替换成新语言版本的样例代码
    // 若用户已修改，为了避免丢失修改，保持现有代码不变
    if (!codeModified && typeof example !== 'undefined' && examples[example]) {
        const code = examples[example]['code'][lang] || examples[example]['code']['en'];
        code_editor_value = code;
        code_editor.value = code;
    }
    if (!styleModified && typeof example !== 'undefined' && examples[example]) {
        const styleCode = examples[example]['style'][lang] || examples[example]['style']['en'];
        style_editor.value = styleCode;
        result_table_style = parseStyleCode(styleCode);
    }

    buildMenuBar();       // 重建菜单栏（含新语言的标签和勾选状态）
    applyLanguageToUI();  // 更新其他界面元素
}

// ── Render Animation ──────────────────────────────────────────────────
