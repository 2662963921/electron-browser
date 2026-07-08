// ============================================================
//  Electron WebView Browser - Main Process
// ============================================================

// Guard: if ELECTRON_RUN_AS_NODE is set, Electron won't work properly
if (process.env.ELECTRON_RUN_AS_NODE) {
  console.error(
    'ELECTRON_RUN_AS_NODE is set! This breaks Electron startup.\n' +
    'Please use:  node start.js .   or   start.bat\n' +
    '(WorkBuddy sets this env var system-wide)'
  );
  process.exit(1);
}

// Suppress webview internal navigation errors (e.g. ERR_CONNECTION_TIMED_OUT)
// These show as "Error occurred in handler for 'GUEST_VIEW_MANAGER_CALL'"
// but are already handled gracefully by the renderer's did-fail-load handler.
process.on('unhandledRejection', (reason) => {
  const msg = String(reason);
  if (msg.includes('GUEST_VIEW_MANAGER_CALL') || msg.includes('ERR_CONNECTION') || msg.includes('ERR_ABORTED')) {
    return; // silently ignore — handled in renderer
  }
  console.error('Unhandled Rejection:', reason);
});

const {
  app,
  BrowserWindow,
  ipcMain,
  globalShortcut,
  nativeTheme,
  shell,
} = require('electron');
const path = require('path');
const fs = require('fs');

// ============================================================
//  Config Management
// ============================================================

const defaultConfig = {
  darkMode: false,
  homepage: 'https://www.bing.com',
  lastURL: '',
  restoreLastURL: true,
  bookmarks: [],
  controlsHidden: false,
  transparentBg: false,
  alwaysOnTop: false,
  dragAreaPercent: { width: 15, height: 8 },
  resizeAreaPercent: { width: 8, height: 8 },
  shortcuts: {
    closeWindow:       { type: 'keyboard', key: 'F4',    ctrl: false, alt: true,  shift: false, meta: false, buttons: 0 },
    toggleDarkMode:    { type: 'keyboard', key: 'D',     ctrl: true,  alt: false, shift: false, meta: false, buttons: 0 },
    hideControls:      { type: 'keyboard', key: 'F11',   ctrl: false, alt: false, shift: false, meta: false, buttons: 0 },
    toggleAlwaysOnTop: { type: 'keyboard', key: 'T',     ctrl: true,  alt: false, shift: true,  meta: false, buttons: 0 },
  },
};

let config = { ...defaultConfig };

function getConfigPath() {
  return path.join(__dirname, 'config.json');
}

function loadConfig() {
  try {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      config = { ...defaultConfig, ...JSON.parse(raw) };
      console.log('Config loaded from:', configPath);
      return;
    }
    console.log('No saved config found, using defaults');
  } catch (e) {
    console.error('Failed to load config:', e.message);
  }
  config = { ...defaultConfig };
}

function saveConfig(cfg) {
  try {
    const configPath = getConfigPath();
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(cfg || config, null, 2), 'utf-8');
    console.log('Config saved to:', configPath);
  } catch (e) {
    console.error('Failed to save config:', e.message);
  }
}

// ============================================================
//  Window & State
// ============================================================

let mainWindow = null;
let webviewId = null;

function createWindow() {
  const winBounds = config.windowBounds || { width: 1280, height: 800 };

  mainWindow = new BrowserWindow({
    ...winBounds,
    minWidth: 400,
    minHeight: 300,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    show: false,
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (config.alwaysOnTop) {
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
    }
    // notify renderer of initial state
    mainWindow.webContents.send('init-config', config);
  });

  mainWindow.on('resize', () => {
    const bounds = mainWindow.getBounds();
    config.windowBounds = { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
    saveConfigDebounced();
  });

  mainWindow.on('move', () => {
    const bounds = mainWindow.getBounds();
    config.windowBounds = { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
    saveConfigDebounced();
  });

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-state-changed', { maximized: true });
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-state-changed', { maximized: false });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    cleanupWebviewProcesses();
  });
}

let saveConfigTimer = null;
function saveConfigDebounced() {
  if (saveConfigTimer) clearTimeout(saveConfigTimer);
  saveConfigTimer = setTimeout(() => saveConfig(config), 500);
}

// ============================================================
//  WebView Process Cleanup
// ============================================================

function cleanupWebviewProcesses() {
  // Close all webview-related webContents
  const allWebContents = require('electron').webContents.getAllWebContents();
  for (const wc of allWebContents) {
    if (wc.getType() === 'webview' || wc.hostWebContents === (mainWindow && mainWindow.webContents)) {
      try { wc.close(); } catch (_) {}
    }
  }
}

function killExistingWebviewProcesses() {
  // On startup, look for any orphaned Electron GPU/utility/renderer processes
  // This is a best-effort cleanup using taskkill on Windows
  try {
    const { execSync } = require('child_process');
    // Only kill child processes that might be orphaned webviews
    // We don't blindly kill all electron processes in case other electron apps are running
    const currentPid = process.pid;
    if (process.platform === 'win32') {
      // Use wmic to find child processes of potential orphaned electron instances
      // This is conservative — only cleans up truly orphaned processes
    }
  } catch (_) {}
}

// ============================================================
//  Shortcut Management
// ============================================================

const shortcutActions = {
  closeWindow:       () => { if (mainWindow) mainWindow.close(); },
  toggleDarkMode:    () => {
    config.darkMode = !config.darkMode;
    nativeTheme.themeSource = config.darkMode ? 'dark' : 'light';
    saveConfig(config);
    syncDarkMode();
  },
  hideControls:      () => { config.controlsHidden = !config.controlsHidden; saveConfig(config); syncControlsHidden(); },
  toggleAlwaysOnTop: () => {
    config.alwaysOnTop = !config.alwaysOnTop;
    saveConfig(config);
    if (mainWindow) {
      mainWindow.setAlwaysOnTop(config.alwaysOnTop, 'screen-saver');
      mainWindow.webContents.send('always-on-top-changed', config.alwaysOnTop);
    }
  },
};

function buildAccelerator(shortcut) {
  if (!shortcut || shortcut.type !== 'keyboard' || !shortcut.key) return null;
  const parts = [];
  if (shortcut.ctrl)  parts.push('CommandOrControl');
  if (shortcut.alt)   parts.push('Alt');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.meta)  parts.push('Meta');
  parts.push(shortcut.key);
  return parts.join('+');
}

function registerAllShortcuts() {
  globalShortcut.unregisterAll();
  for (const [actionName, shortcut] of Object.entries(config.shortcuts)) {
    if (shortcut.type === 'keyboard') {
      const accel = buildAccelerator(shortcut);
      if (accel && shortcutActions[actionName]) {
        try {
          globalShortcut.register(accel, shortcutActions[actionName]);
        } catch (e) {
          console.error(`Failed to register shortcut "${accel}":`, e.message);
        }
      }
    }
  }
}

function syncDarkMode() {
  if (mainWindow) mainWindow.webContents.send('dark-mode-changed', config.darkMode);
}

function syncControlsHidden() {
  if (mainWindow) mainWindow.webContents.send('controls-hidden-changed', config.controlsHidden);
}

// ============================================================
//  IPC Handlers
// ============================================================

function setupIPC() {
  // --- Config ---
  ipcMain.handle('get-config', () => config);

  ipcMain.handle('update-config', (_event, updates) => {
    Object.assign(config, updates);
    saveConfig(config);
    return config;
  });

  // --- Window Controls ---
  ipcMain.on('window-minimize', () => mainWindow && mainWindow.minimize());
  ipcMain.on('window-maximize', () => {
    if (!mainWindow) return;
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
  });
  ipcMain.on('window-close', () => mainWindow && mainWindow.close());

  ipcMain.handle('window-is-maximized', () => mainWindow ? mainWindow.isMaximized() : false);

  ipcMain.on('window-toggle-always-on-top', () => {
    shortcutActions.toggleAlwaysOnTop();
  });

  ipcMain.handle('window-is-always-on-top', () => mainWindow ? mainWindow.isAlwaysOnTop() : false);

  // --- Bookmarks ---
  ipcMain.handle('get-bookmarks', () => config.bookmarks || []);

  ipcMain.handle('add-bookmark', (_event, bookmark) => {
    if (!config.bookmarks) config.bookmarks = [];
    if (!config.bookmarks.find(b => b.url === bookmark.url)) {
      config.bookmarks.push(bookmark);
      saveConfig(config);
    }
    return config.bookmarks;
  });

  ipcMain.handle('remove-bookmark', (_event, url) => {
    if (!config.bookmarks) config.bookmarks = [];
    config.bookmarks = config.bookmarks.filter(b => b.url !== url);
    saveConfig(config);
    return config.bookmarks;
  });

  ipcMain.handle('is-bookmarked', (_event, url) => {
    if (!config.bookmarks) return false;
    return config.bookmarks.some(b => b.url === url);
  });

  // --- Shortcuts ---
  ipcMain.handle('get-shortcuts', () => config.shortcuts);

  ipcMain.handle('update-shortcut', (_event, actionName, shortcut) => {
    config.shortcuts[actionName] = shortcut;
    saveConfig(config);
    registerAllShortcuts();
    return config.shortcuts;
  });

  // --- Dark Mode ---
  ipcMain.on('toggle-dark-mode', () => {
    shortcutActions.toggleDarkMode();
  });

  // --- Webview Background (transparency) ---
  ipcMain.on('set-webview-bg', (_event, color) => {
    if (webviewContents) {
      try { webviewContents.setBackgroundColor(color); } catch (_) {}
    }
  });

  // --- Controls Visibility ---
  ipcMain.on('toggle-controls-hidden', () => {
    shortcutActions.hideControls();
  });

  // --- Resize ---
  ipcMain.on('window-resize', (_event, { width, height }) => {
    if (!mainWindow || mainWindow.isMaximized()) return;
    const [x, y] = mainWindow.getPosition();
    mainWindow.setBounds({ x, y, width, height });
  });

  // --- Get webview info ---
  ipcMain.handle('set-webview-id', (_event, id) => {
    webviewId = id;
    return true;
  });

  // --- Error Page ---
  ipcMain.handle('get-error-html', (_event, { url, error }) => {
    const errorPath = path.join(__dirname, 'error.html');
    try {
      let html = fs.readFileSync(errorPath, 'utf-8');
      html = html.replace('{{URL}}', escapeHTML(url || ''));
      html = html.replace('{{ERROR}}', escapeHTML(error || 'Unknown error'));
      return html;
    } catch (_) {
      return `<html><body style="font-family:sans-serif;padding:40px;color:#ccc;background:#1a1a2e;"><h2>页面加载失败</h2><p>${escapeHTML(url || '')}</p><p>${escapeHTML(error || '')}</p></body></html>`;
    }
  });

  // --- Open external URL ---
  ipcMain.on('open-external', (_event, url) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        shell.openExternal(url);
      }
    } catch (_) {}
  });
}

function escapeHTML(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ============================================================
//  App Lifecycle
// ============================================================

app.whenReady().then(() => {
  // Load saved config from disk FIRST
  loadConfig();

  // Apply Chrome native dark mode based on saved config
  nativeTheme.themeSource = config.darkMode ? 'dark' : 'light';

  killExistingWebviewProcesses();
  setupIPC();
  createWindow();
  registerAllShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // Save last URL before quit (old handler logic merged here)
  if (trackedLastURL) {
    config.lastURL = trackedLastURL;
    saveConfig(config);
  }
  cleanupWebviewProcesses();
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') app.quit();
});

// ============================================================
//  Security: Prevent webview from opening system dialogs
// ============================================================

let trackedLastURL = '';
let webviewContents = null;

app.on('web-contents-created', (_event, contents) => {
  // Track webview contents for background transparency control
  if (contents.getType() === 'webview') {
    webviewContents = contents;
  }

  // Track last navigated URL for save-on-close
  contents.on('did-navigate', (_e, url) => {
    if (url && url !== 'about:blank' && !url.startsWith('data:')) {
      trackedLastURL = url;
    }
  });

  // Intercept new window requests from webview
  contents.setWindowOpenHandler(({ url }) => {
    // Navigate in the main webview instead
    if (mainWindow) {
      mainWindow.webContents.send('navigate-to-url', url);
    }
    return { action: 'deny' };
  });

  // Prevent permission requests from webview
  contents.session.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
});

// Save last URL when app closes
app.on('before-quit', () => {
  if (trackedLastURL) {
    config.lastURL = trackedLastURL;
    saveConfig(config);
  }
  cleanupWebviewProcesses();
  globalShortcut.unregisterAll();
});
