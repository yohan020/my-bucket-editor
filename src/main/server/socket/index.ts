// [socket.io 핸들러] Guest의 파일 동기화 및 실시간 동시 편집
import { Server, Socket } from "socket.io"
import { scanDirectory, readFileContent, writeFileContent } from '../../utils/fileSystem'

// 파일별 현재 내용 캐시 (메모리)
const fileContents = new Map<string, string>()

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

        // 파일 읽기 요청 (room에 참여)
        socket.on('file:read', async (filePath: string) => {
            try {
                // 캐시에 있으면 캐시 사용, 없으면 파일에서 읽기
                let content = fileContents.get(filePath)
                if (!content) {
                    content = await readFileContent(filePath)
                    fileContents.set(filePath, content)
                }
                
                // 파일별 room에 참여
                socket.join(filePath)
                
                socket.emit('file:read:response', { success: true, content, filePath })
            } catch (error) {
                socket.emit('file:read:response', { success: false, error: String(error) })
            }
        })

        // 실시간 편집 내용 동기화 (타이핑할 때마다)
        socket.on('file:change', ({ filePath, content }: { filePath: string, content: string }) => {
            // 캐시 업데이트
            fileContents.set(filePath, content)
            // 같은 파일을 보는 다른 클라이언트에게 전파
            socket.to(filePath).emit('file:change', { filePath, content })
        })

        // 파일 저장 요청 (Ctrl+S)
        socket.on('file:write', async ({ filePath }: { filePath: string }) => {
            console.log('📝 파일 저장 요청:', filePath)
            try {
                const content = fileContents.get(filePath)
                if (content !== undefined) {
                    await writeFileContent(filePath, content)
                    console.log('✅ 파일 저장 성공:', filePath)
                    socket.emit('file:write:response', { success: true, filePath })
                } else {
                    socket.emit('file:write:response', { success: false, error: '캐시에 내용이 없습니다.' })
                }
            } catch (error) {
                console.error('❌ 파일 저장 실패:', error)
                socket.emit('file:write:response', { success: false, error: String(error) })
            }
        })

        // 클라이언트가 파일에서 나갈 때 room 퇴장
        socket.on('file:leave', (filePath: string) => {
            socket.leave(filePath)
        })

        socket.on('disconnect', () => {
            console.log('🔌 Guest 연결 끊김:', socket.id)
        })
    })
}