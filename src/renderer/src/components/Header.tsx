// [헤더 컴포넌트] 대시보드 상단 영역 - 유저 정보, 생성 버튼
import { useTranslation } from 'react-i18next'

interface Props {
    username: string
    onCreateClick: () => void
    onSettingsClick: () => void
    onLogout: () => void
}

export default function Header({ username, onCreateClick, onSettingsClick, onLogout }: Props) {
    const { t } = useTranslation()

    return (
        <header className="top-header">
            <div className="header-left">
                <h2>📂 {t('dashboard.title')}</h2>
            </div>
            <div className="header-right">
                <span className="user-badge">👤 {username}</span>
                <button
                    className="icon-btn"
                    onClick={onSettingsClick}
                    title={t('common.settings')}
                    style={{ marginRight: '10px', width: '40px', height: '40px', fontSize: '1.2rem', cursor: 'pointer' }}
                >
                    ⚙️
                </button>
                <button
                    className="icon-btn"
                    onClick={onLogout}
                    title={t('common.logout')}
                    style={{ marginRight: '10px', height: '40px', fontSize: '1.2rem', cursor: 'pointer', padding: '0 10px', display: 'flex', alignItems: 'center' }}
                >
                    🏠 <span style={{ fontSize: '0.9rem', marginLeft: '5px' }}>Home</span>
                </button>
                <button className="create-btn" onClick={onCreateClick}>+ {t('dashboard.createProject')}</button>
            </div>
        </header>
    )
}