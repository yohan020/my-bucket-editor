// [파일 핸들러] 파일 트리 조회, 읽기, 저장 관련 IPC 처리
import { ipcMain } from 'electron'
import { scanDirectory, readFileContent, writeFileContent } from '../utils/fileSystem'

// 파일 트리 조회
export function registerFileHandlers(): void {
    // 파일 트리 조회
    ipcMain.handle('file:tree', async (_, dirPath: string) => {
        try {
            const tree = await scanDirectory(dirPath)
            return { success: true, tree }
        } catch (error) {
            console.error('파일 트리 조회 실패:', error)
            return { success: false, error: String(error) }
        }
    })

    // 파일 내용 읽기
    ipcMain.handle('file:read', async (_, filePath: string) => {
        try {
            const content = await readFileContent(filePath)
            return { success: true, content }
        } catch (error) {
            console.error('파일 읽기 실패: ',error)
            return { success: false, error: String(error)}
        }
    })

    // 파일 저장
    ipcMain.handle('file:write', async (_, {filePath, content}: {filePath:string, content:string}) => {
        try {
            await writeFileContent(filePath, content)
            return { success: true}
        } catch (error) {
            console.error('파일 저장 실패:', error)
            return { success: false, error: String(error)}
        }
    })
}