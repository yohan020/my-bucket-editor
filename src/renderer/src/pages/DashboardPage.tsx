// [대시보드 페이지] 프로젝트 목록과 서버 관리를 담당하는 메인 화면
import { useCallback } from 'react'
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
    const handleApprove = useCallback(async (port: number, email: string) => {
        const isApproved = confirm(
            `🔔 접속 요청 알림!\n\n` +
            `프로젝트 포트: ${port}\n` +
            `요청자 ID: ${email}\n\n` +
            `이 사용자의 접속을 허용하시겠습니까?`
        )
        await window.api.approveUser(port, email, isApproved)
        alert(isApproved ? `${email} 님을 승인했습니다!` : `${email} 님의 접속을 거절했습니다.`)
    }, [])

    useGuestRequest(handleApprove)

    const handleToggleServer = async (project: Project) => {
        const result = await onToggleServer(project)
        if (result?.stopped) alert('서버를 종료했습니다.')
        if (result?.started) alert(`✅ 서버 가동 시작!\n\nhttp://localhost:${result.port} 로 접속해보세요.`)
        if (result?.error) alert(`실패: ${result.error}`)
    }

    const handleDeleteProject = async (project: Project) => {
        const confirmed = confirm(`정말 '${project.name}' 프로젝트를 삭제하시겠습니까?`)
        if (confirmed) {
            const result = await onDeleteProject(project.id)
            if (result.success) {
                alert('프로젝트가 삭제되었습니다.')
            } else {
                alert('삭제 실패: ' + result.error)
            }
        }
    }

    return (
        <div className="dashboard-layout">
            <Header username={username} projectCount={projects.length} onCreateClick={onCreateClick} />
            <ProjectList
                projects={projects}
                activeProjectIds={activeProjectIds}
                onToggleServer={handleToggleServer}
                onOpenEditor={onOpenEditor}
                onDeleteProject={handleDeleteProject}
            />
        </div>
    )
}