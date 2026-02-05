import Store from 'electron-store'
import { randomBytes, pbkdf2Sync, timingSafeEqual } from 'crypto'

interface AuthConfig {
    passwordHash: string
    salt: string
    recoveryCodeHash: string
    recoveryCodeSalt: string
    totpSecret?: string // 2FA Secret Key (Encrypted or Plain? Plain for now as file is safe)
}

const store = new Store<AuthConfig>({
    name: 'host-auth',
    defaults: {
        passwordHash: '',
        salt: '',
        recoveryCodeHash: '',
        recoveryCodeSalt: '',
        totpSecret: undefined
    }
})

// 해싱 설정
const ITERATIONS = 100000
const KEYLEN = 64
const DIGEST = 'sha512'

/**
 * 비밀번호 해싱 헬퍼
 */
function hashPassword(password: string, salt: string): string {
    return pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST).toString('hex')
}

/**
 * 인증 설정 여부 확인
 */
export function isAuthConfigured(): boolean {
    const hash = store.get('passwordHash')
    return !!hash && hash.length > 0
}

/**
 * 초기 인증 설정 (비밀번호 설정 + 복구코드 생성)
 */
export function setupAuth(password: string): string {
    // 1. 비밀번호 해싱
    const salt = randomBytes(16).toString('hex')
    const passwordHash = hashPassword(password, salt)

    // 2. 복구코드 생성 (XXXX-XXXX-XXXX 형식)
    const recoveryCode = [
        randomBytes(2).toString('hex').toUpperCase(),
        randomBytes(2).toString('hex').toUpperCase(),
        randomBytes(2).toString('hex').toUpperCase()
    ].join('-')

    // 3. 복구코드 해싱
    const recoverySalt = randomBytes(16).toString('hex')
    const recoveryCodeHash = hashPassword(recoveryCode, recoverySalt)

    // 4. 저장
    store.set({
        passwordHash,
        salt,
        recoveryCodeHash,
        recoveryCodeSalt: recoverySalt
    })

    return recoveryCode
}

/**
 * 비밀번호 검증
 */
export function verifyPassword(password: string): boolean {
    const storedHash = store.get('passwordHash')
    const salt = store.get('salt')

    if (!storedHash || !salt) return false

    const attemptHash = hashPassword(password, salt)
    
    // 타이밍 공격 방지 비교
    const attemptBuffer = Buffer.from(attemptHash, 'hex')
    const storedBuffer = Buffer.from(storedHash, 'hex')
    
    try {
        return timingSafeEqual(attemptBuffer, storedBuffer)
    } catch {
        return false
    }
}

/**
 * 복구코드 검증 및 초기화
 */
export function resetAuthWithRecoveryCode(code: string): boolean {
    const storedHash = store.get('recoveryCodeHash')
    const salt = store.get('recoveryCodeSalt')

    if (!storedHash || !salt) return false

    const attemptHash = hashPassword(code, salt)
    
    const attemptBuffer = Buffer.from(attemptHash, 'hex')
    const storedBuffer = Buffer.from(storedHash, 'hex')
    
    let isValid = false
    try {
        isValid = timingSafeEqual(attemptBuffer, storedBuffer)
    } catch {
        isValid = false
    }

    if (isValid) {
        // 인증 정보 초기화
        store.clear()
        return true
    }
    return false
}

/**
 * 강제 초기화 (디버그용/파일삭제 감지용)
 * 실제로는 파일을 지우면 되지만, 코드에서 명시적으로 지울 때 사용
 */
export function clearAuth(): void {
    store.clear()
}

/**
 * 2FA 활성화 (Secret 저장)
 */
export function enableTotp(secret: string): void {
    store.set('totpSecret', secret)
}

/**
 * 2FA 비활성화
 */
export function disableTotp(): void {
    store.delete('totpSecret' as any)
}

/**
 * 2FA 설정 여부 확인
 */
export function isTotpEnabled(): boolean {
    const secret = store.get('totpSecret')
    return !!secret && secret.length > 0
}

/**
 * 2FA Secret 가져오기 (검증용)
 */
export function getTotpSecret(): string | undefined {
    return store.get('totpSecret')
}
