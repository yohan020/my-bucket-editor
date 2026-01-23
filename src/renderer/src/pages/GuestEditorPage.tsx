// [Guest 에디터] Host 서버에 연결하여 실시간 코드 편집
import { useState, useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import Editor from '@monaco-editor/react'
import FileTree from '../components/FileTree'
import * as Y from 'yjs'
import { MonacoBinding } from 'y-monaco'
import { Awareness } from 'y-protocols/awareness'
import { encodeAwarenessUpdate, applyAwarenessUpdate } from 'y-protocols/awareness'
import { getFileIconUrl } from '../utils/fileIcons'

const editorOptions = {
    automaticLayout: true,
    readOnly: false,
    scrollBeyondLastLine: false,
    minimap: { enabled: false }
}

interface FileNode {
    name: string
    path: string
    isDirectory: boolean
    children?: FileNode[]
}

interface Props {
    address: string
    token: string
    email: string
    onDisconnect: () => void
}

export default function GuestEditorPage({ address, token, email, onDisconnect }: Props) {
    const [fileTree, setFileTree] = useState<FileNode[]>([])
    const [currentFile, setCurrentFile] = useState<string | null>(null)
    const [openTabs, setOpenTabs] = useState<string[]>([])  // 열린 탭 목록
    const [isConnected, setIsConnected] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    // 유저 패널 상태
    const [showUserPanel, setShowUserPanel] = useState(false)
    const [onlineUsers, setOnlineUsers] = useState<string[]>([])
    const [approvedUsers, setApprovedUsers] = useState<{ email: string }[]>([])

    const socketRef = useRef<Socket | null>(null)
    const currentFileRef = useRef<string | null>(null)
    const yDocRef = useRef<Y.Doc | null>(null)
    const bindingRef = useRef<MonacoBinding | null>(null)
    const editorRef = useRef<any>(null)
    const awarenessRef = useRef<Awareness | null>(null)
    const tabBarRef = useRef<HTMLDivElement | null>(null)  // 탭 스크롤용

    // 바인딩 설정 함수 (EditorPage와 동일한 패턴)
    const setupBinding = useCallback(() => {
        const editor = editorRef.current
        const yDoc = yDocRef.current

        if (!editor || !yDoc) {
            console.log('⏳ Guest 바인딩 대기 중... editor:', !!editor, 'yDoc:', !!yDoc)
            return
        }

        // 기존 정리 (중요!)
        bindingRef.current?.destroy()
        awarenessRef.current?.destroy()

        // Awareness 생성
        const awareness = new Awareness(yDoc)
        awarenessRef.current = awareness

        // 사용자 정보 설정 (랜덤 색상)
        const colors = ['#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899']
        const randomColor = colors[Math.floor(Math.random() * colors.length)]
        awareness.setLocalStateField('user', {
            name: 'Guest',
            color: randomColor
        })

        // 바인딩 생성
        bindingRef.current = new MonacoBinding(
            yDoc.getText('content'),
            editor.getModel()!,
            new Set([editor]),
            awareness
        )

        console.log('🔗 Guest Yjs 바인딩 완료')

        // Awareness 변경을 서버로 전송
        awareness.on('update', ({ added, updated, removed }: { added: number[], updated: number[], removed: number[] }) => {
            const changedClients = [...added, ...updated, ...removed]
            if (changedClients.length > 0) {
                const update = encodeAwarenessUpdate(awareness, changedClients)
                socketRef.current?.emit('awareness:update', {
                    filePath: currentFileRef.current,
                    update: Array.from(update)
                })
            }
        })

        // 에디터 포커스
        setTimeout(() => editor.focus(), 50)
    }, [])

    // Socket.io 연결
    useEffect(() => {
        console.log('🔄 Socket.io 연결 시도:', `http://${address}`)
        const socket = io(`http://${address}`, {
            auth: { token, email }  // 이메일도 함께 전달
        })
        socketRef.current = socket

        socket.on('connect', () => {
            console.log('✅ Guest Socket.io 연결 성공!')
            setIsConnected(true)
            setIsLoading(false)
            socket.emit('file:tree')
        })

        socket.on('connect_error', (error) => {
            console.error('❌ Socket.io 연결 에러:', error.message)
            // 초기 연결 실패가 아닌 경우에만 (이미 연결된 적이 있는 경우)
            if (isConnected) {
                alert('서버와의 연결이 끊겼습니다. 호스트가 서버를 종료했을 수 있습니다.')
                onDisconnect()
            }
        })

        socket.on('disconnect', (reason) => {
            console.log('🔌 Socket 연결 끊김, 이유:', reason)
            setIsConnected(false)

            // 서버 측에서 연결을 끊은 경우에만 자동 나가기
            // 'io server disconnect' = 서버가 socket.disconnect() 호출
            // 'transport close' = 서버 종료, 네트워크 끊김
            // 'ping timeout' = 서버 응답 없음
            if (reason === 'io server disconnect' ||
                reason === 'transport close' ||
                reason === 'ping timeout') {
                alert('서버와의 연결이 끊겼습니다. 호스트가 서버를 종료했거나 네트워크 문제가 발생했습니다.')
                onDisconnect()
            }
            // 'io client disconnect' = 클라이언트가 disconnect() 호출 (정상 종료)
        })

        socket.on('file:tree:response', (data) => {
            if (data.success) setFileTree(data.tree)
        })

        // 온라인 유저 목록 수신
        socket.on('users:online', (emails: string[]) => {
            console.log('👥 Guest 온라인 유저 목록:', emails)
            setOnlineUsers(emails)
        })

        // 승인된 유저 목록 수신
        socket.on('users:approved', (users: { email: string }[]) => {
            console.log('👥 Guest 승인된 유저 목록:', users)
            setApprovedUsers(users)
        })

        // 접속 시 온라인/승인된 유저 목록 요청
        socket.emit('users:online')
        const port = parseInt(address.split(':')[1] || '3000')
        socket.emit('users:approved', port)

        socket.on('file:read:response', (data) => {
            if (data.success && data.yjsState) {
                console.log('📄 Guest 파일 데이터 수신:', data.filePath)

                // 기존 정리
                bindingRef.current?.destroy()
                bindingRef.current = null
                awarenessRef.current?.destroy()
                awarenessRef.current = null
                yDocRef.current?.destroy()

                // Yjs 문서 생성
                const yDoc = new Y.Doc()
                Y.applyUpdate(yDoc, new Uint8Array(data.yjsState))
                yDocRef.current = yDoc

                // Yjs 업데이트 감지 -> 소켓 전송
                yDoc.on('update', (update: Uint8Array, origin: any) => {
                    if (origin === 'remote') return
                    socketRef.current?.emit('yjs:update', {
                        filePath: currentFileRef.current,
                        update: Array.from(update)
                    })
                })

                // 파일 상태 업데이트
                currentFileRef.current = data.filePath
                setCurrentFile(data.filePath)

                // 바인딩 시도
                setTimeout(() => {
                    setupBinding()
                }, 100)
            }
        })

        socket.on('file:write:response', (data) => {
            if (data.success) console.log('✅ 저장 완료')
            else console.error('❌ 저장 실패:', data.error)
        })

        socket.on('yjs:update', (data) => {
            if (data.filePath === currentFileRef.current && yDocRef.current) {
                Y.applyUpdate(yDocRef.current, new Uint8Array(data.update), 'remote')
            }
        })

        socket.on('awareness:update', ({ filePath, update }: { filePath: string, update: number[] }) => {
            if (filePath === currentFileRef.current && awarenessRef.current) {
                applyAwarenessUpdate(awarenessRef.current, new Uint8Array(update), 'remote')
            }
        })

        return () => {
            socket.disconnect()
            bindingRef.current?.destroy()
            yDocRef.current?.destroy()
            awarenessRef.current?.destroy()
        }
    }, [address, setupBinding])

    // 파일 클릭 핸들러 (탭에 추가)
    const handleFileClick = (path: string) => {
        // 탭에 없으면 추가
        setOpenTabs(prev => {
            if (!prev.includes(path)) {
                return [...prev, path]
            }
            return prev
        })
        socketRef.current?.emit('file:read', path)
    }

    // 탭 클릭 핸들러
    const handleTabClick = (path: string) => {
        if (currentFile === path) return
        socketRef.current?.emit('file:read', path)
    }

    // 탭 닫기 핸들러
    const handleTabClose = (path: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setOpenTabs(prev => prev.filter(f => f !== path))

        if (currentFile === path) {
            const remaining = openTabs.filter(f => f !== path)
            if (remaining.length > 0) {
                handleTabClick(remaining[remaining.length - 1])
            } else {
                setCurrentFile(null)
            }
        }
    }

    // 파일명만 추출
    const getFileName = (filePath: string) => {
        return filePath.split(/[\\/]/).pop() || filePath
    }

    // Editor onMount 핸들러
    const handleEditorMount = (editor: any, monaco: any) => {
        console.log('🖥️ Guest Editor 마운트 완료')
        editorRef.current = editor

        // ★ 핵심: 윈도우 포커스 요청 (키보드 입력 활성화)
        if ((window as any).api?.focusWindow) {
            (window as any).api.focusWindow().then(() => {
                console.log('🎯 Guest 윈도우 포커스 완료')
                editor.focus()
            }).catch(() => { })
        }

        // Ctrl+S 저장
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            if (currentFileRef.current && yDocRef.current) {
                const content = yDocRef.current.getText('content').toString()
                socketRef.current?.emit('file:write', {
                    filePath: currentFileRef.current,
                    content
                })
                console.log('💾 저장 요청:', currentFileRef.current)
            }
        })

        // yDoc이 이미 준비되어 있으면 바인딩 시도
        setTimeout(() => {
            setupBinding()
        }, 50)
    }

    // 로딩 중 표시
    if (isLoading) {
        return (
            <div className="guest-editor loading-screen">
                <div>🔄 연결 중... ({address})</div>
                <div style={{ marginTop: '10px', fontSize: '0.9rem', color: '#888' }}>
                    연결 상태: {isConnected ? '🟢 연결됨' : '🔴 연결 대기 중'}
                </div>
                <button
                    style={{ marginTop: '20px', padding: '10px 20px' }}
                    onClick={onDisconnect}
                >
                    ← 돌아가기
                </button>
            </div>
        )
    }

    return (
        <div className="guest-editor">
            <header className="editor-header">
                <span>📝 Guest Editor</span>
                <span className="current-file">{currentFile || '파일을 선택하세요'}</span>
                <span>{isConnected ? '🟢 연결됨' : '🔴 연결 끊김'}</span>
                {/* 유저 패널 토글 버튼 */}
                <button
                    className="toggle-panel-btn"
                    onClick={() => setShowUserPanel(!showUserPanel)}
                >
                    👥 {onlineUsers.length}
                </button>
                <button onClick={onDisconnect}>연결 해제</button>
            </header>
            <div className="editor-main">
                <aside className="file-tree">
                    <div className="sidebar-header">📁 파일 탐색기</div>
                    <FileTree tree={fileTree} onFileClick={handleFileClick} />
                </aside>
                <main className="editor-container">
                    {/* 탭 바 */}
                    {openTabs.length > 0 && (
                        <div className="tab-bar-container">
                            <div className="tab-bar" ref={tabBarRef}>
                                {openTabs.map(filePath => (
                                    <div
                                        key={filePath}
                                        className={`tab ${currentFile === filePath ? 'active' : ''}`}
                                        onClick={() => handleTabClick(filePath)}
                                    >
                                        <img
                                            src={getFileIconUrl(getFileName(filePath))}
                                            alt=""
                                            className="tab-icon-img"
                                            onError={(e) => (e.currentTarget.style.display = 'none')}
                                        />
                                        <span className="tab-name">{getFileName(filePath)}</span>
                                        <button
                                            className="tab-close"
                                            onClick={(e) => handleTabClose(filePath, e)}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="tab-scroll-buttons">
                                <button
                                    className="tab-scroll-btn"
                                    onClick={() => tabBarRef.current?.scrollBy({ left: -150, behavior: 'smooth' })}
                                >
                                    ◀
                                </button>
                                <button
                                    className="tab-scroll-btn"
                                    onClick={() => tabBarRef.current?.scrollBy({ left: 150, behavior: 'smooth' })}
                                >
                                    ▶
                                </button>
                            </div>
                        </div>
                    )}
                    <Editor
                        height="100%"
                        theme="vs-dark"
                        defaultValue=""
                        options={editorOptions}
                        onMount={handleEditorMount}
                    />
                </main>
                {/* 유저 패널 (접속자 목록) */}
                {showUserPanel && (
                    <aside className="right-panel">
                        <div className="panel-header">
                            <span>👥 접속자</span>
                            <button onClick={() => setShowUserPanel(false)}>✕</button>
                        </div>
                        <ul className="user-list">
                            {/* Host - 실제 접속 상태 표시 */}
                            <li className={onlineUsers.includes('Host') ? 'online' : 'offline'}>
                                <span className="status-dot">{onlineUsers.includes('Host') ? '🟢' : '⚫'}</span>
                                <span>Host</span>
                                <span className="status-text">{onlineUsers.includes('Host') ? '접속중' : '오프라인'}</span>
                            </li>
                            {/* 승인된 유저들 - 온라인/오프라인 상태 표시 */}
                            {approvedUsers
                                .sort((a, b) => {
                                    const aOnline = onlineUsers.includes(a.email)
                                    const bOnline = onlineUsers.includes(b.email)
                                    if (aOnline && !bOnline) return -1
                                    if (!aOnline && bOnline) return 1
                                    return 0
                                })
                                .map(user => {
                                    const isOnline = onlineUsers.includes(user.email)
                                    const isSelf = user.email === email
                                    return (
                                        <li key={user.email} className={isOnline ? 'online' : 'offline'}>
                                            <span className="status-dot">{isOnline ? '🟢' : '⚫'}</span>
                                            <span>{isSelf ? `${user.email} (나)` : user.email}</span>
                                            <span className="status-text">{isOnline ? '접속중' : '오프라인'}</span>
                                        </li>
                                    )
                                })}
                        </ul>
                    </aside>
                )}
            </div>
        </div>
    )
}
