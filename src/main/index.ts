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

// 전역 변수 선언 (서버 상태 관리용)
// 우리가 켠 서버를 나중에 끄려면 변수에 담아둬야 함
const servers = new Map<number, {
  app: express.Express,
  http: http.Server,
  io: Server
}>()

// 프로젝트 타입 정의 (Renderer와 동일하게 유지)
interface Project {
  id: number
  name: string
  path: string
  port: number
  lastUsed: string
}
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
    // 이미 켜져 있다면 끄고 다시 시작
    if (servers.has(port)) {
      console.log('이미 실행 중인 서버가 있습니다. 재시작합니다')
      servers.get(port)?.http.close()
      servers.delete(port)
    }

    try {
      const app = express()
      app.use(cors()) // 보안 정책 허용
      app.use(express.json())

      // 1) 테스트용 기본 페이지 (게스트가 접속하면 이게 보임)
      app.get('/', (req, res) => {
        res.send(`
          <h1>🚀 Bucket Editor Server Running!</h1>
          <p>현재 접속한 프로젝트 경로: ${projectPath}</p>
          <p>게스트 로그인 페이지가 곧 구현될 예정입니다.</p>`)
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
