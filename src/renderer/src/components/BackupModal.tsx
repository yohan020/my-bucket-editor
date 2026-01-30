
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BackupInfo } from '../types';

interface BackupModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectPath: string;
    isServerRunning: boolean;
}

export default function BackupModal({ isOpen, onClose, projectPath, isServerRunning }: BackupModalProps) {
    const { t } = useTranslation();
    const [backups, setBackups] = useState<BackupInfo[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadBackups();
        }
    }, [isOpen]);

    const loadBackups = async () => {
        try {
            setLoading(true);
            const list = await (window as any).api.listBackups(projectPath);
            setBackups(list);
        } catch (err) {
            console.error('Failed to load backups:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBackup = async () => {
        try {
            const confirmed = confirm(t('backup.confirmCreate'));
            if (!confirmed) return;

            setLoading(true);
            await (window as any).api.createBackup(projectPath);
            await loadBackups();
            alert(t('backup.created'));
        } catch (err) {
            console.error('Backup creation failed:', err);
            alert(t('backup.createFailed'));
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (backupPath: string) => {
        if (isServerRunning) {
            alert(t('backup.cannotRestoreWhenRunning'));
            return;
        }

        try {
            const confirmed = confirm(t('backup.confirmRestore'));
            if (!confirmed) return;

            setLoading(true);
            await (window as any).api.restoreBackup(projectPath, backupPath);
            alert(t('backup.restored'));
            onClose();
        } catch (err) {
            console.error('Restore failed:', err);
            alert(t('backup.restoreFailed'));
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteBackup = async (backupPath: string) => {
        try {
            const confirmed = confirm(t('backup.confirmDelete'));
            if (!confirmed) return;

            setLoading(true);
            await (window as any).api.deleteBackup(backupPath);
            await loadBackups(); // Refresh list
            alert(t('backup.deleted'));
        } catch (err) {
            console.error('Delete failed:', err);
            alert(t('backup.deleteFailed'));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content backup-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>📦 {t('backup.title')}</h3>
                    <button onClick={onClose}>✕</button>
                </div>

                <div className="modal-body">
                    <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            className="action-btn success"
                            onClick={handleCreateBackup}
                            disabled={loading}
                        >
                            + {t('backup.create')}
                        </button>
                    </div>

                    {loading && <p style={{ textAlign: 'center', color: '#888' }}>Loading...</p>}

                    {!loading && backups.length === 0 && (
                        <p className="empty-state">{t('backup.empty')}</p>
                    )}

                    <ul className="backup-list">
                        {backups.map((backup, idx) => (
                            <li key={idx} className="backup-item">
                                <div className="backup-info">
                                    <span className="backup-name">{backup.fileName}</span>
                                    <span className="backup-meta">
                                        {new Date(backup.createdAt).toLocaleString()} | {(backup.size / 1024 / 1024).toFixed(2)} MB
                                    </span>
                                </div>
                                <div className="backup-actions">
                                    <button
                                        className="action-btn warning"
                                        onClick={() => handleRestore(backup.filePath)}
                                    >
                                        {t('backup.restore')}
                                    </button>
                                    <button
                                        className="action-btn danger"
                                        onClick={() => handleDeleteBackup(backup.filePath)}
                                    >
                                        {t('backup.delete')}
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
