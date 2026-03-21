const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const { ipcMain, dialog, Menu } = electron;

Menu.setApplicationMenu(null);  // 移除 Electron 默认菜单栏，使用应用内自定义菜单

var mainWindow       = null;
var settingsWindow   = null;  // Render settings child window
var previewWindow    = null;  // Render preview child window

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
    settingsWindow = new BrowserWindow({
        width: 540,
        height: 840,
        resizable: false,
        minimizable: false,
        maximizable: false,
        title: 'Render Animation',
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

// ── Params changed → relay to main window ────────────────────────────
ipcMain.on('render-params-changed', (event, params) => {
    sendTo(mainWindow, 'render-params-changed', params);
});

// ── Start render → relay to main window ──────────────────────────────
ipcMain.on('render-start', (event, params) => {
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
        title: 'Rendering…',
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

// ── Application startup ───────────────────────────────────────────────
app.on('ready', () => {
    mainWindow = new BrowserWindow({
        width: 1600,
        height: 900,
        title: 'Turing Machine IDE',
        webPreferences: { nodeIntegration: true, contextIsolation: false }
    });
    mainWindow.loadFile('index.html');
    mainWindow.on('closed', () => { mainWindow = null; });
});
