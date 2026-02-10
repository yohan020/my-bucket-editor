// [앱 루트] 화면 상태(View)를 관리하고 페이지 컴포넌트를 렌더링하는 진입점
import { useState, useEffect } from 'react'
import { ViewState, Project } from './types'
import { useProjects } from './hooks/useProjects'
import { ModalProvider } from './contexts/ModalContext'
import LoginPage from './pages/LoginPage'
import AuthSetupPage from './pages/AuthSetupPage'
import DashboardPage from './pages/DashboardPage'
import CreateProjectPage from './pages/CreateProjectPage'
import EditorPage from './pages/EditorPage'
import ModeSelectPage from './pages/ModeSelectPage'
import GuestConnectPage from './pages/GuestConnectPage'
import GuestEditorPage from './pages/GuestEditorPage'
import SettingsPage from './pages/SettingsPage'
import CloseConfirmModal from './components/CloseConfirmModal'
import CustomModal from './components/CustomModal'

// window.api 타입 선언 (기존 것 유지)
declare global {
  interface Window {
    api: {
      selectFolder: () => Promise<string | null>
      getProjects: () => Promise<Project[]>
      createProject: (project: Project) => Promise<boolean>
      startServer: (projectId: number, projectPath: string, projectName: string) => Promise<{ success: boolean; message: string; port?: number }>
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
      onCloseConfirm: (callback: () => void) => () => void
      closeResponse: (action: 'background' | 'quit' | 'cancel') => void
      copyToClipboard: (text: string) => Promise<void>
      auth: {
        checkStatus: () => Promise<{ isConfigured: boolean }>
        setup: (password: string) => Promise<{ success: boolean; recoveryCode?: string; error?: string }>
        login: (password: string) => Promise<{ success: boolean }>
        reset: (recoveryCode: string) => Promise<{ success: boolean }>
      }
    }
  }
}

export default function App() {
  const [view, setView] = useState<ViewState | 'AUTH_SETUP'>('MODE_SELECT')
  const [isAuthChecking, setIsAuthChecking] = useState(true)
  const [username, setUsername] = useState('')
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [guestAddress, setGuestAddress] = useState('')
  const [guestToken, setGuestToken] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestProjectName, setGuestProjectName] = useState('')
  const [showCloseModal, setShowCloseModal] = useState(false)

  // useProjects 훅에서 모든 필요한 상태와 함수를 가져옴
  const { projects, activeProjectIds, createProject, toggleServer, deleteProject } = useProjects()

  // 창 닫기 확인 모달 리스너
  useEffect(() => {
    const cleanup = window.api.onCloseConfirm(() => {
      setShowCloseModal(true)
    })
    return cleanup
  }, [])

  // 초기 인증 상태 확인 (제거됨 - 호스트 선택 시 확인)
  useEffect(() => {
    setIsAuthChecking(false)
  }, [])

  const handleHostSelect = async () => {
    const status = await window.api.auth.checkStatus()
    if (status.isConfigured) {
      setView('LOGIN')
    } else {
      setView('AUTH_SETUP')
    }
  }

  const handleLogin = async (usernameInput: string) => {
    // 실제로는 LoginPage에서 auth.login 호출하므로 여기서는 뷰 전환만
    // 하지만 기존 로직 유지를 위해 username 설정
    setUsername(usernameInput)
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

  // 현재 뷰에 따른 페이지 렌더링
  const renderPage = () => {
    if (isAuthChecking) {
      return <div className="center-container">Loading...</div>
    }

    if (view === 'AUTH_SETUP') {
      return <AuthSetupPage onComplete={() => setView('MODE_SELECT')} />
    }

    if (view === 'MODE_SELECT') {
      return (
        <ModeSelectPage
          onSelectHost={handleHostSelect}
          onSelectGuest={() => setView('GUEST_CONNECT')}
        />
      )
    }

    if (view === "GUEST_CONNECT") {
      return (
        <GuestConnectPage
          onConnect={(addr, token, email, projectName) => {
            setGuestAddress(addr)
            setGuestToken(token)
            setGuestEmail(email)
            setGuestProjectName(projectName)
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
          projectName={guestProjectName}
          onDisconnect={() => setView('MODE_SELECT')}
        />
      )
    }

    if (view === 'SETTINGS') {
      return <SettingsPage onBack={() => setView('DASHBOARD')} />
    }

    if (view === 'LOGIN') {
      return <LoginPage onLogin={handleLogin} onBack={() => setView('MODE_SELECT')} />
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
        onOpenSettings={() => setView('SETTINGS')}
        onLogout={() => setView('MODE_SELECT')}
      />
    )
  }

  return (
    <ModalProvider>
      {renderPage()}

      {/* 전역 커스텀 모달 */}
      <CustomModal />

      {/* 닫기 확인 모달 (전역) */}
      {showCloseModal && (
        <CloseConfirmModal
          onBackground={() => {
            window.api.closeResponse('background')
            setShowCloseModal(false)
          }}
          onQuit={() => {
            window.api.closeResponse('quit')
            setShowCloseModal(false)
          }}
          onCancel={() => {
            window.api.closeResponse('cancel')
            setShowCloseModal(false)
          }}
        />
      )}
    </ModalProvider>
  )
}