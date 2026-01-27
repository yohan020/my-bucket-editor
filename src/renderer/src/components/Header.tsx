// [헤더 컴포넌트] 대시보드 상단 영역 - 유저 정보, 생성 버튼
import { useTranslation } from 'react-i18next'
import LanguageSelector from './LanguageSelector'

interface Props {
    username: string
    onCreateClick: () => void
}

export default function Header({ username, onCreateClick }: Props) {
    const { t } = useTranslation()

    return (
        <header className="top-header">
            <div className="header-left">
                <h2>📂 {t('dashboard.title')}</h2>
            </div>
            <div className="header-right">
                <LanguageSelector />
                <span className="user-badge">👤 {username}</span>
                <button className="create-btn" onClick={onCreateClick}>+ {t('dashboard.createProject')}</button>
            </div>
        </header>
    )
}