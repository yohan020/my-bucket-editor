// [로그인 페이지] 관리자(Host) 로그인 화면 UI 컴포넌트
import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
    onLogin: (username: string) => void
    onBack: () => void
}

export default function LoginPage({ onLogin, onBack }: Props) {
    const { t } = useTranslation()
    const [username, setUsername] = useState('') // Host 이름 (현재는 표시용)
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [showRecovery, setShowRecovery] = useState(false)
    const [recoveryCode, setRecoveryCode] = useState('')
    const [recoveryError, setRecoveryError] = useState('')
    const [step, setStep] = useState<'password' | 'totp'>('password')
    const [totpCode, setTotpCode] = useState('')

    const passwordInputRef = useRef<HTMLInputElement>(null)
    const recoveryInputRef = useRef<HTMLInputElement>(null)
    const totpInputRef = useRef<HTMLInputElement>(null)

    // 화면 진입 시 비밀번호 입력창에 포커스
    useEffect(() => {
        const initFocus = async () => {
            await window.api.resetFocus().catch(() => { })
            await window.api.focusWindow().catch(() => { })

            if (!showRecovery) {
                if (step === 'password') {
                    setTimeout(() => passwordInputRef.current?.focus(), 300)
                } else {
                    setTimeout(() => totpInputRef.current?.focus(), 300)
                }
            } else {
                setTimeout(() => recoveryInputRef.current?.focus(), 300)
            }
        }
        initFocus()
    }, [showRecovery, step])

    const handleLogin = async () => {
        if (!password) {
            setError(t('login.passwordRequired'))
            return
        }

        try {
            const result = await window.api.auth.login(password)
            if (result.success) {
                // 2FA 확인
                const { enabled } = await (window.api.auth as any).getTotpStatus()
                if (enabled) {
                    setStep('totp')
                    setError('')
                } else {
                    onLogin(username || 'Host')
                }
            } else {
                setError(t('login.passwordMismatch'))
            }
        } catch (e: any) {
            setError(e.message)
        }
    }

    const handleTotpVerify = async () => {
        if (!totpCode || totpCode.length !== 6) {
            setError(t('login.totpRequired'))
            return
        }
        try {
            const { isValid } = await (window.api.auth as any).verifyTotp(totpCode)
            if (isValid) {
                onLogin(username || 'Host')
            } else {
                setError(t('login.totpInvalid'))
            }
        } catch (e: any) {
            setError(t('login.authError'))
        }
    }

    const handleRecovery = async () => {
        if (!recoveryCode) return
        try {
            const result = await window.api.auth.reset(recoveryCode)
            if (result.success) {
                alert(t('recovery.success'))
                // 앱 리로드 또는 AuthSetup으로 이동 필요
                // 여기서는 간단히 새로고침
                window.location.reload()
            } else {
                setRecoveryError(t('recovery.invalidCode'))
            }
        } catch (e: any) {
            setRecoveryError(e.message)
        }
    }

    if (showRecovery) {
        return (
            <div className="center-container">
                <div className="login-card">
                    <h1>{t('recovery.title')}</h1>
                    <p style={{ marginBottom: '20px', color: '#666', whiteSpace: 'pre-line' }}>
                        {t('recovery.desc')}
                    </p>
                    <input
                        ref={recoveryInputRef}
                        type="text"
                        placeholder={t('recovery.placeholder')}
                        value={recoveryCode}
                        onChange={e => setRecoveryCode(e.target.value.toUpperCase())}
                        autoFocus
                    />
                    {recoveryError && <p className="error-message">{recoveryError}</p>}
                    <button className="primary-btn full-width" onClick={handleRecovery}>
                        {t('recovery.resetBtn')}
                    </button>
                    <button
                        className="secondary-btn full-width"
                        onClick={() => setShowRecovery(false)}
                        style={{ marginTop: '10px' }}
                    >
                        {t('recovery.cancel')}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="center-container">
            <div className="login-card">
                {step === 'password' ? (
                    <>
                        <h1 style={{ textAlign: 'center' }}>🔒 {t('login.hostLogin')}</h1>
                        <p style={{ textAlign: 'center', color: '#888', marginBottom: '20px' }}>
                            {t('login.enterPassword')}
                        </p>

                        <input
                            type="text"
                            placeholder="Display Name (Optional)"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            style={{ marginBottom: '10px', display: 'none' }} // Hidden for now
                        />

                        <input
                            ref={passwordInputRef}
                            type="password"
                            placeholder={t('login.passwordPlaceholder')}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                            autoFocus
                        />

                        {error && <p className="error-message">{error}</p>}

                        <button className="primary-btn full-width" onClick={handleLogin}>
                            {t('login.loginBtn')}
                        </button>

                        <div style={{ marginTop: '15px', textAlign: 'center' }}>
                            <span
                                style={{ color: '#007bff', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline' }}
                                onClick={() => setShowRecovery(true)}
                            >
                                {t('login.forgotPassword')}
                            </span>
                        </div>

                        <button
                            className="secondary-btn full-width"
                            onClick={onBack}
                            style={{ marginTop: '20px', backgroundColor: '#555' }}
                        >
                            {t('common.back')}
                        </button>
                    </>
                ) : (
                    <>
                        <h1 style={{ textAlign: 'center' }}>{t('totp.title')}</h1>
                        <p style={{ textAlign: 'center', color: '#888', marginBottom: '20px' }}>
                            {t('totp.desc')}
                        </p>

                        <input
                            ref={totpInputRef}
                            type="text"
                            placeholder={t('totp.placeholder')}
                            value={totpCode}
                            onChange={(e) => setTotpCode(e.target.value.replace(/[^0-9]/g, ''))}
                            onKeyDown={(e) => e.key === 'Enter' && handleTotpVerify()}
                            maxLength={6}
                            style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '4px' }}
                            autoFocus
                        />

                        {error && <p className="error-message">{error}</p>}

                        <button className="primary-btn full-width" onClick={handleTotpVerify}>
                            {t('totp.verifyBtn')}
                        </button>

                        <button className="secondary-btn full-width" onClick={() => { setStep('password'); setError(''); }} style={{ marginTop: '10px' }}>
                            {t('totp.back')}
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}