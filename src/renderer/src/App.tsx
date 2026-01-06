import { useState, useEffect } from 'react'

// 화면 상태 정의
type ViewState = 'LOGIN' | 'DASHBOARD' | 'CREATE_PROJECT'

interface Project {
  id: number
  name: string
  path: string
  port: number // 서버 포트 정보 추가
  lastUsed: string // 마지막 사용일
}

declare global {
  interface Window {
    api: {
      selectFolder: () => Promise<string | null>
      getProjects: () => Promise<Project[]>
      createProject: (project: Project) => Promise<boolean>
      startServer: (port: number, projectPath: string) => Promise<{ success: boolean, message: string }>
      stopServer: (port: number) => Promise<boolean>
      approveUser: (port: number, email: string, allow: boolean) => Promise<{ success: boolean, message: string }>
      onGuestRequest: (callback: (data: { port: number, email: string }) => void) => () => void
    }
  }
}

function App(): JSX.Element {
  const [view, setView] = useState<ViewState>('LOGIN')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [projectName, setProjectName] = useState('')
  const [projectPath, setProjectPath] = useState('')

  // 어떤 프로젝트의 메뉴가 열려있는지 관리 (null이면 닫힘)
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null)

  const [projects, setProjects] = useState<Project[]>([]) // 초기값을 빈 배열로

  const [activeProjectIds, setActiveProjectIds] = useState<number[]>([])

  // --- 핸들러 ---

  // 앱이 켜지면 '승인 요청 리스너' 등록
  useEffect(() => {
    const cleanup = window.api.onGuestRequest((data) => {
      // 지금은 간단하게 브라우저 기본 confirm 창 이용 (나중에 교체)
      const isApproved = confirm(
        `🔔 접속 요청 알림!\n\n` +
        `프로젝트 포트: ${data.port}\n` +
        `요청자 ID: ${data.email}\n\n` +
        `이 사용자의 접속을 허용하시겠습니까?`
      )

      // 승인 또는 거절 처리 요청
      handleApprove(data.port, data.email, isApproved);
    })

    return cleanup  // 컴포넌트 언마운트 시 리스너 제거
  }, [])

  // 다른 곳 클릭 시 메뉴 닫기
  useEffect(() => {
    const closeMenu = () => setActiveMenuId(null)
    window.addEventListener('click', closeMenu)
    return () => window.removeEventListener('click', closeMenu)
  }, [])

  // 메뉴 토글 핸들러
  const toggleMenu = (e: React.MouseEvent, id: number) => {
    e.stopPropagation() // 부모 클릭 이벤트 전파 방지 (바로 닫히지 않게)
    setActiveMenuId(activeMenuId === id ? null : id)
  }

  // 앱 켜지면 저장된 프로젝트 목록 불러오기
  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    const savedProjects = await window.api.getProjects()
    setProjects(savedProjects)
  }

  // 프로젝트 생성 핸들러
  const handleCreateProject = async () => {
    if (!projectPath || !projectName) {
      alert("이름과 경로를 모두 입력해주세요.")
      return
    }

    const newProject: Project = {
      id: Date.now(),
      name: projectName,
      path: projectPath,
      port: 3000 + projects.length, // 포트번호 자동 증가 (임시 로직)
      lastUsed: new Date().toDateString()
    }

    // 저장 요청
    await window.api.createProject(newProject)

    // 목록 새로고침 및 이동
    await loadProjects()

    // 프로젝트 생성 페이지의 입력값 초기화
    setProjectName('')
    setProjectPath('')

    alert('프로젝트가 생성되었습니다!')
    setView('DASHBOARD')
  }

  // 로그인 핸들러
  const handleLogin = () => {
    if (!username || !password) return alert('정보를 입력하세요.')
    setView('DASHBOARD')
  }

  // --- 메뉴 추천 기능들 ---
  const handleMenuAction = (action: string, projectName: string) => {
    alert(`'${projectName}' 프로젝트 - [${action}] 기능을 실행합니다.`)
    // TODO: 실제 로직 연결
  }

  // 폴더 선택 핸들러
  const handleSelectFolder = async () => {
    const path = await window.api.selectFolder()
    if (path) {
      setProjectPath(path)
    }
  }

  // 서버 실행 핸들러
  const handleToggleServer = async (project: Project) => {
    // 1. 이미 해당 서버가 켜져있다면 끔
    if (activeProjectIds.includes(project.id)) {
      const stopped = await window.api.stopServer(project.port)
      if (stopped) {
        setActiveProjectIds(prev => prev.filter(id => id !== project.id))
        alert('서버를 종료했습니다.')
      }
      return
    }

    // 2. 서버 시작 요청
    const result = await window.api.startServer(project.port, project.path)

    if (result.success) {
      setActiveProjectIds(prev => [...prev, project.id])
      alert(`✅ 서버 가동 시작!\n\n웹 브라우저를 켜고 http://localhost:${project.port} 로 접속해보세요.`)
    } else {
      alert(`실패: ${result.message}`)
    }
  }

  const handleApprove = async (port: number, email: string, allow: boolean) => {
    await window.api.approveUser(port, email, allow)
    if (allow) {
      alert(`${email} 님을 승인했습니다! 이제 로그인할 수 있습니다.`)
    } else {
      alert(`${email} 님의 접속을 거절했습니다.`)
    }
  }

  // --- 렌더링 ---

  // 1. 로그인 & 2. 생성 화면 (이전과 동일하거나 심플하게 유지)
  if (view === 'LOGIN') {
    return (
      <div className="center-container">
        <div className="login-card">
          <h1>🔒 관리자 진입</h1>
          <input type="text" placeholder="ID" value={username} onChange={e => setUsername(e.target.value)} />
          <input type="password" placeholder="PW" value={password} onChange={e => setPassword(e.target.value)} />
          <button className="primary-btn full-width" onClick={handleLogin}>로그인</button>
        </div>
      </div>
    )
  }

  if (view === 'CREATE_PROJECT') {
    return (
      <div className="center-container">
        <div className="create-card">
          <h1>새 프로젝트 생성</h1>

          <div className="input-group">
            <label>프로젝트 이름</label>
            <input type="text" placeholder="예: 팀 프로젝트 A" value={projectName} onChange={e => setProjectName(e.target.value)} />
          </div>

          <div className="input-group">
            <label>경로</label>
            <div className="path-select-row">
              {/* 경로가 표시되는 공간 (읽기 전용) */}
              <input
                type="text"
                className="path-display"
                readOnly
                value={projectPath}
                placeholder="오른쪽 폴더 아이콘을 눌러 선택하세요"
              />
              {/* 폴더 아이콘 버튼 */}
              <button className="folder-btn" onClick={handleSelectFolder}>
                📂
              </button>
            </div>
          </div>

          {/* 하단 버튼 그룹 (50:50 배치) */}
          <div className="bottom-btn-group">
            <button className="secondary-btn half-btn" onClick={() => setView('DASHBOARD')}>
              취소
            </button>
            <button className="primary-btn half-btn" onClick={handleCreateProject}>
              생성
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 3. 대시보드 (디자인 전면 수정)
  return (
    <div className="dashboard-layout">
      {/* 상단 헤더 */}
      <header className="top-header">
        <div className="header-left">
          <h2>📂 내 프로젝트 목록</h2>
          <span className="project-count">{projects.length}개의 프로젝트</span>
        </div>
        <div className="header-right">
          <span className="user-badge">👤 {username}님</span>
          <button className="create-btn" onClick={() => setView('CREATE_PROJECT')}>
            + 새 프로젝트
          </button>
        </div>
      </header>

      {/* 프로젝트 리스트 영역 */}
      <div className="list-container">
        {projects.map((project) => (
          <div key={project.id} className="list-item">

            {/* 왼쪽: 정보 영역 */}
            <div className="item-info">
              <div className="item-title">
                <h3>{project.name}</h3>
                <span className="status-badge">OFFLINE</span>
              </div>
              <p className="item-path">{project.path}</p>
              <span className="item-meta">Port: {project.port} | Last used: {project.lastUsed}</span>
            </div>

            {/* 오른쪽: 액션 영역 */}
            <div className="item-actions">
              <button className={`run-server-btn ${activeProjectIds.includes(project.id) ? 'active' : ''}`} onClick={() => handleToggleServer(project)}>
                {activeProjectIds.includes(project.id) ? '⏹ 서버 중지' : '▶ 서버 실행'}
              </button>

              {/* 점 3개 메뉴 (Kebab Menu) */}
              <div className="menu-wrapper">
                <button className="kebab-btn" onClick={(e) => toggleMenu(e, project.id)}>
                  ⋮
                </button>

                {activeMenuId === project.id && (
                  <div className="dropdown-menu">
                    <div onClick={() => handleMenuAction('설정 변경', project.name)}>⚙️ 설정 변경</div>
                    <div onClick={() => handleMenuAction('이름 변경', project.name)}>✏️ 이름 변경</div>
                    <div onClick={() => handleMenuAction('폴더 열기', project.name)}>📂 폴더 열기</div>
                    <hr />
                    <div className="danger" onClick={() => handleMenuAction('삭제', project.name)}>🗑️ 프로젝트 삭제</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App