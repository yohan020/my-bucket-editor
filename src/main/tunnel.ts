// [터널 서비스] localtunnel을 이용한 외부 접속 URL 생성
import localtunnel from 'localtunnel'

interface TunnelInstance {
    tunnel: any
    url: string
}

// 포트별 터널 인스턴스 관리
const activeTunnels = new Map<number, TunnelInstance>()

/**
 * 터널 시작 - 외부에서 접속 가능한 URL 생성
 */
export async function startTunnel(port: number): Promise<string> {
    // 이미 해당 포트에 터널이 있다면 반환
    if (activeTunnels.has(port)) {
        return activeTunnels.get(port)!.url
    }

    console.log(`🌐 localtunnel 연결 시도 중... (Port: ${port})`)

    try {
        // localtunnel 연결 (서브도메인 랜덤 생성 or 지정 가능)
        const tunnel = await localtunnel({ port })

        if (!tunnel) {
            throw new Error('터널 생성에 실패했습니다.')
        }

        const url = tunnel.url
        console.log(`✅ localtunnel 연결 성공: ${url} → localhost:${port}`)

        // Map에 저장
        activeTunnels.set(port, { tunnel, url })

        // 터널 닫힘 이벤트 감지
        tunnel.on('close', () => {
            console.log(`🔌 터널이 닫혔습니다. (Port: ${port})`)
            activeTunnels.delete(port)
        })

        return url
    } catch (error: any) {
        console.error('❌ localtunnel 연결 실패:', error)
        throw new Error(error?.message || '외부 접속 주소를 생성할 수 없습니다.')
    }
}

/**
 * 터널 종료 (특정 포트)
 */
export async function stopTunnel(port?: number): Promise<void> {
    if (port) {
        // 특정 포트만 종료
        const instance = activeTunnels.get(port)
        if (instance) {
            try {
                instance.tunnel.close()
            } catch (e) {
                console.error(`⚠️ 터널 종료 중 오류 (Port: ${port}):`, e)
            }
            activeTunnels.delete(port)
        }
    } else {
        // 모든 터널 종료
        for (const [p, instance] of activeTunnels) {
            try {
                instance.tunnel.close()
            } catch (e) {
                console.error(`⚠️ 터널 종료 중 오류 (Port: ${p}):`, e)
            }
        }
        activeTunnels.clear()
    }
}

/**
 * 현재 활성 터널 URL 반환 (포트 기준)
 */
export function getActiveUrl(port?: number): string | null {
    if (port) {
        return activeTunnels.get(port)?.url || null
    }
    // 포트 지정이 없으면 첫 번째 터널 반환 (하위 호환성)
    if (activeTunnels.size > 0) {
        const first = activeTunnels.values().next().value
        return first ? first.url : null
    }
    return null
}

/**
 * 앱 종료 시 정리
 */
export async function cleanupTunnels(): Promise<void> {
    await stopTunnel() // 모든 터널 종료
    console.log('🧹 모든 터널 정리 완료')
}
