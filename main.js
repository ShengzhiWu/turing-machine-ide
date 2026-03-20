const electron = require('electron');
const app = electron.app;  // 引用app
const BrowserWindow = electron.BrowserWindow;  // 窗口引用
const { ipcMain, dialog } = electron;

var mainWindow = null;  // 主窗口

// Handle folder browse dialog requests from renderer
ipcMain.handle('show-open-dialog', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result;
});

app.on('ready', ()=>{
    mainWindow = new BrowserWindow({
        width:1600,  // 窗口尺寸
        height:900,
        //icon:"assets/app_icon.ico",
        webPreferences:{nodeIntegration:true, contextIsolation:false}
    });
    mainWindow.loadFile('index.html');  // 加载HTML页面以启动一个渲染进程
    mainWindow.on('closed', (e)=>{
        mainWindow = null;
    });
});
