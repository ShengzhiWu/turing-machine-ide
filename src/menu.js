// ── Menu bar UI ──────────────────────────────────────────────────────
// 依赖：i18n.js（t()、MENU_I18N）、file.js（saveProject 等）

const SPECIAL_STATES = new Set(['start', 'end', 'error']);

function splitCodeAndComment(line) {
    let inStr = false;
    for (let i = 0; i < line.length - 1; i++) {
        const ch = line[i];
        if (ch === '"') inStr = !inStr;
        if (!inStr && ch === '/' && line[i + 1] === '/') {
            return { code: line.slice(0, i), comment: line.slice(i) };
        }
    }
    return { code: line, comment: '' };
}

function splitElementsKeepRaw(codePart) {
    const elements = [];
    let inStr = false;
    let cur = '';
    for (let i = 0; i < codePart.length; i++) {
        const ch = codePart[i];
        if (ch === '"') inStr = !inStr;
        if (ch === ',' && !inStr) {
            elements.push(cur);
            cur = '';
        } else {
            cur += ch;
        }
    }
    elements.push(cur);
    return elements;
}

function updateGraphLabelsAfterStateRename(mapping) {
    if (typeof graph === 'undefined' || !Array.isArray(graph) || mapping.size === 0) return;

    const getDisplayName = rawName => {
        if (rawName.startsWith('end')) return 'end';
        if (rawName.startsWith('error')) return 'error';
        return rawName;
    };

    graph.forEach(node => {
        if (!Array.isArray(node) || typeof node[0] !== 'string') return;
        if (!node[0].startsWith('self-connection') && mapping.has(node[0])) {
            node[0] = mapping.get(node[0]);
        }
        const displayName = getDisplayName(node[0]);
        node._display_name = displayName;
        if (node._dom && node._dom.name) node._dom.name.textContent = displayName;
    });

    if (typeof highlighted_vertex_name === 'string' && mapping.has(highlighted_vertex_name)) {
        highlighted_vertex_name = mapping.get(highlighted_vertex_name);
    }
}

function askPrefixSuffixForStateRename() {
    const overlay = document.getElementById('rename-state-overlay');
    const titleEl = document.getElementById('rename-state-title');
    const prefixLabel = document.getElementById('rename-prefix-label');
    const suffixLabel = document.getElementById('rename-suffix-label');
    const prefixInput = document.getElementById('rename-prefix-input');
    const suffixInput = document.getElementById('rename-suffix-input');
    const cancelBtn = document.getElementById('rename-state-cancel-btn');
    const applyBtn = document.getElementById('rename-state-apply-btn');

    titleEl.textContent = t('renamePrefixSuffixTitle');
    prefixLabel.textContent = t('renamePrefixLabel');
    suffixLabel.textContent = t('renameSuffixLabel');
    prefixInput.placeholder = t('renamePrefixPlaceholder');
    suffixInput.placeholder = t('renameSuffixPlaceholder');
    cancelBtn.textContent = t('renameCancelBtn');
    applyBtn.textContent = t('renameApplyBtn');

    prefixInput.value = '';
    suffixInput.value = '';
    overlay.classList.add('visible');

    return new Promise(resolve => {
        const cleanup = () => {
            overlay.classList.remove('visible');
            overlay.removeEventListener('mousedown', onOverlayMouseDown);
            cancelBtn.removeEventListener('click', onCancel);
            applyBtn.removeEventListener('click', onApply);
            document.removeEventListener('keydown', onKeyDown);
        };

        const onCancel = () => {
            cleanup();
            resolve(null);
        };

        const onApply = () => {
            const result = {
                prefix: prefixInput.value,
                suffix: suffixInput.value,
            };
            cleanup();
            resolve(result);
        };

        const onOverlayMouseDown = e => {
            if (e.target === overlay) onCancel();
        };

        const onKeyDown = e => {
            if (!overlay.classList.contains('visible')) return;
            if (e.key === 'Escape') {
                e.preventDefault();
                onCancel();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                onApply();
            }
        };

        overlay.addEventListener('mousedown', onOverlayMouseDown);
        cancelBtn.addEventListener('click', onCancel);
        applyBtn.addEventListener('click', onApply);
        document.addEventListener('keydown', onKeyDown);

        setTimeout(() => prefixInput.focus(), 0);
    });
}

async function renameStatesByPrefixSuffix() {
    const input = await askPrefixSuffixForStateRename();
    if (!input) return;

    const prefix = input.prefix;
    const suffix = input.suffix;
    if (prefix === '' && suffix === '') return;

    const text = code_editor.value || '';
    const lines = text.split('\n');
    const mapping = new Map();

    // 收集第1元和第5元中出现的状态名，排除特殊状态
    for (const line of lines) {
        const { code } = splitCodeAndComment(line);
        if (code.trim() === '') continue;
        const elements = splitElementsKeepRaw(code);
        [0, 4].forEach(idx => {
            if (idx >= elements.length) return;
            const stateName = elements[idx].trim();
            if (!stateName || SPECIAL_STATES.has(stateName) || mapping.has(stateName)) return;
            mapping.set(stateName, `${prefix}${stateName}${suffix}`);
        });
    }

    if (mapping.size === 0) return;

    const newLines = lines.map(line => {
        const { code, comment } = splitCodeAndComment(line);
        if (code.trim() === '') return line;

        const elements = splitElementsKeepRaw(code);
        if (elements.length === 0) return line;

        const rewriteAt = idx => {
            if (idx >= elements.length) return;
            const raw = elements[idx];
            const trimmed = raw.trim();
            if (!trimmed || SPECIAL_STATES.has(trimmed) || !mapping.has(trimmed)) return;
            elements[idx] = raw.replace(trimmed, mapping.get(trimmed));
        };

        rewriteAt(0);
        rewriteAt(4);

        return elements.join(',') + comment;
    });

    const newText = newLines.join('\n');
    if (newText === text) return;

    code_editor.value = newText;
    code_editor_value = newText;
    codeModified = true;
    updateGraphLabelsAfterStateRename(mapping);
}

function renameStatesByFirstElementOrder() {
    const text = code_editor.value || '';
    const lines = text.split('\n');
    const mapping = new Map();
    let nextIndex = 0;

    // 第一步：按“第一元”的首次出现顺序收集状态
    for (const line of lines) {
        const { code } = splitCodeAndComment(line);
        if (code.trim() === '') continue;
        const elements = splitElementsKeepRaw(code);
        if (elements.length === 0) continue;

        const first = elements[0].trim();
        if (!first || SPECIAL_STATES.has(first) || mapping.has(first)) continue;
        mapping.set(first, String(nextIndex));
        nextIndex++;
    }

    if (mapping.size === 0) return;

    // 第二步：替换所有状态位（第1元和第5元）
    const newLines = lines.map(line => {
        const { code, comment } = splitCodeAndComment(line);
        if (code.trim() === '') return line;

        const elements = splitElementsKeepRaw(code);
        if (elements.length === 0) return line;

        const rewriteAt = idx => {
            if (idx >= elements.length) return;
            const raw = elements[idx];
            const trimmed = raw.trim();
            if (!trimmed || SPECIAL_STATES.has(trimmed) || !mapping.has(trimmed)) return;
            elements[idx] = raw.replace(trimmed, mapping.get(trimmed));
        };

        rewriteAt(0);
        rewriteAt(4);

        return elements.join(',') + comment;
    });

    const newText = newLines.join('\n');
    if (newText === text) return;

    code_editor.value = newText;
    code_editor_value = newText;
    codeModified = true;
    updateGraphLabelsAfterStateRename(mapping);
}

// ── Menu bar rendering ───────────────────────────────────────────────

function buildMenuBar() {
    const bar = document.getElementById('menu-bar');
    bar.innerHTML = '';

    const menus = [
        {
            label: t('file'),
            items: [
                { label: t('openProject'),   action: openProject,   shortcut: 'Ctrl+O' },
                { label: t('saveProject'),   action: saveProject,   shortcut: 'Ctrl+S' },
                { label: t('saveProjectAs'), action: saveProjectAs, shortcut: 'Ctrl+Shift+S' },
                { label: t('saveEmbedding'), action: saveEmbedding },
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
                            submenu: (() => {
                                const opts = [
                                    { code: 'zh', labelKey: 'langZh' },
                                    { code: 'en', labelKey: 'langEn' },
                                    { code: 'zh-tw', labelKey: 'langZhTW' },
                                    { code: 'ru', labelKey: 'langRu' },
                                    { code: 'fr', labelKey: 'langFr' },
                                    { code: 'de', labelKey: 'langDe' },
                                    { code: 'it', labelKey: 'langIt' },
                                    { code: 'ja', labelKey: 'langJa' },
                                    { code: 'ko', labelKey: 'langKo' },
                                    { code: 'es', labelKey: 'langEs' },
                                    { code: 'hi', labelKey: 'langHi' },
                                    { code: 'pt', labelKey: 'langPt' },
                                    { code: 'id', labelKey: 'langId' },
                                    { code: 'th', labelKey: 'langTh' },
                                    { code: 'vi', labelKey: 'langVi' },
                                    { code: 'eo', labelKey: 'langEo' },
                                ];
                                return opts.map(({ code, labelKey }) => ({
                                    label: t(labelKey),
                                    checked: () => language === code,
                                    action: () => switchLanguage(code)
                                }));
                            })()
                        },
                    ]
                },
            ]
        },
        {
            label: t('edit'),
            items: [
                {
                    label: t('stateRename'),
                    submenu: [
                        { label: t('renameStateByFirstElemOrder'), action: renameStatesByFirstElementOrder },
                        { label: t('renameStateByPrefixSuffix'), action: renameStatesByPrefixSuffix }
                    ]
                }
            ]
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
                if (entry.shortcut) {
                    di.appendChild(Object.assign(document.createElement('span'), {
                        textContent: entry.shortcut,
                        style: 'margin-left: auto; padding-left: 24px; opacity: 0.5; font-size: 11px; pointer-events: none;'
                    }));
                }

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
    if (typeof hideGraphContextMenu === 'function') hideGraphContextMenu();
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
