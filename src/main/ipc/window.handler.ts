import { ipcMain, BrowserWindow } from 'electron'

// 창별 초기 포커스 완료 여부 추적
const initialFocusDone = new Set<number>()

export function registerWindowHandlers(): void {
    // 에디터 진입 시 포커스 상태 리셋
    ipcMain.handle('window:resetFocus', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender)
        if (win) {
            initialFocusDone.delete(win.id)
            return true
        }
        return false
    })

    ipcMain.handle('window:focus', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender)
        if (win) {
            const winId = win.id
            
            if (win.isMinimized()) win.restore()
            if (!win.isVisible()) win.show()
            
            // 첫 번째 포커스만 blur 사용 (타이핑 활성화에 필요)
            // 이후 포커스는 blur 없이 (깜빡임 방지)
            if (!initialFocusDone.has(winId)) {
                initialFocusDone.add(winId)
                win.blur()
                win.focus()
            } else {
                win.focus()
            }
            win.webContents.focus()
            
            return true
        }
        return false
    })
}
