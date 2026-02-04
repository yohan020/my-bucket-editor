// [로그인 페이지] 관리자(Host) 로그인 화면 UI 컴포넌트
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
    onLogin: (username: string) => void
    onBack: () => void
}

export default function LoginPage({ onLogin, onBack }: Props) {
    const { t } = useTranslation()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    const handleLogin = () => {
        if (!username || !password) {
            setError(t('errors.invalidCredentials'))
            return
        }
        setError('')
        onLogin(username)
    }

    return (
        <div className="center-container">
            <div className="login-card">
                <h1>🔒 {t('login.title')}</h1>
                <input
                    type="text"
                    placeholder="ID"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                />
                <input
                    type="password"
                    placeholder="PW"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
                {error && <p className="error-message">{error}</p>}
                <button className="primary-btn full-width" onClick={handleLogin}>{t('common.login')}</button>
                <button
                    className="primary-btn full-width"
                    onClick={onBack}
                    style={{ marginTop: '10px', backgroundColor: '#555' }}
                >
                    {t('common.back')}
                </button>
            </div>
        </div>
    )
}