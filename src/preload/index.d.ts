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
  startTunnel: (port: number) => Promise<{ success: boolean; url?: string; error?: string }>
  stopTunnel: () => Promise<{ success: boolean; error?: string }>
  getTunnelUrl: () => Promise<string | null>
  copyToClipboard: (text: string) => Promise<void>
  createBackup: (projectPath: string) => Promise<string>
  listBackups: (projectPath: string) => Promise<any[]>
  restoreBackup: (projectPath: string, backupPath: string) => Promise<void>
  getBackupPath: () => Promise<string>
  setBackupPath: (path: string) => Promise<void>
  deleteBackup: (backupPath: string) => Promise<boolean>
  getTunnelSettings: () => Promise<{ service: string; ngrokAuthToken: string; cloudflareToken?: string; cloudflareDomain?: string }>
  setTunnelSettings: (settings: { service?: string; ngrokAuthToken?: string; cloudflareToken?: string; cloudflareDomain?: string }) => Promise<{ success: boolean }>
  
  auth: {
      checkStatus: () => Promise<{ isConfigured: boolean }>
      setup: (password: string) => Promise<{ success: boolean; recoveryCode?: string; error?: string }>
      login: (password: string) => Promise<{ success: boolean }>
      reset: (recoveryCode: string) => Promise<{ success: boolean }>
      getTotpStatus: () => Promise<{ enabled: boolean }>
      generateTotp: () => Promise<{ success: boolean; secret: string; qrDataUrl: string; error?: string }>
      verifyTotpSetup: (data: { token: string; secret: string }) => Promise<{ isValid: boolean }>
      enableTotp: (secret: string) => Promise<{ success: boolean }>
      disableTotp: () => Promise<{ success: boolean }>
      verifyTotp: (token: string) => Promise<{ isValid: boolean }>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: ApiInterface
  }
}
