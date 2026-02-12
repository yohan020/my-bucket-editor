// [Diff 뷰어] Monaco Diff Editor 사용
import { useState } from 'react'
import { DiffEditor } from '@monaco-editor/react'
import { useTranslation } from 'react-i18next'

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
    const [isRejecting, setIsRejecting] = useState(false)
    const [rejectReason, setRejectReason] = useState('')

    const handleRejectConfirm = () => {
        onReject(rejectReason)
    }

    return (
        <div className="diff-viewer-overlay">
            <div className="diff-viewer-container">
                <header className="diff-header">
                    <h3>🔍 {isRejecting ? t('pr.rejectTitle', '거절 사유 입력') : t('pr.reviewTitle', '변경 사항 검토')}</h3>
                    <div className="diff-actions">
                        {isRejecting ? (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <input
                                    type="text"
                                    placeholder={t('pr.rejectReasonPlaceholder', '거절 사유를 입력하세요')}
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    style={{ padding: '6px', borderRadius: '4px', border: '1px solid #555', background: '#222', color: 'white', width: '250px' }}
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleRejectConfirm()}
                                />
                                <button onClick={handleRejectConfirm} className="reject-btn">{t('pr.confirmReject', '거절 확인')}</button>
                                <button onClick={() => setIsRejecting(false)} className="close-btn">{t('common.cancel', '취소')}</button>
                            </div>
                        ) : (
                            <>
                                <button onClick={() => setIsRejecting(true)} className="reject-btn">❌ {t('userManage.reject', '거절')}</button>
                                <button onClick={onApprove} className="approve-btn">✅ {t('userManage.approve', '승인')}</button>
                                <button onClick={onClose} className="close-btn">{t('common.close', '닫기')}</button>
                            </>
                        )}
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
