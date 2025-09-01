const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld('api', {
    openWorkspace: (opts?: any) => ipcRenderer.invoke('workspace:open', opts),
    readFile: (p: string) => ipcRenderer.invoke('file:read', p),
    writeFile: (p: string, c: string) => ipcRenderer.invoke('file:write', p, c),
    createFileOrDir: (p: string, isDir: boolean) => ipcRenderer.invoke('fs:create', p, isDir),
    renameFileOrDir: (from: string, to: string) => ipcRenderer.invoke('fs:rename', from, to),
    deleteFileOrDir: (p: string) => ipcRenderer.invoke('fs:delete', p),
    batchConvert: (filePaths: string[]) => ipcRenderer.invoke('conversion:batch', filePaths),
    dryRunConvert: (filePaths: string[]) => ipcRenderer.invoke('conversion:dryrun', filePaths),
  });
  