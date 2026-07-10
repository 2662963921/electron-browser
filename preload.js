// ============================================================
//  Electron WebView Browser - Preload Script
// ============================================================

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('browserAPI', {
  // --- Config ---
  getConfig: () => ipcRenderer.invoke('get-config'),
  updateConfig: (updates) => ipcRenderer.invoke('update-config', updates),
  openConfigFolder: () => ipcRenderer.invoke('open-config-folder'),

  // --- Window Controls ---
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  toggleAlwaysOnTop: () => ipcRenderer.send('window-toggle-always-on-top'),
  isAlwaysOnTop: () => ipcRenderer.invoke('window-is-always-on-top'),

  // --- Bookmarks ---
  getBookmarks: () => ipcRenderer.invoke('get-bookmarks'),
  addBookmark: (bookmark) => ipcRenderer.invoke('add-bookmark', bookmark),
  removeBookmark: (url) => ipcRenderer.invoke('remove-bookmark', url),
  isBookmarked: (url) => ipcRenderer.invoke('is-bookmarked', url),

  // --- Shortcuts ---
  getShortcuts: () => ipcRenderer.invoke('get-shortcuts'),
  updateShortcut: (actionName, shortcut) => ipcRenderer.invoke('update-shortcut', actionName, shortcut),

  // --- Actions ---
  toggleDarkMode: () => ipcRenderer.send('toggle-dark-mode'),
  toggleControlsHidden: () => ipcRenderer.send('toggle-controls-hidden'),

  // --- WebView Actions (forwarded) ---
  setWebviewId: (id) => ipcRenderer.invoke('set-webview-id', id),
  getErrorHTML: (info) => ipcRenderer.invoke('get-error-html', info),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  setWebviewBg: (color) => ipcRenderer.send('set-webview-bg', color),

  // --- Event Listeners ---
  onInitConfig: (callback) => {
    ipcRenderer.on('init-config', (_event, cfg) => callback(cfg));
  },
  onDarkModeChanged: (callback) => {
    ipcRenderer.on('dark-mode-changed', (_event, dark) => callback(dark));
  },
  onControlsHiddenChanged: (callback) => {
    ipcRenderer.on('controls-hidden-changed', (_event, hidden) => callback(hidden));
  },
  onWindowStateChanged: (callback) => {
    ipcRenderer.on('window-state-changed', (_event, state) => callback(state));
  },
  onAlwaysOnTopChanged: (callback) => {
    ipcRenderer.on('always-on-top-changed', (_event, onTop) => callback(onTop));
  },
  onNavigateToUrl: (callback) => {
    ipcRenderer.on('navigate-to-url', (_event, url) => callback(url));
  },
  onDevToolsOpened: (callback) => {
    ipcRenderer.on('devtools-opened', (_event, target) => callback(target));
  },
});
