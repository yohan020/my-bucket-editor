// [유저 관리 모달] 승인된 유저 목록을 표시하고 삭제하는 모달
import { useState, useEffect } from 'react'

interface ApprovedUser {
    email: string
    password: string
    approvedAt: string
}

interface Props {
    port: number
    isOpen: boolean
    onClose: () => void
}

export default function UserManageModal({ port, isOpen, onClose }: Props) {
    const [users, setUsers] = useState<ApprovedUser[]>([])

    useEffect(() => {
        if (isOpen) {
            loadUsers()
        }
    }, [isOpen, port])

    const loadUsers = async () => {
        const list = await window.api.getApprovedUsers(port)
        setUsers(list)
    }

    const handleRemove = async (email: string) => {
        if (confirm(`${email} 유저를 삭제하시겠습니까?`)) {
            await window.api.removeApprovedUser(port, email)
            loadUsers() // 새로 고침
        }
    }

    if (!isOpen) return null

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>👥 승인된 유저 목록 (포트: {port})</h3>
                    <button onClick={onClose}>✕</button>
                </div>
                <div className="modal-body">
                    {users.length === 0 ? (
                        <p style={{ color: '#888' }}>승인된 유저가 없습니다.</p>
                    ) : (
                        <ul className="user-list">
                            {users.map(user => (
                                <li key={user.email} className="user-item">
                                    <div>
                                        <strong>{user.email}</strong>
                                        <span className="user-date">
                                            승인: {new Date(user.approvedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <button
                                        className="delete-btn"
                                        onClick={() => handleRemove(user.email)}
                                    >
                                        🗑️ 삭제
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    )
}
