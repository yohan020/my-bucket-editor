import { ipcMain } from 'electron'
import { isAuthConfigured, setupAuth, verifyPassword, resetAuthWithRecoveryCode, isTotpEnabled, enableTotp, disableTotp, getTotpSecret } from '../utils/authStore'
const speakeasy = require('speakeasy')
import QRCode from 'qrcode'

export function registerAuthHandler() {
    // 인증 상태 확인
    ipcMain.handle('auth:status', async () => {
        return { isConfigured: isAuthConfigured() }
    })

    // 초기 설정 (비밀번호 -> 복구코드 반환)
    ipcMain.handle('auth:setup', async (_, password: string) => {
        try {
            const recoveryCode = setupAuth(password)
            return { success: true, recoveryCode }
        } catch (error: any) {
            console.error('Auth Setup Error:', error)
            return { success: false, error: error.message }
        }
    })

    // 로그인 (비밀번호 -> 성공여부)
    ipcMain.handle('auth:login', async (_, password: string) => {
        const isValid = verifyPassword(password)
        return { success: isValid }
    })

    // 복구 (복구코드 -> 초기화 성공여부)
    ipcMain.handle('auth:reset', async (_, recoveryCode: string) => {
        const success = resetAuthWithRecoveryCode(recoveryCode)
        return { success }
    })

    /* --- 2FA (TOTP) 핸들러 --- */

    // 2FA: 상태 확인
    ipcMain.handle('auth:totp-status', async () => {
        return { enabled: isTotpEnabled() }
    })

    // 2FA: 시크릿 생성 (QR용)
    ipcMain.handle('auth:totp-generate', async () => {
        try {
            const secret = speakeasy.generateSecret({
                name: 'MyBucketEditor (Host)',
                issuer: 'MyBucketEditor'
            })
            // secret.base32가 저장할 키, secret.otpauth_url이 QR용
            const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url!)
            return { success: true, secret: secret.base32, qrDataUrl }
        } catch (err: any) {
            console.error('TOTP Gen Error:', err)
            return { success: false, error: err.message }
        }
    })

    // 2FA: 설정 중 검증
    ipcMain.handle('auth:totp-verify-setup', async (_, { token, secret }) => {
        try {
            const isValid = speakeasy.totp.verify({
                secret: secret,
                encoding: 'base32',
                token: token,
                window: 1 // 시간 오차 허용 범위
            })
            return { isValid }
        } catch (err) {
            return { isValid: false }
        }
    })

    // 2FA: 활성화 (저장)
    ipcMain.handle('auth:totp-enable', async (_, secret: string) => {
        enableTotp(secret)
        return { success: true }
    })

    // 2FA: 비활성화
    ipcMain.handle('auth:totp-disable', async () => {
        disableTotp()
        return { success: true }
    })

    // 2FA: 로그인 시 검증
    ipcMain.handle('auth:totp-verify', async (_, token: string) => {
        const secret = getTotpSecret()
        if (!secret) return { isValid: false }

        try {
            const isValid = speakeasy.totp.verify({
                secret: secret,
                encoding: 'base32',
                token: token,
                window: 1
            })
            return { isValid }
        } catch (err) {
            return { isValid: false }
        }
    })
}
