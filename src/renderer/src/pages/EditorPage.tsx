import { useState, useEffect, useRef, useCallback } from 'react'
import { FileNode } from '../types'
import FileTree from '../components/FileTree'
import { io, Socket } from 'socket.io-client'
import * as Y from 'yjs'
import { MonacoBinding } from 'y-monaco'
import Editor from '@monaco-editor/react'
import { Awareness } from 'y-protocols/awareness'
import { encodeAwarenessUpdate, applyAwarenessUpdate } from 'y-protocols/awareness'

const editorOptions = {
    automaticLayout: true,
    readOnly: false,
    scrollBeyondLastLine: false,
    minimap: { enabled: false }
}

interface Props {
    projectName: string
    projectPath: string
    port: number
    onBack: () => void
}

export default function EditorPage({ projectName, projectPath, port, onBack }: Props) {
    const [fileTree, setFileTree] = useState<FileNode[]>([])
    const [currentFile, setCurrentFile] = useState<string | null>(null)
    const [language, setLanguage] = useState('plaintext')

    const [showUserPanel, setShowUserPanel] = useState(false)
    const [approvedUsers, setApprovedUsers] = useState<{ email: string }[]>([])
    const [onlineUsers, setOnlineUsers] = useState<string[]>([])

    const socketRef = useRef<Socket | null>(null)
    const yDocRef = useRef<Y.Doc | null>(null)
    const bindingRef = useRef<MonacoBinding | null>(null)
    const editorRef = useRef<any>(null)
    const currentFileRef = useRef<string | null>(null)
    const awarenessRef = useRef<Awareness | null>(null)

    // 바인딩 설정 함수 (에디터와 Yjs 문서가 모두 준비되었을 때 호출)
    const setupBinding = useCallback(() => {
        const editor = editorRef.current
        const yDoc = yDocRef.current

        if (!editor || !yDoc) return

        // 기존 정리 (중요: Awareness도 정리해야 커서 충돌 방지)
        bindingRef.current?.destroy()
        awarenessRef.current?.destroy()

        // Awareness 생성
        const awareness = new Awareness(yDoc)
        awarenessRef.current = awareness

        // 사용자 정보 설정
        awareness.setLocalStateField('user', {
            name: 'Host',
            color: '#3b82f6'
        })

        // 바인딩 생성 (4번째 인자로 awareness 전달!)
        bindingRef.current = new MonacoBinding(
            yDoc.getText('content'),
            editor.getModel()!,
            new Set([editor]),
            awareness  // ★ 이게 핵심!
        )

        // Awareness 변경을 서버로 전송
        awareness.on('update', ({ added, updated, removed }) => {
            const changedClients = [...added, ...updated, ...removed]
            if (changedClients.length > 0) {
                const update = encodeAwarenessUpdate(awareness, changedClients)
                socketRef.current?.emit('awareness:update', {
                    filePath: currentFileRef.current,
                    update: Array.from(update)
                })
            }
        })
    }, [])

    // 컴포넌트 마운트 시 포커스 상태 리셋 + 파일 트리 로드
    useEffect(() => {
        // 에디터 페이지 진입 시 포커스 상태 리셋 (서버 재시작 후에도 강제 포커스 작동)
        if ((window as any).api?.resetFocus) {
            (window as any).api.resetFocus()
        }
        loadFileTree()

        // 허가된 유저 목록 가져오기
        window.api.getApprovedUsers(port).then(users => {
            setApprovedUsers(users)
        })
    }, [projectPath])

    // Socket.io 연결
    useEffect(() => {
        const socket = io(`http://localhost:${port}`)
        socketRef.current = socket

        socket.on('connect', () => {
            console.log('✅ Host Socket.io 연결 성공!')
        })

        socket.on('file:read:response', (data) => {
            if (data.success && data.yjsState) {
                console.log('📄 파일 데이터 수신:', data.filePath)

                // 기존 정리 (Awareness 포함)
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

                // 파일 상태 업데이트 (Editor 리마운트 트리거)
                setCurrentFile(data.filePath)

                // 에디터가 이미 마운트되어 있으면 바인딩 시도
                // (새 에디터가 마운트되면 onMount에서 다시 시도함)
                setTimeout(() => {
                    setupBinding()
                }, 100)
            }
        })

        socket.on('awareness:update', ({ filePath, update }: { filePath: string, update: number[] }) => {
            if (filePath === currentFileRef.current && awarenessRef.current) {
                applyAwarenessUpdate(awarenessRef.current, new Uint8Array(update), 'remote')
            }
        })

        socket.on('yjs:update', (data) => {
            if (data.filePath === currentFileRef.current && yDocRef.current) {
                Y.applyUpdate(yDocRef.current, new Uint8Array(data.update), 'remote')
            }
        })

        // 접속자 목록 수신
        socket.on('users:online', (emails: string[]) => {
            setOnlineUsers(emails)
        })

        // 접속자 목록 요청
        socket.emit('users:online')

        return () => {
            socket.disconnect()
            if (bindingRef.current) {
                bindingRef.current.destroy()
            }
            if (yDocRef.current) {
                yDocRef.current.destroy()
            }
        }
    }, [port, setupBinding])

    const loadFileTree = async () => {
        const result = await window.api.getFileTree(projectPath)
        if (result.success) {
            setFileTree(result.tree)
        } else {
            alert('파일 트리 로드 실패: ' + result.error)
        }
    }

    // 파일 확장자로 언어 감지
    const detectLanguage = (filePath: string): string => {
        const ext = filePath.split('.').pop()?.toLowerCase()
        const langMap: Record<string, string> = {
            ts: 'typescript',
            tsx: 'typescript',
            js: 'javascript',
            jsx: 'javascript',
            json: 'json',
            html: 'html',
            css: 'css',
            md: 'markdown',
            py: 'python',
        }
        return langMap[ext || ''] || 'plaintext'
    }

    // 파일 클릭 핸들러
    const handleFileClick = (filePath: string) => {
        currentFileRef.current = filePath
        setLanguage(detectLanguage(filePath))
        socketRef.current?.emit('file:read', filePath)
    }

    // Editor onMount 핸들러
    const handleEditorMount = (editor: any, monaco: any) => {
        console.log('🖥️ Editor 마운트 완료')
        editorRef.current = editor

        // ★ 핵심: 윈도우 포커스 요청 (키보드 입력 활성화)
        if ((window as any).api?.focusWindow) {
            (window as any).api.focusWindow().then(() => {
                console.log('🎯 윈도우 포커스 완료')
                editor.focus()
            }).catch(() => { })
        }

        // Ctrl+S 저장
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            if (currentFileRef.current) {
                const content = editor.getValue()
                socketRef.current?.emit('file:write', {
                    filePath: currentFileRef.current,
                    content
                })
                console.log('💾 저장 요청')
            }
        })

        // yDoc이 이미 준비되어 있으면 바인딩 시도
        setTimeout(() => {
            setupBinding()
        }, 50)
    }

    return (
        <div className="guest-editor">
            {/* 헤더 */}
            <header className="editor-header">
                <button className="back-btn" onClick={onBack}>← 돌아가기</button>
                <h2>{projectName}</h2>
                <span className="project-path">{projectPath}</span>
                {/* 토글 버튼 */}
                <button
                    className="toggle-panel-btn"
                    onClick={() => setShowUserPanel(!showUserPanel)}
                >
                    👥 {onlineUsers.length}
                </button>
            </header>
            {/* 메인 영역 */}
            <div className="editor-main">
                {/* 사이드바 (파일 트리) */}
                <aside className="file-tree">
                    <div className="sidebar-header">📁 파일 탐색기</div>
                    <FileTree tree={fileTree} onFileClick={handleFileClick} />
                </aside>
                {/* 에디터 영역 */}
                <main className="editor-container">
                    <Editor
                        height="100%"
                        theme="vs-dark"
                        language={language}
                        defaultValue=""
                        options={editorOptions}
                        onMount={handleEditorMount}
                    />
                </main>
                {/* 우측 패널 (접속자 목록) */}
                {showUserPanel && (
                    <aside className="right-panel">
                        <div className="panel-header">
                            <span>👥 접속자</span>
                            <button onClick={() => setShowUserPanel(false)}>✕</button>
                        </div>
                        <ul className="user-list">
                            <li className="online">
                                <span className="status-dot">🟢</span>
                                <span>Host</span>
                                <span className="status-text">접속중</span>
                            </li>
                            {approvedUsers.map(user => {
                                const isOnline = onlineUsers.includes(user.email)
                                return (
                                    <li key={user.email} className={isOnline ? 'online' : 'offline'}>
                                        <span className="status-dot">{isOnline ? '🟢' : '⚫'}</span>
                                        <span>{user.email}</span>
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