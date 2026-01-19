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
      server.http.close(() => {
        console.log('⛔ 서버가 종료되었습니다.')
      })
      servers.delete(port)
      return true
    }
    return false
  })

}  
