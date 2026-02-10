// [socket.io 핸들러] Guest의 파일 동기화 및 실시간 동시 편집
import { Server, Socket } from "socket.io"
import { scanDirectory, readFileContent, writeFileContent } from '../../utils/fileSystem'
import { verifyToken } from '../utils/jwt'
import { loadApprovedUsers } from '../../utils/userStore'
import * as Y from 'yjs'
import { randomUUID } from 'crypto'
import { addPR, getPRs, removePR, PullRequest, getPR } from '../prStore'

export function setupSocketHandlers(io: Server, projectPath: string): void {
    // [Scope Fix] 각 서버 인스턴스마다 독립적인 상태 관리를 위해 함수 내부로 이동
    // 파일별 현재 내용 캐시 (메모리)
    const fileContents = new Map<string, string>()

    // 파일별 Yjs 문서 관리
    const yDocs = new Map<string, Y.Doc>()

    // 현재 접속 중인 유저 목록
    const connectedUsers = new Map<string, string>()


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
                const content = yDoc.getText('content').toString()

                // 파일별 room에 참여
                socket.join(filePath)
                socket.emit('file:read:response', { 
                    success: true,
                    filePath,
                    content, // DiffViewer용 원본 텍스트 추가
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

        // 파일 저장 요청 (Ctrl+S) -> Host만 가능하도록 제한
        socket.on('file:write', async ({ filePath, content }: { filePath: string, content: string }) => {
            const userEmail = connectedUsers.get(socket.id);
            if (userEmail !== 'Host') {
                console.log('🚫 Guest 파일 저장 시도 차단:', filePath);
                socket.emit('file:write:response', { success: false, error: 'Guest cannot save files directly. Please submit a PR.' });
                return;
            }

            console.log('📝 파일 저장 요청:', filePath)
            try {
                // 클라이언트가 보낸 content를 최우선으로 사용
                if (content !== undefined) {
                    await writeFileContent(filePath, content)
                    // 캐시도 업데이트
                    fileContents.set(filePath, content)
                    console.log('✅ 파일 저장 성공:', filePath)
                    socket.emit('file:write:response', { success: true, filePath })
                } else {
                    // content가 없을 경우 캐시 확인 (하위 호환)
                    const cached = fileContents.get(filePath)
                    if (cached !== undefined) {
                        await writeFileContent(filePath, cached)
                        console.log('✅ 파일 저장 성공 (캐시 사용):', filePath)
                        socket.emit('file:write:response', { success: true, filePath })
                    } else {
                        socket.emit('file:write:response', { success: false, error: '저장할 내용이 없습니다.' })
                    }
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
            const users = await loadApprovedUsers(port)
            socket.emit('users:approved', users.map(u => ({ email: u.email })))
        })

        socket.on('disconnect', () => {
            // 유저 제거 및 브로드캐스트
            connectedUsers.delete(socket.id)
            io.emit('users:online', Array.from(connectedUsers.values()))
        })


        // === PR 시스템 이벤트 핸들러 ===
        socket.on('pr:list', () => {
            const prs = getPRs(projectPath)
            socket.emit('pr:list:response', { success: true, prs })
        })

        socket.on('pr:create', ({ filePath, content, message }: { filePath: string, content: string, message: string }) => {
            try {
                const prId = randomUUID()
                const guestEmail = connectedUsers.get(socket.id) || 'Unknown Guest'
                
                const newPR: PullRequest = {
                    id: prId,
                    filePath,
                    guestEmail,
                    content,
                    message,
                    timestamp: Date.now(),
                    status: 'pending'
                }

                addPR(projectPath, newPR)
                
                console.log('📩 새로운 PR 생성:', prId, message)
                
                // 호스트에게 알림 (모든 클라이언트에게 보내고, 클라이언트가 권한 체크해서 표시)
                io.emit('pr:notification', newPR)
                io.emit('pr:list:update', getPRs(projectPath)) // 목록 갱신 트리거

                socket.emit('pr:create:response', { success: true, prId })
            } catch (error) {
                console.error('❌ PR 생성 실패:', error)
                socket.emit('pr:create:response', { success: false, error: String(error) })
            }
        })

        socket.on('pr:approve', async (prId: string) => {
            const pr = getPR(projectPath, prId)
            if (pr) {
                try {
                    console.log('✅ PR 승인:', prId)
                    await writeFileContent(pr.filePath, pr.content)
                    fileContents.set(pr.filePath, pr.content) // 캐시 업데이트
                    
                    // 파일 변경 전파 (모두에게)
                    io.emit('file:change', { filePath: pr.filePath, content: pr.content })
                    
                    removePR(projectPath, prId)
                    io.emit('pr:approved', prId) 
                    io.emit('pr:list:update', getPRs(projectPath)) // 목록 갱신

                    socket.emit('pr:approve:response', { success: true })
                } catch (e) {
                    console.error('❌ PR 승인 처리 실패:', e)
                    socket.emit('pr:approve:response', { success: false, error: String(e) })
                }
            } else {
                socket.emit('pr:approve:response', { success: false, error: 'PR not found' })
            }
        })

        socket.on('pr:reject', (prId: string) => {
            console.log('🚫 PR 거절:', prId)
            removePR(projectPath, prId)
            io.emit('pr:rejected', prId)
            io.emit('pr:list:update', getPRs(projectPath)) // 목록 갱신
            socket.emit('pr:reject:response', { success: true })
        })
    })
}