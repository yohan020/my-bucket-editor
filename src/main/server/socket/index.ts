// [socket.io 핸들러] Guest의 파일 동기화를 위한 소켓 이벤트 처리
import { Server, Socket } from "socket.io"
import { scanDirectory, readFileContent, writeFileContent} from '../../utils/fileSystem'

export function setupSocketHandlers(io: Server, projectPath: string): void {
    io.on('connection', (socket: Socket) => {
        console.log('🔌 Guest 연결됨:', socket.id)

        // 파일 트리 요청
        socket.on('file:tree', async () => {
            try {
                const tree = await scanDirectory(projectPath)
                socket.emit('file:tree:response', { success: true, tree })
            } catch (error) {
                socket.emit('file:tree:response', { success: false, error: String(error) })
            }
        })

        // 파일 읽기 요청
        socket.on('file:read', async (filePath: string) => {
            try {
                const content = await readFileContent(filePath)
                socket.emit('file:read:response', { success: true, content, filePath })
            } catch (error) {
                socket.emit('file:read:response', { success: false, error: String(error) })
            }
        })

        // 파일 저장 요청
        socket.on('file:write', async ({filePath, content}: {filePath: string, content: string}) => {
            console.log('📝 파일 저장 요청:', filePath)
            try {
                await writeFileContent(filePath, content)
                console.log('✅ 파일 저장 성공:', filePath)
                socket.emit('file:write:response', { success: true, filePath })
                // 다른 클라이언트에게도 알림
                socket.broadcast.emit('file:updated', { filePath, content })
            } catch (error) {
                console.error('❌ 파일 저장 실패:', error)
                socket.emit('file:write:response', { success: false, error: String(error) })
            }
        })

        socket.on('disconnect', () => {
            console.log('🔌 Guest 연결 끊김:', socket.id)
        })
    })
}