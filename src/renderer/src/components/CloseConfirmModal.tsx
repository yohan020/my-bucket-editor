// [닫기 확인 모달] 앱 종료 시 백그라운드 유지/완전 종료 선택
import { useTranslation } from 'react-i18next'

interface Props {
    onBackground: () => void
    onQuit: () => void
    onCancel: () => void
}

export default function CloseConfirmModal({ onBackground, onQuit, onCancel }: Props) {
    const { t } = useTranslation()

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="close-confirm-modal" onClick={(e) => e.stopPropagation()}>
                {/* 상단 헤더바 */}
                <div className="modal-header">
                    <span className="modal-type-label">
                        <span className="type-icon">🚀</span>
                        <span className="type-text">{t('closeConfirm.title')}</span>
                    </span>
                    <button className="modal-close-btn" onClick={onCancel}>✕</button>
                </div>

                {/* 본문 */}
                <div className="modal-body">
                    <p className="modal-message">{t('closeConfirm.message')}</p>
                </div>

                {/* 버튼 영역 */}
                <div className="modal-buttons">
                    <button className="modal-btn background" onClick={onBackground}>
                        <span className="btn-icon">🔽</span>
                        <span className="btn-text">{t('closeConfirm.background')}</span>
                        <span className="btn-desc">{t('closeConfirm.backgroundDesc')}</span>
                    </button>

                    <button className="modal-btn quit" onClick={onQuit}>
                        <span className="btn-icon">🚪</span>
                        <span className="btn-text">{t('closeConfirm.quit')}</span>
                        <span className="btn-desc">{t('closeConfirm.quitDesc')}</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
