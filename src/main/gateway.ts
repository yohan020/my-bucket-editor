
import http from 'http'
import httpProxy from 'http-proxy'
import { getTunnelSettings } from './tunnel'

// 내부 프로젝트 포트 맵 (Subdomain -> Port)
// 예: 'project1' -> 3002
const projectMap = new Map<string, number>()

const GATEWAY_PORT = 4000
let gatewayServer: http.Server | null = null
const proxy = httpProxy.createProxyServer({})

// 프록시 에러 핸들링
proxy.on('error', (err, _req, res) => {
    console.error('❌ Gateway Proxy Error:', err)
    if (res && 'writeHead' in res) {
        try {
            res.writeHead(502, { 'Content-Type': 'text/plain' })
            res.end('Gateway Error: Failed to proxy request.')
        } catch (e) {
            // 응답이 이미 전송된 경우 무시
        }
    }
})

/**
 * 프로젝트 등록 (서브도메인 -> 포트)
 */
export function registerProjectRoute(subdomain: string, port: number) {
    // 소문자로 저장
    const normalizedSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '')
    projectMap.set(normalizedSubdomain, port)
    console.log(`🛣️ Gateway Route Registered: ${normalizedSubdomain} -> localhost:${port}`)
}

/**
 * 프로젝트 등록 해제
 */
export function unregisterProjectRoute(subdomain: string) {
    const normalizedSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '')
    projectMap.delete(normalizedSubdomain)
    console.log(`🛣️ Gateway Route Removed: ${normalizedSubdomain}`)
}

/**
 * 게이트웨이 서버 시작
 */
export function startGatewayServer() {
    if (gatewayServer) return

    gatewayServer = http.createServer((req, res) => {
        const hostname = req.headers.host
        if (!hostname) {
            res.writeHead(400)
            res.end('Missing Host Header')
            return
        }

        // 서브도메인 추출 로직
        // 예: project1.mydomain.com -> project1
        const settings = getTunnelSettings()
        const customDomain = settings.cloudflareDomain || ''
        
        let targetPort: number | undefined

        // 도메인 설정이 없거나, 로컬호스트인 경우 처리 애매함.
        // 여기서는 가장 단순하게 "첫 번째 점(.) 앞부분"을 서브도메인으로 간주
        const parts = hostname.split('.')
        let subdomain = ''

        if (parts.length >= 3) {
            subdomain = parts[0].toLowerCase()
        } else {
            // localhost:4000 같은 경우 서브도메인이 없음.
            // 일단 'default' 또는 첫 번째 프로젝트로 연결? 
            // 현재는 라우팅 실패로 처리.
        }

        // 프로젝트 맵에서 포트 찾기
        targetPort = projectMap.get(subdomain)

        if (targetPort) {
            // 프록시 수행
            proxy.web(req, res, { target: `http://localhost:${targetPort}` })
        } else {
            res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
            res.end(`<h1>My Bucket Gateway</h1><p>프로젝트를 찾을 수 없습니다: <b>${subdomain}</b></p>`)
        }
    })

    // WebSocket 업그레이드 처리
    gatewayServer.on('upgrade', (req, socket, head) => {
        const hostname = req.headers.host
        if (!hostname) {
            socket.destroy()
            return
        }

        const parts = hostname.split('.')
        let subdomain = ''
        if (parts.length >= 3) {
            subdomain = parts[0].toLowerCase()
        }

        const targetPort = projectMap.get(subdomain)
        if (targetPort) {
            proxy.ws(req, socket, head, { target: `http://localhost:${targetPort}` })
        } else {
            socket.destroy()
        }
    })

    gatewayServer.listen(GATEWAY_PORT, () => {
        console.log(`⛩️ Gateway Server listening on port ${GATEWAY_PORT}`)
    })
    
    // 에러 핸들링
    gatewayServer.on('error', (err) => {
        console.error('❌ Gateway Server Error:', err)
    })
}

/**
 * 게이트웨이 서버 멈춤
 */
export function stopGatewayServer() {
    if (gatewayServer) {
        gatewayServer.close()
        gatewayServer = null
        console.log('⛩️ Gateway Server stopped')
    }
}
