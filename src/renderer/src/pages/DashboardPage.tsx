// [대시보드 페이지] 프로젝트 목록과 서버 관리를 담당하는 메인 화면
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Project } from '../types'
import { useGuestRequest } from '../hooks/useGuestRequest'
import { useModal } from '../contexts/ModalContext'
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
    onOpenSettings: () => void
}

export default function DashboardPage({
    username,
    projects,
    activeProjectIds,
    onToggleServer,
    onDeleteProject,
    onCreateClick,
    onOpenEditor,
    onOpenSettings
}: Props) {
    const { t } = useTranslation()
    const { showAlert, showConfirm } = useModal()

    const handleApprove = useCallback(async (port: number, email: string) => {
        const isApproved = await showConfirm({
            message: `🔔 ${t('userManage.title')}\n\n` +
                `${t('dashboard.port')}: ${port}\n` +
                `${t('guest.email')}: ${email}\n\n` +
                `${t('userManage.approve')}?`
        })
        if (isApproved) {
            await window.api.approveUser(port, email)
            showAlert({ message: `${email} ${t('userManage.approve')}!`, type: 'success' })
        } else {
            await window.api.rejectUser(port, email)
            showAlert({ message: `${email} ${t('userManage.reject')}`, type: 'info' })
        }
    }, [t, showAlert, showConfirm])

    useGuestRequest(handleApprove)

    const handleToggleServer = async (project: Project) => {
        const result = await onToggleServer(project)
        if (result?.stopped) showAlert({ message: t('dashboard.serverStopped'), type: 'info' })
        if (result?.started) showAlert({ message: `✅ ${t('dashboard.serverRunning')}\n\nhttp://localhost:${result.port}`, type: 'success' })
        if (result?.error) showAlert({ message: `${t('errors.serverError')}: ${result.error}`, type: 'error' })
    }

    const handleDeleteProject = async (project: Project) => {
        const confirmed = await showConfirm(`${t('dashboard.deleteProject')} '${project.name}'?`)
        if (confirmed) {
            const result = await onDeleteProject(project.id)
            if (result.success) {
                showAlert({ message: t('dashboard.deleteProject') + ' ✓', type: 'success' })
            } else {
                showAlert({ message: t('errors.serverError') + ': ' + result.error, type: 'error' })
            }
        }
    }

    // 에디터 열기 전 서버 체크
    const handleOpenEditor = (project: Project) => {
        if (!activeProjectIds.includes(project.id)) {
            showAlert({ message: `⚠️ ${t('dashboard.serverStartRequired')}`, type: 'warning' })
            return
        }
        onOpenEditor(project)
    }

    // 설정 페이지 열기 전 서버 체크
    const handleOpenSettings = () => {
        if (activeProjectIds.length > 0) {
            showAlert({
                message: t('settings.stopServersFirst'),
                type: 'warning'
            })
            return
        }
        onOpenSettings()
    }

    return (
        <div className="dashboard-layout">
            <Header
                username={username}
                onCreateClick={onCreateClick}
                onSettingsClick={handleOpenSettings}
            />
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