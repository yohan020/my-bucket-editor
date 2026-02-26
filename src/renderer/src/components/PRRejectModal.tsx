// [PR 거절 모달] 거절 사유 입력
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
}

export default function PRRejectModal({ isOpen, onClose, onConfirm }: Props) {
    const { t } = useTranslation()
    const [reason, setReason] = useState('')

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(reason);
        setReason('');
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2000 // DiffViewer보다 위에 표시
        }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{
                backgroundColor: '#1e1e1e',
                padding: '20px',
                borderRadius: '8px',
                width: '400px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                border: '1px solid #333'
            }}>
                <h3 style={{ marginTop: 0, marginBottom: '15px' }}>{t('pr.rejectTitle', '거절 사유 입력')}</h3>

                <form onSubmit={handleSubmit}>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder={t('pr.rejectReasonPlaceholder', '거절 사유를 입력하세요 (선택 사항)')}
                        style={{
                            width: '100%',
                            height: '100px',
                            backgroundColor: '#2d2d2d',
                            border: '1px solid #444',
                            borderRadius: '4px',
                            color: '#e0e0e0',
                            padding: '10px',
                            marginBottom: '15px',
                            resize: 'none',
                            fontFamily: 'inherit'
                        }}
                        autoFocus
                    />

                    <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: 'transparent',
                                border: '1px solid #555',
                                borderRadius: '4px',
                                color: '#aaa',
                                cursor: 'pointer'
                            }}
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#ef4444',
                                border: 'none',
                                borderRadius: '4px',
                                color: 'white',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            {t('pr.confirmReject', '거절 확인')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
