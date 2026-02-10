// [서버 핸들러] Express 서버 시작/종료 등 서버 라이프사이클 IPC 처리
import { ipcMain } from 'electron'
import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { servers } from '../server'
import { createAuthRouter } from '../server/routes/auth.route'
import { createGuestRouter } from '../server/routes/guest.page'
import { createEditorRouter } from '../server/routes/editor.page'
import { setupSocketHandlers } from '../server/socket'
import { getProjectZipBuffer } from '../backup';

// 서버 시작 핸들러
export function registerServerHandlers(): void {
    
  ipcMain.handle('server:start', async (_, {projectId, projectPath, projectName}) => {
    // 1. 이미 켜져 있는 프로젝트인지 확인
    // 기존에는 port로 확인했지만, 이제는 projectId나 path로 확인해야 함.
    // 하지만 servers Map은 port를 키로 쓰고 있음.
    // -> servers Map 값을 순회하며 projectId가 같은지 확인하거나, 구조를 변경해야 함.
    // 간단하게: 이미 실행 중인 서버 중 동일한 projectId가 있으면 그 정보 반환 (또는 재시작)
    
    for (const [runningPort, server] of servers.entries()) {
        if (server.projectId === projectId) {
            console.log(`이미 실행 중인 프로젝트입니다 (Port: ${runningPort}). 재시작합니다.`)
            server.http.close()
            servers.delete(runningPort)
            break
        }
    }

    // 2. 사용자 목록 초기화 (projectId 기반으로 변경되었으므로 별도 인메모리 관리는 필요 없을 수도 있지만,
    // 성능을 위해 메모리에 캐싱한다면 projectId를 키로 써야 함.
    // userStore.ts가 이제 파일 기반으로 projectId를 쓰므로,
    // 여기서는 굳이 메모리에 별도로 set할 필요가 없거나,
    // projectUsers Map을 <projectId, Users>로 변경해야 함.
    // -> server.ts의 projectUsers 정의를 확인해야 함. (일단 패스하고 userStore 직접 사용 권장)

    try {
      const app = express()
      app.use(cors())
      app.use(express.json())

      // 라우트 등록 (authRouter 등에서 port를 썼던 것 수정 필요)
      // createAuthRouter(projectId) 로 변경 필요
      app.use(createAuthRouter(projectId)) 
      app.use(createGuestRouter())
      app.use(createEditorRouter())
      
      // 프로젝트 다운로드 API
      app.get('/api/download', async (_req, res) => {
        try {
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
      const io = new Server(httpServer, {
        cors: { origin: '*', methods: ['GET', 'POST'], credentials: true },
        transports: ['websocket', 'polling']
      })

      // Socket.io 이벤트 핸들러 등록
      setupSocketHandlers(io, projectPath, Number(projectId))

      // 4) 동적 포트 할당 (port 0)
      return new Promise((resolve) => {
          httpServer.listen(0, '0.0.0.0', () => {
            const address = httpServer.address()
            const assignedPort = typeof address === 'string' ? 0 : address?.port || 0
            
            console.log(`✅ 서버 시작 (Project: ${projectName}, ID: ${projectId}) -> Port: ${assignedPort}`)
            
            // Map에 저장 (Key: Port) - Port로 찾는게 편함 (request host header 등)
            // Value에 projectId 추가
            servers.set(assignedPort, {
                app, 
                http: httpServer, 
                io, 
                projectName: projectName || 'Unknown Project',
                projectId
            })
            
            resolve({ success: true, message: '서버 시작 성공', port: assignedPort })
          })

          httpServer.on('error', (err) => {
              console.error('서버 시작 중 에러:', err)
              resolve({ success: false, message: String(err) })
          })
      })

    } catch (error) {
      console.error('서버 시작 실패: ',error)
      return { success: false, message: String(error)}
    }
  })

  // 서버 종료 핸들러
  ipcMain.handle('server:stop', async (_, port: number) => {
    const server = servers.get(port)
    if (server) {
      server.io.emit('server:shutdown')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      server.http.close(() => {
        console.log('⛔ 서버가 종료되었습니다.')
      })
      
      import('../tunnel').then(({ stopTunnel }) => {
          stopTunnel(port).catch(err => console.error('터널 종료 실패:', err))
      })

      servers.delete(port)
      return true
    }
    return false
  })

}  
