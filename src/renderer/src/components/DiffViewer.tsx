// [Diff 뷰어] Monaco Diff Editor 사용
import { useState } from 'react'
import { DiffEditor } from '@monaco-editor/react'
import { useTranslation } from 'react-i18next'
import PRRejectModal from './PRRejectModal'

interface Props {
    original: string;
    modified: string;
    language: string;
    onApprove: () => void;
    onReject: (reason?: string) => void;
    onClose: () => void;
}

export default function DiffViewer({ original, modified, language, onApprove, onReject, onClose }: Props) {
    const { t } = useTranslation()
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)

    return (
        <div className="diff-viewer-overlay">
            <div className="diff-viewer-container">
                <header className="diff-header">
                    <h3>🔍 {t('pr.reviewTitle', '변경 사항 검토')}</h3>
                    <div className="diff-actions">
                        <button onClick={() => setIsRejectModalOpen(true)} className="reject-btn">❌ {t('userManage.reject', '거절')}</button>
                        <button onClick={onApprove} className="approve-btn">✅ {t('userManage.approve', '승인')}</button>
                        <button onClick={onClose} className="close-btn">{t('common.close', '닫기')}</button>
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

            <PRRejectModal
                isOpen={isRejectModalOpen}
                onClose={() => setIsRejectModalOpen(false)}
                onConfirm={(reason) => {
                    onReject(reason);
                    setIsRejectModalOpen(false); // 닫기
                }}
            />
        </div>
    );
}
