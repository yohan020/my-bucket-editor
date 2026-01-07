// [앱 루트] 화면 상태(View)를 관리하고 페이지 컴포넌트를 렌더링하는 진입점
import { useState } from 'react'
import { ViewState, Project } from './types'
import { useProjects } from './hooks/useProjects'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CreateProjectPage from './pages/CreateProjectPage'
import EditorPage from './pages/EditorPage'

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
      getFileTree: (dirPath: string) => Promise<any>
      readFile: (filePath: string) => Promise<any>
      writeFile: (filePath: string, content: string) => Promise<any>
      deleteProject: (projectId: number) => Promise<any>
    }
  }
}

export default function App() {
  const [view, setView] = useState<ViewState>('LOGIN')
  const [username, setUsername] = useState('')
  const [currentProject, setCurrentProject] = useState<Project | null>(null)

  // useProjects 훅이 반환하는 '종합 선물 세트(객체)' 중에서
  // 당장 필요한 '프로젝트 목록(projects)'과 '생성 기능(createProject)'만
  // 쏙 골라서(구조 분해 할당) 변수로 가져옴 (나머지 기능은 무시)
  // 1. 일단 useProject() 혹을 호출하여 모든 기능 만들어 놓음
  // 2. 필요한 기능 만 챙김 (나머지는 둥둥 떠다니느 중)
  // 3. 나머지는 청소부 (가비지 콜렉터) 가 청소함
  // 추가 : 만약 다른곳에서 useProjects()의 일부를 골라서 사용한다면?
  // -> 해당 사이클은 다시 한번 진행됨
  // 이유 : 각 컴포넌트는 독립된 존재라 사이클이 각각 독립적으로 진행됨
  const { projects, createProject } = useProjects()

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
        onBack={() => setView('DASHBOARD')}
      />
    )
  }

  return (
    <DashboardPage
      username={username}
      onCreateClick={() => setView('CREATE_PROJECT')}
      onOpenEditor={handleOpenEditor}
    />
  )
}