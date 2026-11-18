// Pedigree Tool — © 2026 Eren Kılınç. GPL-3.0-or-later; bkz. LICENSE.
// Renderer'a açılan tek köprü. Node API'si sızdırılmaz; yalnızca
// ana sürecin onayladığı dosya işlemleri ve menü olayları geçer.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pedigreeAPI', {
  isNative: true,
  getVersion: () => ipcRenderer.invoke('app:version'),
  getLanguage: () => ipcRenderer.invoke('app:getLanguage'),
  setLanguage: (lang) => ipcRenderer.invoke('app:setLanguage', lang),
  getAppearance: () => ipcRenderer.invoke('app:getAppearance'),
  // Ana süreç değerleri ayrıca beyaz listeden geçirir; burada yalnızca iki alan iletilir.
  setAppearance: (p) => ipcRenderer.invoke('app:setAppearance', {
    theme: p && typeof p.theme === 'string' ? p.theme : undefined,
    darkCanvas: p && typeof p.darkCanvas === 'string' ? p.darkCanvas : undefined,
  }),
  needsFirstRun: (termsVersion) => ipcRenderer.invoke('app:needsFirstRun', termsVersion),
  acceptTerms: (opts) => ipcRenderer.invoke('app:acceptTerms', opts),
  quit: () => ipcRenderer.invoke('app:quit'),
  closeWindow: () => ipcRenderer.invoke('app:closeWindow'),
  setDocState: (s) => ipcRenderer.send('doc:state', {
    dirty: !!(s && s.dirty), filePath: (s && s.filePath) || null, name: (s && s.name) || null,
  }),
  saveText: (opts) => ipcRenderer.invoke('file:saveText', opts),
  saveBase64: (opts) => ipcRenderer.invoke('file:saveBase64', opts),
  openText: () => ipcRenderer.invoke('file:openText'),
  confirm: (opts) => ipcRenderer.invoke('dialog:confirm', opts),
  onMenu: (cb) => {
    ipcRenderer.on('menu-command', (_e, cmd) => cb(cmd));
  },
});
