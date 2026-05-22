const path = require('path');
const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const { ipcMain, dialog, Menu } = electron;

Menu.setApplicationMenu(null);  // 移除 Electron 默认菜单栏，使用应用内自定义菜单

/** Windows 任务栏/窗口图标（开发与打包后均相对于 main.js 所在目录解析） */
const APP_ICON = path.join(__dirname, 'resources', 'icon.ico');

/** 渲染设置窗口：仅本会话内记住用户调整后的宽高（关闭窗口再打开仍有效；退出应用后作废） */
const RENDER_SETTINGS_WIN_MIN = { w: 440, h: 200 };
const RENDER_SETTINGS_WIN_DEFAULT = { width: 570, height: 890 };
var renderSettingsSessionBounds = null;  // { width, height } | null

var mainWindow                 = null;
var mainWindowCloseConfirmed   = false;
var settingsWindow      = null;  // Render settings child window
var previewWindow       = null;  // Render preview child window
var currentRenderParams = null;  // Last known render settings (persisted in project file)
var mainSavedBackgroundThrottling = true;  // restore after image/audio export

/** 设置页内联脚本中的 getParams() → JSON，供关窗时读未 blur 的输入（避免子窗口 sendSync 卡顿） */
const RENDER_SETTINGS_GET_PARAMS_JS =
    '(function(){try{return JSON.stringify(getParams());}catch(x){return"";}})()';

// ── Helper: safely send to a window if it still exists ───────────────
function sendTo(win, channel, ...args) {
    if (win && !win.isDestroyed()) win.webContents.send(channel, ...args);
}

// ── Folder browser dialog ─────────────────────────────────────────────
ipcMain.handle('show-open-dialog', async (event, options) => {
    const sender = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    const result = await dialog.showOpenDialog(sender, options);
    return result;
});

// ── Open render settings window ───────────────────────────────────────
ipcMain.handle('open-render-settings', async (event, initData) => {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
        settingsWindow.focus();
        return;
    }
    // Merge any cached render params so the window reflects the last saved state
    if (currentRenderParams) {
        initData = Object.assign({}, initData, {
            params: Object.assign({}, initData && initData.params, currentRenderParams)
        });
    }
    const rsSize = renderSettingsSessionBounds || RENDER_SETTINGS_WIN_DEFAULT;
    settingsWindow = new BrowserWindow({  // 渲染设置窗口
        icon: APP_ICON,
        width: rsSize.width,
        height: rsSize.height,
        minWidth: RENDER_SETTINGS_WIN_MIN.w,
        minHeight: RENDER_SETTINGS_WIN_MIN.h,
        resizable: true,
        minimizable: false,
        maximizable: false,
        title: (initData && initData.strings && initData.strings.renderSettingsTitle) || 'Render Settings',
        parent: mainWindow,
        modal: true,  // disables main window while open
        webPreferences: { nodeIntegration: true, contextIsolation: false }
    });
    settingsWindow.setMenu(null);
    settingsWindow.loadFile('src/render-settings.html');
    settingsWindow.webContents.on('did-finish-load', () => {
        sendTo(settingsWindow, 'render-settings-init', initData);
    });
    settingsWindow.on('close', async (e) => {
        try {
            if (settingsWindow && !settingsWindow.isDestroyed()) {
                const b = settingsWindow.getBounds();
                if (b.width >= RENDER_SETTINGS_WIN_MIN.w && b.height >= RENDER_SETTINGS_WIN_MIN.h)
                    renderSettingsSessionBounds = { width: b.width, height: b.height };
            }
        } catch (_) {}

        if (settingsWindow._allowSettingsClose) return;
        e.preventDefault();

        try {
            const wc = settingsWindow && !settingsWindow.isDestroyed() ? settingsWindow.webContents : null;
            if (wc) {
                const str = await wc.executeJavaScript(RENDER_SETTINGS_GET_PARAMS_JS);
                if (typeof str === 'string' && str.length > 0) {
                    const params = JSON.parse(str);
                    currentRenderParams = params;
                    setImmediate(() => sendTo(mainWindow, 'render-settings-close-flush', params));
                }
            }
        } catch (_) { /* 页面未就绪或 JSON 异常 */ }

        settingsWindow._allowSettingsClose = true;
        if (settingsWindow && !settingsWindow.isDestroyed()) settingsWindow.close();
    });
    settingsWindow.on('closed', () => {
        settingsWindow = null;
        sendTo(mainWindow, 'render-settings-closed');
    });
});

// ── Close render settings window ─────────────────────────────────────
ipcMain.on('render-settings-close', () => {
    if (settingsWindow && !settingsWindow.isDestroyed()) settingsWindow.close();
});

// ── Params changed → relay to main window & update cache ─────────────
ipcMain.on('render-params-changed', (event, params) => {
    currentRenderParams = params;
    sendTo(mainWindow, 'render-params-changed', params);
});

/** 设置窗口初始化/回填时同步参数，不触发主窗口 markDirty */
ipcMain.on('render-params-sync', (event, params) => {
    currentRenderParams = params;
    sendTo(mainWindow, 'render-params-sync', params);
});

// ── Get render params (called by file.js when saving a project) ───────
ipcMain.handle('get-render-params', () => currentRenderParams);

// ── Set render params (called by file.js when opening a project) ──────
ipcMain.handle('set-render-params', (event, params) => {
    currentRenderParams = params;
    // If the settings window is already open, push the new values into it
    // by re-sending render-settings-init with the updated params merged in.
    if (settingsWindow && !settingsWindow.isDestroyed()) {
        sendTo(settingsWindow, 'render-settings-init', { params });
    }
});

// ── Start render → relay to main window ──────────────────────────────
ipcMain.on('render-start', (event, params) => {
    // Ensure output directory exists before starting render
    if (params.outputPath) {
        try {
            require('fs').mkdirSync(params.outputPath, { recursive: true });
        } catch (err) {
            sendTo(settingsWindow, 'render-output-path-error', err.message);
            return;
        }
    }
    sendTo(mainWindow, 'render-start', params);
});

// ── Total frames update → forward to settings window ─────────────────
ipcMain.on('render-total-frames', (event, n) => {
    sendTo(settingsWindow, 'render-total-frames', n);
});

// ── Progress update → forward to settings window ─────────────────────
ipcMain.on('render-progress', (event, data) => {
    sendTo(settingsWindow, 'render-progress', data);
});

// ── Lock/unlock settings UI ───────────────────────────────────────────
ipcMain.on('render-ui-lock', (event, locked) => {
    sendTo(settingsWindow, 'render-ui-lock', locked);
    // Also prevent closing settings window while rendering
    if (settingsWindow && !settingsWindow.isDestroyed())
        settingsWindow.setClosable(!locked);
    // Export runs in main window renderer; disable Chromium timer/visibility throttling while locked
    if (mainWindow && !mainWindow.isDestroyed()) {
        const wc = mainWindow.webContents;
        if (locked) {
            mainSavedBackgroundThrottling = wc.getBackgroundThrottling();
            wc.setBackgroundThrottling(false);
        } else {
            wc.setBackgroundThrottling(mainSavedBackgroundThrottling);
        }
    }
});

// ── Open render preview window ────────────────────────────────────────
ipcMain.handle('open-render-preview', async (event, initData) => {
    if (previewWindow && !previewWindow.isDestroyed()) {
        previewWindow.focus();
        sendTo(previewWindow, 'render-preview-init', initData);
        return;
    }
    const maxW = Math.min(Math.round(initData.width  * 0.6), 1280);
    const maxH = Math.min(Math.round(initData.height * 0.6) + 60, 800);
    previewWindow = new BrowserWindow({
        icon: APP_ICON,
        width: maxW,
        height: maxH,
        minWidth: 320,
        minHeight: 200,
        title: (initData && initData.strings && initData.strings.renderRendering) || 'Rendering…',
        parent: mainWindow,
        webPreferences: { nodeIntegration: true, contextIsolation: false }
    });
    previewWindow.setMenu(null);
    previewWindow.loadFile('src/render-preview.html');
    previewWindow.webContents.on('did-finish-load', () => {
        sendTo(previewWindow, 'render-preview-init', initData);
    });
    previewWindow.on('closed', () => { previewWindow = null; });
});

// ── Close render preview window ───────────────────────────────────────
ipcMain.on('close-render-preview', () => {
    if (previewWindow && !previewWindow.isDestroyed()) previewWindow.close();
});

// ── Music preview: main window bakes WAV, relay result to settings window ──
ipcMain.on('render-music-preview-result', (event, data) => {
    sendTo(settingsWindow, 'render-music-preview-ready', data);
});

// ── First-frame preview: main window draws → settings window shows ───
ipcMain.on('render-settings-preview-frame', (event, payload) => {
    sendTo(settingsWindow, 'render-settings-preview-frame', payload);
});

// ── Relay music-preview request from settings window to main window ──
ipcMain.on('render-music-preview', (event, params) => {
    sendTo(mainWindow, 'render-music-preview', params);
});

ipcMain.on('render-preview-dataurl', (event, dataurl) => {
    sendTo(previewWindow, 'render-preview-dataurl', dataurl);
});

// ── Forward status text to preview window ────────────────────────────
ipcMain.on('render-preview-status', (event, text) => {
    sendTo(previewWindow, 'render-preview-status', text);
    if (previewWindow && !previewWindow.isDestroyed()) previewWindow.setTitle(text);
});

// ── Window title ─────────────────────────────────────────────────────
ipcMain.on('set-title', (event, title) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setTitle(title);
});

// ── Main window close: let renderer run same unsaved flow as open-file ──
ipcMain.on('main-window-close-allowed', () => {
    mainWindowCloseConfirmed = true;
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
    mainWindowCloseConfirmed = false;
});

// ── Save project file (returns chosen path, or null if cancelled) ─────
ipcMain.handle('save-file', async (event, { defaultName, content }) => {
    const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: defaultName,
        filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (result.canceled || !result.filePath) return null;
    require('fs').writeFileSync(result.filePath, content, 'utf8');
    return result.filePath;
});

// ── Overwrite an existing file directly (no dialog) ───────────────────
ipcMain.handle('save-file-to-path', async (event, { filePath, content }) => {
    try {
        require('fs').writeFileSync(filePath, content, 'utf8');
        return true;
    } catch (err) {
        console.error('[main] save-file-to-path failed:', err);
        return false;
    }
});

// ── Confirm unsaved changes (Save / Don't Save / Cancel) ──────────────
// Returns: 'save' | 'discard' | 'cancel'
ipcMain.handle('confirm-unsaved', async (event, strings) => {
    const result = await dialog.showMessageBox(mainWindow, {
        type: 'warning',
        title:   strings.title   || 'Unsaved Changes',
        message: strings.message || 'You have unsaved changes. What would you like to do?',
        buttons: [
            strings.save    || 'Save',
            strings.discard || "Don't Save",
            strings.cancel  || 'Cancel',
        ],
        defaultId: 0,
        cancelId:  2,
    });
    return ['save', 'discard', 'cancel'][result.response];
});

// ── Open project file (returns { content, path }, or null if cancelled)
ipcMain.handle('open-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        filters: [{ name: 'JSON', extensions: ['json'] }],
        properties: ['openFile']
    });
    if (result.canceled || !result.filePaths.length) return null;
    const filePath = result.filePaths[0];
    const content = require('fs').readFileSync(filePath, 'utf8');
    return { content, path: filePath };
});

// ── Initial UI language (renderer asks via sendSync before i18n loads) ──
const SUPPORTED_UI_LANGS = new Set(['zh', 'en', 'zh-tw', 'ru', 'fr', 'de', 'it', 'ja', 'ko', 'es', 'hi', 'pt', 'id', 'th', 'vi', 'eo']);

function localeTagToAppLang(tag) {  // 将从系统获得的语言标签转化成本软件识别的语言 key
    if (!tag || typeof tag !== 'string') return null;
    const n = tag.toLowerCase().replace(/_/g, '-');
    const base = n.split('-')[0];
    if (base === 'zh') {
        if (n === 'zh-tw' || n === 'zh-hk' || n === 'zh-mo' || n.includes('hant'))  // hant 是 han traditional 的缩写
            return 'zh-tw';
        return 'zh';
    }
    if (base === 'en') return 'en';
    if (SUPPORTED_UI_LANGS.has(n)) return n;
    if (SUPPORTED_UI_LANGS.has(base)) return base;
    return null;
}

function getInitialAppLanguage() {  // 获取初始化语言
    const tried = [];
    try {
        if (typeof app.getPreferredSystemLanguages === 'function')
            tried.push(...app.getPreferredSystemLanguages());
    } catch (_) { /* ignore */ }
    try {
        tried.push(app.getLocale());  // 获取系统语言
    } catch (_) { /* ignore */ }
    for (const tag of tried) {
        const lang = localeTagToAppLang(tag);  // 将系统语言标签转化成本软件识别的语言 key
        if (lang) return lang;
    }
    return 'en';  // 如果所有尝试都失败，则返回英语
}

ipcMain.on('get-initial-ui-language', (event) => {  // 获取初始化语言
    event.returnValue = getInitialAppLanguage();
});

// ── Application startup ───────────────────────────────────────────────
app.on('ready', () => {
    mainWindow = new BrowserWindow({
        icon: APP_ICON,
        width: 1600,
        height: 900,
        title: 'Turing Machine IDE',
        webPreferences: { nodeIntegration: true, contextIsolation: false }
    });
    mainWindow.webContents.openDevTools();  // 打开开发人员工具
    mainWindow.loadFile('index.html');
    mainWindow.on('close', e => {
        if (mainWindowCloseConfirmed) return;
        e.preventDefault();
        sendTo(mainWindow, 'request-close-confirm');
    });
    mainWindow.on('closed', () => { mainWindow = null; });
});
