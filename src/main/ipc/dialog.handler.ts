// [다이얼로그 핸들러] 폴더 선택 등 시스템 다이얼로그 관련 IPC 처리
import { ipcMain, dialog} from 'electron'

export function registerDialogHandlers(): void {
    // 폴더 선택 핸들러
    ipcMain.handle('dialog:openDirectory', async () => {
        const { canceled, filePaths} = await dialog.showOpenDialog({
            properties: ['openDirectory']
        })
        return canceled ? null : filePaths[0]
    })
}