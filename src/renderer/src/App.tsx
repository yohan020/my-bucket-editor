// [앱 루트] 화면 상태(View)를 관리하고 페이지 컴포넌트를 렌더링하는 진입점
import { useState } from 'react'
import { ViewState, Project } from './types'
import { useProjects } from './hooks/useProjects'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CreateProjectPage from './pages/CreateProjectPage'
import EditorPage from './pages/EditorPage'
import ModeSelectPage from './pages/ModeSelectPage'
import GuestConnectPage from './pages/GuestConnectPage'
import GuestEditorPage from './pages/GuestEditorPage'

// window.api 타입 선언 (기존 것 유지)
declare global {
  interface Window {
    api: {
      selectFolder: () => Promise<string | null>
      getProjects: () => Promise<Project[]>
      createProject: (project: Project) => Promise<boolean>
      startServer: (port: number, projectPath: string) => Promise<{ success: boolean; message: string }>
      stopServer: (port: number) => Promise<boolean>
      onGuestRequest: (callback: (data: { port: number; email: string }) => void) => () => void
      getFileTree: (dirPath: string) => Promise<any>
      readFile: (filePath: string) => Promise<any>
      writeFile: (filePath: string, content: string) => Promise<any>
      deleteProject: (projectId: number) => Promise<any>
      getApprovedUsers: (port: number) => Promise<any[]>
      getPendingUsers: (port: number) => Promise<any[]>
      removeApprovedUser: (port: number, email: string) => Promise<any>
      approveUser: (port: number, email: string) => Promise<any>
      rejectUser: (port: number, email: string) => Promise<any>
      focusWindow: () => Promise<boolean>
      resetFocus: () => Promise<boolean>
    }
  }
}

export default function App() {
  const [view, setView] = useState<ViewState>('MODE_SELECT')
  const [username, setUsername] = useState('')
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [guestAddress, setGuestAddress] = useState('')
  const [guestToken, setGuestToken] = useState('')
  const [guestEmail, setGuestEmail] = useState('')

  // useProjects 훅에서 모든 필요한 상태와 함수를 가져옴
  const { projects, activeProjectIds, createProject, toggleServer, deleteProject } = useProjects()

  const handleLogin = (name: string) => {
    setUsername(name)
    setView('DASHBOARD')
  }

  const handleCreate = async (project: Project) => {
    await createProject(project)
    setView('DASHBOARD')
  }

  //에디터 진입
  const handleOpenEditor = (project: Project) => {
    setCurrentProject(project)
    setView('EDITOR')
  }

  if (view === 'MODE_SELECT') {
    return (
      <ModeSelectPage
        onSelectHost={() => setView('LOGIN')}
        onSelectGuest={() => setView('GUEST_CONNECT')}
      />
    )
  }

  if (view === "GUEST_CONNECT") {
    return (
      <GuestConnectPage
        onConnect={(addr, token, email) => {
          setGuestAddress(addr)
          setGuestToken(token)
          setGuestEmail(email)
          setView('GUEST_EDITOR')
        }}
        onBack={() => setView('MODE_SELECT')}
      />
    )
  }

  if (view === "GUEST_EDITOR") {
    return (
      <GuestEditorPage
        address={guestAddress}
        token={guestToken}
        email={guestEmail}
        onDisconnect={() => setView('MODE_SELECT')}
      />
    )
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

  if (view === 'EDITOR' && currentProject) {
    return (
      <EditorPage
        projectName={currentProject.name}
        projectPath={currentProject.path}
        port={currentProject.port}
        onBack={() => setView('DASHBOARD')}
      />
    )
  }

  return (
    <DashboardPage
      username={username}
      projects={projects}
      activeProjectIds={activeProjectIds}
      onToggleServer={toggleServer}
      onDeleteProject={deleteProject}
      onCreateClick={() => setView('CREATE_PROJECT')}
      onOpenEditor={handleOpenEditor}
    />
  )
}