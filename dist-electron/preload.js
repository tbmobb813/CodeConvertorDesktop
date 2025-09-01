"use strict";
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("api", {
    openWorkspace: () => ipcRenderer.invoke("workspace:open"),
    readFile: (p) => ipcRenderer.invoke("file:read", p),
    writeFile: (p, c) => ipcRenderer.invoke("file:write", p, c),
    batchConvert: (filePaths) => ipcRenderer.invoke("conversion:batch", filePaths),
    dryRunConvert: (filePaths) => ipcRenderer.invoke("conversion:dryrun", filePaths),
});
