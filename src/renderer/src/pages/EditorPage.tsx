import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { FileNode } from '../types'
import FileTree from '../components/FileTree'
import { io, Socket } from 'socket.io-client'
import * as Y from 'yjs'
import { MonacoBinding } from 'y-monaco'
import Editor from '@monaco-editor/react'
import { Awareness } from 'y-protocols/awareness'
import { encodeAwarenessUpdate, applyAwarenessUpdate } from 'y-protocols/awareness'
import { getFileIconUrl } from '../utils/fileIcons'
import { updateCursorStyles, cleanupCursorStyles } from '../utils/cursorStyles'
import { useModal } from '../contexts/ModalContext'
import { PullRequest } from '../types'
import PRListPanel from '../components/PRListPanel'
import DiffViewer from '../components/DiffViewer'

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
    const { t } = useTranslation()
    const { showAlert } = useModal()
    const [fileTree, setFileTree] = useState<FileNode[]>([])
    const [currentFile, setCurrentFile] = useState<string | null>(null)
    const [openTabs, setOpenTabs] = useState<string[]>([])
    const [language, setLanguage] = useState('plaintext')

    const [showUserPanel, setShowUserPanel] = useState(false)
    const [approvedUsers, setApprovedUsers] = useState<{ email: string }[]>([])
    const [onlineUsers, setOnlineUsers] = useState<string[]>([])

    // PR 시스템 상태
    const [leftPanelTab, setLeftPanelTab] = useState<'files' | 'pr'>('files')
    const [prList, setPrList] = useState<PullRequest[]>([])
    const [selectedPR, setSelectedPR] = useState<PullRequest | null>(null)
    const [originalContent, setOriginalContent] = useState<string>('')

    const socketRef = useRef<Socket | null>(null)
    const yDocRef = useRef<Y.Doc | null>(null)
    const bindingRef = useRef<MonacoBinding | null>(null)
    const editorRef = useRef<any>(null)
    const currentFileRef = useRef<string | null>(null)
    const awarenessRef = useRef<Awareness | null>(null)
    const tabBarRef = useRef<HTMLDivElement | null>(null)  // 탭 스크롤용

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

        // Awareness 변경을 서버로 전송 + 커서 스타일 업데이트
        awareness.on('update', ({ added, updated, removed }) => {
            const changedClients = [...added, ...updated, ...removed]
            if (changedClients.length > 0) {
                const update = encodeAwarenessUpdate(awareness, changedClients)
                socketRef.current?.emit('awareness:update', {
                    filePath: currentFileRef.current,
                    update: Array.from(update)
                })
                // 커서 스타일 동적 업데이트
                updateCursorStyles(awareness)
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

        return () => {
            cleanupCursorStyles()  // 커서 스타일 정리
        }
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

                // DiffViewer용 원본 콘텐츠 저장 (PR 검토 중일 때)
                if (data.content !== undefined) {
                    setOriginalContent(data.content)
                }

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

        socket.on('file:read:disk:response', (data) => {
            if (data.success) {
                console.log('📄 원본 파일 데이터 수신:', data.filePath)
                setOriginalContent(data.content)
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

        // PR 목록 요청
        socket.emit('pr:list')

        // PR 관련 핸들러
        socket.on('pr:list:response', (data) => {
            if (data.success) setPrList(data.prs)
        })

        socket.on('pr:list:update', (prs) => {
            setPrList(prs)
        })

        socket.on('pr:notification', (pr: PullRequest) => {
            // 알림 표시 (Toast가 없으니 console.log)
            console.log('🔔 새 PR 도착:', pr.message)
            // PR 탭으로 전환할지 여부는 선택사항
            if (leftPanelTab !== 'pr') {
                // 배지 표시 등을 위해 상태 업데이트 (여기선 생략)
            }
        })

        socket.on('pr:approved', () => {
            setSelectedPR(null) // 닫기
            showAlert({ message: 'PR이 승인되었습니다.', type: 'success' })
        })

        socket.on('pr:rejected', () => {
            setSelectedPR(null) // 닫기
            showAlert({ message: 'PR이 거절되었습니다.', type: 'info' })
        })

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
            showAlert({ message: t('errors.serverError') + ': ' + result.error, type: 'error' })
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

    // 파일 클릭 핸들러 (탭에 추가)
    const handleFileClick = (filePath: string) => {
        currentFileRef.current = filePath
        setLanguage(detectLanguage(filePath))

        // 탭에 없으면 추가
        setOpenTabs(prev => {
            if (!prev.includes(filePath)) {
                return [...prev, filePath]
            }
            return prev
        })

        socketRef.current?.emit('file:read', filePath)
    }

    // 탭 클릭 핸들러 (파일 전환)
    const handleTabClick = (filePath: string) => {
        if (currentFile === filePath) return
        currentFileRef.current = filePath
        setLanguage(detectLanguage(filePath))
        socketRef.current?.emit('file:read', filePath)
    }

    // 탭 닫기 핸들러
    const handleTabClose = (filePath: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setOpenTabs(prev => prev.filter(f => f !== filePath))

        // 현재 탭을 닫으면 다른 탭으로 전환
        if (currentFile === filePath) {
            const remaining = openTabs.filter(f => f !== filePath)
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
                <button className="back-btn" onClick={onBack}>← {t('common.back')}</button>
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
                {/* 사이드바 (파일 트리 / PR 목록) */}
                <aside className="file-tree">
                    <div className="sidebar-tabs">
                        <button
                            className={`tab-btn ${leftPanelTab === 'files' ? 'active' : ''}`}
                            onClick={() => setLeftPanelTab('files')}
                        >
                            📁 파일
                        </button>
                        <button
                            className={`tab-btn ${leftPanelTab === 'pr' ? 'active' : ''}`}
                            onClick={() => setLeftPanelTab('pr')}
                        >
                            🚀 PRs ({prList.length})
                        </button>
                    </div>

                    {leftPanelTab === 'files' ? (
                        <FileTree tree={fileTree} onFileClick={handleFileClick} />
                    ) : (
                        <PRListPanel
                            prs={prList}
                            onSelect={(pr) => {
                                setSelectedPR(pr)
                                // 원본 파일 내용 요청 (디스크 버전)
                                socketRef.current?.emit('file:read:disk', pr.filePath)
                            }}
                        />
                    )}
                </aside>
                {/* 에디터 영역 */}
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
                    {/* 에디터 */}
                    {currentFile ? (
                        <Editor
                            height="100%"
                            theme="vs-dark"
                            language={language}
                            defaultValue=""
                            options={editorOptions}
                            onMount={handleEditorMount}
                        />
                    ) : (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            height: '100%',
                            color: '#666',
                            flexDirection: 'column',
                            gap: '10px'
                        }}>
                            <div style={{ fontSize: '3rem' }}>📁</div>
                            <div>{t('editor.selectFile')}</div>
                        </div>
                    )}
                </main>
                {/* 우측 패널 (접속자 목록) */}
                {showUserPanel && (
                    <aside className="right-panel">
                        <div className="panel-header">
                            <span>👥 {t('editor.users')}</span>
                            <button onClick={() => setShowUserPanel(false)}>✕</button>
                        </div>
                        <ul className="user-list">
                            <li className="online">
                                <span className="status-dot">🟢</span>
                                <span>Host</span>
                                <span className="status-text">{t('editor.online')}</span>
                            </li>
                            {/* 온라인 유저 먼저 (접속 순서대로), 오프라인은 뒤로 */}
                            {[...approvedUsers]
                                .sort((a, b) => {
                                    const aOnline = onlineUsers.includes(a.email)
                                    const bOnline = onlineUsers.includes(b.email)
                                    if (aOnline && !bOnline) return -1  // a가 온라인이면 앞으로
                                    if (!aOnline && bOnline) return 1   // b가 온라인이면 앞으로
                                    // 둘 다 온라인이면 접속 순서대로 (onlineUsers 배열 순서)
                                    if (aOnline && bOnline) {
                                        return onlineUsers.indexOf(a.email) - onlineUsers.indexOf(b.email)
                                    }
                                    return 0
                                })
                                .map(user => {
                                    const isOnline = onlineUsers.includes(user.email)
                                    return (
                                        <li key={user.email} className={isOnline ? 'online' : 'offline'}>
                                            <span className="status-dot">{isOnline ? '🟢' : '⚫'}</span>
                                            <span>{user.email}</span>
                                            <span className="status-text">{isOnline ? t('editor.online') : t('editor.offline')}</span>
                                        </li>
                                    )
                                })}
                        </ul>
                    </aside>
                )}
            </div>

            {/* Diff Viewer Modal */}
            {selectedPR && (
                <DiffViewer
                    original={originalContent}
                    modified={selectedPR.content}
                    language={detectLanguage(selectedPR.filePath)}
                    onApprove={() => socketRef.current?.emit('pr:approve', selectedPR.id)}
                    onReject={() => socketRef.current?.emit('pr:reject', selectedPR.id)}
                    onClose={() => setSelectedPR(null)}
                />
            )}
        </div>
    )
}