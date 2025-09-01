import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
let win = null;
async function createWindow() {
    win = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
        },
    });
    const isDev = !app.isPackaged;
    const url = isDev
        ? "http://localhost:5173"
        : `file://${path.join(process.cwd(), "dist", "index.html")}`;
    await win.loadURL(url);
}
app.whenReady().then(() => {
    createWindow();
    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
app.on("window-all-closed", () => {
    if (process.platform !== "darwin")
        app.quit();
});
// ---- File system helpers ----
async function readDirRecursive(root) {
    const entries = await fs.readdir(root, { withFileTypes: true });
    const result = [];
    for (const e of entries) {
        const full = path.join(root, e.name);
        if (e.isDirectory()) {
            result.push({
                type: "dir",
                name: e.name,
                path: full,
                children: await readDirRecursive(full),
            });
        }
        else {
            result.push({ type: "file", name: e.name, path: full });
        }
    }
    return result;
}
ipcMain.handle("workspace:open", async () => {
    const res = await dialog.showOpenDialog({ properties: ["openDirectory"] });
    if (res.canceled || res.filePaths.length === 0)
        return null;
    const root = res.filePaths[0];
    const tree = await readDirRecursive(root);
    return { root, tree };
});
ipcMain.handle("file:read", async (_e, filePath) => {
    return fs.readFile(filePath, "utf8");
});
ipcMain.handle("file:write", async (_e, filePath, content) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, "utf8");
    return true;
});
