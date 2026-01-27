// [프로젝트 아이템] 개별 프로젝트의 정보와 액션 버튼을 표시하는 카드 컴포넌트
import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Project } from '../types'
import KebabMenu from './KebabMenu'
import UserManageModal from './UserManageModal'

interface Props {
    project: Project
    isActive: boolean
    onToggleServer: () => void
    onOpenEditor: () => void
    onDeleteProject: () => void
}

export default function ProjectItem({ project, isActive, onToggleServer, onOpenEditor, onDeleteProject }: Props) {
    const { t } = useTranslation()
    const [menuOpen, setMenuOpen] = useState(false)
    const [userModalOpen, setUserModalOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    // 외부 클릭 시 메뉴 닫기
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [menuOpen])

    const handleMenuAction = (action: string) => {
        if (action === 'delete') {
            onDeleteProject()
        }
        setMenuOpen(false)
    }

    return (
        <div className="list-item">
            <div className="item-info" onClick={onOpenEditor} style={{ cursor: 'pointer' }}>
                <div className="item-title">
                    <h3>{project.name}</h3>
                    <span className="status-badge">{isActive ? 'ONLINE' : 'OFFLINE'}</span>
                </div>
                <p className="item-path">{project.path}</p>
                <span className="item-meta">{t('dashboard.port')}: {project.port} | Last used: {project.lastUsed}</span>
            </div>

            <div className="item-actions">
                <button
                    className="user-manage-btn"
                    onClick={() => setUserModalOpen(true)}
                >
                    👥 {t('dashboard.manageUsers')}
                </button>
                <button className={`run-server-btn ${isActive ? 'active' : ''}`} onClick={onToggleServer}>
                    {isActive ? `⏹ ${t('dashboard.stopServer')}` : `▶ ${t('dashboard.startServer')}`}
                </button>

                <div className="menu-wrapper" ref={menuRef}>
                    <button className="kebab-btn" onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}>⋮</button>
                    <KebabMenu isOpen={menuOpen} onAction={handleMenuAction} />
                </div>
            </div>

            {/* 유저 관리 모달 */}
            <UserManageModal
                port={project.port}
                isOpen={userModalOpen}
                onClose={() => setUserModalOpen(false)}
            />
        </div>
    )
}