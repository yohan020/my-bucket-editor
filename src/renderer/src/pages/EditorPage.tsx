import { useState } from 'react'
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
        setCurrentFile(filePath)
        setLanguage(detectLanguage(filePath))
        //TODO : window.api.readFile(filePath) 호출
        setFileContent(`// 파일 내용 로드 예정: ${filePath}`)
    }

    const handleContentChange = (value: string | undefined) => {
        if (value !== undefined) {
            setFileContent(value)
        }
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