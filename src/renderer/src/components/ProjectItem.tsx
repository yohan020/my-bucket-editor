// [프로젝트 아이템] 개별 프로젝트의 정보와 액션 버튼을 표시하는 카드 컴포넌트
import { useState } from 'react'
import { Project } from '../types'
import KebabMenu from './KebabMenu'

interface Props {
    project: Project
    isActive: boolean
    onToggleServer: () => void
}

export default function ProjectItem({ project, isActive, onToggleServer }: Props) {
    const [menuOpen, setMenuOpen] = useState(false)

    const handleMenuAction = (action: string) => {
        alert(`'${project.name}' 프로젝트 - [${action}] 기능을 실행합니다.`)
        setMenuOpen(false)
    }

    return (
        <div className="list-item">
            <div className="item-info">
                <div className="item-title">
                    <h3>{project.name}</h3>
                    <span className="status-badge">{isActive ? 'ONLINE' : 'OFFLINE'}</span>
                </div>
                <p className="item-path">{project.path}</p>
                <span className="item-meta">Port: {project.port} | Last used: {project.lastUsed}</span>
            </div>

            <div className="item-actions">
                <button className={`run-server-btn ${isActive ? 'active' : ''}`} onClick={onToggleServer}>
                    {isActive ? '⏹ 서버 중지' : '▶ 서버 실행'}
                </button>

                <div className="menu-wrapper">
                    <button className="kebab-btn" onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}>⋮</button>
                    <KebabMenu isOpen={menuOpen} onAction={handleMenuAction} />
                </div>
            </div>
        </div>
    )
}