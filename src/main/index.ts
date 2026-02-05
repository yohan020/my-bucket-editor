// [Main Process 진입점] Electron 앱 초기화, IPC 등록, 윈도우 생성을 담당
import { app, BrowserWindow, ipcMain, session, Tray, Menu, nativeImage } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createWindow } from './window'
import { registerAllHandlers } from './ipc'
import { cleanupTunnels } from './tunnel'
import icon from '../../resources/icon.png?asset'

let tray: Tray | null = null
let isQuitting = false

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // CSP 헤더 제거 (외부 Socket.io 연결 허용)
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ['']
      }
    })
  })

  // [중요] 터널 경고 페이지 우회를 위한 헤더 주입
  // Renderer에서 fetch/socket 요청 시 브라우저 보안 정책으로 헤더 설정이 막힐 수 있어 Main에서 처리
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const { url } = details
    // localtunnel, ngrok, cloudflare 도메인으로 나가는 요청에 헤더 추가
    if (url.includes('loca.lt') || url.includes('ngrok-free.app') || url.includes('ngrok.io') || url.includes('ngrok-free.dev') || url.includes('trycloudflare.com')) {
      callback({
        requestHeaders: {
          ...details.requestHeaders,
          'Bypass-Tunnel-Reminder': 'true',
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'MyBucketEditor-Client/1.0'
        }
      })
    } else {
      callback({ requestHeaders: details.requestHeaders })
    }
  })

  ipcMain.on('ping', () => console.log('pong'))

  // 모든 IPC 핸들러 등록
  registerAllHandlers()

  // 윈도우 생성 및 트레이 설정
  const mainWindow = createWindow()
  createTray(mainWindow)

  // [핵심] 닫기 버튼 오버라이딩 -> 트레이로 숨김 또는 종료 선택
  mainWindow.on('close', (event) => {
    if (isQuitting) return true

    event.preventDefault()

    // macOS: 보통 닫기 시 앱을 숨김 처리 (Dock에는 남음)
    if (process.platform === 'darwin') {
      mainWindow.hide()
      return false
    }

    // Windows/Linux: Renderer에 커스텀 모달 표시 요청
    mainWindow.webContents.send('app:close-confirm')
    return false
  })

  // Renderer에서 사용자 선택 응답 수신
  ipcMain.on('app:close-response', (_, action: 'background' | 'quit' | 'cancel') => {
    if (action === 'background') {
      mainWindow.hide()
    } else if (action === 'quit') {
      isQuitting = true
      app.quit()
    }
    // cancel: 아무것도 하지 않음
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else {
      // 이미 실행 중이면 창 보이기
      mainWindow.show()
    }
  })
})

app.on('window-all-closed', () => {
  // 트레이 모드에서는 창이 닫혀도(숨겨져도) 종료하지 않음
  // 명시적 종료 시에만 cleanup 후 quit
})

app.on('before-quit', async () => {
  isQuitting = true
  // 앱 종료 시 터널 정리
  await cleanupTunnels()
})

// 시스템 트레이 생성 함수
function createTray(mainWindow: BrowserWindow): void {
  const iconImage = nativeImage.createFromPath(icon)
  
  // [Mac Fix] 맥은 메뉴바 아이콘 사이즈를 조절해야 함 (너무 크면 가로로 늘어남)
  if (process.platform === 'darwin') {
      const macIcon = iconImage.resize({ width: 22, height: 22 }) // 22x22가 표준
      // macIcon.setTemplateImage(true) // 제거: 원본 색상 유지
      tray = new Tray(macIcon)
  } else {
      tray = new Tray(iconImage)
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '열기 (Open)',
      click: () => mainWindow.show()
    },
    { type: 'separator' },
    {
      label: '종료 (Quit)',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setToolTip('My Bucket Editor')
  tray.setContextMenu(contextMenu)
  tray.on('double-click', () => mainWindow.show())
}