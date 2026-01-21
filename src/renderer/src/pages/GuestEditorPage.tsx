// [Guest 에디터] Host 서버에 연결하여 실시간 코드 편집
import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import Editor from '@monaco-editor/react'
import FileTree from '../components/FileTree'
import * as Y from 'yjs'
import { MonacoBinding } from 'y-monaco'
import { Awareness } from 'y-protocols/awareness'
import { encodeAwarenessUpdate, applyAwarenessUpdate } from 'y-protocols/awareness'

interface FileNode {
    name: string
    path: string
    isDirectory: boolean
    children?: FileNode[]
}

interface Props {
    address: string
    token: string
    onDisconnect: () => void
}

export default function GuestEditorPage({ address, token, onDisconnect }: Props) {
    const [fileTree, setFileTree] = useState<FileNode[]>([])
    const [currentFile, setCurrentFile] = useState<string | null>(null)
    const [content, setContent] = useState('')
    const [isConnected, setIsConnected] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const socketRef = useRef<Socket | null>(null)
    const currentFileRef = useRef<string | null>(null)
    const yDocRef = useRef<Y.Doc | null>(null)
    const bindingRef = useRef<MonacoBinding | null>(null)
    const editorRef = useRef<any>(null)
    const awarenessRef = useRef<Awareness | null>(null)

    // currentFile이 바뀔 때마다 ref 동기화
    useEffect(() => {
        currentFileRef.current = currentFile
    }, [currentFile])

    // Socket.io 연결
    useEffect(() => {
        console.log('🔄 Socket.io 연결 시도:', `http://${address}`)
        const socket = io(`http://${address}`, {
            auth: { token } // 토큰 전달
        })
        socketRef.current = socket

        socket.on('connect', () => {
            console.log('✅ Socket.io 연결 성공!')
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
                // 기존 문서 정리
                bindingRef.current?.destroy()
                yDocRef.current?.destroy()
                awarenessRef.current?.destroy()

                // 새 Yjs 문서 생성
                const yDoc = new Y.Doc()
                const yText = yDoc.getText('content')

                // 서버 상태 적용
                Y.applyUpdate(yDoc, new Uint8Array(data.yjsState))

                yDocRef.current = yDoc
                setCurrentFile(data.filePath)
                setContent(yText.toString())

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

                if (editorRef.current) {
                    // 바인딩 생성 (4번째 인자로 awareness 전달!)
                    bindingRef.current = new MonacoBinding(
                        yText,
                        editorRef.current.getModel()!,
                        new Set([editorRef.current]),
                        awareness  // ★ 다중 커서 핵심!
                    )

                    // Yjs 업데이트 서버로 전송
                    yDoc.on('update', (update: Uint8Array, origin: any) => {
                        if (origin === 'remote') return
                        socketRef.current?.emit('yjs:update', {
                            filePath: data.filePath,
                            update: Array.from(update)
                        })
                    })

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
                }
            }
        })

        socket.on('file:change', (data) => {
            // ref를 사용하여 현재 파일인지 확인
            if (data.filePath === currentFileRef.current) {
                setContent(data.content)
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

        // Awareness 업데이트 수신
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
    }, [address])

    const handleFileClick = (path: string) => {
        socketRef.current?.emit('file:read', path)
    }

    const handleEditorChange = (value: string | undefined) => {
        if (value !== undefined && currentFile) {
            setContent(value)
            socketRef.current?.emit('file:change', {
                filePath: currentFile,
                content: value
            })
        }
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
                        value={content}
                        onChange={handleEditorChange}
                        onMount={(editor, monaco) => {
                            editorRef.current = editor

                            // Yjs-Monaco 바인딩 (yDoc과 awareness가 있으면)
                            if (yDocRef.current && awarenessRef.current) {
                                const yText = yDocRef.current.getText('content')

                                // 기존 바인딩 정리
                                bindingRef.current?.destroy()

                                // Monaco-Yjs 바인딩 (Awareness 포함)
                                bindingRef.current = new MonacoBinding(
                                    yText,
                                    editor.getModel()!,
                                    new Set([editor]),
                                    awarenessRef.current  // ★ 다중 커서!
                                )
                            }

                            // Ctrl+S 저장
                            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                                if (currentFileRef.current) {
                                    socketRef.current?.emit('file:write', { filePath: currentFileRef.current })
                                    console.log('💾 저장 요청:', currentFileRef.current)
                                }
                            })
                        }}
                    />
                </main>
            </div>
        </div>
    )
}
