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
            
            win.focus()
            win.webContents.focus()
            
            return true
        }
        return false
    })

    // 포커스 문제 해결을 위한 blur/focus 사이클 (alt-tab 효과)
    ipcMain.handle('window:refocus', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender)
        if (win) {
            return new Promise<boolean>((resolve) => {
                // blur 후 짧은 지연을 두고 다시 focus
                win.blur()
                setTimeout(() => {
                    win.focus()
                    win.webContents.focus()
                    resolve(true)
                }, 50)
            })
        }
        return Promise.resolve(false)
    })
}
