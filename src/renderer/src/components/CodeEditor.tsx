// [코드 에디터] Monaco Editor를 사용한 코드 에디터 컴포넌트
import Editor from '@monaco-editor/react'

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
            options={{
                minimap: { enabled: true },
                fontSize: 14,
                wordWrap: 'on',
                automaticLayout: true,
            }}
        />
    )
}