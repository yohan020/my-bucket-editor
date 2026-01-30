// [프로젝트 아이템] 개별 프로젝트의 정보와 액션 버튼을 표시하는 카드 컴포넌트
import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Project } from '../types'
import KebabMenu from './KebabMenu'
import UserManageModal from './UserManageModal'

import BackupModal from './BackupModal'

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
    const [backupModalOpen, setBackupModalOpen] = useState(false) // 백업 모달 상태
    const [tunnelUrl, setTunnelUrl] = useState<string | null>(null)
    const [isTunnelLoading, setIsTunnelLoading] = useState(false)
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

    // 서버가 꺼지면 터널도 초기화
    useEffect(() => {
        if (!isActive) {
            setTunnelUrl(null)
        } else {
            // 서버가 켜져있으면 기존 터널 확인 (포트별로 확인)
            (window as any).api.getTunnelUrl(project.port).then((url: string | null) => {
                if (url) setTunnelUrl(url)
                else setTunnelUrl(null) // URL이 없으면 명확하게 null 처리
            })
        }
    }, [isActive])

    const handleMenuAction = (action: string) => {
        if (action === 'delete') {
            onDeleteProject()
        }
        setMenuOpen(false)
    }

    // 터널 토글 핸들러
    const handleToggleTunnel = async () => {
        if (!isActive) {
            alert(t('dashboard.startServer') + '!')
            return
        }

        const api = (window as any).api

        if (tunnelUrl) {
            setIsTunnelLoading(true)
            await api.stopTunnel(project.port)
            setTunnelUrl(null)
            setIsTunnelLoading(false)
        } else {
            setIsTunnelLoading(true)
            const result = await api.startTunnel(project.port)
            if (result.success && result.url) {
                setTunnelUrl(result.url)
            } else {
                alert(result.error || t('errors.networkError'))
            }
            setIsTunnelLoading(false)
        }
    }

    const handleCopyUrl = async () => {
        if (tunnelUrl) {
            await (window as any).api.copyToClipboard(tunnelUrl)
            alert(t('tunnel.copied'))
        }
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

            <div className="item-actions-wrapper">
                <div className="item-actions">
                    <button
                        className="icon-btn"
                        onClick={() => setUserModalOpen(true)}
                        style={{ marginRight: '5px' }}
                    >
                        👥 {t('dashboard.manageUsers')}
                    </button>

                    <button
                        className="icon-btn"
                        onClick={() => setBackupModalOpen(true)}
                        style={{ marginRight: '5px' }}
                    >
                        📦 {t('backup.button')}
                    </button>

                    <button className={`run-server-btn ${isActive ? 'active' : ''}`} onClick={onToggleServer}>
                        {isActive ? `⏹ ${t('dashboard.stopServer')}` : `▶ ${t('dashboard.startServer')}`}
                    </button>

                    {/* 외부 공유 버튼 (서버 켜져있을 때만 노출) */}
                    {isActive && (
                        <button
                            className={`tunnel-btn ${tunnelUrl ? 'active' : ''}`}
                            onClick={handleToggleTunnel}
                            disabled={isTunnelLoading}
                        >
                            {isTunnelLoading ? '⏳' : '🌐'} {tunnelUrl ? t('tunnel.disableExternal') : t('tunnel.enableExternal')}
                        </button>
                    )}

                    <div className="menu-wrapper" ref={menuRef}>
                        <button className="kebab-btn" onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}>⋮</button>
                        <KebabMenu isOpen={menuOpen} onAction={handleMenuAction} />
                    </div>
                </div>

                {/* 터널 URL 표시 영역 */}
                {tunnelUrl && (
                    <div className="tunnel-info">
                        <span className="tunnel-label">🔗 External:</span>
                        <a href={tunnelUrl} target="_blank" rel="noreferrer" className="tunnel-url">{tunnelUrl}</a>
                        <button className="copy-btn" onClick={handleCopyUrl}>📋 Copy</button>
                    </div>
                )}
            </div>

            {/* 유저 관리 모달 */}
            <UserManageModal
                port={project.port}
                isOpen={userModalOpen}
                onClose={() => setUserModalOpen(false)}
            />

            {/* 백업 관리 모달 */}
            <BackupModal
                isOpen={backupModalOpen}
                onClose={() => setBackupModalOpen(false)}
                projectPath={project.path}
                isServerRunning={isActive}
            />
        </div>
    )
}