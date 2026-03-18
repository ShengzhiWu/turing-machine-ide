const electron = require('electron');
const app = electron.app;  // 引用app
const BrowserWindow = electron.BrowserWindow;  // 窗口引用

var mainWindow = null;  // 主窗口

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
