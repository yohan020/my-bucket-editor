import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import {promises as fs} from 'fs'

// 서버용 모듈
import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import cors from 'cors'

// 프로젝트 타입 정의 (Renderer와 동일하게 유지)
interface Project {
  id: number,
  name: string,
  path: string,
  port: number,
  lastUsed: string
}

interface server {
  app: express.Express,
  http: http.Server,
  io: Server
}

interface User {
  email: string,
  password: string,
  status: 'pending' | 'approved' | 'rejected';
}

// 전역 변수 선언 (서버 상태 관리용)
// 우리가 켠 서버를 나중에 끄려면 변수에 담아둬야 함
const servers = new Map<number, server>()
const projectUsers = new Map<number, User[]>()

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  //------------- ipc 핸들러 -------------

  // 폴더 선택 핸들러
  ipcMain.handle('dialog:openDirectory', async () => {
    const { canceled, filePaths} = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    if (canceled) {
      return null
    } else {
      return filePaths[0]
    }
  })

  // 저장할 파일 경로 : (사용자 데이터 폴더)/projects.json
  const dbPath = join(app.getPath('userData'), 'projects.json')

  // 프로젝트 목록 불러오기 (Read)
  ipcMain.handle('project:list', async () => {
    try {
      const data = await fs.readFile(dbPath, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      return []
    }
  })

  // 프로젝트 저장하기 (Create)
  ipcMain.handle('project:create', async (_, newProject: Project) => {
    let projects: Project[] = []
    try {
      const data = await fs.readFile(dbPath, 'utf-8')
      projects = JSON.parse(data)
    } catch (error) {
      // 파일이 없으면 새로 만듦
    }

    projects.push(newProject)
    await fs.writeFile(dbPath, JSON.stringify(projects, null, 2))
    return true
  })

  // 서버 시작 핸들러
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

      app.post('/api/login', (req, res) => {
        const {email, password} = req.body
        const users = projectUsers.get(port) || [];
        const existingUser = users.find(u => u.email === email)

        // A. 이미 등록된 유저인 경우
        if (existingUser) {
          if (existingUser.password !== password) {
            return res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 틀렸습니다'})
          }

          if (existingUser.status === 'pending') {
            return res.status(202).json({ success: false, message: '⏳ 호스트의 승인을 기다리는 중입니다.'})
          }

          if (existingUser.status === 'rejected') {
            return res.status(403).json({ success: false, message: '⛔ 접속이 거절되었습니다.'})
          }

          return res.status(200).json({ success: true, message: '✅ 접속이 승인되었습니다.'})
        }

        // B. 등록되지 않은 유저인 경우
        const newUser: User = { email, password, status: 'pending'}
        users.push(newUser)
        projectUsers.set(port, users);

        // 호스트에게 승인 요청 왔다고 알려줌
        const windows = BrowserWindow.getAllWindows()
        if (windows.length > 0) {
          windows[0].webContents.send('guest-request', {port, email})
        }

        return res.status(201).json({success: false, message: '📨 승인 요청을 보냈습니다. 호스트가 수락하면 다시 로그인하세요.'})
      })

      // 1) 테스트용 기본 페이지 (게스트가 접속하면 이게 보임)
      app.get('/', (req, res) => {
        res.send(`
          <!DOCTYPE html>
          <html lang="ko">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Bucket Login</title>
            <style>
              /* 스타일은 그대로 유지하거나 더 예쁘게 꾸미세요 */
              body { background-color: #1e1e1e; color: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif; }
              .box { background: #252526; padding: 40px; border-radius: 8px; width: 300px; text-align: center; }
              input { width: 100%; padding: 10px; margin: 10px 0; border-radius: 4px; border: 1px solid #555; background: #333; color: white; }
              button { width: 100%; padding: 10px; background: #0e639c; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
              button:hover { background: #1177bb; }
            </style>
          </head>
          <body>
            <div class="box">
              <h2>🔒 프로젝트 접속</h2>
              <p>아이디와 비밀번호를 입력하세요.<br>(처음이면 자동으로 승인 요청됩니다)</p>
              <input type="text" id="email" placeholder="이메일 / 닉네임">
              <input type="password" id="password" placeholder="비밀번호">
              <button onclick="login()">접속 / 승인요청</button>
            </div>
            <script>
              async function login() {
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                if(!email || !password) return alert('모두 입력해주세요.');

                try {
                  const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ email, password })
                  });
                  const data = await res.json();
                  
                  if (data.success) {
                    alert('🎉 환영합니다! 에디터로 이동합니다.');
                    document.body.innerHTML = '<h1>🚧 에디터 로딩중...</h1>'; 
                    // 추후 여기에 리다이렉트 로직 추가
                  } else {
                    alert(data.message); // "대기중입니다" 또는 "요청 보냈습니다" 메시지 출력
                  }
                } catch (e) { alert('서버 오류'); }
              }
            </script>
          </body>
          </html>
        `)
      })

      // 2) HTTP 서버 실행
      const httpServer = http.createServer(app)

      // 3) 소켓 서버 장착 (나중에 채팅/코딩용)
      const io = new Server(httpServer, {
        cors: { origin: '*' } // 모든 곳에서 접속 허용
      })

      // 4) 진짜로 포트 열기
      httpServer.listen(port, () => {
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

  // 호스트가 승인/거절 버튼을 눌렀을 때 처리하는 핸들러
  ipcMain.handle('user:approve', async (_, {port, email, allow}) => {
    const users = projectUsers.get(port)
    if (!users) return {success: false, message: '⛔ 서버가 없습니다.'}

    const targetUser = users.find(u => u.email === email)
    if (targetUser) {
      targetUser.status = allow ? 'approved' : 'rejected'
      return {success: true, message: '✅ 승인/거절 성공'}
    }
    return {success: false, message: '⛔ 유저가 없습니다.'}
  })

  // ----------------------------------------

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
