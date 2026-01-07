import { useState, useEffect } from 'react'
import { FileNode } from '../types'
import FileTree from '../components/FileTree'
import CodeEditor from '../components/CodeEditor'

interface Props {
    projectName: string
    projectPath: string
    onBack: () => void
}

export default function EditorPage({ projectName, projectPath, onBack }: Props) {
    const [fileTree, setFileTree] = useState<FileNode[]>([])
    const [currentFile, setCurrentFile] = useState<string | null>(null)
    const [fileContent, setFileContent] = useState('')
    const [language, setLanguage] = useState('plaintext')

    // 컴포넌트 마운트 시 파일 트리 로드
    useEffect(() => {
        loadFileTree()
    }, [projectPath])

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

    // 파일 클릭 핸들러 (TODO: 실제 파일 읽기 구현)
    const handleFileClick = async (filePath: string) => {
        const result = await window.api.readFile(filePath)
        if (result.success) {
            setCurrentFile(filePath)
            setLanguage(detectLanguage(filePath))
            setFileContent(result.content || '')
        } else {
            alert('파일 읽기 실패: ' + result.error)
        }
    }

    const handleContentChange = (value: string | undefined) => {
        if (value !== undefined) {
            setFileContent(value)
        }
    }

    useEffect(() => {
        const handleSave = async (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault()
                if (currentFile) {
                    const result = await window.api.writeFile(currentFile, fileContent)
                    if (result.success) {
                        console.log('파일 저장 완료!')
                    } else {
                        alert('파일 저장 실패: ' + result.error)
                    }
                }
            }
        }
        window.addEventListener('keydown', handleSave)
        return () => window.removeEventListener('keydown', handleSave)
    }, [currentFile, fileContent])

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
                        <CodeEditor
                            content={fileContent}
                            language={language}
                            onChange={handleContentChange}
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