// ── Internationalisation ─────────────────────────────────────────────

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
        saveProjectAs:  '另存为',
        saveEmbedding:  '保存图嵌入',
        about:          '关于',
        aboutTitle:     'Turing Machine IDE',
        aboutVersion:   '版本 1.2',
        aboutBody:      `<p>这是一款基于 Electron 的图灵机程序编写与调试工具。</p>
                            <p>您可以在左侧代码面板中编写图灵机程序，在中间面板中查看状态转移图，在右侧面板中观察纸带的运行历史。</p>
                            <p><b>开发者：</b>武圣智<br>
                            <b>许可证：</b>GPL-3.0</p>`,
        closeBtn:       '关闭',
        saveDialogTitle:'保存工程',
        embedDialogTitle:'保存图嵌入',
        openDialogTitle: '打开工程',
        maxSteps:       '最大步数',
        runBtnTitle:    '运行程序 (F5)',
        refreshBtnTitle:'重置图嵌入',
        renderAnim:              '渲染动画',
        renderSecSize:           '尺寸',
        renderSecTiming:         '节奏',
        renderSecStyle:          '视觉样式',
        renderSecMusic:          '音乐',
        renderSecOutput:         '输出',
        renderLabelWidth:        '宽度',
        renderLabelHeight:       '高度',
        renderLabelFps:          '帧率（fps）',
        renderLabelMoveFrames:   '机头移动帧数',
        renderLabelPauseFrames:  '停顿帧数',
        renderLabelHalflife:     '高亮半衰期（帧）',
        renderLabelTotalFrames:  '总帧数：',
        renderLabelTotalDuration: '总时长：',
        renderDurationHour:      '小时',
        renderDurationMinute:    '分钟',
        renderDurationSecond:    '秒',
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
        renderMovementModeTape:  '机头固定，纸带移动',
        renderMovementModeHead:  '纸带固定，机头移动',
        resultFilterLabel:       '结果过滤器',
        resultFilterAll:         '所有',
        resultFilterOnlyChanges: '仅纸带变化的步',
        resultFilterEvery100:    '每 10² 步',
        resultFilterEvery1000:   '每 10³ 步',
        resultFilterEvery10000:  '每 10⁴ 步',
        resultFilterEvery100000: '每 10⁵ 步',
        resultFilterEvery1000000:'每 10⁶ 步',
        resultFilterEvery10000000:'每 10⁷ 步',
        resultFilterEvery100000000:'每 10⁸ 步',
        resultFilterEvery1000000000:'每 10⁹ 步',
        resultFilterHeadTail:    '仅开头和结尾',
        tailStepsLabel:          '末尾保留步数',
        tailSteps0:              '0 步',
        tailSteps1:              '1 步',
        tailSteps10:             '10 步',
        tailSteps100:            '100 步',
        tailSteps1000:           '1000 步',
        minimalMode:             '极简模式',
        pixelScaleX:             '横向缩放',
        pixelScaleY:             '纵向缩放',
        saveTableData:           '保存表格数据',
        saveAsImage:             '保存为图片',
        mouseHintPan:            '中键拖动：平移画布',
        mouseHintRotate:         'Alt + 左键拖动：旋转画布',
        unsavedTitle:            '未保存的修改',
        unsavedMessage:          '当前工程有未保存的修改，是否在打开前保存？',
        unsavedSave:             '保存',
        unsavedDiscard:          '不保存',
        unsavedCancel:           '取消',
        tapeHintTabNext:         'Tab：下一格',
        tapeHintShiftTabPrev:    'Shift + Tab：上一格',
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
        saveProjectAs:  'Save Project As',
        saveEmbedding:  'Save Graph Embedding',
        about:          'About',
        aboutTitle:     'Turing Machine IDE',
        aboutVersion:   'Version 1.2',
        aboutBody:      `<p>A Turing machine programming and debugging tool built with Electron.</p>
                            <p>Write your Turing machine program in the code panel on the left, inspect the state-transition graph in the centre, and trace the tape history on the right.</p>
                            <p><b>Developer:</b>Shengzhi Wu<br>
                            <b>License:</b> GPL-3.0</p>`,
        closeBtn:       'Close',
        saveDialogTitle:'Save Project',
        embedDialogTitle:'Save Graph Embedding',
        openDialogTitle: 'Open Project',
        maxSteps:       'Max steps',
        runBtnTitle:    'Run Program (F5)',
        refreshBtnTitle:'Initialize Graph Embedding',
        renderAnim:              'Render Animation',
        renderSecSize:           'Size',
        renderSecTiming:         'Timing',
        renderSecStyle:          'Visual Style',
        renderSecMusic:          'Music',
        renderSecOutput:         'Output',
        renderLabelWidth:        'Width',
        renderLabelHeight:       'Height',
        renderLabelFps:          'Frame rate (fps)',
        renderLabelMoveFrames:   'Move frames',
        renderLabelPauseFrames:  'Pause frames',
        renderLabelHalflife:     'Highlight half-life (frames)',
        renderLabelTotalFrames:  'Total frames: ',
        renderLabelTotalDuration: 'Duration: ',
        renderDurationHour:      'h',
        renderDurationMinute:    'm',
        renderDurationSecond:    's',
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
        renderMovementModeTape:  'Head fixed, tape moves',
        renderMovementModeHead:  'Tape fixed, head moves',
        resultFilterLabel:       'Result filter',
        resultFilterAll:         'All',
        resultFilterOnlyChanges: 'Tape-change steps only',
        resultFilterEvery100:    'Every 10² steps',
        resultFilterEvery1000:   'Every 10³ steps',
        resultFilterEvery10000:  'Every 10⁴ steps',
        resultFilterEvery100000: 'Every 10⁵ steps',
        resultFilterEvery1000000:'Every 10⁶ steps',
        resultFilterEvery10000000:'Every 10⁷ steps',
        resultFilterEvery100000000:'Every 10⁸ steps',
        resultFilterEvery1000000000:'Every 10⁹ steps',
        resultFilterHeadTail:    'First and last only',
        tailStepsLabel:          'Tail steps retained',
        tailSteps0:              '0 steps',
        tailSteps1:              '1 step',
        tailSteps10:             '10 steps',
        tailSteps100:            '100 steps',
        tailSteps1000:           '1000 steps',
        minimalMode:             'Minimal mode',
        pixelScaleX:             'H scale',
        pixelScaleY:             'V scale',
        saveTableData:           'Save table data',
        saveAsImage:             'Save as image',
        mouseHintPan:            'Middle-click drag: move',
        mouseHintRotate:         'Alt + left drag: rotate',
        unsavedTitle:            'Unsaved Changes',
        unsavedMessage:          'The current project has unsaved changes. Save before opening?',
        unsavedSave:             'Save',
        unsavedDiscard:          "Don't Save",
        unsavedCancel:           'Cancel ',  // 这里加一个空格是因为如果不这样做，Cancel作为特殊字符串会被系统识别导致界面显示异常
        tapeHintTabNext:         'Tab: next cell',
        tapeHintShiftTabPrev:    'Shift + Tab: previous cell',
    }
};

function t(key) {  // 带默认语言的多语言支持文本查询函数
    const lang = (typeof language !== 'undefined') ? language : 'en';
    return (MENU_I18N[lang] || MENU_I18N['en'])[key] || MENU_I18N['en'][key] || key;
}

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
    if (typeof updateTapeEditHintText === 'function') updateTapeEditHintText();
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
