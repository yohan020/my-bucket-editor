// [socket.io 핸들러] Guest의 파일 동기화 및 실시간 동시 편집
import { Server, Socket } from "socket.io"
import { scanDirectory, readFileContent, writeFileContent } from '../../utils/fileSystem'
import { verifyToken } from '../utils/jwt'
import * as Y from 'yjs'

// 파일별 현재 내용 캐시 (메모리)
const fileContents = new Map<string, string>()

// 파일별 Yjs 문서 관리
const yDocs = new Map<string, Y.Doc>()

// 현재 접속 중인 유저 목록
const connectedUsers = new Map<string, string>()

export function setupSocketHandlers(io: Server, projectPath: string): void {


    //토큰 검증 미들웨어 추가
    io.use((socket, next) => {
        const origin = socket.handshake.headers.origin || ''
        const referer = socket.handshake.headers.referer || ''
        
        // Host 연결 확인 (localhost 또는 origin이 비어있는 경우)
        const isLocalhost = 
            origin === '' || 
            origin.includes('localhost') || 
            origin.includes('127.0.0.1') ||
            referer.includes('localhost') ||
            referer.includes('127.0.0.1')
        
        // Host는 토큰 없이 허용
        if (isLocalhost) {
            console.log('✅ Host 연결:', socket.id, 'origin:', origin || '(empty)')
            return next()
        }
        
        // Guest는 토큰 필요
        const token = socket.handshake.auth?.token
        if (token && verifyToken(token)) {
            console.log('✅ Guest 인증 성공:', socket.id)
            next()
        } else {
            console.log('❌ Guest 인증 실패:', socket.id, 'origin:', origin)
            next(new Error('인증이 필요합니다'))
        }
    })

    io.on('connection', (socket: Socket) => {
        console.log('🔌 Guest 연결됨:', socket.id)

        // 접속 유저 등록 및 브로드 캐스트
        const userEmail = socket.handshake.auth?.email || 'Host'
        connectedUsers.set(socket.id, userEmail)
        io.emit('users:online', Array.from(connectedUsers.values()))

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
                // Yjs 문서 생성 또는 가져오기
                if (!yDocs.has(filePath)) {
                    const yDoc = new Y.Doc()
                    const yText = yDoc.getText('content')
                    const content = await readFileContent(filePath)
                    yText.insert(0, content)
                    yDocs.set(filePath, yDoc)
                }

                const yDoc = yDocs.get(filePath)!
                const state = Y.encodeStateAsUpdate(yDoc)

                // 파일별 room에 참여
                socket.join(filePath)
                socket.emit('file:read:response', { 
                    success: true,
                    filePath,
                    yjsState: Array.from(state)
                 })
            } catch (error) {
                socket.emit('file:read:response', { success: false, error: String(error) })
            }
        })

        socket.on('yjs:update', ({ filePath, update }: {filePath: string, update: number[]}) => {
            const yDoc = yDocs.get(filePath)
            if (yDoc) {
                Y.applyUpdate(yDoc, new Uint8Array(update))
                socket.to(filePath).emit('yjs:update', { filePath, update })
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

        // Awareness 업데이트를 다른 클라이언트에게 브로드캐스트
        socket.on('awareness:update', ({ filePath, update }: {filePath: string, update: number[]}) =>{
            // 같은 파일을 보는 다른 사용자에게 전파
            socket.to(filePath).emit('awareness:update', { filePath, update })
        })

        // 클라이언트가 파일에서 나갈 때 room 퇴장
        socket.on('file:leave', (filePath: string) => {
            socket.leave(filePath)
        })

        // 접속자 목록 요청
        socket.on('users:online', () => {
            socket.emit('users:online', Array.from(connectedUsers.values()))
        })

        // 승인된 유저 목록 요청 (Guest용)
        socket.on('users:approved', async (port: number) => {
            const { loadApprovedUsers } = await import('../../utils/userStore')
            const users = await loadApprovedUsers(port)
            socket.emit('users:approved', users.map(u => ({ email: u.email })))
        })

        socket.on('disconnect', () => {
            console.log('🔌 Guest 연결 끊김:', socket.id)

            // 유저 제거 및 브로드캐스트
            connectedUsers.delete(socket.id)
            io.emit('users:online', Array.from(connectedUsers.values()))
        })


    })
}