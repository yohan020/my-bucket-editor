// [터널 서비스] LocalTunnel + ngrok + Cloudflare 지원
import localtunnel from 'localtunnel'
import ngrok from '@ngrok/ngrok'
import { Tunnel as CloudflareTunnel } from 'cloudflared'
import ElectronStore from 'electron-store'
import { registerProjectRoute, startGatewayServer, unregisterProjectRoute } from './gateway'

// electron-store ESM 호환성 처리
const Store = (ElectronStore as any).default || ElectronStore

export type TunnelService = 'localtunnel' | 'ngrok' | 'cloudflare'

interface TunnelInstance {
    type: TunnelService
    tunnel: any
    url: string
    stop?: () => Promise<any> // Cloudflare용
}

interface TunnelSettings {
    service: TunnelService
    ngrokAuthToken: string
    cloudflareToken?: string
    cloudflareDomain?: string
}

// 설정 저장소
const store = new Store({
    defaults: {
        tunnelSettings: {
            service: 'localtunnel',
            ngrokAuthToken: '',
            cloudflareToken: '',
            cloudflareDomain: ''
        }
    }
}) as any

// 포트별 터널 인스턴스 관리
const activeTunnels = new Map<number, TunnelInstance>()

// 게이트웨이 터널 (싱글톤) - 포트 4000
let gatewayTunnel: TunnelInstance | null = null

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
export async function startTunnel(port: number, projectName: string = 'server'): Promise<string> {
    // 이미 해당 포트에 터널이 있다면 반환
    if (activeTunnels.has(port)) {
        return activeTunnels.get(port)!.url
    }

    const settings = getTunnelSettings()
    
    if (settings.service === 'ngrok') {
        return startNgrokTunnel(port, settings.ngrokAuthToken)
    } else if (settings.service === 'cloudflare') {
        return startCloudflareTunnel(port, projectName)
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
 * Cloudflare Tunnel 시작 (Quick Tunnel 또는 Named Tunnel)
 */
async function startCloudflareTunnel(port: number, projectName: string): Promise<string> {
    console.log(`🌐 Cloudflare 연결 시도 중... (Port: ${port})`)
    const settings = getTunnelSettings()

    try {
        let tunnel: any
        let tunnelUrl: string
        const domain = settings.cloudflareDomain || ''
        const isWildcard = domain.startsWith('*.') // 와일드카드 도메인 체크

        // 1. 와일드카드 모드 (Gateway 사용)
        if (settings.cloudflareToken && isWildcard) {
            console.log('🔒 ===================================================')
            console.log('🔒 Cloudflare Gateway Mode (Wildcard) Activated')
            console.log(`🔒 Domain: ${domain}`)
            console.log('🔒 ===================================================')
            
            // 1-1. 게이트웨이 서버 시작 (4000 포트)
            startGatewayServer()

            // 1-2. 게이트웨이용 터널이 없으면 시작
            if (!gatewayTunnel) {
                console.log('🏗️ Starting Global Gateway Tunnel...')
                const gwTunnel = new CloudflareTunnel(['tunnel', 'run', '--token', settings.cloudflareToken])
                gwTunnel.on('error', (err) => console.error('❌ Gateway Tunnel Error:', err))
                
                // 게이트웨이 터널 등록
                gatewayTunnel = {
                    type: 'cloudflare',
                    tunnel: gwTunnel,
                    url: domain, // *.abc.com (표시용)
                    stop: async () => gwTunnel.stop()
                }
            }

            // 1-3. 현재 프로젝트를 게이트웨이에 등록
            // URL 생성: https://{projectName}.{domain_without_wildcard}
            const rootDomain = domain.replace('*.', '')
            // 프로젝트 이름 URL 안전하게 변환
            const safeProjectName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-')
            tunnelUrl = `https://${safeProjectName}.${rootDomain}`
            
            registerProjectRoute(safeProjectName, port)
            
            // activeTunnels에는 가짜 터널 객체 등록 (stop 시 라우트 해제용)
            activeTunnels.set(port, {
                type: 'cloudflare',
                tunnel: null, // 실제 터널은 gatewayTunnel이 담당
                url: tunnelUrl,
                stop: async () => {
                    unregisterProjectRoute(safeProjectName)
                    // 마지막 프로젝트라면 게이트웨이 터널도 닫을지 결정? (지금은 유지)
                }
            })

            console.log(`✅ Gateway Route Added: ${tunnelUrl} -> localhost:${port}`)
            return tunnelUrl
        }

        // 2. Token이 있는 경우: Named Tunnel (고정 도메인 1:1)
        if (settings.cloudflareToken && settings.cloudflareToken.trim() !== '') {
            console.log('🔒 Cloudflare Named Tunnel (Token) 모드로 시작합니다.')
            
            tunnel = new CloudflareTunnel(['tunnel', 'run', '--token', settings.cloudflareToken])

            if (!settings.cloudflareDomain) {
                console.warn('⚠️ Cloudflare Token은 있지만 도메인이 설정되지 않았습니다.')
            }
            tunnelUrl = settings.cloudflareDomain || 'https://unknown-domain.com'
            
            tunnel.on('error', (err: Error) => {
                console.error('❌ Cloudflare Tunnel 에러:', err)
            })

        } else {
            // 3. Token이 없는 경우: Quick Tunnel (임시 주소)
            console.log('🚀 Cloudflare Quick Tunnel (임시 주소) 모드로 시작합니다.')
            tunnel = new CloudflareTunnel(['tunnel', '--url', `http://localhost:${port}`])

            // URL 이벤트 대기
            tunnelUrl = await new Promise<string>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Cloudflare 터널 URL 대기 시간 초과'))
                }, 30000) // 30초 타임아웃

                tunnel.once('url', (url: string) => {
                    clearTimeout(timeout)
                    resolve(url)
                })

                tunnel.once('error', (err: Error) => {
                    clearTimeout(timeout)
                    reject(err)
                })
            })
        }

        console.log(`✅ Cloudflare 연결 성공: ${tunnelUrl} → localhost:${port}`)

        activeTunnels.set(port, { 
            type: 'cloudflare', 
            tunnel: tunnel,
            url: tunnelUrl,
            stop: async () => tunnel.stop()
        })

        return tunnelUrl
    } catch (error: any) {
        console.error('❌ Cloudflare 연결 실패:', error)
        throw new Error(error?.message || 'Cloudflare 터널 생성에 실패했습니다.')
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
                if (instance.stop) { // 커스텀 stop 함수가 있으면 호출 (Gateway Route 해제 등)
                    await instance.stop()
                } else if (instance.tunnel && instance.tunnel.close) { // ngrok 등
                    await instance.tunnel.close()
                } else if (instance.tunnel && instance.tunnel.stop) { // cloudflared (직접)
                     await instance.tunnel.stop()
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
                if (instance.stop) {
                    await instance.stop()
                } else if (instance.tunnel && instance.tunnel.close) {
                    await instance.tunnel.close()
                } else if (instance.tunnel && instance.tunnel.stop) { // cloudflared (직접)
                     await instance.tunnel.stop()
                }
            } catch (e) {
                console.error(`⚠️ 터널 종료 중 오류 (Port: ${p}):`, e)
            }
        }
        activeTunnels.clear()
        
        // Gateway 터널도 종료
        if (gatewayTunnel) {
            try {
                if (gatewayTunnel.stop) await gatewayTunnel.stop()
            } catch(e) { console.error('Gateway tunnel stop error', e)}
            gatewayTunnel = null
        }

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
