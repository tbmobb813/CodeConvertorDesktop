import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  openWorkspace: () => ipcRenderer.invoke("workspace:open"),
  readFile: (p: string) => ipcRenderer.invoke("file:read", p),
  writeFile: (p: string, c: string) => ipcRenderer.invoke("file:write", p, c),
});

export {};
