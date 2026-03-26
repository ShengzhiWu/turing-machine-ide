const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const { ipcMain, dialog, Menu } = electron;

Menu.setApplicationMenu(null);  // 移除 Electron 默认菜单栏，使用应用内自定义菜单

var mainWindow          = null;
var settingsWindow      = null;  // Render settings child window
var previewWindow       = null;  // Render preview child window
var currentRenderParams = null;  // Last known render settings (persisted in project file)

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
    settingsWindow = new BrowserWindow({
        width: 540,
        height: 870,
        resizable: false,
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

// ── Application startup ───────────────────────────────────────────────
app.on('ready', () => {
    mainWindow = new BrowserWindow({
        width: 1600,
        height: 900,
        title: 'Turing Machine IDE',
        webPreferences: { nodeIntegration: true, contextIsolation: false }
    });
    // mainWindow.webContents.openDevTools();  // 打开开发人员工具
    mainWindow.loadFile('index.html');
    mainWindow.on('closed', () => { mainWindow = null; });
});
