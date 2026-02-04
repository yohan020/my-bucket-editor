// [Guest 연결 페이지] Host IP:Port 입력하여 연결
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getRecentServers, addRecentServer, removeRecentServer, formatRelativeTime, RecentServer } from '../utils/recentServers'

interface Props {
    onConnect: (address: string, token: string, email: string, projectName: string) => void
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
    const [recentServers, setRecentServers] = useState<RecentServer[]>([])

    // 최근 서버 목록 로드
    useEffect(() => {
        setRecentServers(getRecentServers())
    }, [])

    const handleConnect = async (targetAddr?: string) => {
        const addr = targetAddr || address
        if (!addr) return

        setStatus('loading')
        try {
            // 주소 노멀라이제이션 (http/https 없으면 추가)
            let targetAddress = addr
            if (!addr.startsWith('http://') && !addr.startsWith('https://')) {
                // ngrok, cloudflare 도메인은 https 사용
                if (addr.includes('ngrok') || addr.includes('trycloudflare.com') || addr.includes('.app') || addr.includes('.dev')) {
                    targetAddress = `https://${addr}`
                } else {
                    targetAddress = `http://${addr}`
                }
            }

            // 간단한 연결 테스트 (서버에 GET 요청)
            const res = await fetch(targetAddress, {
                headers: {
                    'Bypass-Tunnel-Reminder': 'true',
                    'ngrok-skip-browser-warning': 'true'
                }
            })
            if (res.ok) {
                setAddress(targetAddress) // 전체 URL 저장
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
            // address는 이미 handleConnect에서 정규화됨
            const res = await fetch(`${address}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Bypass-Tunnel-Reminder': 'true',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({ email, password })
            })
            const data = await res.json()
            if (res.ok && data.success) {
                // 로그인 성공 시 최근 서버에 추가
                addRecentServer(address, data.projectName)
                onConnect(address, data.token, email, data.projectName || 'Unknown')
            } else {
                setStatus(res.status === 202 ? 'pending' : 'error')
                setMessage(data.message)
            }
        } catch (e) {
            setStatus('error')
            setMessage(t('errors.invalidCredentials'))
        }
    }

    const handleRemoveRecent = (addr: string, e: React.MouseEvent) => {
        e.stopPropagation()
        removeRecentServer(addr)
        setRecentServers(getRecentServers())
    }

    const handleRecentClick = (addr: string) => {
        setAddress(addr)
        handleConnect(addr)
    }

    return (
        <div className="guest-connect-container">
            {step === 'address' ? (
                <>
                    <h1>👤 {t('modeSelect.guest')}</h1>

                    {/* 최근 접속 서버 목록 */}
                    {recentServers.length > 0 && (
                        <div className="recent-servers">
                            <div className="recent-servers-header">
                                📌 {t('guest.recentServers')}
                            </div>
                            <div className="recent-servers-list">
                                {recentServers.map(server => (
                                    <div
                                        key={server.address}
                                        className="recent-server-item"
                                        onClick={() => handleRecentClick(server.address)}
                                    >
                                        <div className="server-info">
                                            <span className="server-name">📁 {server.projectName || 'Unknown Project'}</span>
                                            <span className="server-address">🌐 {server.address}</span>
                                        </div>
                                        <div className="server-meta">
                                            <span className="server-time">{formatRelativeTime(server.lastConnected, t)}</span>
                                            <button
                                                className="remove-btn"
                                                onClick={(e) => handleRemoveRecent(server.address, e)}
                                                title={t('common.delete')}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 구분선 */}
                    {recentServers.length > 0 && (
                        <div className="divider">
                            <span>{t('guest.directInput')}</span>
                        </div>
                    )}

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
                            onClick={() => handleConnect()}
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