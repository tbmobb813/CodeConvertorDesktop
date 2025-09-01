"use strict";
ipcMain.handle("workspace:open", async () => {
    ipcMain.handle("file:read", async (_e, filePath) => {
        ipcMain.handle("file:write", async (_e, filePath, content) => {
            // ===== electron/main.ts =====
            import { app, BrowserWindow, dialog, ipcMain } from 'electron';
            import path from 'node:path';
            import fs from 'node:fs/promises';
            import fsc from 'node:fs';
            let win = null;
            let lastRoot = null;
            const IGNORE_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '.next', 'out']);
            async function createWindow() {
                win = new BrowserWindow({
                    width: 1280,
                    height: 800,
                    webPreferences: {
                        preload: path.join(__dirname, 'preload.js'),
                        contextIsolation: true,
                        nodeIntegration: false,
                        sandbox: true
                    }
                });
                const isDev = !app.isPackaged;
                const url = isDev ? 'http://localhost:5173' : `file://${path.join(process.cwd(), 'dist', 'index.html')}`;
                await win.loadURL(url);
            }
            app.whenReady().then(() => {
                createWindow();
                app.on('activate', () => {
                    if (BrowserWindow.getAllWindows().length === 0)
                        createWindow();
                });
            });
            app.on('window-all-closed', () => {
                if (process.platform !== 'darwin')
                    app.quit();
            });
            async function readDirRecursive(root) {
                let entries;
                try {
                    entries = await fs.readdir(root, { withFileTypes: true });
                }
                catch (e) {
                    return [];
                }
                const results = [];
                for (const e of entries) {
                    const full = path.join(root, e.name);
                    if (e.isDirectory()) {
                        if (IGNORE_DIRS.has(e.name))
                            continue;
                        results.push({ type: 'dir', name: e.name, path: full, children: await readDirRecursive(full) });
                    }
                    else if (e.isFile()) {
                        results.push({ type: 'file', name: e.name, path: full });
                    }
                }
                // sort: dirs first, then files, alpha
                results.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
                return results;
            }
        });
    });
});
