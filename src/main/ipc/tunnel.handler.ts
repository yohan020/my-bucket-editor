// [터널 핸들러] ngrok 터널 관련 IPC 핸들러
import { ipcMain } from 'electron'
import { startTunnel, stopTunnel, getActiveUrl } from '../tunnel'

export function registerTunnelHandlers(): void {
    // 터널 시작 (외부 URL 생성)
    ipcMain.handle('tunnel:start', async (_, port: number) => {
        try {
            const url = await startTunnel(port)
            return { success: true, url }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    })

    // 터널 종료
    ipcMain.handle('tunnel:stop', async () => {
        try {
            await stopTunnel()
            return { success: true }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    })

    // 현재 터널 URL 조회
    ipcMain.handle('tunnel:getUrl', () => {
        return getActiveUrl()
    })
}
