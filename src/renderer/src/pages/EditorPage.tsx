import { useState, useEffect, useRef } from 'react'
import { FileNode } from '../types'
import FileTree from '../components/FileTree'
import { io, Socket } from 'socket.io-client'
import * as Y from 'yjs'
import { MonacoBinding } from 'y-monaco'
import Editor from '@monaco-editor/react'

interface Props {
    projectName: string
    projectPath: string
    port: number
    onBack: () => void
}

export default function EditorPage({ projectName, projectPath, port, onBack }: Props) {
    const [fileTree, setFileTree] = useState<FileNode[]>([])
    const [currentFile, setCurrentFile] = useState<string | null>(null)
    const [fileContent, setFileContent] = useState('')
    const [language, setLanguage] = useState('plaintext')
    const socketRef = useRef<Socket | null>(null)
    const yDocRef = useRef<Y.Doc | null>(null)
    const bindingRef = useRef<MonacoBinding | null>(null)
    const editorRef = useRef<any>(null)
    const currentFileRef = useRef<string | null>(null)

    // 컴포넌트 마운트 시 파일 트리 로드
    useEffect(() => {
        loadFileTree()
    }, [projectPath])

    useEffect(() => {
        const socket = io(`http://localhost:${port}`)
        socketRef.current = socket

        socket.on('connect', () => {
            console.log('✅ Socket.io 연결 성공!')
        })

        socket.on('file:read:response', (data) => {
            if (data.success && data.yjsState) {
                bindingRef.current?.destroy()
                yDocRef.current?.destroy()

                const yDoc = new Y.Doc()
                const yText = yDoc.getText('content')
                Y.applyUpdate(yDoc, new Uint8Array(data.yjsState))

                yDocRef.current = yDoc
                setCurrentFile(data.filePath)
                setFileContent(yText.toString())

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

        socket.on('yjs:update', (data) => {
            if (data.filePath === currentFileRef.current && yDocRef.current) {
                Y.applyUpdate(yDocRef.current, new Uint8Array(data.update))
            }
        })

        return () => { socket.disconnect() }
    }, [port])

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

    return (
        <div className="editor-layout">
            {/* 헤더 */}
            <header className="editor-header">
                <button className="back-btn" onClick={onBack}>← 돌아가기</button>
                <h2>{projectName}</h2>
                <span className="project-path">{projectPath}</span>
            </header>
            {/* 메인 영역 */}
            <div className="editor-main">
                {/* 사이드바 (파일 트리) */}
                <aside className="editor-sidebar">
                    <div className="sidebar-header">📁 파일 탐색기</div>
                    <FileTree tree={fileTree} onFileClick={handleFileClick} />
                </aside>
                {/* 에디터 영역 */}
                <main className="editor-content">
                    {currentFile ? (
                        <Editor
                            height="100%"
                            theme="vs-dark"
                            language={language}
                            value={fileContent}
                            onMount={(editor, monaco) => {
                                editorRef.current = editor
                                // Yjs 바인딩은 file:read:response에서 처리됨

                                // Ctrl+S 저장
                                editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                                    if (currentFileRef.current) {
                                        socketRef.current?.emit('file:write', { filePath: currentFileRef.current })
                                    }
                                })
                            }}
                        />
                    ) : (
                        <div className="editor-placeholder">
                            👈 왼쪽에서 파일을 선택하세요
                        </div>
                    )}
                </main>
            </div>
        </div>
    )
}