import { useState, useEffect } from 'react';
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
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadBackupPath();
        loadTunnelSettings();
    }, []);

    const loadBackupPath = async () => {
        try {
            const path = await (window as any).api.getBackupPath();
            setBackupPath(path);
        } catch (err) {
            console.error('Failed to get backup path:', err);
        }
    };

    const loadTunnelSettings = async () => {
        try {
            const settings = await (window as any).api.getTunnelSettings();
            setTunnelService(settings.service);
            setNgrokAuthToken(settings.ngrokAuthToken || '');
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
                ngrokAuthToken: ngrokAuthToken
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
