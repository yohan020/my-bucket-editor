// [Preload Bridge] Renderer와 Main Process 간 IPC 통신 API를 노출하는 브릿지
import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:openDirectory'),
  getProjects: (): Promise<any[]> => ipcRenderer.invoke('project:list'),
  createProject: (project: any): Promise<boolean> => ipcRenderer.invoke('project:create', project),
  startServer: (port: number, projectPath: string, projectName: string): Promise<any> => ipcRenderer.invoke('server:start', {port, projectPath, projectName}),
  stopServer: (port: number): Promise<boolean> => ipcRenderer.invoke('server:stop', port),
  onGuestRequest: (callback: (data: { port: number, email: string }) => void) => {
    const handler = (_: Electron.IpcRendererEvent, data: { port: number, email: string }) => callback(data)
    ipcRenderer.on('guest-request', handler)
    return () => ipcRenderer.removeListener('guest-request', handler)
  },

  // === 파일 관련 API ====
  getFileTree: (dirPath: string): Promise<any> => ipcRenderer.invoke('file:tree', dirPath),
  readFile: (filePath: string): Promise<any> => ipcRenderer.invoke('file:read', filePath),
  writeFile: (filePath: string, content: string): Promise<any> => ipcRenderer.invoke('file:write', {filePath, content}),

  // === 프로젝트 삭제 API ===
  deleteProject: (projectId: number): Promise<any> => ipcRenderer.invoke('project:delete', projectId),

  // === 유저 목록 관련 API ===
  getApprovedUsers: (port: number): Promise<any[]> => ipcRenderer.invoke('user:list', port),
  getPendingUsers: (port: number): Promise<any[]> => ipcRenderer.invoke('user:pending:list', port),
  removeApprovedUser: (port: number, email: string): Promise<any> => ipcRenderer.invoke('user:remove', { port, email }),
  approveUser: (port: number, email: string): Promise<any> => ipcRenderer.invoke('user:approve', { port, email }),
  rejectUser: (port: number, email: string): Promise<any> => ipcRenderer.invoke('user:reject', { port, email }),

  // === 윈도우 포커스 API ===
  focusWindow: (): Promise<boolean> => ipcRenderer.invoke('window:focus'),
  resetFocus: (): Promise<boolean> => ipcRenderer.invoke('window:resetFocus'),
  refocusWindow: (): Promise<boolean> => ipcRenderer.invoke('window:refocus'),

  // === 터널(ngrok) 관련 API ===
  startTunnel: (port: number, projectName?: string): Promise<{ success: boolean; url?: string; error?: string }> => ipcRenderer.invoke('tunnel:start', port, projectName),
  stopTunnel: (port?: number): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('tunnel:stop', port),
  getTunnelUrl: (port?: number): Promise<string | null> => ipcRenderer.invoke('tunnel:getUrl', port),
  getTunnelSettings: (): Promise<{ service: string; ngrokAuthToken: string }> => ipcRenderer.invoke('tunnel:getSettings'),
  setTunnelSettings: (settings: { service?: string; ngrokAuthToken?: string }): Promise<{ success: boolean }> => ipcRenderer.invoke('tunnel:setSettings', settings),

  // === 클립보드 API ===
  copyToClipboard: (text: string): Promise<void> => ipcRenderer.invoke('clipboard:write', text),

  // === 백업 API ===
  createBackup: (projectPath: string): Promise<string> => ipcRenderer.invoke('backup:create', projectPath),
  listBackups: (projectPath: string): Promise<any[]> => ipcRenderer.invoke('backup:list', projectPath),
  restoreBackup: (projectPath: string, backupPath: string): Promise<void> => ipcRenderer.invoke('backup:restore', { projectPath, backupPath }),
  getBackupPath: (): Promise<string> => ipcRenderer.invoke('backup:getPath'),
  setBackupPath: (path: string): Promise<void> => ipcRenderer.invoke('backup:setPath', path),
  deleteBackup: (backupPath: string): Promise<boolean> => ipcRenderer.invoke('backup:delete', backupPath),

  // === 인증 API ===
  auth: {
      checkStatus: (): Promise<{ isConfigured: boolean }> => ipcRenderer.invoke('auth:status'),
      setup: (password: string): Promise<{ success: boolean; recoveryCode?: string; error?: string }> => ipcRenderer.invoke('auth:setup', password),
      login: (password: string): Promise<{ success: boolean }> => ipcRenderer.invoke('auth:login', password),
      reset: (recoveryCode: string): Promise<{ success: boolean }> => ipcRenderer.invoke('auth:reset', recoveryCode),
      
      // 2FA
      getTotpStatus: (): Promise<{ enabled: boolean }> => ipcRenderer.invoke('auth:totp-status'),
      generateTotp: (): Promise<{ success: boolean; secret: string; qrDataUrl: string; error?: string }> => ipcRenderer.invoke('auth:totp-generate'),
      verifyTotpSetup: (data: { token: string; secret: string }): Promise<{ isValid: boolean }> => ipcRenderer.invoke('auth:totp-verify-setup', data),
      enableTotp: (secret: string): Promise<{ success: boolean }> => ipcRenderer.invoke('auth:totp-enable', secret),
      disableTotp: (): Promise<{ success: boolean }> => ipcRenderer.invoke('auth:totp-disable'),
      verifyTotp: (token: string): Promise<{ isValid: boolean }> => ipcRenderer.invoke('auth:totp-verify', token)
  },

  // === 창 닫기 확인 API ===
  onCloseConfirm: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('app:close-confirm', handler)
    return () => ipcRenderer.removeListener('app:close-confirm', handler)
  },
  closeResponse: (action: 'background' | 'quit' | 'cancel'): void => {
    ipcRenderer.send('app:close-response', action)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
