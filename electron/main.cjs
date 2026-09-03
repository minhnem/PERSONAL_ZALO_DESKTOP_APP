const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');

const isDev = !app.isPackaged;

// Ép Electron dùng User-Agent chuẩn của Chrome để Zalo không nhận diện sai
app.userAgentFallback = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true, // Enable <webview> for Zalo
    },
  });

  // Load Vite dev server or static files
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Handle cookies for Zalo to persist login
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;"]
      }
    });
  });
}

app.whenReady().then(() => {
  ipcMain.handle('get-zalo-cookies', async (event, accountId) => {
    try {
      // Get all cookies for zalo.me from specific partition
      const targetSession = accountId ? session.fromPartition(`persist:zalo_${accountId}`) : session.defaultSession;
      const cookies = await targetSession.cookies.get({ domain: '.zalo.me' });
      return cookies;
    } catch (error) {
      console.error('Failed to get cookies', error);
      return [];
    }
  });

  ipcMain.handle('flush-session-data', async (event, accountId) => {
    try {
      if (accountId) {
        const targetSession = session.fromPartition(`persist:zalo_${accountId}`);
        await targetSession.flushStorageData();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to flush storage data', error);
      return false;
    }
  });

  ipcMain.handle('clear-partition', async (event, accountId) => {
    try {
      if (accountId) {
        const targetSession = session.fromPartition(`persist:zalo_${accountId}`);
        await targetSession.clearStorageData();
      }
      return true;
    } catch (error) {
      console.error('Failed to clear partition', error);
      return false;
    }
  });

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
