// [Guest 연결 페이지] Host IP:Port 입력하여 연결
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
    onConnect: (address: string, token: string, email: string) => void
    onBack: () => void
}

export default function GuestConnectPage({ onConnect, onBack }: Props) {
    const { t } = useTranslation()
    const [address, setAddress] = useState('')
    const [step, setStep] = useState<'address' | 'login'>('address')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [status, setStatus] = useState<'idle' | 'loading' | 'pending' | 'error'>('idle')
    const [message, setMessage] = useState('')


    const handleConnect = async () => {
        setStatus('loading')
        try {
            // 간단한 연결 테스트 (서버에 GET 요청)
            const res = await fetch(`http://${address}`, {
                headers: { 'Bypass-Tunnel-Reminder': 'true' }
            })
            if (res.ok) {
                setStep('login')
                setStatus('idle')
            } else {
                setStatus('error')
                setMessage(t('errors.connectionFailed'))
            }
        } catch (e) {
            setStatus('error')
            setMessage(t('errors.connectionFailed'))
        }
    }

    const handleLogin = async () => { // 로그인
        setStatus('loading')
        try {
            const res = await fetch(`http://${address}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Bypass-Tunnel-Reminder': 'true'
                },
                body: JSON.stringify({ email, password })
            })
            const data = await res.json()
            if (res.ok && data.success) {
                onConnect(address, data.token, email)
            } else {
                setStatus(res.status === 202 ? 'pending' : 'error')
                setMessage(data.message)
            }
        } catch (e) {
            setStatus('error')
            setMessage(t('errors.invalidCredentials'))
        }
    }

    return (
        <div className="guest-connect-container">
            {step === 'address' ? (
                <>
                    <h1>👤 {t('modeSelect.guest')}</h1>
                    <p>{t('guest.serverAddress')}</p>
                    <input
                        placeholder="192.168.0.10:3002"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                    />
                    <div className="buttons">
                        <button
                            className="connect-btn"
                            onClick={handleConnect}
                            disabled={status === 'loading'}
                        >
                            {status === 'loading' ? `⏳ ${t('guest.connecting')}` : `🔗 ${t('guest.connect')}`}
                        </button>
                        <button className="back-btn" onClick={onBack}>
                            ← {t('common.back')}
                        </button>
                    </div>
                    {message && <p className="error-message">{message}</p>}
                </>
            ) : (
                <>
                    <h1>🔐 {t('login.title')}</h1>
                    <p>{t('guest.serverAddress')}: {address}</p>
                    <input
                        placeholder={t('guest.email')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                        type="password"
                        placeholder={t('guest.password')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    />
                    {message && (
                        <p className={status === 'pending' ? 'pending-message' : 'error-message'}>
                            {message}
                        </p>
                    )}
                    <div className="buttons">
                        <button
                            className="connect-btn"
                            onClick={handleLogin}
                            disabled={status === 'loading'}
                        >
                            {status === 'loading' ? `⏳ ${t('guest.connecting')}` : t('common.login')}
                        </button>
                        <button className="back-btn" onClick={() => setStep('address')}>
                            ← {t('common.back')}
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}