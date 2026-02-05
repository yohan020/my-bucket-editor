import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useModal } from '../contexts/ModalContext';

interface SettingsPageProps {
    onBack: () => void;
}

type TunnelService = 'localtunnel' | 'ngrok' | 'cloudflare';

export default function SettingsPage({ onBack }: SettingsPageProps) {
    const { t, i18n } = useTranslation();
    const { showAlert } = useModal();
    const [backupPath, setBackupPath] = useState('');

    // 터널 설정 상태
    const [tunnelService, setTunnelService] = useState<TunnelService>('localtunnel');
    const [ngrokAuthToken, setNgrokAuthToken] = useState('');
    const [cloudflareToken, setCloudflareToken] = useState('');
    const [cloudflareDomain, setCloudflareDomain] = useState('');
    const [isSaving, setIsSaving] = useState(false);



    const loadBackupPath = async () => {
        try {
            const path = await (window as any).api.getBackupPath();
            setBackupPath(path);
        } catch (err) {
            console.error('Failed to get backup path:', err);
        }
    };

    const [totpEnabled, setTotpEnabled] = useState(false);
    const [totpStep, setTotpStep] = useState<'idle' | 'loading' | 'setup' | 'verify'>('idle');
    const [totpSecret, setTotpSecret] = useState('');
    const [totpQr, setTotpQr] = useState('');
    const [totpCode, setTotpCode] = useState('');
    const [setupAttempt, setSetupAttempt] = useState(0);
    const totpInputRef = useRef<HTMLInputElement>(null);

    // 강화된 포커스 로직: totpStep이 setup이 되면 포커스
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined;

        if (totpStep === 'setup') {
            const focusInput = async () => {
                // 1. 현재 포커스된 요소 blur (버튼 등)
                (document.activeElement as HTMLElement)?.blur();

                // 2. Electron 윈도우 blur/focus 사이클 (alt-tab 효과)
                await (window as any).api.refocusWindow();

                // 3. input 포커스
                if (totpInputRef.current) {
                    totpInputRef.current.focus();
                    console.log('✅ TOTP input focused via refocus');
                }
            };

            // 충분한 지연 후 실행
            timer = setTimeout(focusInput, 200);
        }

        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [totpStep, setupAttempt]);


    useEffect(() => {
        loadBackupPath();
        loadTunnelSettings();
        checkTotpStatus();
    }, []);

    const checkTotpStatus = async () => {
        try {
            const { enabled } = await (window as any).api.auth.getTotpStatus();
            setTotpEnabled(enabled);
        } catch (err) {
            console.error('Failed to get TOTP status:', err);
        }
    };

    const handleEnableTotpStart = async () => {
        // 버튼 포커스 해제 (Electron 포커스 문제 방지)
        (document.activeElement as HTMLElement)?.blur();

        setTotpStep('loading');
        setSetupAttempt(prev => prev + 1); // 카운터 증가로 새 key 생성
        try {
            const { success, secret, qrDataUrl } = await (window as any).api.auth.generateTotp();
            if (success) {
                setTotpSecret(secret);
                setTotpQr(qrDataUrl);
                setTotpCode('');
                setTotpStep('setup');
            } else {
                setTotpStep('idle');
            }
        } catch (err) {
            setTotpStep('idle');
            showAlert({ message: '2FA 생성 실패', type: 'error' });
        }
    };

    const handleVerifyAndEnableTotp = async () => {
        try {
            const { isValid } = await (window as any).api.auth.verifyTotpSetup({ token: totpCode, secret: totpSecret });
            if (isValid) {
                await (window as any).api.auth.enableTotp(totpSecret);
                setTotpEnabled(true);
                setTotpStep('idle');
                showAlert({ message: '2FA가 활성화되었습니다!', type: 'success' });
            } else {
                showAlert({ message: '인증 코드가 올바르지 않습니다.', type: 'error' });
            }
        } catch (err) {
            showAlert({ message: '2FA 활성화 실패', type: 'error' });
        }
    };

    const handleDisableTotp = async () => {
        if (!confirm('정말 2FA를 해제하시겠습니까?')) return;
        try {
            await (window as any).api.auth.disableTotp();
            setTotpEnabled(false);
            showAlert({ message: '2FA가 해제되었습니다.', type: 'info' });
        } catch (err) {
            showAlert({ message: '해제 실패', type: 'error' });
        }
    };

    const loadTunnelSettings = async () => {
        try {
            const settings = await (window as any).api.getTunnelSettings();
            setTunnelService(settings.service);
            setNgrokAuthToken(settings.ngrokAuthToken || '');
            setCloudflareToken(settings.cloudflareToken || '');
            setCloudflareDomain(settings.cloudflareDomain || '');
        } catch (err) {
            console.error('Failed to get tunnel settings:', err);
        }
    };

    const handleChangePath = async () => {
        try {
            const selectedPath = await (window as any).api.selectFolder();
            if (selectedPath) {
                await (window as any).api.setBackupPath(selectedPath);
                setBackupPath(selectedPath);
                showAlert({ message: t('settings.pathChanged'), type: 'success' });
            }
        } catch (err) {
            console.error('Failed to set backup path:', err);
            showAlert({ message: t('settings.pathChangeFailed'), type: 'error' });
        }
    };

    const handleSaveTunnelSettings = async () => {
        setIsSaving(true);
        try {
            await (window as any).api.setTunnelSettings({
                service: tunnelService,
                ngrokAuthToken,
                cloudflareToken,
                cloudflareDomain
            });
            showAlert({ message: t('settings.tunnelSaved'), type: 'success' });
        } catch (err) {
            console.error('Failed to save tunnel settings:', err);
            showAlert({ message: t('settings.tunnelSaveFailed'), type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    return (
        <div className="settings-container">
            <div className="settings-card">
                <div className="settings-header">
                    <h1>⚙️ {t('settings.title')}</h1>
                    <button className="close-btn" onClick={onBack}>✕</button>
                </div>

                <div className="settings-body">
                    {/* 언어 설정 */}
                    <div className="settings-group">
                        <label>{t('common.language')}</label>
                        <div className="language-selector" style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                            <button
                                className={`lang-btn ${i18n.language === 'ko' ? 'active' : ''}`}
                                onClick={() => changeLanguage('ko')}
                                style={{ padding: '8px 15px', cursor: 'pointer', backgroundColor: i18n.language === 'ko' ? '#0e639c' : '#333', color: 'white', border: '1px solid #444', borderRadius: '4px', fontSize: '1rem' }}
                            >
                                🇰🇷 한국어
                            </button>
                            <button
                                className={`lang-btn ${i18n.language === 'en' ? 'active' : ''}`}
                                onClick={() => changeLanguage('en')}
                                style={{ padding: '8px 15px', cursor: 'pointer', backgroundColor: i18n.language === 'en' ? '#0e639c' : '#333', color: 'white', border: '1px solid #444', borderRadius: '4px', fontSize: '1rem' }}
                            >
                                🇺🇸 English
                            </button>
                            <button
                                className={`lang-btn ${i18n.language === 'ja' ? 'active' : ''}`}
                                onClick={() => changeLanguage('ja')}
                                style={{ padding: '8px 15px', cursor: 'pointer', backgroundColor: i18n.language === 'ja' ? '#0e639c' : '#333', color: 'white', border: '1px solid #444', borderRadius: '4px', fontSize: '1rem' }}
                            >
                                🇯🇵 日本語
                            </button>
                        </div>
                    </div>

                    {/* 터널 서비스 설정 */}
                    <div className="settings-group">
                        <label>{t('settings.tunnelService')}</label>
                        <p style={{ margin: '5px 0 10px', fontSize: '0.85rem', color: '#888' }}>
                            {t('settings.tunnelServiceDesc')}
                        </p>

                        <select
                            value={tunnelService}
                            onChange={(e) => setTunnelService(e.target.value as TunnelService)}
                            style={{
                                padding: '10px',
                                backgroundColor: '#333',
                                color: '#eee',
                                border: '1px solid #444',
                                borderRadius: '4px',
                                fontSize: '0.95rem',
                                width: '100%',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="localtunnel">LocalTunnel (기본)</option>
                            <option value="ngrok">ngrok (안정적)</option>
                            <option value="cloudflare">Cloudflare (추천 ⭐)</option>
                        </select>

                        {/* ngrok API Key 입력 (ngrok 선택 시만 표시) */}
                        {tunnelService === 'ngrok' && (
                            <div style={{ marginTop: '15px' }}>
                                <label style={{ fontSize: '0.9rem', color: '#aaa' }}>ngrok API Key</label>
                                <input
                                    type="password"
                                    value={ngrokAuthToken}
                                    onChange={(e) => setNgrokAuthToken(e.target.value)}
                                    placeholder="ngrok authtoken"
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        marginTop: '5px',
                                        backgroundColor: '#333',
                                        color: '#eee',
                                        border: '1px solid #444',
                                        borderRadius: '4px',
                                        fontSize: '0.95rem',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: '#666' }}>
                                    {t('settings.ngrokHint')}
                                </p>
                                <p style={{ margin: '5px 0 0', fontSize: '0.8rem', color: '#f59e0b' }}>
                                    ⚠️ {t('settings.ngrokFreePlanNote')}
                                </p>
                            </div>
                        )}

                        {/* Cloudflare Token 입력 (cloudflare 선택 시만 표시) */}
                        {tunnelService === 'cloudflare' && (
                            <div style={{ marginTop: '15px' }}>
                                {/* Token Input */}
                                <label style={{ fontSize: '0.9rem', color: '#aaa' }}>{t('settings.cloudflareToken')}</label>
                                <input
                                    type="password"
                                    value={cloudflareToken}
                                    onChange={(e) => setCloudflareToken(e.target.value)}
                                    placeholder="Cloudflare Tunnel Token (eyJh...)"
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        marginTop: '5px',
                                        backgroundColor: '#333',
                                        color: '#eee',
                                        border: '1px solid #444',
                                        borderRadius: '4px',
                                        fontSize: '0.95rem',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <p style={{ margin: '8px 0 15px', fontSize: '0.8rem', color: '#666' }}>
                                    {t('settings.cloudflareTokenDesc')}
                                </p>

                                {/* Domain Input (Token이 있을 때만 활성화 권장하지만, 필수 입력으로 둠) */}
                                <label style={{ fontSize: '0.9rem', color: '#aaa' }}>{t('settings.cloudflareDomain')}</label>
                                <input
                                    type="text"
                                    value={cloudflareDomain}
                                    onChange={(e) => setCloudflareDomain(e.target.value)}
                                    placeholder="https://editor.mydomain.com"
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        marginTop: '5px',
                                        backgroundColor: '#333',
                                        color: '#eee',
                                        border: '1px solid #444',
                                        borderRadius: '4px',
                                        fontSize: '0.95rem',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: '#666' }}>
                                    {t('settings.cloudflareDomainDesc')}
                                </p>
                                <p style={{ margin: '5px 0 0', fontSize: '0.8rem', color: '#10b981' }}>
                                    💡 {t('settings.cloudflareWildcardHint')}
                                </p>
                            </div>
                        )}

                        <button
                            className="action-btn primary"
                            onClick={handleSaveTunnelSettings}
                            disabled={isSaving}
                            style={{ marginTop: '15px' }}
                        >
                            {isSaving ? '...' : t('common.save')}
                        </button>
                    </div>

                    {/* 백업 경로 설정 */}
                    <div className="settings-group">
                        <label>{t('settings.backupPathLabel')}</label>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#888' }}>
                            {t('settings.backupPathDesc')}
                        </p>

                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '10px' }}>
                            <div className="path-display" style={{ padding: '10px', borderRadius: '4px', flex: 1, backgroundColor: '#333', color: '#eee' }}>
                                {backupPath || t('settings.noPath')}
                            </div>
                            <button
                                className="action-btn primary"
                                onClick={handleChangePath}
                            >
                                {t('settings.change')}
                            </button>
                        </div>
                    </div>
                    {/* 2차 인증 (2FA) */}
                    <div className="settings-group">
                        <label>🔒 2단계 인증 (Google Authenticator)</label>
                        <div style={{ marginTop: '10px', backgroundColor: '#333', padding: '15px', borderRadius: '6px' }}>
                            {totpEnabled ? (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: '#4ec9b0', fontWeight: 'bold' }}>✅ 사용 중 (Active)</span>
                                    <button
                                        className="action-btn secondary"
                                        onClick={handleDisableTotp}
                                        style={{ backgroundColor: '#e51400', color: 'white' }}
                                    >
                                        해제
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    {totpStep === 'idle' ? (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ color: '#888', fontSize: '0.9rem' }}>계정을 더 안전하게 보호하세요.</span>
                                            <button
                                                className="action-btn primary"
                                                onClick={handleEnableTotpStart}
                                            >
                                                설정하기
                                            </button>
                                        </div>
                                    ) : totpStep === 'loading' ? (
                                        <div style={{ textAlign: 'center', padding: '20px', color: '#aaa' }}>
                                            잠시만 기다려주세요...
                                        </div>
                                    ) : (
                                        <div key="setup-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#ccc' }}>QR 코드를 스캔하고 인증번호를 입력하세요.</p>
                                            <img src={totpQr} alt="QR Code" style={{ borderRadius: '4px', border: '5px solid white' }} />
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <input
                                                    key={`totp-input-${setupAttempt}`}
                                                    ref={totpInputRef}
                                                    type="text"
                                                    autoFocus
                                                    placeholder="123456"
                                                    value={totpCode}
                                                    onChange={(e) => setTotpCode(e.target.value)}
                                                    onClick={async (e) => {
                                                        // Electron 윈도우 blur/focus 사이클 (alt-tab 효과)
                                                        await (window as any).api.refocusWindow();
                                                        (e.target as HTMLInputElement).focus();
                                                    }}
                                                    style={{
                                                        width: '120px', textAlign: 'center', fontSize: '1.2rem', letterSpacing: '2px',
                                                        padding: '8px', borderRadius: '4px', border: '1px solid #555',
                                                        backgroundColor: '#222', color: 'white', outline: 'none'
                                                    }}
                                                    maxLength={6}
                                                />
                                                <button className="action-btn primary" onClick={handleVerifyAndEnableTotp}>
                                                    확인
                                                </button>
                                                <button className="action-btn secondary" onClick={() => setTotpStep('idle')}>
                                                    취소
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        className="action-btn secondary"
                        onClick={onBack}
                    >
                        {t('common.back')}
                    </button>
                </div>
            </div>
        </div>
    );
}
