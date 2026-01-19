// [Guest 에디터] Host 서버에 연결하여 실시간 코드 편집
import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import Editor from '@monaco-editor/react'

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
            if (data.success) {
                setCurrentFile(data.filePath)
                setContent(data.content)
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

    // 재귀적 파일 트리 렌더링
    const renderTree = (nodes: FileNode[], depth: number): JSX.Element[] => {
        return nodes.map(node => (
            <div key={node.path}>
                <div
                    className="tree-item"
                    style={{ paddingLeft: `${16 + depth * 16}px` }}
                    onClick={() => !node.isDirectory && handleFileClick(node.path)}
                >
                    {node.isDirectory ? '📁' : '📄'} {node.name}
                </div>
                {node.isDirectory && node.children && renderTree(node.children, depth + 1)}
            </div>
        ))
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
                    {renderTree(fileTree, 0)}
                </aside>
                <main className="editor-container">
                    <Editor
                        height="100%"
                        theme="vs-dark"
                        value={content}
                        onChange={handleEditorChange}
                        onMount={(editor, monaco) => {
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
