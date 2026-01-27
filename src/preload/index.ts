// [Preload Bridge] Renderer와 Main Process 간 IPC 통신 API를 노출하는 브릿지
import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:openDirectory'),
  getProjects: (): Promise<any[]> => ipcRenderer.invoke('project:list'),
  createProject: (project: any): Promise<boolean> => ipcRenderer.invoke('project:create', project),
  startServer: (port: number, projectPath: string): Promise<any> => ipcRenderer.invoke('server:start', {port, projectPath}),
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

  // === 터널(ngrok) 관련 API ===
  startTunnel: (port: number): Promise<{ success: boolean; url?: string; error?: string }> => ipcRenderer.invoke('tunnel:start', port),
  stopTunnel: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('tunnel:stop'),
  getTunnelUrl: (): Promise<string | null> => ipcRenderer.invoke('tunnel:getUrl')
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
