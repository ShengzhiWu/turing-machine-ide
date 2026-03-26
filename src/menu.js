// ── Menu bar UI ──────────────────────────────────────────────────────
// 依赖：i18n.js（t()、MENU_I18N）、file.js（saveProject 等）
// 以及全局变量：language, examples, example, codeModified, styleModified,
//   code_editor, code_editor_value, style_editor, result_table_style
// 依赖函数：parseStyleCode(), menuRenderAnimation()

// ── Menu bar rendering ───────────────────────────────────────────────

function buildMenuBar() {
    const bar = document.getElementById('menu-bar');
    bar.innerHTML = '';

    const menus = [
        {
            label: t('file'),
            items: [
                { label: t('openProject'),   action: openProject },
                { label: t('saveProject'),   action: saveProject },
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
                                action: () => loadExample(key)
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

    // Recursively remove submenu-open from all descendants
    function closeSubmenusIn(container) {
        container.querySelectorAll('.submenu-open').forEach(el => el.classList.remove('submenu-open'));
    }

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

                // Clicking a submenu trigger should not bubble up to .menu-item
                di.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });

                // Hover: close sibling submenus, open this one
                di.addEventListener('mouseenter', () => {
                    Array.from(container.children).forEach(sibling => {
                        if (sibling !== di && sibling.classList.contains('submenu-open')) {
                            closeSubmenusIn(sibling);
                            sibling.classList.remove('submenu-open');
                        }
                    });
                    di.classList.add('submenu-open');
                });
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

                // Hover: close any open sibling submenus
                di.addEventListener('mouseenter', () => {
                    Array.from(container.children).forEach(sibling => {
                        if (sibling.classList.contains('submenu-open')) {
                            closeSubmenusIn(sibling);
                            sibling.classList.remove('submenu-open');
                        }
                    });
                });

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
    document.querySelectorAll('.submenu-open').forEach(el => el.classList.remove('submenu-open'));
}

// ── About dialog ─────────────────────────────────────────────────────

function menuAbout() {
    document.getElementById('about-title').textContent        = t('aboutTitle');
    document.getElementById('about-version-line').textContent = t('aboutVersion');
    document.getElementById('about-body').innerHTML           = t('aboutBody');
    document.getElementById('about-close-btn').textContent    = t('closeBtn');
    document.getElementById('about-overlay').classList.add('visible');
}

function closeAbout() {
    document.getElementById('about-overlay').classList.remove('visible');
}

// Close about dialog when clicking outside
document.getElementById('about-overlay').addEventListener('mousedown', function(e) {
    if (e.target === this) closeAbout();
});

// ── Language switching ────────────────────────────────────────────────

function applyLanguageToUI() {
    const runBtn = document.getElementById('run-btn');
    if (runBtn) runBtn.title = ' ' + t('runBtnTitle');

    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) refreshBtn.title = t('refreshBtnTitle');

    const maxStepsLabel = document.getElementById('max-steps-label');
    if (maxStepsLabel) maxStepsLabel.textContent = t('maxSteps');

    const resultFilterLabel = document.getElementById('result-filter-label');
    if (resultFilterLabel) resultFilterLabel.textContent = t('resultFilterLabel');

    // 更新下拉列表各选项文案
    const filterOptMap = {
        'result-filter-opt-all':          'resultFilterAll',
        'result-filter-opt-only-changes': 'resultFilterOnlyChanges',
        'result-filter-opt-every-100':    'resultFilterEvery100',
        'result-filter-opt-every-1000':   'resultFilterEvery1000',
        'result-filter-opt-every-10000':  'resultFilterEvery10000',
        'result-filter-opt-every-100000': 'resultFilterEvery100000',
        'result-filter-opt-every-1000000':'resultFilterEvery1000000',
        'result-filter-opt-every-10000000':'resultFilterEvery10000000',
        'result-filter-opt-every-100000000':'resultFilterEvery100000000',
        'result-filter-opt-every-1000000000':'resultFilterEvery1000000000',
        'result-filter-opt-head-tail':    'resultFilterHeadTail',
    };
    for (const [id, key] of Object.entries(filterOptMap)) {
        const el = document.getElementById(id);
        if (el) el.textContent = t(key);
    }

    const tailStepsLabel = document.getElementById('tail-steps-label');
    if (tailStepsLabel) tailStepsLabel.textContent = t('tailStepsLabel');

    const tailStepsOptMap = {
        'tail-steps-opt-0':    'tailSteps0',
        'tail-steps-opt-1':    'tailSteps1',
        'tail-steps-opt-10':   'tailSteps10',
        'tail-steps-opt-100':  'tailSteps100',
        'tail-steps-opt-1000': 'tailSteps1000',
    };
    for (const [id, key] of Object.entries(tailStepsOptMap)) {
        const el = document.getElementById(id);
        if (el) el.textContent = t(key);
    }

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

    const graphHintPan = document.getElementById('graph-hint-pan');
    if (graphHintPan) graphHintPan.textContent = t('mouseHintPan');

    const graphHintRotate = document.getElementById('graph-hint-rotate');
    if (graphHintRotate) graphHintRotate.textContent = t('mouseHintRotate');

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
