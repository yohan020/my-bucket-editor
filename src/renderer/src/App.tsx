// [앱 루트] 화면 상태(View)를 관리하고 페이지 컴포넌트를 렌더링하는 진입점
import { useState } from 'react'
import { ViewState, Project } from './types'
import { useProjects } from './hooks/useProjects'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CreateProjectPage from './pages/CreateProjectPage'

// window.api 타입 선언 (기존 것 유지)
declare global {
  interface Window {
    api: {
      selectFolder: () => Promise<string | null>
      getProjects: () => Promise<Project[]>
      createProject: (project: Project) => Promise<boolean>
      startServer: (port: number, projectPath: string) => Promise<{ success: boolean; message: string }>
      stopServer: (port: number) => Promise<boolean>
      approveUser: (port: number, email: string, allow: boolean) => Promise<{ success: boolean; message: string }>
      onGuestRequest: (callback: (data: { port: number; email: string }) => void) => () => void
    }
  }
}

export default function App() {
  const [view, setView] = useState<ViewState>('LOGIN')
  const [username, setUsername] = useState('')
  const { projects, createProject } = useProjects()

  const handleLogin = (name: string) => {
    setUsername(name)
    setView('DASHBOARD')
  }

  const handleCreate = async (project: Project) => {
    await createProject(project)
    setView('DASHBOARD')
  }

  if (view === 'LOGIN') {
    return <LoginPage onLogin={handleLogin} />
  }

  if (view === 'CREATE_PROJECT') {
    return (
      <CreateProjectPage
        projectCount={projects.length}
        onCreate={handleCreate}
        onCancel={() => setView('DASHBOARD')}
      />
    )
  }

  return (
    <DashboardPage
      username={username}
      onCreateClick={() => setView('CREATE_PROJECT')}
    />
  )
}