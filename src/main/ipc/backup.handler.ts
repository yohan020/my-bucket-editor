
import { ipcMain } from 'electron';
import { createBackup, listBackups, restoreBackup, deleteBackup, getBackupPath, setBackupPath } from '../backup';

export function registerBackupHandlers(): void {
  ipcMain.handle('backup:create', async (_, projectPath: string) => {
    return await createBackup(projectPath);
  });

  ipcMain.handle('backup:list', async (_, projectPath: string) => {
    return await listBackups(projectPath);
  });

  ipcMain.handle('backup:restore', async (_, { projectPath, backupPath }: { projectPath: string; backupPath: string }) => {
    return await restoreBackup(projectPath, backupPath);
  });

  ipcMain.handle('backup:delete', async (_, backupPath: string) => {
    await deleteBackup(backupPath);
    return true;
  });

  ipcMain.handle('backup:getPath', async () => {
    return getBackupPath();
  });

  ipcMain.handle('backup:setPath', async (_, newPath: string) => {
    setBackupPath(newPath);
    return true;
  });
}
