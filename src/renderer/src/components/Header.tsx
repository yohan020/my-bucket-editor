// [헤더 컴포넌트] 대시보드 상단 영역 - 유저 정보, 프로젝트 개수, 생성 버튼
interface Props {
    username: string
    projectCount: number
    onCreateClick: () => void
}

export default function Header({ username, projectCount, onCreateClick }: Props) {
    return (
        <header className="top-header">
            <div className="header-left">
                <h2>📂 내 프로젝트 목록</h2>
                <span className="project-count">{projectCount}개의 프로젝트</span>
            </div>
            <div className="header-right">
                <span className="user-badge">👤 {username}님</span>
                <button className="create-btn" onClick={onCreateClick}>+ 새 프로젝트</button>
            </div>
        </header>
    )
}