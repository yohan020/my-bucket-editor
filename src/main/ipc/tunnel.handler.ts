// [터널 핸들러] LocalTunnel + ngrok 터널 IPC 핸들러
import { ipcMain } from 'electron'
import { startTunnel, stopTunnel, getActiveUrl, getTunnelSettings, setTunnelSettings, TunnelService } from '../tunnel'

export function registerTunnelHandlers(): void {
    // 터널 시작 (외부 URL 생성)
    ipcMain.handle('tunnel:start', async (_, port: number, projectName?: string) => {
        try {
            const url = await startTunnel(port, projectName)
            return { success: true, url }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    })

    // 터널 종료
    ipcMain.handle('tunnel:stop', async (_, port?: number) => {
        try {
            await stopTunnel(port)
            return { success: true }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    })

    // 현재 터널 URL 조회
    ipcMain.handle('tunnel:getUrl', (_, port?: number) => {
        return getActiveUrl(port)
    })

    // 터널 설정 조회
    ipcMain.handle('tunnel:getSettings', () => {
        return getTunnelSettings()
    })

    // 터널 설정 저장
    ipcMain.handle('tunnel:setSettings', (_, settings: { service?: TunnelService; ngrokAuthToken?: string }) => {
        setTunnelSettings(settings)
        return { success: true }
    })
}
