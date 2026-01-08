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
  approveUser: (port: number, email: string, allow: boolean): Promise<any> => ipcRenderer.invoke('user:approve', {port, email, allow}),
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
  removeApprovedUser: (port: number, email: string): Promise<any> => ipcRenderer.invoke('user:remove', { port, email })
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
