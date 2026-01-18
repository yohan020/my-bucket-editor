// [Guest 연결 페이지] Host IP:Port 입력하여 연결
import { useState } from 'react'

interface Props {
    onConnect: (address: string) => void
    onBack: () => void
}

export default function GuestConnectPage({ onConnect, onBack }: Props) {
    const [address, setAddress] = useState('')

    const handleConnect = () => {
        if (address.trim()) {
            onConnect(address.trim())
        }
    }

    return (
        <div className="guest-connect-container">
            <h1>👤 Guest로 참여</h1>
            <p>Host의 IP:Port를 입력하세요</p>

            <input
                type="text"
                placeholder="예: 192.168.0.10:3002"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
            />

            <div className="buttons">
                <button onClick={handleConnect} className="connect-btn">
                    🔗 연결하기
                </button>
                <button onClick={onBack} className="back-btn">
                    ← 뒤로
                </button>
            </div>
        </div>
    )
}