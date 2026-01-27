// [모드 선택 페이지] Host/Guest 모드 선택
import { useTranslation } from 'react-i18next'
import LanguageSelector from '../components/LanguageSelector'

interface Props {
    onSelectHost: () => void
    onSelectGuest: () => void
}

export default function ModeSelectPage({ onSelectHost, onSelectGuest }: Props) {
    const { t } = useTranslation()

    return (
        <div className="mode-select-container">
            <div className="language-selector-wrapper">
                <LanguageSelector />
            </div>
            <h1>🪣 {t('modeSelect.title')}</h1>
            <p>{t('modeSelect.selectMode')}</p>

            <div className="mode-buttons">
                <button onClick={onSelectHost} className="mode-btn host">
                    🖥️ {t('modeSelect.host')}
                    <span>{t('modeSelect.hostDesc')}</span>
                </button>

                <button onClick={onSelectGuest} className="mode-btn guest">
                    👤 {t('modeSelect.guest')}
                    <span>{t('modeSelect.guestDesc')}</span>
                </button>
            </div>
        </div>
    )
}