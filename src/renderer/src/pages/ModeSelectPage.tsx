// [모드 선택 페이지] Host/Guest 모드 선택

interface Props {
    onSelectHost: () => void
    onSelectGuest: () => void
}

export default function ModeSelectPage({ onSelectHost, onSelectGuest }: Props) {
    return (
        <div className="mode-select-container">
            <h1>🪣 Bucket Editor</h1>
            <p>모드를 선택하세요</p>

            <div className="mode-buttons">
                <button onClick={onSelectHost} className="mode-btn host">
                    🖥️ Host로 시작
                    <span>서버를 실행하고 다른 사람을 초대합니다</span>
                </button>

                <button onClick={onSelectGuest} className="mode-btn guest">
                    👤 Guest로 참여
                    <span>다른 사람의 서버에 접속합니다</span>
                </button>
            </div>
        </div>
    )
}