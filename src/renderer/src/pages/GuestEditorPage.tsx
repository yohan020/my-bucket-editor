// [Guest 에디터] Host 서버에 연결하여 실시간 코드 편집
import { useState, useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import Editor from '@monaco-editor/react'
import FileTree from '../components/FileTree'
import * as Y from 'yjs'
import { MonacoBinding } from 'y-monaco'
import { Awareness } from 'y-protocols/awareness'
import { encodeAwarenessUpdate, applyAwarenessUpdate } from 'y-protocols/awareness'

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
    const [isConnected, setIsConnected] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    const socketRef = useRef<Socket | null>(null)
    const currentFileRef = useRef<string | null>(null)
    const yDocRef = useRef<Y.Doc | null>(null)
    const bindingRef = useRef<MonacoBinding | null>(null)
    const editorRef = useRef<any>(null)
    const awarenessRef = useRef<Awareness | null>(null)

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
        })

        socket.on('disconnect', () => setIsConnected(false))

        socket.on('file:tree:response', (data) => {
            if (data.success) setFileTree(data.tree)
        })

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

    const handleFileClick = (path: string) => {
        socketRef.current?.emit('file:read', path)
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
                <button onClick={onDisconnect}>연결 해제</button>
            </header>
            <div className="editor-main">
                <aside className="file-tree">
                    <div className="sidebar-header">📁 파일 탐색기</div>
                    <FileTree tree={fileTree} onFileClick={handleFileClick} />
                </aside>
                <main className="editor-container">
                    <Editor
                        height="100%"
                        theme="vs-dark"
                        defaultValue=""
                        options={editorOptions}
                        onMount={handleEditorMount}
                    />
                </main>
            </div>
        </div>
    )
}
