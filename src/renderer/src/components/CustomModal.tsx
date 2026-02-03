// [커스텀 모달 컴포넌트] 상단바 + Alert/Confirm 모드 지원
import { useTranslation } from 'react-i18next'
import { useModal, ModalType } from '../contexts/ModalContext'

const typeLabels: Record<ModalType, { icon: string; label: string; color: string }> = {
    success: { icon: '✅', label: '성공', color: '#22c55e' },
    error: { icon: '❌', label: '오류', color: '#ef4444' },
    warning: { icon: '⚠️', label: '주의', color: '#f59e0b' },
    info: { icon: 'ℹ️', label: '알림', color: '#3b82f6' }
}

export default function CustomModal() {
    const { t } = useTranslation()
    const { modalState, closeModal } = useModal()

    if (!modalState.isOpen) return null

    const typeInfo = typeLabels[modalState.type]
    const isConfirm = modalState.mode === 'confirm'

    return (
        <div className="modal-overlay" onClick={isConfirm ? modalState.onCancel : closeModal}>
            <div className="custom-modal" onClick={(e) => e.stopPropagation()}>
                {/* 상단 헤더바 */}
                <div className="modal-header">
                    <span className="modal-type-label">
                        <span className="type-text">{modalState.title || typeInfo.label}</span>
                    </span>
                    <button className="modal-close-btn" onClick={isConfirm ? modalState.onCancel : closeModal}>
                        ✕
                    </button>
                </div>

                {/* 본문 */}
                <div className="modal-body">
                    <p className="modal-message">{modalState.message}</p>
                </div>

                {/* 버튼 영역 */}
                <div className="modal-footer">
                    {isConfirm ? (
                        <>
                            <button className="modal-btn cancel" onClick={modalState.onCancel}>
                                {modalState.cancelText || t('common.cancel')}
                            </button>
                            <button className="modal-btn confirm" onClick={modalState.onConfirm}>
                                {modalState.confirmText || t('common.confirm')}
                            </button>
                        </>
                    ) : (
                        <button className="modal-btn ok" onClick={closeModal}>
                            {t('common.confirm')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
