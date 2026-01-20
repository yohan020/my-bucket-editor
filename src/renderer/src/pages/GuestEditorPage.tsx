// [Guest 에디터] Host 서버에 연결하여 실시간 코드 편집
import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import Editor from '@monaco-editor/react'
import FileTree from '../components/FileTree'
import * as Y from 'yjs'
import { MonacoBinding } from 'y-monaco'

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

                // 새 Yjs 문서 생성
                const yDoc = new Y.Doc()
                const yText = yDoc.getText('content')

                // 서버 상태 적용
                Y.applyUpdate(yDoc, new Uint8Array(data.yjsState))

                yDocRef.current = yDoc
                setCurrentFile(data.filePath)
                setContent(yText.toString())

                if (editorRef.current) {
                    bindingRef.current = new MonacoBinding(
                        yText,
                        editorRef.current.getModel()!,
                        new Set([editorRef.current])
                    )

                    yDoc.on('update', (update: Uint8Array) => {
                        socketRef.current?.emit('yjs:update', {
                            filePath: data.filePath,
                            update: Array.from(update)
                        })
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
                Y.applyUpdate(yDocRef.current, new Uint8Array(data.update))
            }
        })

        return () => { socket.disconnect() }
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
                            // Yjs-Monaco 바인딩
                            if (yDocRef.current) {
                                const yText = yDocRef.current.getText('content')

                                // 기존 바인딩 정리
                                bindingRef.current?.destroy()

                                // Monaco-Yjs 바인딩
                                bindingRef.current = new MonacoBinding(
                                    yText,
                                    editor.getModel()!,
                                    new Set([editor])
                                )

                                // 변경 시 서버로 전송
                                yDocRef.current.on('update', (update: Uint8Array) => {
                                    socketRef.current?.emit('yjs:update', {
                                        filePath: currentFileRef.current,
                                        update: Array.from(update)
                                    })
                                })
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
