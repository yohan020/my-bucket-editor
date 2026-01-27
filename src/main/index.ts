// [Main Process 진입점] Electron 앱 초기화, IPC 등록, 윈도우 생성을 담당
import { app, BrowserWindow, ipcMain, session } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createWindow } from './window'
import { registerAllHandlers } from './ipc'

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // CSP 헤더 제거 (외부 Socket.io 연결 허용)
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ['']
      }
    })
  })

  ipcMain.on('ping', () => console.log('pong'))

  // 모든 IPC 핸들러 등록
  registerAllHandlers()

  // 윈도우 생성
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', async () => {
  await import('./tunnel').then(m => m.cleanupTunnels())
  if (process.platform !== 'darwin') app.quit()
})