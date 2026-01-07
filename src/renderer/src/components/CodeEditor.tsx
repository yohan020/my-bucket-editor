// [코드 에디터] Monaco Editor를 사용한 코드 에디터 컴포넌트
import Editor, { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'

// 로컬 Monaco 사용 설정
loader.config({ monaco })

interface Props {
    content: string,
    language: string,
    onChange: (value: string | undefined) => void
}

export default function CodeEditor({ content, language, onChange }: Props) {
    return (
        <Editor
            height="100%"
            language={language}
            value={content}
            onChange={onChange}
            theme="vs-dark"
            loading={<div style={{ color: 'white', padding: '20px' }}>⏳ Monaco 에디터 로딩 중...</div>}
            onMount={() => console.log('✅ Monaco Editor 로드 완료!')}
            options={{
                minimap: { enabled: true },
                fontSize: 14,
                wordWrap: 'on',
                automaticLayout: true,
            }}
        />
    )
}