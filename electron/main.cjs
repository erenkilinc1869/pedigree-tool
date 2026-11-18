// Pedigree Tool — © 2026 Eren Kılınç. GPL-3.0-or-later; bkz. LICENSE.
// Electron ana süreç (main process).
// Uygulama tamamen yereldir; hiçbir ağ bağlantısı veya veri gönderimi yoktur.
// Dosya açma/kaydetme işleri burada yapılır, renderer'a yalnızca preload üzerinden
// dar bir API açılır (contextIsolation açık, nodeIntegration kapalı).
const { app, BrowserWindow, Menu, shell, ipcMain, dialog, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const appearanceRules = require('./settings.cjs');

// Pencere simgesi paketin içinden okunur (build/ klasörü asar'a girmez).
const ICON = path.join(__dirname, '..', 'app', 'assets', 'EK-logo.png');
const APP_ID = 'com.erenkilinc.pedigreetool';
let win = null;

// Renderer'ın bildirdiği belge durumu (kapatırken sormak için).
let doc = { dirty: false, filePath: null, name: null };
let closeAllowed = false;
let closePrompt = false;

// Bu oturumda kullanıcının ana sürecin kendi Aç / Kaydet diyaloglarında seçtiği yollar.
// Renderer diyalogsuz "Kaydet" için yalnızca bunlardan birini verebilir; başka bir yol
// gelirse diyalog gösterilir (renderer istediği yere sessizce yazamasın).
const approvedPaths = new Set();
const pathKey = (p) => {
  const r = path.resolve(p);
  return process.platform === 'win32' ? r.toLowerCase() : r;
};
const approve = (p) => { approvedPaths.add(pathKey(p)); return p; };
const isApproved = (p) => typeof p === 'string' && p !== '' && approvedPaths.has(pathKey(p));

// Uygulama kurulum programı olmadan dağıtılır (klasör / zip). Exe'ye electron-builder
// dokunmaz, böylece Windows Akıllı Uygulama Denetimi onu resmi Electron dosyası olarak
// tanır ve çalıştırır. Kurulumun yaptığı işler (dil seçimi, koşulların kabulü, kısayollar)
// ilk açılışta uygulamanın içinde yapılır.
app.setAppUserModelId(APP_ID);

// ---- dil ----
// Öncelik: kullanıcının seçtiği dil (ilk açılış ekranı / Dil menüsü) > sistem dili.
const MENU_TEXT = {
  tr: {
    file: 'Dosya', new: 'Yeni', open: 'Aç...', save: 'Kaydet', saveAs: 'Farklı Kaydet...',
    pptx: 'PowerPoint’e Aktar (PPTX)...',
    quit: 'Çıkış', edit: 'Düzen', undo: 'Geri Al', redo: 'Yinele', cut: 'Kes', copy: 'Kopyala',
    paste: 'Yapıştır', selectAll: 'Tümünü Seç', view: 'Görünüm', zoomIn: 'Yakınlaştır',
    zoomOut: 'Uzaklaştır', fit: 'Ekrana Sığdır', layout: 'Otomatik Düzenle', fullscreen: 'Tam Ekran',
    reload: 'Yenile', devtools: 'Geliştirici Araçları', language: 'Dil', window: 'Pencere',
    settings: 'Ayarlar…', theme: 'Tema', themeSystem: 'Sistem', themeLight: 'Açık', themeDark: 'Koyu',
    cancel: 'Vazgeç', proceed: 'Devam et', pedFile: 'Pedigri dosyası',
    dontSave: 'Kaydetme', closeQ: '“{name}” dosyasındaki değişiklikler kaydedilsin mi?',
    closeDetail: 'Kaydetmezseniz son değişiklikler dosyaya yazılmaz.',
    help: 'Yardım', about: 'Hakkında', ok: 'Tamam', shortcut: 'Masaüstü Kısayolu Oluştur',
    aboutDetail:
      'Erciyes Üniversitesi Tıbbi Genetik Anabilim Dalı asistan doktorlarının katkılarıyla\nEren Kılınç tarafından tasarlanmış ve geliştirilmiştir.\n© 2026 Eren Kılınç. Özgür yazılım: GNU GPL sürüm 3 ya da sonrası (bkz. LICENSE.txt).\n\n' +
      'Genetik danışmanlık, eğitim ve araştırma amacıyla pedigri çizimi içindir. Tıbbi cihaz değildir; ' +
      'tanı veya klinik karar için tek başına kullanılamaz, çizimler uzman tarafından kontrol edilmelidir.\n\n' +
      'Uygulama tamamen bu bilgisayarda çalışır, hiçbir veriyi dışarı göndermez. Hasta verilerinin KVKK’ya ' +
      'uygun işlenmesinden kullanıcı sorumludur.\n\n' +
      'Üçüncü taraf bileşenler: Electron, React, PptxGenJS (MIT lisansı).\n\n' +
      'Atıf: Kılınç, E. (2026). Pedigree Tool. Zenodo. https://doi.org/10.5281/zenodo.24332669',
  },
  en: {
    file: 'File', new: 'New', open: 'Open...', save: 'Save', saveAs: 'Save As...',
    pptx: 'Export to PowerPoint (PPTX)...',
    quit: 'Quit', edit: 'Edit', undo: 'Undo', redo: 'Redo', cut: 'Cut', copy: 'Copy',
    paste: 'Paste', selectAll: 'Select All', view: 'View', zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out', fit: 'Fit to Screen', layout: 'Auto-arrange', fullscreen: 'Full Screen',
    reload: 'Reload', devtools: 'Developer Tools', language: 'Language', window: 'Window',
    settings: 'Settings…', theme: 'Theme', themeSystem: 'System', themeLight: 'Light', themeDark: 'Dark',
    cancel: 'Cancel', proceed: 'Continue', pedFile: 'Pedigree file',
    dontSave: 'Don’t save', closeQ: 'Save the changes to “{name}”?',
    closeDetail: 'If you don’t save, your latest changes will not be written to the file.',
    help: 'Help', about: 'About', ok: 'OK', shortcut: 'Create Desktop Shortcut',
    aboutDetail:
      'Designed and developed by Eren Kılınç, with contributions from the resident physicians of the Department of Medical Genetics, Erciyes University.\n© 2026 Eren Kılınç. Free software: GNU GPL version 3 or later (see LICENSE.txt).\n\n' +
      'For drawing pedigrees for genetic counselling, teaching and research. Not a medical device; ' +
      'must not be used on its own for diagnosis or clinical decisions, and drawings should be checked by a qualified professional.\n\n' +
      'The application runs entirely on this computer and sends no data anywhere. You are responsible for ' +
      'handling patient data in line with applicable data protection law.\n\n' +
      'Third-party components: Electron, React, PptxGenJS (MIT licence).\n\n' +
      'Cite: Kılınç, E. (2026). Pedigree Tool. Zenodo. https://doi.org/10.5281/zenodo.24332669',
  },
};

const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');

function readSettings() {
  try { return JSON.parse(fs.readFileSync(settingsFile(), 'utf8')); } catch (_) { return {}; }
}

function writeSettings(s) {
  try {
    fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
    fs.writeFileSync(settingsFile(), JSON.stringify(s, null, 2), 'utf8');
  } catch (_) { /* ayar yazılamazsa uygulama yine çalışır */ }
}

function decideLanguage() {
  const s = readSettings();
  if (s.lang === 'tr' || s.lang === 'en') return s.lang;
  return app.getLocale().toLowerCase().startsWith('tr') ? 'tr' : 'en';
}

// ---- kısayollar ----
// Paketlenmiş uygulamada exe'nin kendisine, geliştirmede "electron <uygulama klasörü>"
// komutuna işaret eder. Simge resources/icon.ico (EK logosu); yoksa exe'nin simgesi.
function shortcutOptions() {
  const iconFile = path.join(process.resourcesPath, 'icon.ico');
  return {
    target: process.execPath,
    args: app.isPackaged ? '' : '"' + app.getAppPath() + '"',
    cwd: path.dirname(process.execPath),
    description: 'Pedigree Tool',
    icon: fs.existsSync(iconFile) ? iconFile : process.execPath,
    iconIndex: 0,
    appUserModelId: APP_ID,
  };
}

function shortcutPaths() {
  return {
    desktop: path.join(app.getPath('desktop'), 'Pedigree Tool.lnk'),
    startMenu: path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Pedigree Tool.lnk'),
  };
}

function createShortcuts(which) {
  const made = [];
  const paths = shortcutPaths();
  for (const key of ['desktop', 'startMenu']) {
    if (!which[key]) continue;
    try {
      fs.mkdirSync(path.dirname(paths[key]), { recursive: true });
      // 'create': yoksa oluşturur, varsa (örn. eski kurulumdan kalan) üzerine yazar.
      if (shell.writeShortcutLink(paths[key], 'create', shortcutOptions())) made.push(paths[key]);
    } catch (_) { /* kısayol oluşturulamazsa uygulama yine açılır */ }
  }
  return made;
}

let lang = 'tr';
const T = () => MENU_TEXT[lang];

function setLanguage(next, notifyRenderer) {
  if (next !== 'tr' && next !== 'en') return lang;
  lang = next;
  writeSettings(Object.assign({}, readSettings(), { lang }));
  buildMenu();
  if (notifyRenderer) send('lang:' + lang);
  return lang;
}

// ---- görünüm (tema) ----
// Tercih settings.json'da (dil ile aynı dosya) tutulur. nativeTheme.themeSource hem
// Windows'un izin verdiği yerel öğeleri (başlık çubuğu, diyaloglar) hem de sayfadaki
// prefers-color-scheme sorgusunu belirler; sayfa temasını bu sorgudan okur.
let appearance = { theme: 'system', darkCanvas: 'dark' };

function applyNativeTheme() {
  nativeTheme.themeSource = appearance.theme;
}

// Değerler beyaz listeden geçmeden hiçbir şey yazılmaz (bkz. settings.cjs).
function setAppearance(patch, notifyRenderer) {
  const clean = appearanceRules.sanitizePatch(patch);
  if (!clean) return appearance;
  const themeChanged = clean.theme && clean.theme !== appearance.theme;
  appearance = Object.assign({}, appearance, clean);
  writeSettings(Object.assign({}, readSettings(), appearance));
  if (themeChanged) {
    applyNativeTheme();
    buildMenu();
    if (notifyRenderer) send('theme:' + appearance.theme);
  }
  return appearance;
}

// ---- pencere ----
function createWindow() {
  win = new BrowserWindow({
    width: 1500,
    height: 950,
    minWidth: 1000,
    minHeight: 640,
    title: 'Pedigree Tool',
    icon: ICON,
    // Sayfa süreci bazı makinelerde (güvenlik taraması nedeniyle) birkaç saniyede
    // başlıyor; bu sürede beyaz boşluk yerine uygulamanın (temaya göre) zemin rengi görünür.
    backgroundColor: appearanceRules.windowBackground(nativeTheme.shouldUseDarkColors),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  // Dışa giden bağlantılar yalnızca http/https ise varsayılan tarayıcıda açılır.
  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const p = new URL(url).protocol;
      if (p === 'http:' || p === 'https:') shell.openExternal(url);
    } catch (_) { /* geçersiz URL: yok say */ }
    return { action: 'deny' };
  });

  // Pencerenin kendi içinde başka bir sayfaya gitmesini engelle.
  win.webContents.on('will-navigate', (e, url) => {
    if (url !== win.webContents.getURL()) e.preventDefault();
  });

  // Açık bir dosyada kaydedilmemiş değişiklik varsa kapatmadan önce sorulur.
  // Adsız çizim sorulmadan kapanır: otomatik kayıt onu bir sonraki açılışta geri getirir.
  closeAllowed = false;
  doc = { dirty: false, filePath: null, name: null };
  win.on('close', (e) => {
    if (closeAllowed || !doc.dirty || !doc.filePath) return;
    e.preventDefault();
    if (closePrompt) return;
    closePrompt = true;
    const t = T();
    dialog.showMessageBox(win, {
      type: 'warning',
      buttons: [t.save, t.dontSave, t.cancel],
      defaultId: 0,
      cancelId: 2,
      noLink: true,
      message: t.closeQ.replace('{name}', doc.name || path.basename(doc.filePath)),
      detail: t.closeDetail,
    }).then(({ response }) => {
      closePrompt = false;
      // "Kaydet": kaydı renderer yapar (dosya biçimi orada); başarılı olursa
      // app:closeWindow ile pencereyi kapatır, olmazsa pencere açık kalır.
      if (response === 0) send('saveAndClose');
      else if (response === 1) {
        // "Kaydetme": renderer otomatik kaydı dosyanın kaydedilmiş hâline döndürüp
        // pencereyi kapatır. Yanıt vermezse (donmuş sayfa) pencere yine de kapanır.
        send('discardAndClose');
        setTimeout(closeWindow, 2000);
      }
    }, () => { closePrompt = false; });
  });

  win.loadFile(path.join(__dirname, '..', 'app', 'index.html'));
}

function closeWindow() {
  closeAllowed = true;
  if (win && !win.isDestroyed()) win.close();
}

function send(cmd) {
  if (win && !win.isDestroyed()) win.webContents.send('menu-command', cmd);
}

function buildMenu() {
  const t = T();
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: t.file,
        submenu: [
          { label: t.new, accelerator: 'CmdOrCtrl+N', click: () => send('new') },
          { label: t.open, accelerator: 'CmdOrCtrl+O', click: () => send('open') },
          { label: t.save, accelerator: 'CmdOrCtrl+S', click: () => send('save') },
          { label: t.saveAs, accelerator: 'CmdOrCtrl+Shift+S', click: () => send('saveAs') },
          { type: 'separator' },
          { label: t.pptx, click: () => send('pptx') },
          { type: 'separator' },
          { label: t.settings, accelerator: 'CmdOrCtrl+,', click: () => send('settings') },
          { type: 'separator' },
          { role: 'quit', label: t.quit },
        ],
      },
      {
        label: t.edit,
        submenu: [
          { label: t.undo, accelerator: 'CmdOrCtrl+Z', click: () => send('undo') },
          { label: t.redo, accelerator: 'CmdOrCtrl+Y', click: () => send('redo') },
          { type: 'separator' },
          { role: 'cut', label: t.cut },
          { role: 'copy', label: t.copy },
          { role: 'paste', label: t.paste },
          { role: 'selectAll', label: t.selectAll },
        ],
      },
      {
        label: t.view,
        submenu: [
          { label: t.zoomIn, accelerator: 'CmdOrCtrl+Plus', click: () => send('zoomIn') },
          { label: t.zoomOut, accelerator: 'CmdOrCtrl+-', click: () => send('zoomOut') },
          { label: t.fit, accelerator: 'CmdOrCtrl+0', click: () => send('fit') },
          { label: t.layout, accelerator: 'CmdOrCtrl+L', click: () => send('layout') },
          { type: 'separator' },
          {
            label: t.theme,
            submenu: [
              ['system', t.themeSystem], ['light', t.themeLight], ['dark', t.themeDark],
            ].map(([value, label]) => ({
              label, type: 'radio', checked: appearance.theme === value,
              click: () => setAppearance({ theme: value }, true),
            })),
          },
          { type: 'separator' },
          { role: 'togglefullscreen', label: t.fullscreen },
          { role: 'reload', label: t.reload },
          { role: 'toggleDevTools', label: t.devtools },
        ],
      },
      {
        label: t.language,
        submenu: [
          { label: 'Türkçe', type: 'radio', checked: lang === 'tr', click: () => setLanguage('tr', true) },
          { label: 'English', type: 'radio', checked: lang === 'en', click: () => setLanguage('en', true) },
        ],
      },
      { role: 'windowMenu', label: t.window },
      {
        label: t.help,
        submenu: [
          { label: t.shortcut, click: () => createShortcuts({ desktop: true }) },
          { type: 'separator' },
          { label: t.about, click: showAbout },
        ],
      },
    ])
  );
}

function showAbout() {
  const t = T();
  dialog.showMessageBox(win, {
    type: 'info',
    title: t.about,
    message: 'Pedigree Tool ' + app.getVersion(),
    detail: t.aboutDetail,
    buttons: [t.ok],
    icon: ICON,
  });
}

// Yerel bir diyalog kapandıktan sonra klavye odağını sayfaya geri verir (Windows'ta
// bazen pencere odaklı görünür ama sayfa tuşları almaz).
function refocusPage() {
  if (win && !win.isDestroyed() && win.isFocused()) win.webContents.focus();
}

// ---- IPC ----

ipcMain.handle('app:version', () => app.getVersion());
ipcMain.handle('app:getLanguage', () => lang);
ipcMain.handle('app:setLanguage', (_e, next) => setLanguage(next, false));
ipcMain.handle('app:getAppearance', () => appearance);
ipcMain.handle('app:setAppearance', (_e, patch) => setAppearance(patch, false));

ipcMain.handle('app:needsFirstRun', (_e, termsVersion) => readSettings().termsAccepted !== termsVersion);

ipcMain.handle('app:acceptTerms', (_e, { lang: chosen, termsVersion, desktop, startMenu }) => {
  setLanguage(chosen, false);
  writeSettings(Object.assign({}, readSettings(), {
    termsAccepted: termsVersion,
    termsAcceptedAt: new Date().toISOString(),
  }));
  return { shortcuts: createShortcuts({ desktop, startMenu }) };
});

ipcMain.handle('app:quit', () => app.quit());
ipcMain.handle('app:closeWindow', () => closeWindow());

ipcMain.on('doc:state', (e, s) => {
  if (!win || win.isDestroyed() || e.sender !== win.webContents || !s) return;
  doc = {
    dirty: !!s.dirty,
    filePath: typeof s.filePath === 'string' ? s.filePath : null,
    name: typeof s.name === 'string' ? s.name : null,
  };
});

// Dosya işlemleri yalnızca kullanıcının diyalogla onayladığı yollara yazar.
ipcMain.handle('file:saveText', async (_e, { defaultPath, filters, data, filePath }) => {
  let target = isApproved(filePath) ? filePath : null;
  if (!target) {
    const res = await dialog.showSaveDialog(win, { defaultPath, filters });
    if (res.canceled || !res.filePath) return { canceled: true };
    target = approve(res.filePath);
  }
  // Yazma hatası (klasör yok, salt okunur, dosya kilitli...) kullanıcıya nedeniyle
  // gösterilsin diye düz bir sonuç olarak döner; fırlatılırsa renderer'a anlaşılmaz
  // bir "Error invoking remote method" iletisi ulaşıyordu.
  try {
    fs.writeFileSync(target, data, 'utf8');
  } catch (err) {
    return { canceled: false, error: err.message };
  }
  return { canceled: false, filePath: target };
});

ipcMain.handle('file:saveBase64', async (_e, { defaultPath, filters, base64 }) => {
  const res = await dialog.showSaveDialog(win, { defaultPath, filters });
  if (res.canceled || !res.filePath) return { canceled: true };
  approve(res.filePath);
  try {
    fs.writeFileSync(res.filePath, Buffer.from(base64, 'base64'));
  } catch (err) {
    return { canceled: false, error: err.message };
  }
  return { canceled: false, filePath: res.filePath };
});

ipcMain.handle('file:openText', async () => {
  const res = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [{ name: T().pedFile, extensions: ['json'] }],
  });
  if (res.canceled || !res.filePaths[0]) return { canceled: true };
  const filePath = approve(res.filePaths[0]);
  try {
    return { canceled: false, filePath, data: fs.readFileSync(filePath, 'utf8') };
  } catch (err) {
    return { canceled: false, error: err.message };
  }
});

ipcMain.handle('dialog:confirm', async (_e, { message, detail }) => {
  const res = await dialog.showMessageBox(win, {
    type: 'warning',
    buttons: [T().cancel, T().proceed],
    defaultId: 0,
    cancelId: 0,
    message,
    detail,
  });
  refocusPage();
  return res.response === 1;
});

// Tek kopya: açılış sürerken exe'ye tekrar tıklanırsa ikinci pencere açılmaz,
// mevcut pencere öne getirilir.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!win || win.isDestroyed()) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });
}

app.whenReady().then(() => {
  lang = decideLanguage();
  // Tema pencere açılmadan uygulanır: hem zemin rengi hem sayfanın ilk boyaması doğru olur.
  appearance = appearanceRules.appearanceOf(readSettings());
  applyNativeTheme();
  // Tema değişince (tercih ya da "Sistem"deyken Windows ayarı) pencerenin zemini de
  // değişir; yeniden boyutlandırmada kenarlarda yanlış renk görünmesin.
  nativeTheme.on('updated', () => {
    if (win && !win.isDestroyed()) win.setBackgroundColor(appearanceRules.windowBackground(nativeTheme.shouldUseDarkColors));
  });
  buildMenu();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
