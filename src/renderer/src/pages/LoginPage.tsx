// [로그인 페이지] 관리자(Host) 로그인 화면 UI 컴포넌트
import { useState } from 'react'

interface Props {
    onLogin: (username: string) => void
}

export default function LoginPage({ onLogin }: Props) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')

    const handleLogin = () => {
        if (!username || !password) return alert('정보를 입력하세요.')
        onLogin(username)
    }

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