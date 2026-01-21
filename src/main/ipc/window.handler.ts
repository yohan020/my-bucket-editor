import { ipcMain, BrowserWindow } from 'electron'

export function registerWindowHandlers(): void {
    ipcMain.handle('window:focus', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender)
        if (win) {
            if (win.isMinimized()) win.restore()
            win.show()
            
            // ★ 핵심: OS 레벨 키보드 입력 활성화를 위한 강력한 트릭
            // 1. 잠깐 항상 위에 설정했다가 해제 (Windows에서 포커스 강제)
            win.setAlwaysOnTop(true)
            win.setAlwaysOnTop(false)
            
            // 2. blur 후 focus (포커스 상태 초기화)
            win.blur()
            win.focus()
            
            // 3. webContents에도 포커스
            win.webContents.focus()
            
            return true
        }
        return false
    })
}
