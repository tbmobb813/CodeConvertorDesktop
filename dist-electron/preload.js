"use strict";
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld('api', {
    openWorkspace: (opts) => ipcRenderer.invoke('workspace:open', opts),
    readFile: (p) => ipcRenderer.invoke('file:read', p),
    writeFile: (p, c) => ipcRenderer.invoke('file:write', p, c),
    createFileOrDir: (p, isDir) => ipcRenderer.invoke('fs:create', p, isDir),
    renameFileOrDir: (from, to) => ipcRenderer.invoke('fs:rename', from, to),
    deleteFileOrDir: (p) => ipcRenderer.invoke('fs:delete', p),
    batchConvert: (filePaths) => ipcRenderer.invoke('conversion:batch', filePaths),
    dryRunConvert: (filePaths) => ipcRenderer.invoke('conversion:dryrun', filePaths),
});
