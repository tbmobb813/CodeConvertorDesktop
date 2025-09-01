import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("api", {
    openWorkspace: () => ipcRenderer.invoke("workspace:open"),
    readFile: (p) => ipcRenderer.invoke("file:read", p),
    writeFile: (p, c) => ipcRenderer.invoke("file:write", p, c),
});
