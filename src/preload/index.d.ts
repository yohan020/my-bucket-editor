import { ElectronAPI } from '@electron-toolkit/preload'

interface ApiInterface {
  selectFolder: () => Promise<string | null>
  getProjects: () => Promise<any[]>
  createProject: (project: any) => Promise<boolean>
  startServer: (port: number, projectPath: string) => Promise<any>
  stopServer: (port: number) => Promise<boolean>
  onGuestRequest: (callback: (data: { port: number; email: string }) => void) => () => void
  getFileTree: (dirPath: string) => Promise<any>
  readFile: (filePath: string) => Promise<any>
  writeFile: (filePath: string, content: string) => Promise<any>
  deleteProject: (projectId: number) => Promise<any>
  getApprovedUsers: (port: number) => Promise<any[]>
  getPendingUsers: (port: number) => Promise<any[]>
  removeApprovedUser: (port: number, email: string) => Promise<any>
  approveUser: (port: number, email: string) => Promise<any>
  rejectUser: (port: number, email: string) => Promise<any>
  focusWindow: () => Promise<boolean>
  resetFocus: () => Promise<boolean>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: ApiInterface
  }
}
