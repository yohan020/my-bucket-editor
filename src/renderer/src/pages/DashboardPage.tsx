// [대시보드 페이지] 프로젝트 목록과 서버 관리를 담당하는 메인 화면
import { useCallback } from 'react'
import { Project } from '../types'
import { useProjects } from '../hooks/useProjects'
import { useGuestRequest } from '../hooks/useGuestRequest'
import Header from '../components/Header'
import ProjectList from '../components/ProjectList'

interface Props {
    username: string
    onCreateClick: () => void
    onOpenEditor: (project: Project) => void
}

export default function DashboardPage({ username, onCreateClick, onOpenEditor }: Props) {
    const { projects, activeProjectIds, toggleServer } = useProjects()

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
        const result = await toggleServer(project)
        if (result?.stopped) alert('서버를 종료했습니다.')
        if (result?.started) alert(`✅ 서버 가동 시작!\n\nhttp://localhost:${result.port} 로 접속해보세요.`)
        if (result?.error) alert(`실패: ${result.error}`)
    }

    return (
        <div className="dashboard-layout">
            <Header username={username} projectCount={projects.length} onCreateClick={onCreateClick} />
            <ProjectList
                projects={projects}
                activeProjectIds={activeProjectIds}
                onToggleServer={handleToggleServer}
                onOpenEditor={onOpenEditor}
            />
        </div>
    )
}