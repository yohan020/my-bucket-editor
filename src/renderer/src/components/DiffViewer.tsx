// [Diff 뷰어] Monaco Diff Editor 사용
import { DiffEditor } from '@monaco-editor/react'

interface Props {
    original: string;
    modified: string;
    language: string;
    onApprove: () => void;
    onReject: () => void;
    onClose: () => void;
}

export default function DiffViewer({ original, modified, language, onApprove, onReject, onClose }: Props) {
    return (
        <div className="diff-viewer-overlay">
            <div className="diff-viewer-container">
                <header className="diff-header">
                    <h3>🔍 변경 사항 검토</h3>
                    <div className="diff-actions">
                        <button onClick={onReject} className="reject-btn">❌ 거절</button>
                        <button onClick={onApprove} className="approve-btn">✅ 승인</button>
                        <button onClick={onClose} className="close-btn">닫기</button>
                    </div>
                </header>
                <div className="diff-body" style={{ height: 'calc(100% - 60px)' }}>
                    <DiffEditor
                        height="100%"
                        language={language}
                        original={original}
                        modified={modified}
                        theme="vs-dark"
                        options={{
                            readOnly: true,
                            renderSideBySide: true,
                            minimap: { enabled: false }
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
