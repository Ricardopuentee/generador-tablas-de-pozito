const path = require('path')
const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron')
const { pathToFileURL } = require('url')

const imageExtensions = new Set(['.apng', '.avif', '.gif', '.jpeg', '.jpg', '.png', '.webp'])
const appDisplayName = 'Generador de Tablas de Loteria'

function getNaturalSortKey(fileName) {
  const numberMatch = fileName.match(/\d+/)
  return {
    number: numberMatch ? Number.parseInt(numberMatch[0], 10) : Number.POSITIVE_INFINITY,
    name: fileName
  }
}

function sortImageFiles(fileNames) {
  return [...fileNames].sort((a, b) => {
    const aKey = getNaturalSortKey(a)
    const bKey = getNaturalSortKey(b)

    if (aKey.number !== bKey.number) {
      return aKey.number - bKey.number
    }

    return aKey.name.localeCompare(bKey.name, undefined, { numeric: true, sensitivity: 'base' })
  })
}

ipcMain.handle('custom-deck:select-folder', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Selecciona una carpeta con 54 imagenes',
    properties: ['openDirectory']
  })

  if (result.canceled || !result.filePaths.length) {
    return { canceled: true }
  }

  const folderPath = result.filePaths[0]
  const folderName = path.basename(folderPath)
  const entries = await require('fs').promises.readdir(folderPath, { withFileTypes: true })
  const imageFiles = sortImageFiles(
    entries
      .filter((entry) => entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase()))
      .map((entry) => entry.name)
  )

  if (imageFiles.length !== 54) {
    return {
      canceled: false,
      error: `La carpeta "${folderName}" tiene ${imageFiles.length} imagenes. Debe tener exactamente 54.`
    }
  }

  return {
    canceled: false,
    deck: {
      name: folderName,
      transparent: folderName.toLowerCase().includes('sin fondo'),
      imagePaths: imageFiles.map((fileName) => pathToFileURL(path.join(folderPath, fileName)).href)
    }
  }
})

function createWindow() {
  app.setName(appDisplayName)

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    title: appDisplayName,
    backgroundColor: '#f4f4f6',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  win.loadFile('index.html')
  win.setMenuBarVisibility(false)

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  win.webContents.on('will-navigate', (event, url) => {
    if (url !== win.webContents.getURL()) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })
}

app.whenReady().then(createWindow)

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
