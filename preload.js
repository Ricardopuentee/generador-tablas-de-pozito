const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('customDeckApi', {
  selectFolder: () => ipcRenderer.invoke('custom-deck:select-folder')
})
