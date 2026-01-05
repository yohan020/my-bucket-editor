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
    }
  }
}

function App(): JSX.Element {
  const [view, setView] = useState<ViewState>('LOGIN')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [projectPath, setProjectPath] = useState('')

  // 어떤 프로젝트의 메뉴가 열려있는지 관리 (null이면 닫힘)
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null)

  const [projects, setProjects] = useState<Project[]>([
    { id: 1, name: '나만의 쇼핑몰', path: 'C:\\Projects\\Shop', port: 3000, lastUsed: '2026-01-04' },
    { id: 2, name: '알고리즘 스터디', path: 'D:\\Study\\Algo', port: 3001, lastUsed: '2026-01-05' }
  ])

  // --- 핸들러 ---

  // 다른 곳 클릭 시 메뉴 닫기
  useEffect(() => {
    const closeMenu = () => setActiveMenuId(null)
    window.addEventListener('click', closeMenu)
    return () => window.removeEventListener('click', closeMenu)
  }, [])

  const handleLogin = () => {
    if (!username || !password) return alert('정보를 입력하세요.')
    setView('DASHBOARD')
  }

  const toggleMenu = (e: React.MouseEvent, id: number) => {
    e.stopPropagation() // 부모 클릭 이벤트 전파 방지 (바로 닫히지 않게)
    setActiveMenuId(activeMenuId === id ? null : id)
  }

  // --- 메뉴 추천 기능들 ---
  const handleMenuAction = (action: string, projectName: string) => {
    alert(`'${projectName}' 프로젝트 - [${action}] 기능을 실행합니다.`)
    // TODO: 실제 로직 연결
  }

  const handleSelectFolder = async () => {
    const path = await window.api.selectFolder()
    if (path) {
      setProjectPath(path)
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
            <input type="text" placeholder="예: 팀 프로젝트 A" />
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
            <button className="primary-btn half-btn" onClick={() => { alert('생성 완료!'); setView('DASHBOARD'); }}>
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
              <button className="run-server-btn" onClick={() => alert('서버 시작!')}>
                ▶ 서버 실행
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