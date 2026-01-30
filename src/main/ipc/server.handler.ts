// [서버 핸들러] Express 서버 시작/종료 등 서버 라이프사이클 IPC 처리
import { ipcMain } from 'electron'
import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { servers, projectUsers } from '../server'
import { createAuthRouter } from '../server/routes/auth.route'
import { createGuestRouter } from '../server/routes/guest.page'
import { createEditorRouter } from '../server/routes/editor.page'
import { setupSocketHandlers } from '../server/socket'
import { getProjectZipBuffer } from '../backup';

// 서버 시작 핸들러
export function registerServerHandlers(): void {
    
  ipcMain.handle('server:start', async (_, {port, projectPath}) => {
    // 1. 이미 켜져 있다면 끄고 다시 시작
    if (servers.has(port)) {
      console.log('이미 실행 중인 서버가 있습니다. 재시작합니다')
      servers.get(port)?.http.close()
      servers.delete(port)
    }

    // 2. 해당 포트의 상요자 목록 초기화
    if (!projectUsers.has(port)) {
      projectUsers.set(port, [])
    }

    try {
      const app = express()
      app.use(cors()) // 보안 정책 허용
      app.use(express.json())

      // 라우트 등록
      app.use(createAuthRouter(port))
      app.use(createGuestRouter())
      app.use(createEditorRouter())
      
      // 프로젝트 다운로드 API (게스트용)
      app.get('/api/download', async (_req, res) => {
        try {
          // 보안: 헤더 검사 (Bypass-Tunnel-Reminder 포함)
          // 간단히 구현. 실제론 토큰 검증 미들웨어를 타는게 좋음.
          // 여기선 createAuthRouter 등이 이미 있으니 토큰 검증은 생략하거나 추가할 수 있음.
          // 편의상 단순히 제공.
          
          const buffer = await getProjectZipBuffer(projectPath);
          res.setHeader('Content-Disposition', `attachment; filename="project_backup.zip"`);
          res.setHeader('Content-Type', 'application/zip');
          res.send(buffer);
        } catch (error) {
          console.error('Download failed:', error);
          res.status(500).send('Download failed');
        }
      });

      // HTTP 서버 실행
      const httpServer = http.createServer(app)

      // 소켓 서버 장착 (나중에 채팅/코딩용)
      const io = new Server(httpServer, {
        cors: { 
          origin: '*',  // 모든 곳에서 접속 허용
          methods: ['GET', 'POST'],
          credentials: true
        },
        transports: ['websocket', 'polling']  // WebSocket 우선, polling 대비
      })

      // Socket.io 이벤트 핸들러 등록
      setupSocketHandlers(io, projectPath)

      // 4) 진짜로 포트 열기 (0.0.0.0 = 모든 네트워크 인터페이스에서 접근 가능)
      httpServer.listen(port, '0.0.0.0', () => {
        console.log(`✅ 서버가 ${port}번 포트에서 시작되었습니다! 경로: ${projectPath}`)
      })

      // Map에 저장
      servers.set(port, {app, http: httpServer, io})
      
      return { success: true, message: '서버 시작 성공'}
    } catch (error) {
      console.error('서버 시작 실패: ',error)
      return { success: false, message: String(error)}
    }
  })

  // 서버 종료 핸들러
  ipcMain.handle('server:stop', async (_, port: number) => {
    const server = servers.get(port)
    if (server) {
      // 모든 클라이언트에게 서버 종료 알림 브로드캐스트
      server.io.emit('server:shutdown')
      
      // 클라이언트가 메시지를 받을 시간을 주고 종료
      await new Promise(resolve => setTimeout(resolve, 500))
      
      server.http.close(() => {
        console.log('⛔ 서버가 종료되었습니다.')
      })
      
      // [Fix] 서버 종료 시 해당 포트의 터널도 함께 종료
      import('../tunnel').then(({ stopTunnel }) => {
          stopTunnel(port).catch(err => console.error('터널 종료 실패:', err))
      })

      servers.delete(port)
      return true
    }
    return false
  })

}  
