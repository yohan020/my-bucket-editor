// [PR 생성 모달] 게스트가 저장 시 메시지 입력
import { useState } from 'react'

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (message: string) => void;
}

export default function PRCreateModal({ isOpen, onClose, onConfirm }: Props) {
    const [message, setMessage] = useState('')

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content pr-modal">
                <h3>🚀 변경 사항 전송 (PR)</h3>
                <p>파일을 저장하려면 호스트의 승인이 필요합니다.<br />변경 내용을 설명해주세요.</p>
                <textarea
                    className="pr-message-input"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="예: 로그인 버그 수정, 함수 최적화..."
                    autoFocus
                />
                <div className="modal-buttons">
                    <button onClick={onClose} className="cancel-btn">취소</button>
                    <button
                        onClick={() => { onConfirm(message); setMessage(''); onClose(); }}
                        className="confirm-btn"
                        disabled={!message.trim()}
                    >
                        전송
                    </button>
                </div>
            </div>
        </div>
    );
}
