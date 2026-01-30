import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface SettingsPageProps {
    onBack: () => void;
}

export default function SettingsPage({ onBack }: SettingsPageProps) {
    const { t, i18n } = useTranslation();
    const [backupPath, setBackupPath] = useState('');

    useEffect(() => {
        loadBackupPath();
    }, []);

    const loadBackupPath = async () => {
        try {
            const path = await (window as any).api.getBackupPath();
            setBackupPath(path);
        } catch (err) {
            console.error('Failed to get backup path:', err);
        }
    };

    const handleChangePath = async () => {
        try {
            // 폴더 선택 다이얼로그
            const selectedPath = await (window as any).api.selectFolder();
            if (selectedPath) {
                await (window as any).api.setBackupPath(selectedPath);
                setBackupPath(selectedPath);
                alert(t('settings.pathChanged'));
            }
        } catch (err) {
            console.error('Failed to set backup path:', err);
            alert(t('settings.pathChangeFailed'));
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
                    {/* 언어 설정 추가 */}
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
