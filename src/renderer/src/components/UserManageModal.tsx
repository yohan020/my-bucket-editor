// [유저 관리 모달] 승인된 유저 목록 + 대기 중인 유저 목록 (가로 레이아웃)
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useModal } from '../contexts/ModalContext'

interface ApprovedUser {
    email: string
    password: string
    approvedAt: string
}

interface PendingUser {
    email: string
    status: string
}

interface Props {
    port: number
    isOpen: boolean
    onClose: () => void
}

export default function UserManageModal({ port, isOpen, onClose }: Props) {
    const { t } = useTranslation()
    const { showConfirm } = useModal()
    const [approvedUsers, setApprovedUsers] = useState<ApprovedUser[]>([])
    const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])

    useEffect(() => {
        if (isOpen) {
            loadUsers()
        }
    }, [isOpen, port])

    const loadUsers = async () => {
        const approved = await window.api.getApprovedUsers(port)
        const pending = await window.api.getPendingUsers(port)
        setApprovedUsers(approved)
        setPendingUsers(pending)
    }

    const handleRemove = async (email: string) => {
        const confirmed = await showConfirm(`${t('common.delete')} ${email}?`)
        if (confirmed) {
            await window.api.removeApprovedUser(port, email)
            loadUsers()
        }
    }

    const handleApprove = async (email: string) => {
        await window.api.approveUser(port, email)
        loadUsers()
    }

    const handleReject = async (email: string) => {
        await window.api.rejectUser(port, email)
        loadUsers()
    }

    if (!isOpen) return null

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content user-manage-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>👥 {t('userManage.title')} ({t('dashboard.port')}: {port})</h3>
                    <button onClick={onClose}>✕</button>
                </div>
                <div className="modal-body user-panels">
                    {/* 왼쪽: 승인된 유저 */}
                    <div className="user-panel approved-panel">
                        <h4>📋 {t('userManage.approvedUsers')}</h4>
                        {approvedUsers.length === 0 ? (
                            <p className="empty-message">{t('userManage.noApprovedUsers')}</p>
                        ) : (
                            <ul className="user-list">
                                {approvedUsers.map(user => (
                                    <li key={user.email} className="user-item">
                                        <span className="user-email">{user.email}</span>
                                        <button
                                            className="delete-btn"
                                            onClick={() => handleRemove(user.email)}
                                        >
                                            🗑️
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* 오른쪽: 대기 중인 유저 */}
                    <div className="user-panel pending-panel">
                        <h4>⏳ {t('userManage.pendingUsers')}</h4>
                        {pendingUsers.length === 0 ? (
                            <p className="empty-message">{t('userManage.noPendingUsers')}</p>
                        ) : (
                            <ul className="user-list">
                                {pendingUsers.map(user => (
                                    <li key={user.email} className="user-item pending">
                                        <span className="user-email">{user.email}</span>
                                        <div className="action-buttons">
                                            <button
                                                className="approve-btn"
                                                onClick={() => handleApprove(user.email)}
                                            >
                                                ✅ {t('userManage.approve')}
                                            </button>
                                            <button
                                                className="reject-btn"
                                                onClick={() => handleReject(user.email)}
                                            >
                                                ❌ {t('userManage.reject')}
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
