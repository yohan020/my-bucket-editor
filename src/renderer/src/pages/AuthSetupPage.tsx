import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
    onComplete: () => void
}

export default function AuthSetupPage({ onComplete }: Props) {
    const { t } = useTranslation()
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [recoveryCode, setRecoveryCode] = useState<string | null>(null)
    const [error, setError] = useState('')

    const setupInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const initFocus = async () => {
            // 윈도우 포커스 상태 리셋 (blur -> focus 강제 유발)
            await window.api.resetFocus().catch(() => { })
            await window.api.focusWindow().catch(() => { })
            setTimeout(() => setupInputRef.current?.focus(), 300)
        }
        initFocus()
    }, [])

    const handleSetup = async () => {
        if (!password || password.length < 4) {
            setError('비밀번호는 4자 이상이어야 합니다.')
            return
        }
        if (password !== confirm) {
            setError('비밀번호가 일치하지 않습니다.')
            return
        }

        try {
            const result = await window.api.auth.setup(password)
            if (result.success && result.recoveryCode) {
                setRecoveryCode(result.recoveryCode)
                setError('')
            } else {
                setError(result.error || '설정 실패')
            }
        } catch (e: any) {
            setError(e.message)
        }
    }

    const handleCopyAndStart = async () => {
        if (recoveryCode) {
            await window.api.copyToClipboard(recoveryCode)
            onComplete()
        }
    }

    if (recoveryCode) {
        return (
            <div className="center-container">
                <div className="login-card" style={{ maxWidth: '500px', textAlign: 'center' }}>
                    <h1 style={{ color: '#4caf50' }}>✅ 설정 완료!</h1>
                    <p style={{ marginTop: '20px', fontSize: '1.1rem' }}>
                        비밀번호 분실 시 필요한 <b>복구 코드</b>입니다.<br />
                        안전한 곳에 꼭 보관하세요!
                    </p>
                    <div style={{
                        background: '#f5f5f5',
                        padding: '15px',
                        margin: '20px 0',
                        borderRadius: '8px',
                        fontFamily: 'monospace',
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        color: '#333',
                        border: '2px dashed #ccc'
                    }}>
                        {recoveryCode}
                    </div>
                    <button className="primary-btn full-width" onClick={handleCopyAndStart}>
                        코드 복사하고 시작하기
                    </button>
                    <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '10px' }}>
                        * 이 코드는 다시 볼 수 없습니다.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="center-container">
            <div className="login-card">
                <h1>🔐 초기 비밀번호 설정</h1>
                <p style={{ marginBottom: '20px', color: '#666', fontSize: '0.9rem' }}>
                    호스트 대시보드를 보호하기 위한 비밀번호를 설정해주세요.
                </p>
                <input
                    ref={setupInputRef}
                    type="password"
                    placeholder="새 비밀번호"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoFocus
                />
                <input
                    type="password"
                    placeholder="비밀번호 확인"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSetup()}
                />
                {error && <p className="error-message">{error}</p>}
                <button className="primary-btn full-width" onClick={handleSetup}>
                    설정 완료
                </button>
            </div>
        </div>
    )
}
