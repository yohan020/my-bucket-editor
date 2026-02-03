// [터널 서비스] LocalTunnel + ngrok 지원
import localtunnel from 'localtunnel'
import ngrok from '@ngrok/ngrok'
import ElectronStore from 'electron-store'

// electron-store ESM 호환성 처리
const Store = (ElectronStore as any).default || ElectronStore

export type TunnelService = 'localtunnel' | 'ngrok'

interface TunnelInstance {
    type: TunnelService
    tunnel: any
    url: string
}

interface TunnelSettings {
    service: TunnelService
    ngrokAuthToken: string
}

// 설정 저장소
const store = new Store({
    defaults: {
        tunnelSettings: {
            service: 'localtunnel',
            ngrokAuthToken: ''
        }
    }
}) as any

// 포트별 터널 인스턴스 관리
const activeTunnels = new Map<number, TunnelInstance>()

/**
 * 터널 설정 가져오기
 */
export function getTunnelSettings(): TunnelSettings {
    return store.get('tunnelSettings')
}

/**
 * 터널 설정 저장
 */
export function setTunnelSettings(settings: Partial<TunnelSettings>): void {
    const current = getTunnelSettings()
    store.set('tunnelSettings', { ...current, ...settings })
}

/**
 * 터널 시작 - 외부에서 접속 가능한 URL 생성
 */
export async function startTunnel(port: number): Promise<string> {
    // 이미 해당 포트에 터널이 있다면 반환
    if (activeTunnels.has(port)) {
        return activeTunnels.get(port)!.url
    }

    const settings = getTunnelSettings()
    
    if (settings.service === 'ngrok') {
        return startNgrokTunnel(port, settings.ngrokAuthToken)
    } else {
        return startLocaltunnel(port)
    }
}

/**
 * LocalTunnel 시작
 */
async function startLocaltunnel(port: number): Promise<string> {
    console.log(`🌐 localtunnel 연결 시도 중... (Port: ${port})`)

    try {
        const tunnel = await localtunnel({ port })

        if (!tunnel) {
            throw new Error('터널 생성에 실패했습니다.')
        }

        const url = tunnel.url
        console.log(`✅ localtunnel 연결 성공: ${url} → localhost:${port}`)

        activeTunnels.set(port, { type: 'localtunnel', tunnel, url })

        // 터널 닫힘 이벤트
        tunnel.on('close', () => {
            console.log(`🔌 터널이 닫혔습니다. (Port: ${port})`)
            activeTunnels.delete(port)
        })

        // 에러 이벤트 핸들링 (connection refused 등 무시)
        tunnel.on('error', (err: any) => {
            console.warn(`⚠️ LocalTunnel 에러 (무시됨):`, err?.message || err)
            // 에러 발생 시 터널 정리
            activeTunnels.delete(port)
        })

        return url
    } catch (error: any) {
        console.error('❌ localtunnel 연결 실패:', error)
        throw new Error(error?.message || '외부 접속 주소를 생성할 수 없습니다.')
    }
}

/**
 * ngrok 터널 시작
 */
async function startNgrokTunnel(port: number, authToken: string): Promise<string> {
    console.log(`🌐 ngrok 연결 시도 중... (Port: ${port})`)

    if (!authToken) {
        throw new Error('ngrok API Key가 설정되지 않았습니다. 설정에서 입력해주세요.')
    }

    try {
        // ngrok 인증
        await ngrok.authtoken(authToken)

        // 터널 시작
        const listener = await ngrok.forward({ addr: port, authtoken: authToken })
        const url = listener.url()

        if (!url) {
            throw new Error('ngrok URL을 가져올 수 없습니다.')
        }

        console.log(`✅ ngrok 연결 성공: ${url} → localhost:${port}`)

        activeTunnels.set(port, { type: 'ngrok', tunnel: listener, url })

        return url
    } catch (error: any) {
        console.error('❌ ngrok 연결 실패:', error)
        throw new Error(error?.message || 'ngrok 터널 생성에 실패했습니다.')
    }
}

/**
 * 터널 종료 (특정 포트)
 */
export async function stopTunnel(port?: number): Promise<void> {
    if (port) {
        const instance = activeTunnels.get(port)
        if (instance) {
            try {
                if (instance.type === 'ngrok') {
                    await instance.tunnel.close()
                } else {
                    instance.tunnel.close()
                }
            } catch (e) {
                console.error(`⚠️ 터널 종료 중 오류 (Port: ${port}):`, e)
            }
            activeTunnels.delete(port)
        }
    } else {
        // 모든 터널 종료
        for (const [p, instance] of activeTunnels) {
            try {
                if (instance.type === 'ngrok') {
                    await instance.tunnel.close()
                } else {
                    instance.tunnel.close()
                }
            } catch (e) {
                console.error(`⚠️ 터널 종료 중 오류 (Port: ${p}):`, e)
            }
        }
        activeTunnels.clear()
        
        // ngrok 전체 세션 종료
        try {
            await ngrok.disconnect()
        } catch (e) {
            // 무시
        }
    }
}

/**
 * 현재 활성 터널 URL 반환 (포트 기준)
 */
export function getActiveUrl(port?: number): string | null {
    if (port) {
        return activeTunnels.get(port)?.url || null
    }
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
    await stopTunnel()
    console.log('🧹 모든 터널 정리 완료')
}
