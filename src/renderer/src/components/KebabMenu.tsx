// [케밥 메뉴] 프로젝트 설정/삭제 등의 드롭다운 메뉴 컴포넌트
interface Props {
    isOpen: boolean
    onAction: (action: string) => void
}

export default function KebabMenu({ isOpen, onAction }: Props) {
    if (!isOpen) return null

    return (
        <div className="dropdown-menu">
            <div onClick={() => onAction('설정 변경')}>⚙️ 설정 변경</div>
            <div onClick={() => onAction('이름 변경')}>✏️ 이름 변경</div>
            <div onClick={() => onAction('폴더 열기')}>📂 폴더 열기</div>
            <hr />
            <div className="danger" onClick={() => onAction('삭제')}>🗑️ 프로젝트 삭제</div>
        </div>
    )
}