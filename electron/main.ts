import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let win: BrowserWindow | null = null;

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
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ---- Conversion helpers (mocked for now) ----
async function convertCode(code: string, filePath: string): Promise<{ converted: string; diagnostics: any[]; error: string | null }> {
  // TODO: Replace with real conversion logic
  return {
    converted: code + "\n// [converted]", // mock
    diagnostics: [],
    error: null,
  };
}

// ---- Batch Conversion IPC ----
ipcMain.handle("conversion:batch", async (_e, filePaths: string[]) => {
  const results = [];
  for (const filePath of filePaths) {
    try {
      const code = await fs.readFile(filePath, "utf8");
      const res = await convertCode(code, filePath);
      results.push({
        filePath,
        original: code,
        converted: res.converted,
        diagnostics: res.diagnostics,
        error: res.error,
      });
    } catch (err) {
      let errorMsg = "Unknown error";
      if (err instanceof Error) errorMsg = err.message;
      results.push({ filePath, error: errorMsg });
    }
  }
  return { results };
});

// ---- Improved Dry Run IPC ----
ipcMain.handle("conversion:dryrun", async (_e, filePaths: string[]) => {
  const previews = [];
  for (const filePath of filePaths) {
    try {
      const code = await fs.readFile(filePath, "utf8");
      const res = await convertCode(code, filePath);
      previews.push({
        filePath,
        original: code,
        converted: res.converted,
        diagnostics: res.diagnostics,
        error: res.error,
        diff: res.converted !== code ? "[diff available]" : null, // mock diff
      });
    } catch (err) {
      let errorMsg = "Unknown error";
      if (err instanceof Error) errorMsg = err.message;
      previews.push({ filePath, error: errorMsg });
    }
  }
  return { previews };
});

// ---- File system helpers ----
async function readDirRecursive(root: string) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const result: any[] = [];
  for (const e of entries) {
    const full = path.join(root, e.name);
    if (e.isDirectory()) {
      result.push({
        type: "dir",
        name: e.name,
        path: full,
        children: await readDirRecursive(full),
      });
    } else {
      result.push({ type: "file", name: e.name, path: full });
    }
  }
  return result;
}

ipcMain.handle("workspace:open", async () => {
  const res = await dialog.showOpenDialog({ properties: ["openDirectory"] });
  if (res.canceled || res.filePaths.length === 0) return null;
  const root = res.filePaths[0];
  const tree = await readDirRecursive(root);
  return { root, tree };
});

ipcMain.handle("file:read", async (_e, filePath: string) => {
  return fs.readFile(filePath, "utf8");
});

ipcMain.handle("file:write", async (_e, filePath: string, content: string) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
  return true;
});
