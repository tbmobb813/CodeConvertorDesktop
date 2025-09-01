const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  openWorkspace: () => ipcRenderer.invoke("workspace:open"),
  readFile: (p: string) => ipcRenderer.invoke("file:read", p),
  writeFile: (p: string, c: string) => ipcRenderer.invoke("file:write", p, c),
  batchConvert: (filePaths: string[]) => ipcRenderer.invoke("conversion:batch", filePaths),
  dryRunConvert: (filePaths: string[]) => ipcRenderer.invoke("conversion:dryrun", filePaths),
});

