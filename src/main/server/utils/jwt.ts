// [JWT 유틸] 토큰 생성 및 검증
import jwt from 'jsonwebtoken'

// 비밀키 (실제 서비스에서는 환경변수로 관리)
const SECRET_KEY = 'bucket-editor-secret-key-2025'

// 토큰 생성
export function generateToken(payload: { email: string, port: number }): string {
    return jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' })
}

// 토큰 검증
export function verifyToken(token: string): { email: string, port: number } | null {
    try {
        return jwt.verify(token, SECRET_KEY) as { email: string, port: number }
    } catch (error) {
        return null // 유효하지 않거나 만료됨
    }
}