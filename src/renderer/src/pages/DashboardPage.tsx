// [대시보드 페이지] 프로젝트 목록과 서버 관리를 담당하는 메인 화면
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Project } from '../types'
import { useGuestRequest } from '../hooks/useGuestRequest'
import Header from '../components/Header'
import ProjectList from '../components/ProjectList'

interface Props {
    username: string
    projects: Project[]
    activeProjectIds: number[]
    onToggleServer: (project: Project) => Promise<any>
    onDeleteProject: (projectId: number) => Promise<any>
    onCreateClick: () => void
    onOpenEditor: (project: Project) => void
}

export default function DashboardPage({
    username,
    projects,
    activeProjectIds,
    onToggleServer,
    onDeleteProject,
    onCreateClick,
    onOpenEditor
}: Props) {
    const { t } = useTranslation()

    const handleApprove = useCallback(async (port: number, email: string) => {
        const isApproved = confirm(
            `🔔 ${t('userManage.title')}\n\n` +
            `${t('dashboard.port')}: ${port}\n` +
            `${t('guest.email')}: ${email}\n\n` +
            `${t('userManage.approve')}?`
        )
        if (isApproved) {
            await window.api.approveUser(port, email)
            alert(`${email} ${t('userManage.approve')}!`)
        } else {
            await window.api.rejectUser(port, email)
            alert(`${email} ${t('userManage.reject')}`)
        }
    }, [t])

    useGuestRequest(handleApprove)

    const handleToggleServer = async (project: Project) => {
        const result = await onToggleServer(project)
        if (result?.stopped) alert(t('dashboard.serverStopped'))
        if (result?.started) alert(`✅ ${t('dashboard.serverRunning')}\n\nhttp://localhost:${result.port}`)
        if (result?.error) alert(`${t('errors.serverError')}: ${result.error}`)
    }

    const handleDeleteProject = async (project: Project) => {
        const confirmed = confirm(`${t('dashboard.deleteProject')} '${project.name}'?`)
        if (confirmed) {
            const result = await onDeleteProject(project.id)
            if (result.success) {
                alert(t('dashboard.deleteProject') + ' ✓')
            } else {
                alert(t('errors.serverError') + ': ' + result.error)
            }
        }
    }

    // 에디터 열기 전 서버 체크
    const handleOpenEditor = (project: Project) => {
        if (!activeProjectIds.includes(project.id)) {
            alert(`⚠️ ${t('dashboard.startServer')}!`)
            return
        }
        onOpenEditor(project)
    }

    return (
        <div className="dashboard-layout">
            <Header username={username} onCreateClick={onCreateClick} />
            <ProjectList
                projects={projects}
                activeProjectIds={activeProjectIds}
                onToggleServer={handleToggleServer}
                onOpenEditor={handleOpenEditor}
                onDeleteProject={handleDeleteProject}
            />
        </div>
    )
}