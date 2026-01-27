// [터널 서비스] localtunnel을 이용한 외부 접속 URL 생성
import localtunnel from 'localtunnel'

let activeTunnel: any = null
let activeUrl: string | null = null

/**
 * 터널 시작 - 외부에서 접속 가능한 URL 생성
 */
export async function startTunnel(port: number): Promise<string> {
    // 기존 터널 정리
    await stopTunnel()

    console.log(`🌐 localtunnel 연결 시도 중... (Port: ${port})`)

    try {
        // localtunnel 연결 (서브도메인 랜덤 생성 or 지정 가능)
        activeTunnel = await localtunnel({ port })

        if (!activeTunnel) {
            throw new Error('터널 생성에 실패했습니다.')
        }

        activeUrl = activeTunnel.url
        console.log(`✅ localtunnel 연결 성공: ${activeUrl} → localhost:${port}`)

        // 터널 닫힘 이벤트 감지
        activeTunnel.on('close', () => {
            console.log('🔌 터널이 닫혔습니다.')
            activeUrl = null
            activeTunnel = null
        })

        return activeUrl as string
    } catch (error: any) {
        console.error('❌ localtunnel 연결 실패:', error)
        throw new Error(error?.message || '외부 접속 주소를 생성할 수 없습니다.')
    }
}

/**
 * 터널 종료
 */
export async function stopTunnel(): Promise<void> {
    if (activeTunnel) {
        try {
            activeTunnel.close()
        } catch (e) {
            console.error('⚠️ 터널 종료 중 오류:', e)
        }
    }
    activeTunnel = null
    activeUrl = null
}

/**
 * 현재 활성 터널 URL 반환
 */
export function getActiveUrl(): string | null {
    return activeUrl
}

/**
 * 앱 종료 시 정리
 */
export async function cleanupTunnels(): Promise<void> {
    await stopTunnel()
    console.log('🧹 모든 터널 정리 완료')
}
